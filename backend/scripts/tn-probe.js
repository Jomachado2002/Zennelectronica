'use strict';

require('dotenv').config();
const tn = require('../services/tiendaNaranjaClient');

(async () => {
  const info = tn.status();
  console.log(JSON.stringify({
    environment: info.environment,
    host: info.host,
    hasOauth: info.hasOauth,
    hasBearer: info.hasBearer,
    hasSellerLogin: info.hasSellerLogin,
    skuPrefix: info.skuPrefix || '(falta)',
    sellerId: info.sellerId || '(falta)',
    canCreate: info.canCreate
  }, null, 2));
  const staging = await tn.probeAuth('staging');
  const production = await tn.probeAuth('production');
  console.log(JSON.stringify({ staging, production }, null, 2));
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
