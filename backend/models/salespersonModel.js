const mongoose = require('mongoose');

const salespersonSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    document: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    documentType: {
        type: String,
        enum: ['CI', 'RUC', 'PASAPORTE', 'CEDULA'],
        default: 'CI'
    },
    phone: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        zip: String,
        country: {
            type: String,
            default: 'Paraguay'
        }
    },
    commissionRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isManager: {
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
        employeeId: {
            type: String,
            unique: true,
            sparse: true
        },
        hireDate: {
            type: Date
        },
        department: {
            type: String,
            default: 'Ventas'
        },
        salesTarget: {
            monthly: {
                type: Number,
                default: 0
            },
            yearly: {
                type: Number,
                default: 0
            }
        },
        performance: {
            totalSales: {
                type: Number,
                default: 0
            },
            totalCommission: {
                type: Number,
                default: 0
            },
            averageSaleValue: {
                type: Number,
                default: 0
            }
        }
    }
}, {
    timestamps: true
});

// Index for better performance
salespersonSchema.index({ document: 1, isActive: 1 });
salespersonSchema.index({ name: 1, isActive: 1 });
salespersonSchema.index({ email: 1, isActive: 1 });
salespersonSchema.index({ createdBy: 1 });

// Static method to get active salespersons
salespersonSchema.statics.getActiveSalespersons = function() {
    return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to search salespersons
salespersonSchema.statics.searchSalespersons = function(query) {
    const searchRegex = new RegExp(query, 'i');
    return this.find({
        isActive: true,
        $or: [
            { name: searchRegex },
            { document: searchRegex },
            { email: searchRegex },
            { phone: searchRegex }
        ]
    }).sort({ name: 1 });
};

// Instance method to soft delete
salespersonSchema.methods.softDelete = function() {
    this.isActive = false;
    return this.save();
};

// Instance method to update performance
salespersonSchema.methods.updatePerformance = function(saleAmount, commissionAmount) {
    this.metadata.performance.totalSales += 1;
    this.metadata.performance.totalCommission += commissionAmount || 0;
    this.metadata.performance.averageSaleValue = 
        this.metadata.performance.totalCommission / this.metadata.performance.totalSales;
    return this.save();
};

// Instance method to get full name with document
salespersonSchema.methods.getFullNameWithDocument = function() {
    return `${this.name} (${this.document})`;
};

const SalespersonModel = mongoose.model('Salesperson', salespersonSchema);
module.exports = SalespersonModel;
