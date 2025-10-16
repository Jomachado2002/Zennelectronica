// backend/scripts/manageNotebooksProducts.js
// Script maestro para gestionar la eliminación de productos de notebooks

const { backupNotebooksProducts } = require('./backupNotebooksProducts');
const { deleteNotebooksProducts } = require('./deleteNotebooksProducts');
const { verifyNotebooksDeletion } = require('./verifyNotebooksDeletion');

// Configuración de logging
const log = (message, type = 'INFO') => {
    const timestamp = new Date().toISOString();
    const colors = {
        'INFO': '\x1b[36m',    // Cyan
        'SUCCESS': '\x1b[32m', // Green
        'WARNING': '\x1b[33m', // Yellow
        'ERROR': '\x1b[31m',   // Red
        'PROGRESS': '\x1b[35m' // Magenta
    };
    const reset = '\x1b[0m';
    console.log(`${colors[type]}[${timestamp}] ${type}: ${message}${reset}`);
};

/**
 * Función principal para gestionar la eliminación de productos de notebooks
 */
async function manageNotebooksProducts() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    log('🚀 Gestor de Productos de Notebooks', 'INFO');
    log('=====================================', 'INFO');
    
    switch (command) {
        case 'backup':
            log('💾 Iniciando respaldo de productos de notebooks...', 'PROGRESS');
            await backupNotebooksProducts();
            break;
            
        case 'delete':
            if (!args.includes('--confirm')) {
                log('❌ Para eliminar productos, usa: node manageNotebooksProducts.js delete --confirm', 'ERROR');
                log('⚠️  ADVERTENCIA: Esta acción es irreversible', 'WARNING');
                break;
            }
            log('🗑️  Iniciando eliminación de productos de notebooks...', 'PROGRESS');
            await deleteNotebooksProducts();
            break;
            
        case 'verify':
            log('🔍 Iniciando verificación de eliminación...', 'PROGRESS');
            await verifyNotebooksDeletion();
            break;
            
        case 'full-process':
            log('🔄 Iniciando proceso completo de eliminación...', 'PROGRESS');
            
            // Paso 1: Respaldo
            log('\n📋 PASO 1: Creando respaldo...', 'INFO');
            await backupNotebooksProducts();
            
            // Pausa para confirmación
            log('\n⏸️  Respaldo completado. Presiona Enter para continuar con la eliminación...', 'WARNING');
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.on('data', async () => {
                process.stdin.setRawMode(false);
                process.stdin.pause();
                
                // Paso 2: Eliminación
                log('\n📋 PASO 2: Eliminando productos...', 'INFO');
                await deleteNotebooksProducts();
                
                // Paso 3: Verificación
                log('\n📋 PASO 3: Verificando eliminación...', 'INFO');
                await verifyNotebooksDeletion();
                
                process.exit(0);
            });
            break;
            
        default:
            log('❌ Comando no reconocido', 'ERROR');
            log('\n📖 COMANDOS DISPONIBLES:', 'INFO');
            log('  backup          - Crear respaldo de productos de notebooks', 'INFO');
            log('  delete --confirm - Eliminar productos de notebooks (IRREVERSIBLE)', 'INFO');
            log('  verify          - Verificar que la eliminación fue exitosa', 'INFO');
            log('  full-process    - Proceso completo (respaldo + eliminación + verificación)', 'INFO');
            log('\n📝 EJEMPLOS DE USO:', 'INFO');
            log('  node manageNotebooksProducts.js backup', 'INFO');
            log('  node manageNotebooksProducts.js delete --confirm', 'INFO');
            log('  node manageNotebooksProducts.js verify', 'INFO');
            log('  node manageNotebooksProducts.js full-process', 'INFO');
            break;
    }
}

// Ejecutar el script si se llama directamente
if (require.main === module) {
    manageNotebooksProducts().catch(error => {
        log(`❌ Error en el gestor: ${error.message}`, 'ERROR');
        console.error(error);
        process.exit(1);
    });
}

module.exports = {
    manageNotebooksProducts
};
