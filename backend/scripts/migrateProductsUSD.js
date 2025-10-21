const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelos
const ProductModel = require('../models/productModel');
const ExchangeRateModel = require('../models/exchangeRateModel');

// Conectar a la base de datos
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    // console.log removed for production
  } catch (error) {
    // console.error removed for production
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
    // console.log removed for production

    // Obtener tipo de cambio actual
    const currentRate = await ExchangeRateModel.getCurrentRate('USD');
    const exchangeRate = currentRate.toPYG;
    // console.log removed for production

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

    // console.log removed for production

    if (productsToMigrate.length === 0) {
      // console.log removed for production
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
          // console.log removed for production
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
        
        // console.log removed for production
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
        // console.error removed for production
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
    // console.log removed for production
    // console.log removed for production
    // console.log removed for production
    // console.log removed for production
    // console.log removed for production
    // console.log removed for production

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
    // console.log removed for production

    // Mostrar productos migrados exitosamente
    const successfulMigrations = migrationResults.filter(r => r.status === 'migrated');
    if (successfulMigrations.length > 0) {
      // console.log removed for production
      successfulMigrations.forEach((result, index) => {
        // console.log removed for production
        console.log(`   - USD estimado: $${result.estimatedUSD.toFixed(2)}`);
        console.log(`   - Nuevo precio: ${result.newSellingPrice.toLocaleString()} Gs`);
      });
    }

    // Mostrar productos saltados
    const skippedProducts = migrationResults.filter(r => r.status === 'skipped');
    if (skippedProducts.length > 0) {
      // console.log removed for production
      skippedProducts.forEach((result, index) => {
        // console.log removed for production
      });
    }

    // Mostrar errores
    const errorProducts = migrationResults.filter(r => r.status === 'error');
    if (errorProducts.length > 0) {
      // console.log removed for production
      errorProducts.forEach((result, index) => {
        // console.log removed for production
      });
    }

    // console.log removed for production

  } catch (error) {
    // console.error removed for production
  } finally {
    await mongoose.disconnect();
    // console.log removed for production
  }
};

// Función para verificar productos antes de migrar
const previewMigration = async () => {
  try {
    // console.log removed for production

    const currentRate = await ExchangeRateModel.getCurrentRate('USD');
    const exchangeRate = currentRate.toPYG;
    // console.log removed for production

    const productsToMigrate = await ProductModel.find({
      $or: [
        { purchasePriceUSD: { $exists: false } },
        { purchasePriceUSD: { $lte: 0 } },
        { purchasePriceUSD: null }
      ],
      purchasePrice: { $exists: true, $gt: 0 },
      exchangeRate: { $exists: true, $gt: 0 }
    });

    // console.log removed for production

    if (productsToMigrate.length === 0) {
      // console.log removed for production
      return;
    }

    // Mostrar primeros 10 productos como ejemplo
    const sampleProducts = productsToMigrate.slice(0, 10);
    
    // console.log removed for production
    // console.log removed for production
    
    sampleProducts.forEach((product, index) => {
      const estimatedUSD = estimateUSD(product.purchasePrice, product.exchangeRate);
      const financialValues = calculateFinancialValues(product, exchangeRate);
      
      // console.log removed for production
      console.log(`   - Precio actual: ${product.purchasePrice?.toLocaleString()} Gs`);
      // console.log removed for production
      console.log(`   - USD estimado: $${estimatedUSD?.toFixed(2) || 'N/A'}`);
      if (financialValues) {
        console.log(`   - Nuevo precio venta: ${financialValues.sellingPrice.toLocaleString()} Gs`);
      }
      // console.log removed for production
    });

    if (productsToMigrate.length > 10) {
      // console.log removed for production
    }

    // console.log removed for production

  } catch (error) {
    // console.error removed for production
  } finally {
    await mongoose.disconnect();
  }
};

// Función para restaurar backup (si existe)
const restoreFromBackup = async (backupPath) => {
  try {
    // console.log removed for production
    
    const fs = require('fs');
    if (!fs.existsSync(backupPath)) {
      // console.log removed for production
      return;
    }

    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log(`📊 Backup creado: ${new Date(backupData.timestamp).toLocaleString()}`);
    // console.log removed for production

    // Aquí implementarías la lógica de restauración
    // console.log removed for production
    
  } catch (error) {
    // console.error removed for production
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
      // console.log removed for production
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
