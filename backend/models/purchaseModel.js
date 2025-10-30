// backend/models/purchaseModel.js - VERSIÓN CON SOPORTE MULTI-MONEDA
const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
    purchaseNumber: {
        type: String,
        required: false,
        unique: true,
        sparse: true
    },
    purchaseType: {
        type: String,
        required: true
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'supplier'
    },
    supplierSnapshot: {
        name: String,
        company: String,
        email: String,
        phone: String,
        ruc: String,
        address: String
    },
    supplierInfo: {
        name: String,
        contact: String,
        ruc: String,
        address: String
    },
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch'
    },
    branchSnapshot: {
        name: String,
        code: String,
        address: String
    },
    items: [{
        description: {
            type: String,
            required: true
        },
        category: {
            type: String,
            enum: ['producto', 'servicio', 'gasto_fijo', 'gasto_variable', 'inversion'],
            default: 'producto'
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0
        },
        // ✅ SOPORTE MULTI-MONEDA
        currency: {
            type: String,
            enum: ['PYG', 'USD', 'EUR'],
            default: 'PYG'
        },
        exchangeRate: {
            type: Number,
            default: 1
        },
        taxType: {
            type: String,
            enum: ['iva_10', 'iva_5', 'exento'],
            required: true
        },
        taxRate: {
            type: Number,
            enum: [0, 5, 10],
            required: true
        },
        priceIncludesTax: {
            type: Boolean,
            default: true
        },
        baseAmount: {
            type: Number,
            required: true
        },
        taxAmount: {
            type: Number,
            required: true
        },
        subtotal: {
            type: Number,
            required: true
        }
    }],
    subtotal: {
        type: Number,
        required: true
    },
    totalTaxAmount: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['efectivo', 'transferencia', 'cheque', 'tarjeta', 'credito'],
        default: 'transferencia' // Para compras, más común transferencia
    },
    paymentStatus: {
        type: String,
        enum: ['pendiente', 'parcial', 'pagado', 'vencido'],
        default: 'pendiente'
    },
    dueDate: {
        type: Date
    },
    purchaseDate: {
        type: Date,
        default: Date.now
    },
    invoiceFile: {
        type: String
    },
    receiptFile: {
        type: String
    },
    notes: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    createdByGuest: {
        type: String,
        required: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// ✅ FUNCIÓN ESTÁTICA para generar número de compra
purchaseSchema.statics.generatePurchaseNumber = async function() {
    try {
        const lastPurchase = await this.findOne(
            { 
                purchaseNumber: { 
                    $exists: true, 
                    $ne: null,
                    $regex: /^CMP-\d{5}$/ 
                } 
            }, 
            { purchaseNumber: 1 },
            { sort: { createdAt: -1 } }
        );

        if (lastPurchase && lastPurchase.purchaseNumber) {
            const match = lastPurchase.purchaseNumber.match(/CMP-(\d{5})/);
            if (match) {
                const lastNumber = parseInt(match[1]);
                const nextNumber = lastNumber + 1;
                return `CMP-${nextNumber.toString().padStart(5, '0')}`;
            }
        }
        
        return 'CMP-00001';
        
    } catch (error) {
        // console.error removed for production
        const timestamp = Date.now().toString();
        const suffix = timestamp.slice(-5);
        return `CMP-${suffix}`;
    }
};

// ✅ Hook pre-save OPTIMIZADO
purchaseSchema.pre('save', async function(next) {
    try {
        // Solo generar número si es nuevo documento y no tiene número
        if (this.isNew && !this.purchaseNumber) {
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts) {
                try {
                    this.purchaseNumber = await this.constructor.generatePurchaseNumber();
                    
                    // Verificar que no existe
                    const existing = await this.constructor.findOne({ 
                        purchaseNumber: this.purchaseNumber 
                    });
                    
                    if (!existing) {
                        break;
                    }
                    
                    attempts++;
                    if (attempts >= maxAttempts) {
                        this.purchaseNumber = `CMP-${Date.now().toString().slice(-5)}`;
                    }
                    
                } catch (err) {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        this.purchaseNumber = `CMP-${Math.random().toString().slice(-5)}`;
                    }
                }
            }
        }
        next();
    } catch (error) {
        // console.error removed for production
        this.purchaseNumber = `CMP-${Date.now().toString().slice(-5)}`;
        next();
    }
});

const purchaseModel = mongoose.model("purchase", purchaseSchema);
module.exports = purchaseModel;