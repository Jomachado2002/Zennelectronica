const mongoose = require('mongoose');

const newsletterContactSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    status: {
        type: String,
        enum: ['active', 'unsubscribed'],
        default: 'active',
        index: true
    },
    source: {
        type: String,
        default: 'import'
    },
    unsubscribeToken: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    importedAt: { type: Date, default: Date.now },
    lastSentAt: { type: Date, default: null, index: true },
    sendCount: { type: Number, default: 0 },
    unsubscribedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('newsletterContact', newsletterContactSchema);
