const mongoose = require('mongoose');

const behaviorEventSchema = new mongoose.Schema({
    visitorId: { type: String, required: true, maxlength: 80 },
    ip: { type: String, maxlength: 64, default: '' },
    type: {
        type: String,
        required: true,
        enum: ['page_view', 'product_view', 'search', 'add_to_cart', 'cart_sync', 'email_capture']
    },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product' },
    productName: { type: String, maxlength: 180, default: '' },
    category: { type: String, maxlength: 120, default: '' },
    brand: { type: String, maxlength: 120, default: '' },
    searchQuery: { type: String, maxlength: 120, default: '' },
    durationMs: { type: Number, min: 0, max: 30 * 60 * 1000, default: 0 },
    path: { type: String, maxlength: 300, default: '' }
}, { timestamps: { createdAt: true, updatedAt: false } });

behaviorEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60 });
behaviorEventSchema.index({ visitorId: 1, createdAt: -1 });
behaviorEventSchema.index({ ip: 1, createdAt: -1 });
behaviorEventSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('behaviorEvent', behaviorEventSchema);
