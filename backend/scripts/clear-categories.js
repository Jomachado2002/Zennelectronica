#!/usr/bin/env node

/**
 * Script para limpiar/eliminar todas las categorías de la base de datos
 * 
 * ⚠️ ADVERTENCIA: Este script elimina TODAS las categorías de la base de datos.
 * Usar con precaución, preferiblemente solo en desarrollo.
 * 
 * Uso: node backend/scripts/clear-categories.js
 */

const mongoose = require('mongoose');
const Category = require('../models/categoryModel');
const readline = require('readline');

// Configuración de base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://josiasnicolas02:jOSIASMACHADO2010@cluster0.870vw.mongodb.net/Eccomercejm?retryWrites=true&w=majority&appName=Cluster0';

// Configurar readline para confirmar la acción
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Conectar a la base de datos
 */
async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB exitosamente');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    throw error;
  }
}

/**
 * Mostrar estadísticas antes de eliminar
 */
async function showStatistics() {
  try {
    const categories = await Category.find({});
    console.log('\n📊 ESTADÍSTICAS ACTUALES:');
    console.log(`   • Total de categorías: ${categories.length}`);
    
    let totalSubcategories = 0;
    let totalSpecifications = 0;

    categories.forEach(category => {
      totalSubcategories += category.subcategories.length;
      category.subcategories.forEach(subcategory => {
        totalSpecifications += subcategory.specifications.length;
      });
    });

    console.log(`   • Total de subcategorías: ${totalSubcategories}`);
    console.log(`   • Total de especificaciones: ${totalSpecifications}`);
    console.log('\n📁 CATEGORÍAS A ELIMINAR:');
    
    categories.forEach((category, index) => {
      console.log(`   ${index + 1}. ${category.label} (${category.subcategories.length} subcategorías)`);
    });

    return categories.length;
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error.message);
    throw error;
  }
}

/**
 * Preguntar confirmación al usuario
 */
function askConfirmation() {
  return new Promise((resolve) => {
    rl.question('\n⚠️  ¿Estás seguro de que deseas eliminar TODAS las categorías? (escriba "SI" para confirmar): ', (answer) => {
      resolve(answer.trim().toUpperCase() === 'SI');
    });
  });
}

/**
 * Eliminar todas las categorías
 */
async function clearCategories() {
  try {
    const result = await Category.deleteMany({});
    console.log(`\n✅ Se eliminaron ${result.deletedCount} categorías exitosamente`);
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Error eliminando categorías:', error.message);
    throw error;
  }
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log('═══════════════════════════════════════════════════');
    console.log('   SCRIPT DE LIMPIEZA DE CATEGORÍAS');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('⚠️  ADVERTENCIA: Este script eliminará TODAS las categorías de la base de datos.');
    console.log('⚠️  Esta acción NO se puede deshacer.\n');

    // Conectar a la base de datos
    await connectToDatabase();

    // Mostrar estadísticas
    const totalCategories = await showStatistics();

    if (totalCategories === 0) {
      console.log('\n✅ No hay categorías para eliminar. La base de datos ya está limpia.\n');
      rl.close();
      await mongoose.connection.close();
      process.exit(0);
    }

    // Pedir confirmación
    const confirmed = await askConfirmation();
    rl.close();

    if (!confirmed) {
      console.log('\n❌ Operación cancelada por el usuario.\n');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Eliminar categorías
    console.log('\n🔄 Eliminando categorías...');
    await clearCategories();

    // Verificar que se eliminaron
    const remaining = await Category.countDocuments();
    if (remaining === 0) {
      console.log('✅ Base de datos limpiada exitosamente. No quedan categorías.\n');
    } else {
      console.log(`⚠️  Advertencia: Aún quedan ${remaining} categorías en la base de datos.\n`);
    }

    // Cerrar conexión
    await mongoose.connection.close();
    console.log('✅ Conexión a MongoDB cerrada\n');

    console.log('═══════════════════════════════════════════════════');
    console.log('   ✨ SCRIPT COMPLETADO ✨');
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error ejecutando el script:', error);
    rl.close();
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Ejecutar el script
main();

