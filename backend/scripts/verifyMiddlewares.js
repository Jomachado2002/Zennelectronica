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
    // console.error removed for production
    // console.error removed for production
}

// Verificar las rutas también
try {
    
    
    const routes = require('../routes/index');
    
    
    
} catch (error) {
    // console.error removed for production
    // console.error removed for production
}