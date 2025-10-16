const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelos
const ProductModel = require('../models/productModel');
const ExchangeRateModel = require('../models/exchangeRateModel');

// Conectar a la base de datos
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

// Función para estimar USD basado en purchasePrice y exchangeRate
const estimateUSD = (purchasePrice, exchangeRate) => {
  if (!purchasePrice || !exchangeRate || exchangeRate === 0) return null;
  return purchasePrice / exchangeRate;
};

// Función para calcular nuevos valores financieros
const calculateFinancialValues = (product, newExchangeRate) => {
  const purchasePriceUSD = product.purchasePriceUSD || estimateUSD(product.purchasePrice, product.exchangeRate);
  
  if (!purchasePriceUSD || purchasePriceUSD <= 0) {
    return null;
  }

  const newPurchasePrice = purchasePriceUSD * newExchangeRate;
  const interestAmount = newPurchasePrice * ((product.loanInterest || 15) / 100);
  const totalCost = newPurchasePrice + interestAmount + (product.deliveryCost || 0);
  const newSellingPrice = totalCost * (1 + (product.profitMargin || 30) / 100);

  return {
    purchasePriceUSD,
    exchangeRate: newExchangeRate,
    purchasePrice: newPurchasePrice,
    sellingPrice: Math.round(newSellingPrice),
    profitAmount: Math.round(newSellingPrice - totalCost),
    lastUpdatedFinance: new Date()
  };
};

