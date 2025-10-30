const mongoose = require('mongoose');

const purchaseTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true, unique: true },
  description: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

purchaseTypeSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('PurchaseType', purchaseTypeSchema);


