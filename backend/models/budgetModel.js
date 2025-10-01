// backend/models/budgetModel.js - VERSIÓN CORREGIDA
const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
    budgetNumber: {
        type: String,
        required: true,
        unique: true
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'client',
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product'
        },
        productSnapshot: {
            name: String,
            price: Number,
            description: String,
            category: String,
            subcategory: String,
            brandName: String
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        unitPrice: {
            type: Number,
            required: true
        },
        discount: {
            type: Number,
            default: 0
        },
        subtotal: {
            type: Number,
            required: true
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    finalAmount: {
        type: Number,
        required: true
    },
    notes: String,
    validUntil: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'],
        default: 'draft'
    },
    paymentTerms: {
        type: String
    },
    deliveryMethod: {
        type: String
    },
    // CORREGIDO PARA SOPORTAR USUARIOS INVITADOS
    createdBy: {
        type: mongoose.Schema.Types.Mixed, // Permite ObjectId o String
        required: false // Hacer opcional para usuarios invitados
    },
    
    // Campo adicional para usuarios invitados
    createdByGuest: {
        type: String,
        required: false
    },
    
    pdfPath: {
        type: String
    }
}, {
    timestamps: true
});

// Modificar el hook pre('save') para hacer más robusto el proceso de generación del budgetNumber
budgetSchema.pre('save', async function(next) {
    try {
        // Si ya tiene un número de presupuesto, continuar
        if (this.budgetNumber) {
            return next();
        }

        // Si es un nuevo documento, generar un número de presupuesto
        if (this.isNew) {
            const lastBudget = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
            
            if (lastBudget && lastBudget.budgetNumber) {
                // Extraer la parte numérica del último presupuesto
                const lastNumberStr = lastBudget.budgetNumber.split('-')[1];
                if (!lastNumberStr) {
                    this.budgetNumber = 'PRES-00001';
                } else {
                    const lastNumber = parseInt(lastNumberStr);
                    this.budgetNumber = `PRES-${(lastNumber + 1).toString().padStart(5, '0')}`;
                }
            } else {
                // Primer presupuesto
                this.budgetNumber = 'PRES-00001';
            }
            return next();
        }

        // Si no es un nuevo documento y no tiene budgetNumber, asignar uno
        // basado en timestamp para evitar duplicados (caso de emergencia)
        if (!this.budgetNumber) {
            this.budgetNumber = `PRES-${Date.now().toString().slice(-5)}`;
        }
        
        next();
    } catch (error) {
        // En caso de error, asignar un número basado en timestamp
        console.error('Error generando budgetNumber:', error);
        this.budgetNumber = `PRES-${Date.now().toString().slice(-5)}`;
        next();
    }
});

const budgetModel = mongoose.model("budget", budgetSchema);
module.exports = budgetModel;