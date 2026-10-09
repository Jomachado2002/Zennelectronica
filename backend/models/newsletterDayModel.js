const mongoose = require('mongoose');

const newsletterDaySchema = new mongoose.Schema({
    dateKey: { type: String, required: true, unique: true },
    assigned: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'newsletterContact'
    }],
    sentCount: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['idle', 'running', 'done'],
        default: 'idle'
    },
    autoSentAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('newsletterDay', newsletterDaySchema);
