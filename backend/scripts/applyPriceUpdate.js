const mongoose = require('mongoose');
require('dotenv').config();

// Importar las funciones
const { recalculateProductPrices } = require('../controller/product/recalculatePrices');

async function applyPriceUpdate() {
  try {
    const newExchangeRate = process.argv[2];
    
    if (!newExchangeRate || isNaN(newExchangeRate) || newExchangeRate <= 0) {
      console.log('❌ Uso: node scripts/applyPriceUpdate.js <nuevo_tipo_cambio>');
      console.log('   Ejemplo: node scripts/applyPriceUpdate.js 7600');
      process.exit(1);
    }

    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB conectado exitosamente');

    console.log(`\n💰 Aplicando actualización real de precios con tipo de cambio: ${newExchangeRate}`);
    console.log('=' .repeat(60));

    // Aplicar actualización real
    console.log('\n🚀 APLICANDO ACTUALIZACIÓN REAL:');
    const results = await recalculateProductPrices(parseFloat(newExchangeRate), {
      updateProducts: true,
      dryRun: false
    });

    console.log('\n📊 Resultados de la actualización:');
    console.log(`   - Productos procesados: ${results.totalProducts}`);
    console.log(`   - Productos actualizados: ${results.updatedProducts}`);
    console.log(`   - Aumentos de precio: ${results.priceIncreases}`);
    console.log(`   - Disminuciones de precio: ${results.priceDecreases}`);
    console.log(`   - Sin cambios: ${results.unchangedPrices}`);
    console.log(`   - Cambio promedio: ${results.averagePriceChange.toFixed(2)} PYG`);
    console.log(`   - Duración: ${results.updateDuration}ms`);

    if (results.errors.length > 0) {
      console.log('\n⚠️  Errores encontrados:');
      results.errors.forEach(error => {
        console.log(`   - ${error.productName}: ${error.error}`);
      });
    }

    console.log('\n✅ Actualización completada exitosamente');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

applyPriceUpdate();
