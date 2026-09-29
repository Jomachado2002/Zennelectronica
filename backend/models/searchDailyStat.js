const mongoose = require('mongoose');

const searchDailyStatSchema = new mongoose.Schema({
    day: { type: String, required: true, maxlength: 10 },
    query: { type: String, required: true, maxlength: 120 },
    count: { type: Number, default: 0 }
}, { timestamps: true });

searchDailyStatSchema.index({ day: 1, query: 1 }, { unique: true });
searchDailyStatSchema.index({ day: 1, count: -1 });

module.exports = mongoose.model('searchDailyStat', searchDailyStatSchema);
