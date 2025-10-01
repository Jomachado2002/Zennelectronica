// backend/models/clientModel.js
const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
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
    notes: String,
    budgets: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'budget'
    }],
    sales: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'sale'
    }],
    // ✅ CAMBIO PRINCIPAL: Permitir tanto ObjectId como String
    createdBy: {
        type: mongoose.Schema.Types.Mixed, // Acepta cualquier tipo
        required: false // Hacer opcional para usuarios invitados
    },
    // ✅ ALTERNATIVA: Agregar campo separado para usuarios invitados
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

const clientModel = mongoose.model("client", clientSchema);
module.exports = clientModel;