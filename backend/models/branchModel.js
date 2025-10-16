const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        uppercase: true
    },
    address: {
        street: {
            type: String,
            required: true,
            trim: true
        },
        city: {
            type: String,
            required: true,
            trim: true
        },
        state: {
            type: String,
            required: true,
            trim: true
        },
        zip: {
            type: String,
            trim: true
        },
        country: {
            type: String,
            default: 'Paraguay',
            trim: true
        }
    },
    contact: {
        phone: {
            type: String,
            trim: true
        },
        email: {
            type: String,
            trim: true,
            lowercase: true
        },
        manager: {
            type: String,
            trim: true
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isMainBranch: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    // Metadata for future use
    metadata: {
        coordinates: {
            latitude: Number,
            longitude: Number
        },
        businessHours: {
            monday: { open: String, close: String, closed: { type: Boolean, default: false } },
            tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
            wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
            thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
            friday: { open: String, close: String, closed: { type: Boolean, default: false } },
            saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
            sunday: { open: String, close: String, closed: { type: Boolean, default: false } }
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
branchSchema.index({ code: 1, isActive: 1 });
branchSchema.index({ name: 1, isActive: 1 });
branchSchema.index({ createdBy: 1 });

// Static method to get active branches
branchSchema.statics.getActiveBranches = function() {
    return this.find({ isActive: true }).sort({ 'metadata.sortOrder': 1, name: 1 });
};

// Static method to get main branch
branchSchema.statics.getMainBranch = function() {
    return this.findOne({ isMainBranch: true, isActive: true });
};

// Instance method to soft delete
branchSchema.methods.softDelete = function() {
    this.isActive = false;
    return this.save();
};

// Instance method to get full address
branchSchema.methods.getFullAddress = function() {
    const { street, city, state, zip, country } = this.address;
    let address = `${street}, ${city}, ${state}`;
    if (zip) address += ` ${zip}`;
    if (country && country !== 'Paraguay') address += `, ${country}`;
    return address;
};

const BranchModel = mongoose.model('Branch', branchSchema);
module.exports = BranchModel;
