const mongoose = require('mongoose');

const recentProductSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product' },
    name: { type: String, maxlength: 180, default: '' },
    category: { type: String, maxlength: 120, default: '' },
    brand: { type: String, maxlength: 120, default: '' },
    price: { type: Number, default: 0 },
    action: { type: String, maxlength: 40, default: 'product_view' },
    durationMs: { type: Number, default: 0 },
    at: { type: Date, default: Date.now }
}, { _id: false });

const cartItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product' },
    name: { type: String, maxlength: 180, default: '' },
    category: { type: String, maxlength: 120, default: '' },
    price: { type: Number, default: 0 },
    quantity: { type: Number, default: 1, min: 1, max: 99 },
    at: { type: Date, default: Date.now }
}, { _id: false });

const visitorProfileSchema = new mongoose.Schema({
    visitorId: { type: String, required: true, unique: true, maxlength: 80 },
    email: { type: String, maxlength: 180, default: '', lowercase: true, trim: true },
    emailSource: { type: String, maxlength: 40, default: '' },
    emailCapturedAt: { type: Date },
    deviceLabel: { type: String, maxlength: 80, default: '' },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    lastIp: { type: String, maxlength: 64, default: '' },
    recentProducts: { type: [recentProductSchema], default: [] },
    cartItems: { type: [cartItemSchema], default: [] },
    cartUpdatedAt: { type: Date },
    cartFingerprint: { type: String, maxlength: 400, default: '' },
    cartEmailCount: { type: Number, default: 0, min: 0, max: 3 },
    cartRestoreToken: { type: String, maxlength: 64 },
    lastCartEmailAt: { type: Date },
    suggestionFingerprint: { type: String, maxlength: 400, default: '' },
    suggestionAnchorAt: { type: Date },
    suggestionEmailCount: { type: Number, default: 0, min: 0, max: 3 },
    lastSuggestionEmailAt: { type: Date }
}, { timestamps: true });

visitorProfileSchema.index({ lastSeenAt: -1 });
visitorProfileSchema.index({ email: 1, lastCartEmailAt: 1 });
visitorProfileSchema.index({ email: 1, lastSuggestionEmailAt: 1 });
visitorProfileSchema.index({ suggestionAnchorAt: 1, suggestionEmailCount: 1 });
visitorProfileSchema.index({ cartRestoreToken: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('visitorProfile', visitorProfileSchema);
