#!/usr/bin/env node

/**
 * Script MAESTRO para sincronizar categorías
 * 
 * Este script ejecuta AMBOS scripts de exportación en secuencia:
 * 1. export-categories-to-code.js (backend hardcoded)
 * 2. export-categories-to-frontend.js (frontend helper)
 * 
 * Uso: node backend/scripts/sync-categories.js
 * 
 * 💡 Ejecuta este script cada vez que:
 *    - Crees/modifiques categorías
 *    - Crees/modifiques subcategorías
 *    - Crees/modifiques especificaciones
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('═══════════════════════════════════════════════════');
console.log('   🔄 SINCRONIZACIÓN DE CATEGORÍAS');
console.log('═══════════════════════════════════════════════════\n');

const scriptsDir = __dirname;

try {
  // Paso 1: Exportar al backend
  console.log('📦 PASO 1/2: Exportando categorías al backend...\n');
  execSync(`node ${path.join(scriptsDir, 'export-categories-to-code.js')}`, {
    stdio: 'inherit',
    cwd: path.join(scriptsDir, '..')
  });

  console.log('\n');

  // Paso 2: Exportar al frontend
  console.log('🎨 PASO 2/2: Exportando categorías al frontend...\n');
  execSync(`node ${path.join(scriptsDir, 'export-categories-to-frontend.js')}`, {
    stdio: 'inherit',
    cwd: path.join(scriptsDir, '..')
  });

  console.log('\n');
  console.log('═══════════════════════════════════════════════════');
  console.log('   ✨ SINCRONIZACIÓN COMPLETADA ✨');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log('✅ Archivos actualizados:');
  console.log('   • backend/data/categories-hardcoded.js');
  console.log('   • frontend/src/helpers/productCategory.js\n');
  
  console.log('💡 Próximos pasos:');
  console.log('   1. Reinicia tu servidor backend si está corriendo');
  console.log('   2. Reinicia tu aplicación frontend si está corriendo');
  console.log('   3. Limpia el caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)\n');

  process.exit(0);
} catch (error) {
  console.error('\n❌ Error durante la sincronización:', error.message);
  console.error('\n💡 Verifica que:');
  console.error('   • MongoDB esté corriendo');
  console.error('   • Tengas las credenciales correctas');
  console.error('   • Los archivos de scripts existan\n');
  process.exit(1);
}


