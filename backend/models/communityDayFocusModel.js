'use strict';

const mongoose = require('mongoose');

const communityDayFocusSchema = new mongoose.Schema(
  {
    planDate: { type: String, required: true, unique: true },
    focus: { type: String, default: '' },
    messages: {
      type: [{
        role: { type: String, enum: ['user', 'assistant'], default: 'assistant' },
        text: { type: String, default: '' },
        at: { type: Date, default: Date.now }
      }],
      default: []
    }
  },
  { timestamps: true, collection: 'communitydayfocus' }
);

module.exports = mongoose.model('CommunityDayFocus', communityDayFocusSchema);
