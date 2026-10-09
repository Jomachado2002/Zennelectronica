const mongoose = require('mongoose');

const newsletterTemplateSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, default: 'captacion' },
    subject: { type: String, default: '' },
    preheader: { type: String, default: '' },
    headline: { type: String, default: '' },
    intro: { type: String, default: '' },
    instagramLine: { type: String, default: '' },
    categoryIntro: { type: String, default: '' },
    closing: { type: String, default: '' },
    angle: { type: String, default: '' },
    html: { type: String, default: '' },
    brevoTemplateId: { type: Number, default: null },
    brevoTemplateName: { type: String, default: 'Newsletter captación Zenn' },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'product' }],
    ai: {
        gemini: { type: String, default: '' },
        claude: { type: String, default: '' }
    },
    brevoError: { type: String, default: '' },
    generatedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('newsletterTemplate', newsletterTemplateSchema);
