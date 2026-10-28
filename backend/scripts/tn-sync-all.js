'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/productModel');
const { runTnDaily } = require('../services/tiendaNaranjaSyncService');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  let round = 0;
  let empty = 0;
  while (empty < 3) {
    round += 1;
    const result = await runTnDaily({ limit: 20 });
    const left = await Product.countDocuments({
      stock: { $gt: 0 },
      codigo: { $exists: true, $nin: ['', null] },
      'productImage.0': { $exists: true, $ne: '' },
      $or: [
        { 'tiendaNaranja.lastSyncAt': { $exists: false } },
        { 'tiendaNaranja.lastSyncAt': null }
      ]
    });
    console.log(`[tn sync] ronda ${round} · ok ${result.ok} · fallidos ${result.failed} · faltan ${left}`);
    if (!result.ok) empty += 1;
    else empty = 0;
    if (left === 0) break;
  }
  await mongoose.disconnect();
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
