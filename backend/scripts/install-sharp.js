const { execSync } = require('child_process');
const path = require('path');

// console.log removed for production

try {
  // Instalar Sharp
  // console.log removed for production
  execSync('npm install sharp', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  
  // console.log removed for production
  // console.log removed for production
  // console.log removed for production
  console.log('  ✅ axios - Descarga de imágenes (ya instalado)');
  console.log('  ✅ firebase - Firebase Storage (ya instalado)');
  console.log('  ✅ uuid - Generación de IDs únicos (ya instalado)');
  console.log('  ✅ mongoose - Base de datos (ya instalado)');
  
  // console.log removed for production
  // console.log removed for production
  // console.log removed for production
  
} catch (error) {
  // console.error removed for production
  // console.log removed for production
  // console.log removed for production
  process.exit(1);
}




