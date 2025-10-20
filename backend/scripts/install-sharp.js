const { execSync } = require('child_process');
const path = require('path');

console.log('🔧 Instalando Sharp para conversión de imágenes...\n');

try {
  // Instalar Sharp
  console.log('Instalando Sharp...');
  execSync('npm install sharp', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  
  console.log('\n✅ Sharp instalado correctamente!');
  console.log('\n📋 Dependencias necesarias:');
  console.log('  ✅ sharp - Conversión de imágenes');
  console.log('  ✅ axios - Descarga de imágenes (ya instalado)');
  console.log('  ✅ firebase - Firebase Storage (ya instalado)');
  console.log('  ✅ uuid - Generación de IDs únicos (ya instalado)');
  console.log('  ✅ mongoose - Base de datos (ya instalado)');
  
  console.log('\n🚀 Ahora puedes ejecutar:');
  console.log('  node scripts/testWebPConversion.js');
  console.log('  node scripts/convertImagesToWebP.js --dry-run');
  
} catch (error) {
  console.error('❌ Error instalando Sharp:', error.message);
  console.log('\n💡 Intenta ejecutar manualmente:');
  console.log('  npm install sharp');
  process.exit(1);
}

