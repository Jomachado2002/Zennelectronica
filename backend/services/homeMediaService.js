'use strict';

const HomeBanner = require('../models/homeBannerModel');
const HomeCategoryTile = require('../models/homeCategoryTileModel');

const DEFAULT_TILES = [
  {
    key: 'notebooks',
    label: 'Notebooks',
    href: '/categoria-producto?category=notebook_y_computadoras&subcategory=notebook__20_03',
    order: 10,
    image: ''
  },
  {
    key: 'games',
    label: 'Games',
    href: '/categoria-producto?category=juegos_y_consolas',
    order: 20,
    image: ''
  },
  {
    key: 'informatica',
    label: 'Informática',
    href: '/categoria-producto?category=almacenamiento',
    order: 30,
    image: ''
  },
  {
    key: 'electronicos',
    label: 'Electrónicos',
    href: '/categoria-producto?category=celulares_y_tablets&subcategory=smartphones_y_celulares__32_01',
    order: 40,
    image: ''
  },
  {
    key: 'portatiles',
    label: 'Portátiles',
    href: '/categoria-producto?category=notebook_y_computadoras',
    order: 50,
    image: ''
  }
];

async function getActiveHomeBanners() {
  return HomeBanner.find({ enabled: true }).sort({ order: 1, createdAt: 1 }).lean();
}

async function getActiveHomeCategoryTiles() {
  let tiles = await HomeCategoryTile.find({ enabled: true })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  if (!tiles.length) {
    await seedHomeCategoryTiles();
    tiles = await HomeCategoryTile.find({ enabled: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();
  }
  return tiles;
}

async function listHomeBanners() {
  return HomeBanner.find({}).sort({ order: 1, createdAt: 1 }).lean();
}

async function listHomeCategoryTiles() {
  return HomeCategoryTile.find({}).sort({ order: 1, createdAt: 1 }).lean();
}

async function seedHomeCategoryTiles() {
  for (const t of DEFAULT_TILES) {
    await HomeCategoryTile.updateOne(
      { key: t.key },
      { $setOnInsert: { ...t, enabled: true } },
      { upsert: true }
    );
  }
  return listHomeCategoryTiles();
}

module.exports = {
  DEFAULT_TILES,
  getActiveHomeBanners,
  getActiveHomeCategoryTiles,
  listHomeBanners,
  listHomeCategoryTiles,
  seedHomeCategoryTiles
};
