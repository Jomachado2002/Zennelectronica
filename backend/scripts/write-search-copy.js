'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const productModel = require('../models/productModel');
const { writeProductSearchCopy } = require('../services/productSearchCopy');

const SLUGS = [
  'placa-madre-msi-b550-gaming-wi-fi-6e-socket-am4-ddr4',
  'calculadora-cientifica-casio-fx-991la-cw-negro',
  'control-redragon-g832-kaiser-para-android-pc-ps5-wireless-negro',
  'impresora-3d-bambu-lab-p2s-pf004-usa007-combo-ams-multi-color-600mms-110v-gris',
  'patineta-eletrico-hye-x10pro-11-negro',
  'disco-duro-toshiba-1tb-35-sata-3-7200rpm-dt01aca100',
  'mini-pc-nvidia-dgx-spark-bundle-gb10-grace-20-nucleos-arm-128gb-de-ram-1tb-ssd-kit-con-2',
  'celular-realme-p4-power-5g-rmx5107-8gb-de-ram-256gb-pantalla-68-dual-sim-5g-power-plata-an',
  'notebook-hp-15-fc0235dx-amd-ryzen-7-7730u-pantalla-touch-full-hd-156-16gb-de-ram-512gb-ssd',
  'notebook-gamer-alienware-15-lda15260-7823blk-pus-intel-core-7-240h-pantalla-wuxga-153-16gb',
  'consola-portatil-game-smartfy-gp01t-64gb-blanco'
];

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI');
  await mongoose.connect(process.env.MONGODB_URI);
  let saved = 0;
  for (const slug of SLUGS) {
    const product = await productModel.findOne({ slug }).select('productName sellingPrice seoDescription').lean();
    if (!product) {
      console.log('miss', slug);
      continue;
    }
    try {
      const description = await writeProductSearchCopy(product);
      if (!description) {
        console.log('skip', slug);
        continue;
      }
      await productModel.updateOne({ _id: product._id }, { $set: { seoDescription: description } });
      saved += 1;
      console.log('ok', slug, description);
    } catch (error) {
      console.log('fail', slug, error.message);
    }
  }
  console.log('saved', saved);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
