const mongoose = require('mongoose');
require('dotenv').config();

// Importar las funciones
const { recalculateProductPrices } = require('../controller/product/recalculatePrices');

async function applyPriceUpdate() {
  try {
    const newExchangeRate = process.argv[2];
    
    if (!newExchangeRate || isNaN(newExchangeRate) || newExchangeRate <= 0) {
      // console.log removed for production
      // console.log removed for production
      process.exit(1);
    }

    // console.log removed for production
    await mongoose.connect(process.env.MONGODB_URI);
    // console.log removed for production

    // console.log removed for production
    console.log('=' .repeat(60));

    // Aplicar actualización real
    // console.log removed for production
    const results = await recalculateProductPrices(parseFloat(newExchangeRate), {
      updateProducts: true,
      dryRun: false
    });

    // console.log removed for production
    // console.log removed for production
    // console.log removed for production
    // console.log removed for production
    // console.log removed for production
    // console.log removed for production
    console.log(`   - Cambio promedio: ${results.averagePriceChange.toFixed(2)} PYG`);
    // console.log removed for production

    if (results.errors.length > 0) {
      // console.log removed for production
      results.errors.forEach(error => {
        // console.log removed for production
      });
    }

    // console.log removed for production

  } catch (error) {
    // console.error removed for production
  } finally {
    await mongoose.connection.close();
    // console.log removed for production
  }
}

applyPriceUpdate();
