// backend/scripts/verifyMiddlewares.js - Script de verificación

const path = require('path');



try {
    // Verificar que el archivo existe
    const middlewarePath = path.join(__dirname, '../middleware/authToken.js');
    
    
    // Intentar importar el middleware
    const middleware = require('../middleware/authToken');
    
    
    
    
    // Verificar que las funciones existen
    
    
    
    
    
    // Verificar que son funciones
    if (typeof middleware.authToken === 'function') {
        
    } else {
        
    }
    
    if (typeof middleware.requireAuth === 'function') {
        
    } else {
        
    }
    
    
    
} catch (error) {
    console.error("❌ Error en la verificación:", error);
    console.error("📍 Stack trace:", error.stack);
}

// Verificar las rutas también
try {
    
    
    const routes = require('../routes/index');
    
    
    
} catch (error) {
    console.error("❌ Error importando rutas:", error);
    console.error("📍 Stack trace:", error.stack);
}