const mongoose = require('mongoose');
require('dotenv').config();

// Importar las funciones
const { recalculateProductPrices } = require('../controller/product/recalculatePrices');

async function testPriceRecalculation() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB conectado exitosamente');

    const newExchangeRate = 7600;
    
    console.log(`\n📊 Probando recálculo de precios con tipo de cambio: ${newExchangeRate}`);
    console.log('=' .repeat(60));

    // Simular actualización (dry run)
    console.log('\n🔍 SIMULACIÓN (dry run):');
    const simulationResults = await recalculateProductPrices(newExchangeRate, {
      updateProducts: false,
      dryRun: true
    });

    console.log('\n📈 Resultados de la simulación:');
    console.log(`   - Productos encontrados: ${simulationResults.totalProducts}`);
    console.log(`   - Aumentos de precio: ${simulationResults.priceIncreases}`);
    console.log(`   - Disminuciones de precio: ${simulationResults.priceDecreases}`);
    console.log(`   - Sin cambios: ${simulationResults.unchangedPrices}`);
    console.log(`   - Cambio promedio: ${simulationResults.averagePriceChange.toFixed(2)} PYG`);

    // Mostrar algunos ejemplos
    if (simulationResults.products.length > 0) {
      console.log('\n📋 Ejemplos de productos:');
      simulationResults.products.slice(0, 3).forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.productName}`);
        console.log(`      Código: ${product.codigo}`);
        console.log(`      Precio anterior: ${product.oldSellingPrice.toLocaleString()} PYG`);
        console.log(`      Precio nuevo: ${product.newSellingPrice.toLocaleString()} PYG`);
        console.log(`      Cambio: ${product.priceChange.toLocaleString()} PYG (${product.priceChangePercentage}%)`);
        console.log(`      Tipo: ${product.changeType}`);
        console.log('');
      });
    }

    // Preguntar si quiere aplicar la actualización
    console.log('¿Deseas aplicar la actualización real? (esto actualizará los productos en la BD)');
    console.log('Para aplicar, ejecuta: node scripts/applyPriceUpdate.js 7600');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

testPriceRecalculation();
