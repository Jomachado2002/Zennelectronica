'use strict';

const mongoose = require('mongoose');

const tiktokAccountSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'store', unique: true },
    openId: { type: String, default: '' },
    displayName: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    accessToken: { type: String, default: '' },
    refreshToken: { type: String, default: '' },
    expiresAt: { type: Date, default: null },
    refreshExpiresAt: { type: Date, default: null },
    scope: { type: String, default: '' }
  },
  { timestamps: true, collection: 'tiktokaccounts' }
);

module.exports = mongoose.model('TiktokAccount', tiktokAccountSchema);
