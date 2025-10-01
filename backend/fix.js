// Corrección para el problema de gOPD
const fs = require('fs');
const path = require('path');

try {
  const gopdPath = path.join(__dirname, 'node_modules', 'gopd');
  if (fs.existsSync(gopdPath) && !fs.existsSync(path.join(gopdPath, 'gOPD.js'))) {
    fs.writeFileSync(
      path.join(gopdPath, 'gOPD.js'),
      'module.exports = require("./index.js");'
    );
    console.log('Fixed gOPD module');
  }
} catch (error) {
  console.error('Error fixing gOPD:', error);
}