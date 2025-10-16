// backend/models/saleModel.js - VERSIÓN CON SOPORTE MULTI-MONEDA
const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    saleNumber: {
        type: String,
        required: false,
        unique: true,
        sparse: true
    },
    saleType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalesType',
        required: true
    },
    saleTypeSnapshot: {
        name: String,
        description: String
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'client',
        required: true
    },
    clientSnapshot: {
        name: String,
        company: String,
        email: String,
        phone: String,
        address: {
            street: String,
            city: String,
            state: String,
            zip: String,
            country: String
        },
        taxId: String
    },
    // ✅ NUEVOS CAMPOS PARA SISTEMA MEJORADO
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        required: true
    },
    branchSnapshot: {
        name: String,
        code: String,
        address: {
            street: String,
            city: String,
            state: String,
            zip: String,
            country: String
        }
    },
    salesperson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salesperson',
        required: true
    },
    salespersonSnapshot: {
        name: String,
        document: String,
        phone: String,
        email: String
    },
    items: [{
        // ✅ SOPORTE PARA PRODUCTOS DE BD Y MANUALES
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product',
            required: false // Opcional para productos manuales
        },
        productSnapshot: {
            name: String,
            code: String,
            brand: String,
            category: String
        },
        description: {
            type: String,
            required: true
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
        // ✅ NUEVOS CAMPOS PARA SOPORTE MULTI-MONEDA
        currency: {
            type: String,
            enum: ['PYG', 'USD', 'EUR'],
            default: 'PYG'
        },
        exchangeRate: {
            type: Number,
            default: 1
        },
        unitPricePYG: {
            type: Number,
            required: false // Se calcula automáticamente
        },
        // ✅ CAMPOS DE IMPUESTOS MEJORADOS
        taxType: {
            type: String,
            enum: ['exempt', 'iva_5', 'iva_10'],
            default: 'iva_10'
        },
        taxRate: {
            type: Number,
            default: 10
        },
        taxAmount: {
            type: Number,
            default: 0
        },
        subtotal: {
            type: Number,
            required: true
        },
        subtotalWithTax: {
            type: Number,
            required: true
        }
    }],
    subtotal: {
        type: Number,
        required: true
    },
    // ✅ IVA VARIABLE MEJORADO
    tax: {
        type: Number,
        enum: [0, 5, 10],
        default: 10
    },
    taxAmount: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    // ✅ NUEVOS CAMPOS PARA SISTEMA MEJORADO
    currency: {
        type: String,
        enum: ['PYG', 'USD', 'EUR'],
        default: 'PYG'
    },
    exchangeRate: {
        type: Number,
        default: 1
    },
    totalAmountPYG: {
        type: Number,
        required: true
    },
    totalAmountUSD: {
        type: Number,
        required: false
    },
    // ✅ CAMPOS DE PAGO MEJORADOS
    paymentTerms: {
        type: String,
        enum: ['efectivo', 'net_15', 'net_30', 'net_60', 'net_90', 'personalizado'],
        default: 'efectivo'
    },
    customPaymentTerms: {
        type: String
    },
    dueDate: {
        type: Date
    },
    // ✅ ARCHIVOS ADJUNTOS
    attachments: [{
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        }
    }],
    // ✅ CAMPOS ADICIONALES
    amountInWords: {
        type: String
    },
    internalNotes: {
        type: String
    },
    customerNotes: {
        type: String
    },
    paymentMethod: {
        type: String,
        enum: ['efectivo', 'transferencia', 'cheque', 'tarjeta', 'credito'],
        default: 'efectivo'
    },
    paymentStatus: {
        type: String,
        enum: ['pendiente', 'parcial', 'pagado', 'vencido'],
        default: 'pendiente'
    },
    saleDate: {
        type: Date,
        default: Date.now
    },
    invoiceFile: {
        type: String
    },
    notes: String,
    createdBy: {
        type: mongoose.Schema.Types.Mixed,
        required: false
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

// ✅ FUNCIÓN ESTÁTICA para generar número de venta
saleSchema.statics.generateSaleNumber = async function() {
    try {
        const lastSale = await this.findOne(
            { 
                saleNumber: { 
                    $exists: true, 
                    $ne: null,
                    $regex: /^VNT-\d{5}$/ 
                } 
            }, 
            { saleNumber: 1 },
            { sort: { createdAt: -1 } }
        );

        if (lastSale && lastSale.saleNumber) {
            const match = lastSale.saleNumber.match(/VNT-(\d{5})/);
            if (match) {
                const lastNumber = parseInt(match[1]);
                const nextNumber = lastNumber + 1;
                return `VNT-${nextNumber.toString().padStart(5, '0')}`;
            }
        }
        
        return 'VNT-00001';
        
    } catch (error) {
        console.error('❌ Error generando saleNumber:', error);
        const timestamp = Date.now().toString();
        const suffix = timestamp.slice(-5);
        return `VNT-${suffix}`;
    }
};

// ✅ Hook pre-save OPTIMIZADO
saleSchema.pre('save', async function(next) {
    try {
        // Solo generar número si es nuevo documento y no tiene número
        if (this.isNew && !this.saleNumber) {
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts) {
                try {
                    this.saleNumber = await this.constructor.generateSaleNumber();
                    
                    // Verificar que no existe
                    const existing = await this.constructor.findOne({ 
                        saleNumber: this.saleNumber 
                    });
                    
                    if (!existing) {
                        break;
                    }
                    
                    attempts++;
                    if (attempts >= maxAttempts) {
                        this.saleNumber = `VNT-${Date.now().toString().slice(-5)}`;
                    }
                    
                } catch (err) {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        this.saleNumber = `VNT-${Math.random().toString().slice(-5)}`;
                    }
                }
            }
        }
        next();
    } catch (error) {
        console.error('❌ Error en pre-save hook de venta:', error);
        this.saleNumber = `VNT-${Date.now().toString().slice(-5)}`;
        next();
    }
});

const saleModel = mongoose.model("sale", saleSchema);
module.exports = saleModel;