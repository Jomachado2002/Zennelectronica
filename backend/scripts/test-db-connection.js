#!/usr/bin/env node

/**
 * Script para verificar la conexión a la base de datos
 * 
 * Uso: node backend/scripts/test-db-connection.js
 */

const mongoose = require('mongoose');
const Category = require('../models/categoryModel');

// Configuración de base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://josiasnicolas02:jOSIASMACHADO2010@cluster0.870vw.mongodb.net/Eccomercejm?retryWrites=true&w=majority&appName=Cluster0';

/**
 * Función principal
 */
async function main() {
  try {
    console.log('═══════════════════════════════════════════════════');
    console.log('   TEST DE CONEXIÓN A MONGODB');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('🔄 Intentando conectar a MongoDB...');
    console.log(`📍 URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}\n`);

    // Intentar conectar
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // Timeout de 5 segundos
    });

    console.log('✅ Conexión exitosa a MongoDB\n');

    // Obtener información de la base de datos
    const dbName = mongoose.connection.db.databaseName;
    console.log(`📦 Base de datos: ${dbName}`);

    // Verificar categorías existentes
    console.log('\n🔍 Verificando categorías...');
    const categoriesCount = await Category.countDocuments();
    console.log(`   • Total de categorías: ${categoriesCount}`);

    if (categoriesCount > 0) {
      const categories = await Category.find({}, 'name label').limit(5);
      console.log('\n📁 Primeras categorías encontradas:');
      categories.forEach((cat, index) => {
        console.log(`   ${index + 1}. ${cat.label} (${cat.name})`);
      });

      if (categoriesCount > 5) {
        console.log(`   ... y ${categoriesCount - 5} más`);
      }
    } else {
      console.log('\n⚠️  No hay categorías en la base de datos.');
      console.log('   Ejecuta "npm run populate-categories" para poblar las categorías.');
    }

    // Obtener estadísticas de colecciones
    console.log('\n📊 Estadísticas de colecciones:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`   • ${collection.name}: ${count} documentos`);
    }

    // Cerrar conexión
    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada\n');

    console.log('═══════════════════════════════════════════════════');
    console.log('   ✨ TEST COMPLETADO EXITOSAMENTE ✨');
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error de conexión:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('\n💡 Sugerencias:');
      console.error('   1. Verifica que MongoDB esté corriendo');
      console.error('   2. Verifica la URI de conexión');
      console.error('   3. Verifica que tengas permisos de acceso');
      console.error('\n🔧 Para iniciar MongoDB:');
      console.error('   • macOS: brew services start mongodb-community');
      console.error('   • Linux: sudo systemctl start mongod');
      console.error('   • Windows: net start MongoDB\n');
    }

    await mongoose.connection.close();
    process.exit(1);
  }
}

// Ejecutar el script
main();

