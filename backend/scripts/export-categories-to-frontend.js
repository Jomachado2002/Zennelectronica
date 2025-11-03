#!/usr/bin/env node

/**
 * Script para exportar categorías de la BD al formato del frontend
 * 
 * Este script:
 * 1. Lee las categorías desde MongoDB
 * 2. Las convierte al formato del frontend (sin especificaciones)
 * 3. Actualiza el archivo frontend/src/helpers/productCategory.js
 * 
 * Uso: node backend/scripts/export-categories-to-frontend.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Category = require('../models/categoryModel');

// Configuración de base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://josiasnicolas02:jOSIASMACHADO2010@cluster0.870vw.mongodb.net/Eccomercejm?retryWrites=true&w=majority&appName=Cluster0';

/**
 * Conectar a la base de datos
 */
async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB exitosamente');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    throw error;
  }
}

/**
 * Extraer categorías de la base de datos
 */
async function extractCategories() {
  try {
    console.log('\n🔄 Extrayendo categorías desde la base de datos...\n');

    const categories = await Category.find({}).sort({ order: 1, createdAt: 1 }).lean();
    
    if (categories.length === 0) {
      console.log('⚠️  No hay categorías en la base de datos para exportar.');
      return null;
    }

    console.log(`✅ Se encontraron ${categories.length} categorías\n`);

    return categories;
  } catch (error) {
    console.error('❌ Error extrayendo categorías:', error.message);
    throw error;
  }
}

/**
 * Orden preferido de categorías (las nuevas se agregarán al final)
 */
const PREFERRED_ORDER = [
  'informatica',
  'perifericos',
  'electronicos',
  'cctv',
  'electrodomesticos'
];

/**
 * Ordenar categorías según el orden preferido
 */
function sortCategoriesByPreferredOrder(categories) {
  // Crear un mapa para búsqueda rápida
  const categoryMap = new Map(categories.map(cat => [cat.value, cat]));
  
  // Primero agregar las categorías en el orden preferido
  const sortedCategories = [];
  
  PREFERRED_ORDER.forEach(categoryValue => {
    if (categoryMap.has(categoryValue)) {
      sortedCategories.push(categoryMap.get(categoryValue));
      categoryMap.delete(categoryValue); // Eliminar para no duplicar
    }
  });
  
  // Agregar el resto de categorías al final (las nuevas)
  categoryMap.forEach(category => {
    sortedCategories.push(category);
  });
  
  return sortedCategories;
}

/**
 * Convertir categorías al formato del frontend
 * (solo categorías y subcategorías, sin especificaciones)
 */
function convertToFrontendFormat(categories) {
  let categoryId = 1;
  let subcategoryId = 1;

  // Primero ordenar según el orden preferido
  const sortedCategories = sortCategoriesByPreferredOrder(categories);

  return sortedCategories.map(category => {
    const frontendCategory = {
      id: categoryId++,
      value: category.value,
      label: category.label
    };

    if (category.subcategories && category.subcategories.length > 0) {
      frontendCategory.subcategories = category.subcategories.map(sub => ({
        id: subcategoryId++,
        value: sub.value,
        label: sub.label
      }));
    }

    return frontendCategory;
  });
}

/**
 * Generar código JavaScript para el frontend
 */
function generateFrontendCode(categories) {
  const formattedCategories = JSON.stringify(categories, null, 2)
    // Agregar comentarios para mejor legibilidad
    .replace(/"id":/g, 'id:')
    .replace(/"value":/g, 'value:')
    .replace(/"label":/g, 'label:')
    .replace(/"subcategories":/g, 'subcategories:');

  const code = `// frontend/src/helpers/productCategory.js
// Categorías generadas automáticamente desde la base de datos
// Fecha de generación: ${new Date().toISOString()}
// Total de categorías: ${categories.length}
//
// ORDEN PREFERIDO: informatica, perifericos, electronicos, cctv, electrodomesticos
// Las nuevas categorías se agregan automáticamente al final

const productCategory = ${formattedCategories};

export default productCategory;
`;

  return code;
}

/**
 * Mostrar resumen de las categorías exportadas
 */
function showSummary(categories) {
  console.log('📊 RESUMEN DE CATEGORÍAS PARA FRONTEND:\n');
  
  let totalSubcategories = 0;
  let newCategoriesCount = 0;

  categories.forEach((category, index) => {
    const subCount = category.subcategories ? category.subcategories.length : 0;
    totalSubcategories += subCount;
    
    const isNew = !PREFERRED_ORDER.includes(category.value);
    if (isNew) newCategoriesCount++;
    
    const badge = isNew ? ' 🆕 NUEVA' : '';
    console.log(`${index + 1}. ${category.label} (${category.value}) - ${subCount} subcategorías${badge}`);
  });

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`📦 Total: ${categories.length} categorías`);
  console.log(`📦 Total: ${totalSubcategories} subcategorías`);
  if (newCategoriesCount > 0) {
    console.log(`🆕 Nuevas categorías agregadas al final: ${newCategoriesCount}`);
  }
  console.log('═══════════════════════════════════════════════════\n');
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log('═══════════════════════════════════════════════════');
    console.log('   EXPORTAR CATEGORÍAS AL FRONTEND');
    console.log('═══════════════════════════════════════════════════\n');

    // Conectar a la base de datos
    await connectToDatabase();

    // Extraer categorías
    const categories = await extractCategories();

    if (!categories) {
      await mongoose.connection.close();
      process.exit(0);
    }

    // Convertir al formato del frontend
    const frontendCategories = convertToFrontendFormat(categories);

    // Mostrar resumen
    showSummary(frontendCategories);

    // Generar código JavaScript
    const jsCode = generateFrontendCode(frontendCategories);

    // Definir ruta de salida (frontend)
    const frontendFilePath = path.join(__dirname, '../../frontend/src/helpers/productCategory.js');

    // Verificar que el directorio existe
    const frontendDir = path.dirname(frontendFilePath);
    if (!fs.existsSync(frontendDir)) {
      console.log(`⚠️  El directorio ${frontendDir} no existe. Verifica la estructura del proyecto.\n`);
      process.exit(1);
    }

    // Hacer backup del archivo actual si existe
    if (fs.existsSync(frontendFilePath)) {
      const backupPath = frontendFilePath.replace('.js', '.backup.js');
      fs.copyFileSync(frontendFilePath, backupPath);
      console.log(`💾 Backup creado: ${backupPath}\n`);
    }

    // Guardar archivo
    fs.writeFileSync(frontendFilePath, jsCode, 'utf8');
    console.log(`✅ Archivo del frontend actualizado:`);
    console.log(`   ${frontendFilePath}\n`);

    // Mostrar preview del código generado
    console.log('📝 PREVIEW DEL CÓDIGO GENERADO (primeras líneas):\n');
    console.log('─────────────────────────────────────────────────');
    const lines = jsCode.split('\n').slice(0, 25);
    lines.forEach(line => console.log(line));
    console.log('...');
    console.log('─────────────────────────────────────────────────\n');

    // Cerrar conexión
    await mongoose.connection.close();
    console.log('✅ Conexión a MongoDB cerrada\n');

    console.log('═══════════════════════════════════════════════════');
    console.log('   ✨ EXPORTACIÓN COMPLETADA EXITOSAMENTE ✨');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('💡 Próximos pasos:');
    console.log('   1. El archivo frontend/src/helpers/productCategory.js ha sido actualizado');
    console.log('   2. Las categorías ahora reflejan lo que hay en la base de datos');
    console.log('   3. Reinicia tu aplicación frontend si está corriendo\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error ejecutando el script:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Ejecutar el script
main();

