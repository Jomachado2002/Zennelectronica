// backend/models/profitabilityAnalysisModel.js - VERSIÓN FINAL CORREGIDA
const mongoose = require('mongoose');

const profitabilityAnalysisSchema = new mongoose.Schema({
    // Número único del análisis - HACER OPCIONAL Y AGREGAR DEFAULT
    analysisNumber: {
        type: String,
        required: false, // CAMBIAR A OPCIONAL TEMPORALMENTE
        unique: true,
        default: function() {
            return `ANAL-${Date.now().toString().slice(-5)}`;
        }
    },
    
    // Relaciones
    budget: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'budget',
        required: true
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'client',
        required: true
    },
    
    // Items del análisis
    items: [{
        // Información del producto
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product'
        },
        productSnapshot: {
            name: { type: String, default: '' },
            description: { type: String, default: '' },
            category: { type: String, default: '' },
            subcategory: { type: String, default: '' },
            brandName: { type: String, default: '' }
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        },
        
        // Información del proveedor
        supplier: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'supplier',
            required: true
        },
        supplierSnapshot: {
            name: { type: String, default: '' },
            contactPerson: { type: String, default: '' },
            phone: { type: String, default: '' },
            email: { type: String, default: '' }
        },
        
        // Costos
        purchasePrice: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        purchaseCurrency: {
            type: String,
            default: 'USD',
            enum: ['USD', 'PYG', 'EUR']
        },
        exchangeRate: {
            type: Number,
            default: 7300
        },
        purchasePricePYG: {
            type: Number,
            required: true,
            default: 0
        },
        shippingCost: {
            type: Number,
            default: 0
        },
        customsCost: {
            type: Number,
            default: 0
        },
        otherCosts: {
            type: Number,
            default: 0
        },
        totalCostPerUnit: {
            type: Number,
            required: true,
            default: 0
        },
        
        // Precios de venta
        sellingPrice: {
            type: Number,
            required: true,
            default: 0
        },
        
        // Análisis calculado
        grossProfit: {
            type: Number,
            required: true,
            default: 0
        },
        profitMargin: {
            type: Number,
            required: true,
            default: 0
        },
        totalGrossProfit: {
            type: Number,
            required: true,
            default: 0
        },
        
        // Metadatos del item
        notes: { type: String, default: '' },
        deliveryTime: { type: String, default: '' }
    }],
    
    // Resumen total del análisis
    totals: {
        totalPurchaseCost: {
            type: Number,
            required: true,
            default: 0
        },
        totalShippingCost: {
            type: Number,
            required: true,
            default: 0
        },
        totalOtherCosts: {
            type: Number,
            required: true,
            default: 0
        },
        totalCosts: {
            type: Number,
            required: true,
            default: 0
        },
        totalRevenue: {
            type: Number,
            required: true,
            default: 0
        },
        totalGrossProfit: {
            type: Number,
            required: true,
            default: 0
        },
        averageProfitMargin: {
            type: Number,
            required: true,
            default: 0
        },
        totalQuantity: {
            type: Number,
            required: true,
            default: 0
        }
    },
    
    // Estado y metadatos
    status: {
        type: String,
        enum: ['draft', 'confirmed', 'completed', 'cancelled'],
        default: 'draft'
    },
    notes: { type: String, default: '' },
    
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
    
    // Fechas importantes
    estimatedDeliveryDate: Date,
    actualDeliveryDate: Date,
    orderPlacedDate: Date
}, {
    timestamps: true
});

// Pre-save hook SIMPLIFICADO para generar número de análisis
profitabilityAnalysisSchema.pre('save', function(next) {
    // Si es nuevo y no tiene analysisNumber, generar uno simple
    if (this.isNew && !this.analysisNumber) {
        this.analysisNumber = `ANAL-${Date.now().toString().slice(-8)}`;
    }
    next();
});

// Pre-save hook para calcular totales - SIMPLIFICADO
profitabilityAnalysisSchema.pre('save', function(next) {
    // Inicializar totales
    let totalPurchaseCost = 0;
    let totalShippingCost = 0;
    let totalOtherCosts = 0;
    let totalRevenue = 0;
    let totalGrossProfit = 0;
    let totalQuantity = 0;
    
    // Calcular totales de cada item
    this.items.forEach(item => {
        const quantity = Number(item.quantity) || 0;
        totalQuantity += quantity;
        
        // Asegurar que purchasePricePYG esté calculado
        if (!item.purchasePricePYG && item.purchasePrice) {
            if (item.purchaseCurrency === 'USD') {
                item.purchasePricePYG = item.purchasePrice * (item.exchangeRate || 7300);
            } else if (item.purchaseCurrency === 'EUR') {
                item.purchasePricePYG = item.purchasePrice * 1.1 * (item.exchangeRate || 7300);
            } else {
                item.purchasePricePYG = item.purchasePrice;
            }
        }
        
        totalPurchaseCost += item.purchasePricePYG * quantity;
        totalShippingCost += (item.shippingCost || 0) * quantity;
        totalOtherCosts += ((item.customsCost || 0) + (item.otherCosts || 0)) * quantity;
        totalRevenue += (item.sellingPrice || 0) * quantity;
        
        // Calcular totales del item
        item.totalCostPerUnit = (item.purchasePricePYG || 0) + (item.shippingCost || 0) + (item.customsCost || 0) + (item.otherCosts || 0);
        item.grossProfit = (item.sellingPrice || 0) - item.totalCostPerUnit;
        item.profitMargin = (item.sellingPrice || 0) > 0 ? (item.grossProfit / item.sellingPrice) * 100 : 0;
        item.totalGrossProfit = item.grossProfit * quantity;
        
        totalGrossProfit += item.totalGrossProfit;
    });
    
    const totalCosts = totalPurchaseCost + totalShippingCost + totalOtherCosts;
    const averageProfitMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
    
    // Asignar totales calculados con valores por defecto
    this.totals = {
        totalPurchaseCost: totalPurchaseCost || 0,
        totalShippingCost: totalShippingCost || 0,
        totalOtherCosts: totalOtherCosts || 0,
        totalCosts: totalCosts || 0,
        totalRevenue: totalRevenue || 0,
        totalGrossProfit: totalGrossProfit || 0,
        averageProfitMargin: averageProfitMargin || 0,
        totalQuantity: totalQuantity || 0
    };
    
    next();
});

// Índices
profitabilityAnalysisSchema.index({ analysisNumber: 1 }, { unique: true, sparse: true });
profitabilityAnalysisSchema.index({ budget: 1 });
profitabilityAnalysisSchema.index({ client: 1 });
profitabilityAnalysisSchema.index({ status: 1 });
profitabilityAnalysisSchema.index({ createdAt: -1 });

const profitabilityAnalysisModel = mongoose.model("profitabilityAnalysis", profitabilityAnalysisSchema);
module.exports = profitabilityAnalysisModel;