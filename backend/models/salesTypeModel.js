const mongoose = require('mongoose');

const salesTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    // Metadata for future use
    metadata: {
        color: {
            type: String,
            default: '#3B82F6' // Default blue color
        },
        icon: {
            type: String,
            default: 'shopping-bag'
        },
        sortOrder: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

// Index for better performance
salesTypeSchema.index({ name: 1, isActive: 1 });
salesTypeSchema.index({ createdBy: 1 });

// Static method to get active sales types
salesTypeSchema.statics.getActiveTypes = function() {
    return this.find({ isActive: true }).sort({ 'metadata.sortOrder': 1, name: 1 });
};

// Instance method to soft delete
salesTypeSchema.methods.softDelete = function() {
    this.isActive = false;
    return this.save();
};

const SalesTypeModel = mongoose.model('SalesType', salesTypeSchema);
module.exports = SalesTypeModel;
