const mongoose = require('mongoose');
require('dotenv').config();

// Importar las funciones
const { recalculateProductPrices } = require('../controller/product/recalculatePrices');

async function testPriceRecalculation() {
  try {
    // console.log removed for production
    await mongoose.connect(process.env.MONGODB_URI);
    // console.log removed for production

    const newExchangeRate = 7600;
    
    // console.log removed for production
    console.log('=' .repeat(60));

    // Simular actualización (dry run)
    console.log('\n🔍 SIMULACIÓN (dry run):');
    const simulationResults = await recalculateProductPrices(newExchangeRate, {
      updateProducts: false,
      dryRun: true
    });

    // console.log removed for production
    // console.log removed for production
    // console.log removed for production
    // console.log removed for production
    // console.log removed for production
    console.log(`   - Cambio promedio: ${simulationResults.averagePriceChange.toFixed(2)} PYG`);

    // Mostrar algunos ejemplos
    if (simulationResults.products.length > 0) {
      // console.log removed for production
      simulationResults.products.slice(0, 3).forEach((product, index) => {
        // console.log removed for production
        // console.log removed for production
        console.log(`      Precio anterior: ${product.oldSellingPrice.toLocaleString()} PYG`);
        console.log(`      Precio nuevo: ${product.newSellingPrice.toLocaleString()} PYG`);
        console.log(`      Cambio: ${product.priceChange.toLocaleString()} PYG (${product.priceChangePercentage}%)`);
        // console.log removed for production
        // console.log removed for production
      });
    }

    // Preguntar si quiere aplicar la actualización
    console.log('¿Deseas aplicar la actualización real? (esto actualizará los productos en la BD)');
    // console.log removed for production

  } catch (error) {
    // console.error removed for production
  } finally {
    await mongoose.connection.close();
    // console.log removed for production
  }
}

testPriceRecalculation();
