const mongoose = require('mongoose');

const newsletterSendSchema = new mongoose.Schema({
    contactId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'newsletterContact',
        required: true,
        index: true
    },
    email: { type: String, required: true },
    dateKey: { type: String, required: true, index: true },
    status: {
        type: String,
        enum: ['sent', 'failed'],
        required: true
    },
    brevoMessageId: { type: String, default: '' },
    error: { type: String, default: '' }
}, { timestamps: true });

newsletterSendSchema.index(
    { contactId: 1, dateKey: 1 },
    { unique: true, partialFilterExpression: { status: 'sent' } }
);

module.exports = mongoose.model('newsletterSend', newsletterSendSchema);
