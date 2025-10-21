const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// console.log removed for production

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
  // console.error removed for production
  process.exit(1);
}

// console.log removed for production

try {
  // Instalar cada dependencia
  for (const dep of dependencies) {
    // console.log removed for production
    execSync(`npm install ${dep}`, { 
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    // console.log removed for production
  }
  
  // console.log removed for production
  // console.log removed for production
  dependencies.forEach(dep => console.log(`  - ${dep}`));
  
  // console.log removed for production
  // console.log removed for production
  // console.log removed for production
  
} catch (error) {
  // console.error removed for production
  process.exit(1);
}


