const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== INSTALANDO DEPENDENCIAS PARA CONVERSIÓN WEBP ===\n');

// Lista de dependencias necesarias
const dependencies = [
  'sharp',           // Para conversión de imágenes
  'axios',           // Para descargar imágenes
  'uuid',            // Para generar IDs únicos
  'firebase'         // Para Firebase Storage
];

// Verificar si package.json existe
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ No se encontró package.json en el directorio backend');
  process.exit(1);
}

console.log('📦 Instalando dependencias...\n');

try {
  // Instalar cada dependencia
  for (const dep of dependencies) {
    console.log(`Instalando ${dep}...`);
    execSync(`npm install ${dep}`, { 
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    console.log(`✅ ${dep} instalado correctamente\n`);
  }
  
  console.log('🎉 ¡Todas las dependencias instaladas correctamente!');
  console.log('\n📋 Dependencias instaladas:');
  dependencies.forEach(dep => console.log(`  - ${dep}`));
  
  console.log('\n🚀 Ahora puedes ejecutar los scripts de conversión:');
  console.log('  - Conversión masiva: node scripts/convertImagesToWebP.js --dry-run');
  console.log('  - Conversión individual: node scripts/convertSingleImageToWebP.js <URL>');
  
} catch (error) {
  console.error('❌ Error instalando dependencias:', error.message);
  process.exit(1);
}
