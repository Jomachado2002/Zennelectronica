// backend/scripts/verifyRootUser.js - VERIFICAR USUARIO ROOT

const mongoose = require('mongoose');
const userModel = require('../models/userModel');
require('dotenv').config();

async function verifyRootUser() {
    try {
        console.log('🔍 Verificando usuario ROOT...');
        
        // Conectar a la base de datos
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a la base de datos');
        
        const targetEmail = 'josiasnicolas02@gmail.com';
        
        // Buscar el usuario
        const user = await userModel.findOne({ email: targetEmail.toLowerCase() });
        
        if (!user) {
            console.log('❌ Usuario no encontrado:', targetEmail);
            return;
        }
        
        console.log('👤 Usuario encontrado:');
        console.log('   - ID:', user._id);
        console.log('   - Nombre:', user.name);
        console.log('   - Email:', user.email);
        console.log('   - Rol:', user.role);
        console.log('   - Activo:', user.isActive);
        
        console.log('\n🔐 Permisos del usuario:');
        console.log('   - Admin Panel:', user.permissions?.adminPanel);
        console.log('   - Productos - Ver:', user.permissions?.products?.view);
        console.log('   - Productos - Crear:', user.permissions?.products?.create);
        console.log('   - Productos - Editar:', user.permissions?.products?.edit);
        console.log('   - Productos - Eliminar:', user.permissions?.products?.delete);
        console.log('   - Productos - Subir:', user.permissions?.products?.upload);
        console.log('   - Usuarios - Ver:', user.permissions?.users?.view);
        console.log('   - Usuarios - Crear:', user.permissions?.users?.create);
        console.log('   - Usuarios - Editar:', user.permissions?.users?.edit);
        console.log('   - Usuarios - Eliminar:', user.permissions?.users?.delete);
        console.log('   - Inventario - Ver:', user.permissions?.inventory?.view);
        console.log('   - Inventario - Sincronizar:', user.permissions?.inventory?.sync);
        console.log('   - Finanzas - Ver:', user.permissions?.finances?.view);
        console.log('   - Finanzas - Crear:', user.permissions?.finances?.create);
        console.log('   - Finanzas - Editar:', user.permissions?.finances?.edit);
        console.log('   - Configuración - Ver:', user.permissions?.settings?.view);
        console.log('   - Configuración - Editar:', user.permissions?.settings?.edit);
        
        // Verificar si tiene todos los permisos de ROOT
        const hasAllRootPermissions = 
            user.permissions?.adminPanel === true &&
            user.permissions?.products?.view === true &&
            user.permissions?.products?.create === true &&
            user.permissions?.products?.edit === true &&
            user.permissions?.products?.delete === true &&
            user.permissions?.products?.upload === true &&
            user.permissions?.users?.view === true &&
            user.permissions?.users?.create === true &&
            user.permissions?.users?.edit === true &&
            user.permissions?.users?.delete === true &&
            user.permissions?.settings?.view === true &&
            user.permissions?.settings?.edit === true;
        
        if (hasAllRootPermissions) {
            console.log('\n🎉 ¡Usuario ROOT configurado correctamente con todos los permisos!');
        } else {
            console.log('\n⚠️  Usuario ROOT pero algunos permisos pueden estar faltando');
        }
        
    } catch (error) {
        console.error('❌ Error verificando usuario ROOT:', error);
    } finally {
        // Cerrar conexión
        await mongoose.disconnect();
        console.log('🔌 Desconectado de la base de datos');
        process.exit(0);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    verifyRootUser();
}

module.exports = verifyRootUser;
