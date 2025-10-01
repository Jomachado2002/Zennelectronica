// backend/models/supplierModel.js - VERSIÓN CORREGIDA
const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        zip: String,
        country: String
    },
    company: {
        type: String,
        trim: true
    },
    taxId: {
        type: String,
        trim: true
    },
    contactPerson: {
        name: String,
        position: String,
        phone: String,
        email: String
    },
    businessInfo: {
        website: String,
        specialty: String, // Ej: "Importador de Hardware", "Distribuidor de Software"
        paymentTerms: String, // Ej: "30 días", "Pago anticipado"
        deliveryTime: String, // Ej: "5-7 días laborables"
        minimumOrder: Number,
        currency: {
            type: String,
            default: 'USD',
            enum: ['USD', 'PYG', 'EUR']
        }
    },
    notes: String,
    
    // Relaciones
    profitabilityAnalyses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'profitabilityAnalysis'
    }],
    
    // Estado
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Metadatos - CORREGIDO PARA SOPORTAR USUARIOS INVITADOS
    createdBy: {
        type: mongoose.Schema.Types.Mixed, // Permite ObjectId o String
        required: false // Hacer opcional para usuarios invitados
    },
    
    // Campo adicional para usuarios invitados
    createdByGuest: {
        type: String,
        required: false
    },
    
    // Información de rendimiento
    stats: {
        totalOrders: {
            type: Number,
            default: 0
        },
        averageDeliveryTime: Number, // en días
        reliabilityScore: {
            type: Number,
            min: 0,
            max: 5,
            default: 0
        },
        lastOrderDate: Date
    }
}, {
    timestamps: true
});

// Índices para búsquedas eficientes
supplierSchema.index({ name: 1 });
supplierSchema.index({ email: 1 });
supplierSchema.index({ 'businessInfo.specialty': 1 });
supplierSchema.index({ isActive: 1 });

const supplierModel = mongoose.model("supplier", supplierSchema);
module.exports = supplierModel;