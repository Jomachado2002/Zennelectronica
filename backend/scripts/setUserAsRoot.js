// backend/scripts/setUserAsRoot.js - CONFIGURAR USUARIO COMO ROOT

const mongoose = require('mongoose');
const userModel = require('../models/userModel');
require('dotenv').config();

async function setUserAsRoot() {
    try {
        console.log('🚀 Configurando usuario como ROOT...');
        
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
        
        console.log('👤 Usuario encontrado:', {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive
        });
        
        // Obtener permisos por defecto para ROOT
        const rootPermissions = userModel.getDefaultPermissions('ROOT');
        
        // Actualizar usuario a ROOT con todos los permisos
        const updatedUser = await userModel.findByIdAndUpdate(
            user._id,
            {
                role: 'ROOT',
                permissions: rootPermissions
            },
            { new: true, runValidators: true }
        );
        
        console.log('✅ Usuario actualizado exitosamente:');
        console.log('   - Nuevo rol:', updatedUser.role);
        console.log('   - Admin Panel:', updatedUser.permissions.adminPanel);
        console.log('   - Productos:', updatedUser.permissions.products.view);
        console.log('   - Usuarios:', updatedUser.permissions.users.create);
        console.log('   - Configuración:', updatedUser.permissions.settings.edit);
        
        console.log('🎉 ¡Usuario configurado como ROOT exitosamente!');
        
    } catch (error) {
        console.error('❌ Error configurando usuario como ROOT:', error);
    } finally {
        // Cerrar conexión
        await mongoose.disconnect();
        console.log('🔌 Desconectado de la base de datos');
        process.exit(0);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    setUserAsRoot();
}

module.exports = setUserAsRoot;
