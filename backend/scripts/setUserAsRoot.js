// backend/scripts/setUserAsRoot.js - CONFIGURAR USUARIO COMO ROOT

const mongoose = require('mongoose');
const userModel = require('../models/userModel');
require('dotenv').config();

async function setUserAsRoot() {
    try {
        // console.log removed for production
        
        // Conectar a la base de datos
        await mongoose.connect(process.env.MONGODB_URI);
        // console.log removed for production
        
        const targetEmail = 'josiasnicolas02@gmail.com';
        
        // Buscar el usuario
        const user = await userModel.findOne({ email: targetEmail.toLowerCase() });
        
        if (!user) {
            // console.log removed for production
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
        
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        
        // console.log removed for production
        
    } catch (error) {
        // console.error removed for production
    } finally {
        // Cerrar conexión
        await mongoose.disconnect();
        // console.log removed for production
        process.exit(0);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    setUserAsRoot();
}

module.exports = setUserAsRoot;
