'use strict';

/**
 * Carga departamentos y ciudades de Paraguay en Mongo.
 *   node scripts/seed-paraguay-places.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ParaguayPlace = require('../models/paraguayPlaceModel');
const { buildParaguayPlaceDocs } = require('../data/paraguayPlacesSeed');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const docs = buildParaguayPlaceDocs();
  let upserted = 0;
  for (const doc of docs) {
    await ParaguayPlace.findOneAndUpdate({ slug: doc.slug }, { $set: doc }, { upsert: true });
    upserted += 1;
  }
  const counts = await ParaguayPlace.aggregate([
    { $group: { _id: '$placeType', n: { $sum: 1 } } }
  ]);
  console.log(JSON.stringify({ ok: true, upserted, counts }, null, 2));
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
