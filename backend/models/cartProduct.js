const mongoose = require('mongoose');

const addToCartSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        required: true
    },
    quantity: {
        type: Number,
        default: 1,
        min: 1,
        max: 100
    },
    userId: {
        type: String,
        required: true
    },
    sessionId: {
        type: String,
        required: true
    },
    isGuest: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound unique index to prevent duplicate entries
addToCartSchema.index({ 
    productId: 1, 
    $or: [
        { userId: 1 }, 
        { sessionId: 1 }
    ]
}, { unique: true });

const addToCartModel = mongoose.model("addToCart", addToCartSchema);

module.exports = addToCartModel;