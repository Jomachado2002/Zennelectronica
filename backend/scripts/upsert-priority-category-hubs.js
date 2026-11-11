'use strict';

/**
 * Upsert CategorySeo de hubs prioritarios con conteos/marcas reales.
 * No cambia slugs ni precios. Idempotente.
 *
 * Uso: cd backend && node scripts/upsert-priority-category-hubs.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const productModel = require('../models/productModel');
const Category = require('../models/categoryModel');
const CategorySeo = require('../models/categorySeoModel');
const { formatGuaranies } = require('../services/productSearchCopy');
const { PRIORITY_HUB_KEYS, priorityCategoryHub } = require('../services/priorityCategoryHubs');

function todayAsuncion() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Asuncion',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

async function statsFor(category, subcategory) {
  const query = { category, stock: { $gt: 0 } };
  if (subcategory) query.subcategory = subcategory;
  const [count, agg, brands] = await Promise.all([
    productModel.countDocuments(query),
    productModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$sellingPrice' },
          maxPrice: { $max: '$sellingPrice' }
        }
      }
    ]),
    productModel.aggregate([
      { $match: { ...query, brandName: { $nin: ['', null] } } },
      { $group: { _id: '$brandName', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 6 }
    ])
  ]);
  const row = agg[0] || {};
  return {
    count,
    minPrice: Number(row.minPrice) || 0,
    maxPrice: Number(row.maxPrice) || 0,
    brands: brands.map((b) => b._id).filter(Boolean)
  };
}

async function labelFor(category, subcategory) {
  const doc = await Category.findOne({ value: category, isActive: true })
    .select('label subcategories.label subcategories.value')
    .lean();
  if (!doc) return priorityCategoryHub(category, subcategory)?.label || category;
  if (!subcategory) return doc.label || category;
  const sub = (doc.subcategories || []).find((item) => item.value === subcategory);
  return sub?.label || priorityCategoryHub(category, subcategory)?.label || subcategory;
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const day = todayAsuncion();
  const written = [];

  for (const key of PRIORITY_HUB_KEYS) {
    const priority = priorityCategoryHub(key.category, key.subcategory);
    if (!priority) continue;
    const stats = await statsFor(key.category, key.subcategory);
    const label = await labelFor(key.category, key.subcategory);
    const seoTitle = priority.seoTitle;
    const intro = priority.buildIntro({
      total: stats.count,
      minLabel: formatGuaranies(stats.minPrice),
      brands: stats.brands
    });

    await CategorySeo.findOneAndUpdate(
      { category: key.category, subcategory: key.subcategory || '' },
      {
        category: key.category,
        subcategory: key.subcategory || '',
        label,
        seoTitle,
        intro,
        productCount: stats.count,
        minPrice: stats.minPrice,
        maxPrice: stats.maxPrice,
        updatedOn: day
      },
      { upsert: true }
    );

    written.push({
      category: key.category,
      subcategory: key.subcategory || '',
      seoTitle,
      h1: priority.h1,
      productCount: stats.count,
      brands: stats.brands.slice(0, 4),
      intro: intro.slice(0, 120)
    });
  }

  console.log(JSON.stringify({ ok: true, updatedOn: day, hubs: written }, null, 2));
  await mongoose.disconnect();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
