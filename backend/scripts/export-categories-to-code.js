#!/usr/bin/env node

/**
 * Script para EXTRAER categorías de la base de datos y generar código hardcodeado
 * 
 * Este script:
 * 1. Lee todas las categorías desde MongoDB
 * 2. Genera código JavaScript hardcodeado
 * 3. Guarda el código en un archivo
 * 
 * Uso: node backend/scripts/export-categories-to-code.js
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
 * Formatear objeto a código JavaScript con indentación
 */
function formatObjectToCode(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  const spacesInner = '  '.repeat(indent + 1);
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    
    const items = obj.map(item => {
      if (typeof item === 'object' && item !== null) {
        return formatObjectToCode(item, indent + 1);
      }
      return JSON.stringify(item);
    });
    
    return `[\n${spacesInner}${items.join(',\n' + spacesInner)}\n${spaces}]`;
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    
    const props = keys.map(key => {
      const value = obj[key];
      let formattedValue;
      
      if (typeof value === 'string') {
        formattedValue = JSON.stringify(value);
      } else if (typeof value === 'boolean' || typeof value === 'number') {
        formattedValue = value;
      } else if (Array.isArray(value)) {
        formattedValue = formatObjectToCode(value, indent + 1);
      } else if (typeof value === 'object' && value !== null) {
        formattedValue = formatObjectToCode(value, indent + 1);
      } else {
        formattedValue = JSON.stringify(value);
      }
      
      return `${spacesInner}${key}: ${formattedValue}`;
    });
    
    return `{\n${props.join(',\n')}\n${spaces}}`;
  }
  
  return JSON.stringify(obj);
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

    // Transformar a formato limpio (sin _id, __v, timestamps)
    const cleanCategories = categories.map(category => {
      const cleanCategory = {
        name: category.name,
        label: category.label,
        value: category.value,
        order: category.order || 1,
        isActive: category.isActive !== false,
        color: category.color || '#3B82F6',
        icon: category.icon || 'FaFolder'
      };

      if (category.subcategories && category.subcategories.length > 0) {
        cleanCategory.subcategories = category.subcategories.map(sub => {
          const cleanSub = {
            name: sub.name,
            label: sub.label,
            value: sub.value,
            order: sub.order || 1,
            isActive: sub.isActive !== false
          };

          if (sub.specifications && sub.specifications.length > 0) {
            cleanSub.specifications = sub.specifications.map(spec => ({
              name: spec.name,
              label: spec.label,
              type: spec.type || 'text',
              placeholder: spec.placeholder || '',
              required: spec.required || false,
              order: spec.order || 1,
              ...(spec.options && spec.options.length > 0 ? { options: spec.options } : {})
            }));
          }

          return cleanSub;
        });
      }

      return cleanCategory;
    });

    return cleanCategories;
  } catch (error) {
    console.error('❌ Error extrayendo categorías:', error.message);
    throw error;
  }
}

/**
 * Generar código JavaScript hardcodeado
 */
function generateCode(categories) {
  const code = `// Categorías hardcodeadas - Generado automáticamente desde la base de datos
// Fecha de generación: ${new Date().toISOString()}
// Total de categorías: ${categories.length}

const categoriesData = ${formatObjectToCode(categories, 0)};

module.exports = categoriesData;
`;

  return code;
}

/**
 * Generar también un archivo JSON para referencia
 */
function generateJSON(categories) {
  return JSON.stringify(categories, null, 2);
}

/**
 * Mostrar resumen de las categorías exportadas
 */
function showSummary(categories) {
  console.log('📊 RESUMEN DE CATEGORÍAS EXPORTADAS:\n');
  
  let totalSubcategories = 0;
  let totalSpecifications = 0;

  categories.forEach((category, index) => {
    const subCount = category.subcategories ? category.subcategories.length : 0;
    totalSubcategories += subCount;

    console.log(`${index + 1}. ${category.label} (${category.value})`);
    console.log(`   • Subcategorías: ${subCount}`);

    if (category.subcategories) {
      category.subcategories.forEach(sub => {
        const specCount = sub.specifications ? sub.specifications.length : 0;
        totalSpecifications += specCount;
        console.log(`     └─ ${sub.label} (${sub.value}) - ${specCount} especificaciones`);
      });
    }
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════');
  console.log(`📦 Total: ${categories.length} categorías`);
  console.log(`📦 Total: ${totalSubcategories} subcategorías`);
  console.log(`📦 Total: ${totalSpecifications} especificaciones`);
  console.log('═══════════════════════════════════════════════════\n');
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log('═══════════════════════════════════════════════════');
    console.log('   EXPORTAR CATEGORÍAS A CÓDIGO HARDCODEADO');
    console.log('═══════════════════════════════════════════════════\n');

    // Conectar a la base de datos
    await connectToDatabase();

    // Extraer categorías
    const categories = await extractCategories();

    if (!categories) {
      await mongoose.connection.close();
      process.exit(0);
    }

    // Mostrar resumen
    showSummary(categories);

    // Generar código JavaScript
    const jsCode = generateCode(categories);
    const jsonCode = generateJSON(categories);

    // Definir rutas de salida
    const outputDir = path.join(__dirname, '../data');
    const jsFilePath = path.join(outputDir, 'categories-hardcoded.js');
    const jsonFilePath = path.join(outputDir, 'categories-export.json');

    // Crear directorio si no existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log('📁 Directorio creado: backend/data/\n');
    }

    // Guardar archivos
    fs.writeFileSync(jsFilePath, jsCode, 'utf8');
    console.log(`✅ Código JavaScript guardado en:`);
    console.log(`   ${jsFilePath}\n`);

    fs.writeFileSync(jsonFilePath, jsonCode, 'utf8');
    console.log(`✅ JSON de respaldo guardado en:`);
    console.log(`   ${jsonFilePath}\n`);

    // Mostrar preview del código generado
    console.log('📝 PREVIEW DEL CÓDIGO GENERADO (primeras líneas):\n');
    console.log('─────────────────────────────────────────────────');
    const lines = jsCode.split('\n').slice(0, 20);
    lines.forEach(line => console.log(line));
    console.log('...');
    console.log('─────────────────────────────────────────────────\n');

    // Cerrar conexión
    await mongoose.connection.close();
    console.log('✅ Conexión a MongoDB cerrada\n');

    console.log('═══════════════════════════════════════════════════');
    console.log('   ✨ EXPORTACIÓN COMPLETADA EXITOSAMENTE ✨');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('💡 Para usar las categorías hardcodeadas:');
    console.log('   const categories = require("./data/categories-hardcoded");\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error ejecutando el script:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Ejecutar el script
main();

