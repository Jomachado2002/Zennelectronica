'use strict';

const mongoose = require('mongoose');

const creativeDownloadSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true, unique: true },
    format: { type: String, default: 'feed' },
    imageIndex: { type: Number, default: 0 },
    lastDownloadedAt: { type: Date, required: true },
    count: { type: Number, default: 1 }
  },
  { timestamps: true, collection: 'creativedownloads' }
);

creativeDownloadSchema.index({ lastDownloadedAt: 1 });

module.exports = mongoose.model('CreativeDownload', creativeDownloadSchema);
