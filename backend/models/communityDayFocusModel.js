'use strict';

const mongoose = require('mongoose');

const communityDayFocusSchema = new mongoose.Schema(
  {
    planDate: { type: String, required: true, unique: true },
    focus: { type: String, default: '' }
  },
  { timestamps: true, collection: 'communitydayfocus' }
);

module.exports = mongoose.model('CommunityDayFocus', communityDayFocusSchema);
