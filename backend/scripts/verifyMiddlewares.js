// backend/scripts/verifyMiddlewares.js - Script de verificación

const path = require('path');

console.log("🔍 === VERIFICANDO MIDDLEWARES ===");

try {
    // Verificar que el archivo existe
    const middlewarePath = path.join(__dirname, '../middleware/authToken.js');
    console.log("📂 Ruta del middleware:", middlewarePath);
    
    // Intentar importar el middleware
    const middleware = require('../middleware/authToken');
    
    console.log("📦 Middleware importado:", typeof middleware);
    console.log("🔧 Propiedades disponibles:", Object.keys(middleware));
    
    // Verificar que las funciones existen
    console.log("✅ Verificaciones:");
    console.log("- authToken:", typeof middleware.authToken);
    console.log("- requireAuth:", typeof middleware.requireAuth);
    console.log("- debugAuth:", typeof middleware.debugAuth);
    
    // Verificar que son funciones
    if (typeof middleware.authToken === 'function') {
        console.log("✅ authToken es una función válida");
    } else {
        console.log("❌ authToken NO es una función");
    }
    
    if (typeof middleware.requireAuth === 'function') {
        console.log("✅ requireAuth es una función válida");
    } else {
        console.log("❌ requireAuth NO es una función");
    }
    
    console.log("🎉 Verificación completada exitosamente");
    
} catch (error) {
    console.error("❌ Error en la verificación:", error);
    console.error("📍 Stack trace:", error.stack);
}

// Verificar las rutas también
try {
    console.log("\n🔍 === VERIFICANDO RUTAS ===");
    
    const routes = require('../routes/index');
    console.log("📦 Rutas importadas:", typeof routes);
    console.log("✅ Las rutas se importaron correctamente");
    
} catch (error) {
    console.error("❌ Error importando rutas:", error);
    console.error("📍 Stack trace:", error.stack);
}