const mongoose = require('mongoose');

const productDailyStatSchema = new mongoose.Schema({
    day: { type: String, required: true, maxlength: 10 },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
    name: { type: String, maxlength: 180, default: '' },
    category: { type: String, maxlength: 120, default: '' },
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    addToCarts: { type: Number, default: 0 },
    dwellMs: { type: Number, default: 0 }
}, { timestamps: true });

productDailyStatSchema.index({ day: 1, productId: 1 }, { unique: true });
productDailyStatSchema.index({ day: 1, views: -1 });

module.exports = mongoose.model('productDailyStat', productDailyStatSchema);