// Función principal de migración
const migrateProductsUSD = async () => {
  try {
    console.log('🚀 Iniciando migración de productos sin purchasePriceUSD...\n');

    // Obtener tipo de cambio actual
    const currentRate = await ExchangeRateModel.getCurrentRate('USD');
    const exchangeRate = currentRate.toPYG;
    console.log(`📊 Tipo de cambio actual: ${exchangeRate} Gs\n`);

    // Buscar productos sin purchasePriceUSD pero con purchasePrice y exchangeRate
    const productsToMigrate = await ProductModel.find({
      $or: [
        { purchasePriceUSD: { $exists: false } },
        { purchasePriceUSD: { $lte: 0 } },
        { purchasePriceUSD: null }
      ],
      purchasePrice: { $exists: true, $gt: 0 },
      exchangeRate: { $exists: true, $gt: 0 }
    });

    console.log(`📦 Productos encontrados para migración: ${productsToMigrate.length}\n`);

    if (productsToMigrate.length === 0) {
      console.log('✅ No hay productos que necesiten migración');
      return;
    }

    // Estadísticas
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const migrationResults = [];

    // Procesar cada producto
    for (const product of productsToMigrate) {
      try {
        console.log(`🔄 Procesando: ${product.productName} (ID: ${product._id})`);
        
        // Calcular valores financieros
        const financialValues = calculateFinancialValues(product, exchangeRate);
        
        if (!financialValues) {
          console.log(`⚠️  Saltando: No se puede calcular USD para ${product.productName}`);
          skippedCount++;
          migrationResults.push({
            productId: product._id,
            productName: product.productName,
            status: 'skipped',
            reason: 'No se puede calcular USD'
          });
          continue;
        }

        // Actualizar producto
        await ProductModel.findByIdAndUpdate(product._id, financialValues);
        
        console.log(`✅ Migrado: ${product.productName}`);
        console.log(`   - USD estimado: $${financialValues.purchasePriceUSD.toFixed(2)}`);
        console.log(`   - Precio PYG: ${financialValues.purchasePrice.toLocaleString()} Gs`);
        console.log(`   - Precio venta: ${financialValues.sellingPrice.toLocaleString()} Gs\n`);
        
        migratedCount++;
        migrationResults.push({
          productId: product._id,
          productName: product.productName,
          status: 'migrated',
          estimatedUSD: financialValues.purchasePriceUSD,
          newSellingPrice: financialValues.sellingPrice
        });

      } catch (error) {
        console.error(`❌ Error procesando ${product.productName}:`, error.message);
        errorCount++;
        migrationResults.push({
          productId: product._id,
          productName: product.productName,
          status: 'error',
          error: error.message
        });
      }
    }

    // Generar reporte
    console.log('\n📊 REPORTE DE MIGRACIÓN');
    console.log('========================');
    console.log(`✅ Productos migrados: ${migratedCount}`);
    console.log(`⚠️  Productos saltados: ${skippedCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📦 Total procesados: ${productsToMigrate.length}`);

    // Guardar reporte detallado
    const reportData = {
      timestamp: new Date(),
      exchangeRate,
      totalProducts: productsToMigrate.length,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errorCount,
      results: migrationResults
    };

    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(__dirname, `../temp/migration-report-${Date.now()}.json`);
    
    // Crear directorio temp si no existe
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n📄 Reporte detallado guardado en: ${reportPath}`);

    // Mostrar productos migrados exitosamente
    const successfulMigrations = migrationResults.filter(r => r.status === 'migrated');
    if (successfulMigrations.length > 0) {
      console.log('\n✅ PRODUCTOS MIGRADOS EXITOSAMENTE:');
      successfulMigrations.forEach((result, index) => {
        console.log(`${index + 1}. ${result.productName}`);
        console.log(`   - USD estimado: $${result.estimatedUSD.toFixed(2)}`);
        console.log(`   - Nuevo precio: ${result.newSellingPrice.toLocaleString()} Gs`);
      });
    }

    // Mostrar productos saltados
    const skippedProducts = migrationResults.filter(r => r.status === 'skipped');
    if (skippedProducts.length > 0) {
      console.log('\n⚠️  PRODUCTOS SALTADOS:');
      skippedProducts.forEach((result, index) => {
        console.log(`${index + 1}. ${result.productName} - ${result.reason}`);
      });
    }

    // Mostrar errores
    const errorProducts = migrationResults.filter(r => r.status === 'error');
    if (errorProducts.length > 0) {
      console.log('\n❌ ERRORES:');
      errorProducts.forEach((result, index) => {
        console.log(`${index + 1}. ${result.productName} - ${result.error}`);
      });
    }

    console.log('\n🎉 Migración completada!');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
};

// Función para verificar productos antes de migrar
const previewMigration = async () => {
  try {
    console.log('🔍 Vista previa de la migración...\n');

    const currentRate = await ExchangeRateModel.getCurrentRate('USD');
    const exchangeRate = currentRate.toPYG;
    console.log(`📊 Tipo de cambio actual: ${exchangeRate} Gs\n`);

    const productsToMigrate = await ProductModel.find({
      $or: [
        { purchasePriceUSD: { $exists: false } },
        { purchasePriceUSD: { $lte: 0 } },
        { purchasePriceUSD: null }
      ],
      purchasePrice: { $exists: true, $gt: 0 },
      exchangeRate: { $exists: true, $gt: 0 }
    });

    console.log(`📦 Productos que serían migrados: ${productsToMigrate.length}\n`);

    if (productsToMigrate.length === 0) {
      console.log('✅ No hay productos que necesiten migración');
      return;
    }

    // Mostrar primeros 10 productos como ejemplo
    const sampleProducts = productsToMigrate.slice(0, 10);
    
    console.log('📋 MUESTRA DE PRODUCTOS A MIGRAR:');
    console.log('==================================');
    
    sampleProducts.forEach((product, index) => {
      const estimatedUSD = estimateUSD(product.purchasePrice, product.exchangeRate);
      const financialValues = calculateFinancialValues(product, exchangeRate);
      
      console.log(`${index + 1}. ${product.productName}`);
      console.log(`   - Precio actual: ${product.purchasePrice?.toLocaleString()} Gs`);
      console.log(`   - Exchange rate: ${product.exchangeRate} Gs`);
      console.log(`   - USD estimado: $${estimatedUSD?.toFixed(2) || 'N/A'}`);
      if (financialValues) {
        console.log(`   - Nuevo precio venta: ${financialValues.sellingPrice.toLocaleString()} Gs`);
      }
      console.log('');
    });

    if (productsToMigrate.length > 10) {
      console.log(`... y ${productsToMigrate.length - 10} productos más\n`);
    }

    console.log('💡 Para ejecutar la migración, ejecute: node migrateProductsUSD.js --migrate');

  } catch (error) {
    console.error('❌ Error en vista previa:', error);
  } finally {
    await mongoose.disconnect();
  }
};

// Función para restaurar backup (si existe)
const restoreFromBackup = async (backupPath) => {
  try {
    console.log(`🔄 Restaurando desde backup: ${backupPath}`);
    
    const fs = require('fs');
    if (!fs.existsSync(backupPath)) {
      console.log('❌ Archivo de backup no encontrado');
      return;
    }

    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log(`📊 Backup creado: ${new Date(backupData.timestamp).toLocaleString()}`);
    console.log(`📦 Productos en backup: ${backupData.products.length}`);

    // Aquí implementarías la lógica de restauración
    console.log('⚠️  Función de restauración no implementada aún');
    
  } catch (error) {
    console.error('❌ Error restaurando backup:', error);
  }
};

// Función principal
const main = async () => {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔧 Script de Migración de Productos USD

Uso:
  node migrateProductsUSD.js [opciones]

Opciones:
  --preview, -p     Vista previa de la migración (por defecto)
  --migrate, -m     Ejecutar migración real
  --restore, -r     Restaurar desde backup
  --help, -h        Mostrar esta ayuda

Ejemplos:
  node migrateProductsUSD.js --preview
  node migrateProductsUSD.js --migrate
  node migrateProductsUSD.js --restore backup.json
    `);
    return;
  }

  await connectDB();

  if (args.includes('--migrate') || args.includes('-m')) {
    await migrateProductsUSD();
  } else if (args.includes('--restore') || args.includes('-r')) {
    const backupPath = args[args.indexOf('--restore') + 1] || args[args.indexOf('-r') + 1];
    if (!backupPath) {
      console.log('❌ Debe especificar la ruta del backup');
      return;
    }
    await restoreFromBackup(backupPath);
  } else {
    await previewMigration();
  }
};

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  migrateProductsUSD,
  previewMigration,
  estimateUSD,
  calculateFinancialValues
};
