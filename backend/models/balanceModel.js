const mongoose = require('mongoose');

const balanceSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    current_balance: {
        type: Number,
        default: 0,
        min: 0
    },
    total_loaded: {
        type: Number,
        default: 0
    },
    total_spent: {
        type: Number,
        default: 0
    },
    transactions: [{
        type: {
            type: String,
            enum: ['load', 'spend', 'refund', 'bonus', 'roulette_win'],
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        reference: {
            type: String // ID de transacción de Bancard, ID de venta, etc.
        },
        transaction_date: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'cancelled'],
            default: 'completed'
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    }],
    last_transaction_date: {
        type: Date,
        default: Date.now
    },
    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Índices para optimizar consultas
balanceSchema.index({ user_id: 1 });
balanceSchema.index({ 'transactions.transaction_date': -1 });
balanceSchema.index({ current_balance: 1 });

// Middleware para actualizar el balance cuando se agrega una transacción
balanceSchema.pre('save', function(next) {
    if (this.transactions && this.transactions.length > 0) {
        const lastTransaction = this.transactions[this.transactions.length - 1];
        this.last_transaction_date = lastTransaction.transaction_date;
        
        // Recalcular balance si es necesario
        if (this.isModified('transactions')) {
            this.current_balance = this.transactions
                .filter(t => t.status === 'completed')
                .reduce((balance, transaction) => {
                    if (transaction.type === 'load' || transaction.type === 'bonus' || transaction.type === 'roulette_win') {
                        return balance + transaction.amount;
                    } else if (transaction.type === 'spend') {
                        return balance - transaction.amount;
                    } else if (transaction.type === 'refund') {
                        return balance + transaction.amount;
                    }
                    return balance;
                }, 0);
        }
    }
    next();
});

// Método estático para obtener o crear balance de usuario
balanceSchema.statics.getOrCreateUserBalance = async function(userId) {
    try {
        let balance = await this.findOne({ user_id: userId });
        
        if (!balance) {
            balance = new this({
                user_id: userId,
                current_balance: 0,
                transactions: []
            });
            await balance.save();
        }
        
        return balance;
    } catch (error) {
        console.error('Error obteniendo/creando balance de usuario:', error);
        throw error;
    }
};

// Método para agregar transacción y actualizar balance
balanceSchema.methods.addTransaction = async function(transactionData) {
    try {
        // Validar que no se gaste más de lo disponible
        if (transactionData.type === 'spend' && transactionData.amount > this.current_balance) {
            throw new Error('Saldo insuficiente');
        }
        
        // Agregar transacción
        this.transactions.push(transactionData);
        
        // Actualizar totales
        if (transactionData.type === 'load') {
            this.total_loaded += transactionData.amount;
        } else if (transactionData.type === 'spend') {
            this.total_spent += transactionData.amount;
        }
        
        await this.save();
        return this;
    } catch (error) {
        console.error('Error agregando transacción:', error);
        throw error;
    }
};

// Método para verificar saldo suficiente
balanceSchema.methods.hasEnoughBalance = function(amount) {
    return this.current_balance >= amount;
};

module.exports = mongoose.model('Balance', balanceSchema);
