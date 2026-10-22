'use strict';

const productModel = require('../models/productModel');
const Category = require('../models/categoryModel');
const CategorySeo = require('../models/categorySeoModel');
const { formatGuaranies } = require('./productSearchCopy');

const HUBS_PER_RUN = 3;

const HEAD_ORDER = ['notebooks', 'auriculares', 'adaptadores', 'celulares', 'smartphones', 'monitores'];

function searchLabel(label) {
  const text = String(label || '').trim();
  if (/^notebook$/i.test(text)) return 'Notebooks';
  if (/^auriculares y accesorios$/i.test(text)) return 'Auriculares';
  if (/^adaptadores$/i.test(text)) return 'Adaptadores';
  if (/^smartphones y celulares$/i.test(text)) return 'Celulares';
  if (/^monitores$/i.test(text)) return 'Monitores';
  return text;
}

function headRank(label) {
  const text = searchLabel(label).toLowerCase();
  const index = HEAD_ORDER.indexOf(text);
  return index === -1 ? 99 : index;
}

function humanize(value) {
  return String(value || '')
    .replace(/__[\d_]+$/g, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clip(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1).replace(/\s+\S*$/, '').trim();
  return cut.length > 20 ? cut : text.slice(0, max).trim();
}

function localHub(row) {
  const phrase = searchLabel(row.label);
  const min = formatGuaranies(row.minPrice);
  return {
    seoTitle: clip(`${phrase} en Paraguay`, 60),
    intro: clip(
      `Hay ${row.count} ${phrase.toLowerCase()} con stock en Zenn, desde ${min}. Envío a Asunción y todo Paraguay.`,
      240
    )
  };
}

async function labelMap() {
  const rows = await Category.find({ isActive: true }).select('label value subcategories.label subcategories.value').lean();
  const map = new Map();
  for (const row of rows) {
    map.set(`${row.value}::`, row.label || humanize(row.value));
    for (const sub of row.subcategories || []) {
      map.set(`${row.value}::${sub.value}`, sub.label || humanize(sub.value));
    }
  }
  return map;
}

async function groupedProducts(limit) {
  const pipeline = [
    { $match: { stock: { $gt: 0 }, sellingPrice: { $gt: 0 }, category: { $nin: ['', null] } } },
    {
      $group: {
        _id: { category: '$category', subcategory: '$subcategory' },
        count: { $sum: 1 },
        minPrice: { $min: '$sellingPrice' },
        maxPrice: { $max: '$sellingPrice' }
      }
    },
    { $match: { count: { $gte: 4 } } },
    { $sort: { count: -1 } }
  ];
  if (limit) pipeline.push({ $limit: limit });
  const grouped = await productModel.aggregate(pipeline);
  const labels = await labelMap();
  return grouped
    .map((row) => {
      const category = row._id.category || '';
      const subcategory = row._id.subcategory || '';
      const label = labels.get(`${category}::${subcategory}`) || humanize(subcategory) || labels.get(`${category}::`) || humanize(category);
      return {
        category,
        subcategory,
        label,
        count: row.count,
        minPrice: row.minPrice,
        maxPrice: row.maxPrice
      };
    })
    .filter((row) => row.label && row.label.length > 2);
}

async function candidates() {
  const rows = await groupedProducts(80);
  const existing = await CategorySeo.find().select('category subcategory updatedOn').lean();
  const fresh = new Set(
    existing
      .filter((row) => row.updatedOn && Date.now() - new Date(`${row.updatedOn}T00:00:00-03:00`).getTime() < 20 * 86400000)
      .map((row) => `${row.category}::${row.subcategory || ''}`)
  );

  return rows
    .filter((row) => {
      if (fresh.has(`${row.category}::${row.subcategory}`)) return false;
      return headRank(row.label) < 99 ? row.count >= 4 : row.count >= 12;
    })
    .sort((a, b) => headRank(a.label) - headRank(b.label) || b.count - a.count)
    .slice(0, HUBS_PER_RUN);
}

async function saveHub(row, day) {
  const { seoTitle, intro } = localHub(row);
  await CategorySeo.findOneAndUpdate(
    { category: row.category, subcategory: row.subcategory },
    {
      category: row.category,
      subcategory: row.subcategory,
      label: row.label,
      seoTitle,
      intro,
      productCount: row.count,
      minPrice: row.minPrice,
      maxPrice: row.maxPrice,
      updatedOn: day
    },
    { upsert: true }
  );
  return { label: row.label, seoTitle, intro, productCount: row.count, category: row.category, subcategory: row.subcategory };
}

async function refreshCategoryHubs(day) {
  const rows = await candidates();
  const written = [];
  for (const row of rows) {
    try {
      written.push(await saveHub(row, day));
    } catch (error) {
      written.push({ label: row.label, error: error.message });
    }
  }
  return written;
}

async function fillAllFromProducts(day) {
  const rows = await groupedProducts();
  const written = [];
  for (const row of rows) written.push(await saveHub(row, day));
  return written;
}

async function readCategoryHub(category, subcategory) {
  if (!category) return null;
  return CategorySeo.findOne({ category, subcategory: subcategory || '' }).lean();
}

module.exports = {
  refreshCategoryHubs,
  fillAllFromProducts,
  readCategoryHub
};
