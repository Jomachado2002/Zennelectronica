'use strict';

const fs = require('fs');
const path = require('path');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const TnCategoryMap = require('../models/tnCategoryMapModel');
const { tnCategoryOfHeuristic, DEFAULT_CATEGORY } = require('./tiendaNaranjaCategories');

const TREE_PATH = path.join(__dirname, '..', 'data', 'tienda-naranja-categorias.json');

let pathCache = { at: 0, map: new Map() };
let treeCache = { at: 0, paths: [] };

function keyOf(category, subcategory) {
  return `${String(category || '').trim()}||${String(subcategory || '').trim()}`;
}

async function loadPathCache(force = false) {
  if (!force && Date.now() - pathCache.at < 30_000 && pathCache.map.size) {
    return pathCache.map;
  }
  const rows = await TnCategoryMap.find({}).lean();
  const map = new Map();
  for (const row of rows) {
    map.set(keyOf(row.zennCategory, row.zennSubcategory), row);
  }
  pathCache = { at: Date.now(), map };
  return map;
}

function invalidateCache() {
  pathCache = { at: 0, map: new Map() };
}

function flattenTnTree(node, trail = [], out = []) {
  if (!node || typeof node !== 'object') return out;
  const name = String(node.name || '').trim();
  const next = name && name !== 'Default Category' ? [...trail, name] : [...trail];
  const kids = Array.isArray(node.children) ? node.children : [];
  if (!kids.length && next.length >= 1) {
    // Pad to 3 levels for Excel (Padre;Hijo;Nieto)
    const a = next[0] || 'Tecnología e Informática';
    const b = next[1] || next[0] || a;
    const c = next[2] || next[1] || next[0] || a;
    out.push({
      id: node.id != null ? String(node.id) : '',
      path: `${a};${b};${c}`,
      depth: next.length,
      label: next.join(' › ')
    });
  }
  for (const child of kids) flattenTnTree(child, next, out);
  return out;
}

function listTnCategoryPaths({ force = false } = {}) {
  if (!force && Date.now() - treeCache.at < 60_000 && treeCache.paths.length) {
    return treeCache.paths;
  }
  let root;
  try {
    root = JSON.parse(fs.readFileSync(TREE_PATH, 'utf8'));
  } catch {
    root = null;
  }
  const paths = root ? flattenTnTree(root) : [];
  // Unique by path string
  const seen = new Set();
  const unique = [];
  for (const item of paths) {
    if (seen.has(item.path)) continue;
    seen.add(item.path);
    unique.push(item);
  }
  unique.sort((a, b) => a.path.localeCompare(b.path, 'es'));
  treeCache = { at: Date.now(), paths: unique };
  return unique;
}

async function resolveTnPath(product) {
  const map = await loadPathCache();
  const hit = map.get(keyOf(product.category, product.subcategory));
  if (hit && hit.tnPath) return hit.tnPath;
  return tnCategoryOfHeuristic(product) || DEFAULT_CATEGORY;
}

async function listZennPairs() {
  const counts = await Product.aggregate([
    {
      $match: {
        category: { $exists: true, $nin: ['', null] }
      }
    },
    {
      $group: {
        _id: { c: '$category', s: '$subcategory' },
        n: { $sum: 1 }
      }
    },
    { $sort: { n: -1 } }
  ]);

  const categories = await Category.find({}).select('name label value subcategories').lean();
  const labelOf = new Map();
  for (const cat of categories) {
    labelOf.set(String(cat.value || ''), {
      label: cat.label || cat.name || cat.value,
      subs: new Map(
        (cat.subcategories || []).map((sub) => [
          String(sub.value || ''),
          sub.label || sub.name || sub.value
        ])
      )
    });
  }

  const map = await loadPathCache();
  return counts.map((row) => {
    const zennCategory = String(row._id.c || '');
    const zennSubcategory = String(row._id.s || '');
    const meta = labelOf.get(zennCategory);
    const mapped = map.get(keyOf(zennCategory, zennSubcategory));
    const sample = {
      category: zennCategory,
      subcategory: zennSubcategory,
      productName: ''
    };
    return {
      zennCategory,
      zennSubcategory,
      zennCategoryLabel: (meta && meta.label) || zennCategory,
      zennSubcategoryLabel: (meta && meta.subs.get(zennSubcategory)) || zennSubcategory,
      productCount: row.n,
      tnPath: mapped ? mapped.tnPath : '',
      suggestedTnPath: tnCategoryOfHeuristic(sample) || DEFAULT_CATEGORY,
      mapped: Boolean(mapped && mapped.tnPath),
      mapId: mapped ? String(mapped._id) : null
    };
  });
}

async function upsertMap({
  zennCategory,
  zennSubcategory = '',
  tnPath,
  zennCategoryLabel = '',
  zennSubcategoryLabel = '',
  tnCategoryIds,
  source = 'manual',
  productCount
} = {}) {
  const cat = String(zennCategory || '').trim();
  const sub = String(zennSubcategory || '').trim();
  const pathTn = String(tnPath || '').trim();
  if (!cat || !pathTn) {
    const error = new Error('Faltan zennCategory o tnPath');
    error.status = 400;
    throw error;
  }
  const update = {
    zennCategory: cat,
    zennSubcategory: sub,
    tnPath: pathTn,
    source,
    zennCategoryLabel: zennCategoryLabel || cat,
    zennSubcategoryLabel: zennSubcategoryLabel || sub
  };
  if (Array.isArray(tnCategoryIds) && tnCategoryIds.length) {
    update.tnCategoryIds = tnCategoryIds.map(String);
  }
  if (Number.isFinite(Number(productCount))) update.productCount = Number(productCount);

  const doc = await TnCategoryMap.findOneAndUpdate(
    { zennCategory: cat, zennSubcategory: sub },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  invalidateCache();
  return doc;
}

async function deleteMap(id) {
  await TnCategoryMap.deleteOne({ _id: id });
  invalidateCache();
}

/**
 * Siembra la tabla con la heurística actual para todos los pares Zenn usados.
 * No pisa filas manuales (source=manual) salvo force=true.
 */
async function seedFromHeuristic({ force = false } = {}) {
  const pairs = await listZennPairs();
  let created = 0;
  let updated = 0;
  let kept = 0;
  for (const pair of pairs) {
    const existing = await TnCategoryMap.findOne({
      zennCategory: pair.zennCategory,
      zennSubcategory: pair.zennSubcategory
    }).lean();
    if (existing && existing.source === 'manual' && !force) {
      kept += 1;
      await TnCategoryMap.updateOne(
        { _id: existing._id },
        { $set: { productCount: pair.productCount } }
      );
      continue;
    }
    const doc = await upsertMap({
      zennCategory: pair.zennCategory,
      zennSubcategory: pair.zennSubcategory,
      zennCategoryLabel: pair.zennCategoryLabel,
      zennSubcategoryLabel: pair.zennSubcategoryLabel,
      tnPath: pair.suggestedTnPath || DEFAULT_CATEGORY,
      productCount: pair.productCount,
      source: existing && existing.source === 'manual' ? 'manual' : 'seed'
    });
    if (existing) updated += 1;
    else if (doc) created += 1;
  }
  invalidateCache();
  return { created, updated, kept, total: pairs.length };
}

module.exports = {
  DEFAULT_CATEGORY,
  keyOf,
  loadPathCache,
  invalidateCache,
  listTnCategoryPaths,
  resolveTnPath,
  listZennPairs,
  upsertMap,
  deleteMap,
  seedFromHeuristic
};
