// backend/scripts/migratePermissions.js - MIGRACIÓN A SISTEMA DE PERMISOS GRANULAR

const mongoose = require('mongoose');
const userModel = require('../models/userModel');
require('dotenv').config();

async function migratePermissions() {
    try {
        // console.log removed for production
        
        // Conectar a la base de datos
        await mongoose.connect(process.env.MONGODB_URI);
        // console.log removed for production
        
        // Obtener todos los usuarios
        const users = await userModel.find({});
        // console.log removed for production
        
        let migratedCount = 0;
        let rootCount = 0;
        let adminCount = 0;
        let generalCount = 0;
        
        for (const user of users) {
            try {
                console.log(`\n👤 Migrando usuario: ${user.name} (${user.email}) - Rol: ${user.role}`);
                
                // Determinar el rol y permisos por defecto
                let newRole = user.role;
                let defaultPermissions;
                
                // Si el usuario actual es ADMIN, mantenerlo como ADMIN
                // Si quieres convertir algunos ADMIN a ROOT, puedes hacerlo aquí
                if (user.email === 'josiasnicolas02@gmail.com') {
                    // Convertir tu usuario a ROOT
                    newRole = 'ROOT';
                    // console.log removed for production
                }
                
                // Obtener permisos por defecto según el rol
                defaultPermissions = userModel.getDefaultPermissions(newRole);
                
                // Actualizar usuario con nuevos permisos
                const updatedUser = await userModel.findByIdAndUpdate(
                    user._id,
                    {
                        role: newRole,
                        permissions: defaultPermissions
                    },
                    { new: true }
                );
                
                // console.log removed for production
                // console.log removed for production
                // console.log removed for production
                // console.log removed for production
                
                migratedCount++;
                
                // Contar por roles
                if (updatedUser.role === 'ROOT') rootCount++;
                else if (updatedUser.role === 'ADMIN') adminCount++;
                else if (updatedUser.role === 'GENERAL') generalCount++;
                
            } catch (error) {
                // console.error removed for production
            }
        }
        
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

// Ejecutar migración si se llama directamente
if (require.main === module) {
    migratePermissions();
}

module.exports = migratePermissions;
