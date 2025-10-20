// backend/scripts/migratePermissions.js - MIGRACIÓN A SISTEMA DE PERMISOS GRANULAR

const mongoose = require('mongoose');
const userModel = require('../models/userModel');
require('dotenv').config();

async function migratePermissions() {
    try {
        console.log('🚀 Iniciando migración de permisos...');
        
        // Conectar a la base de datos
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a la base de datos');
        
        // Obtener todos los usuarios
        const users = await userModel.find({});
        console.log(`📊 Encontrados ${users.length} usuarios para migrar`);
        
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
                    console.log('🔑 Convirtiendo usuario a ROOT');
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
                
                console.log(`✅ Usuario migrado exitosamente`);
                console.log(`   - Nuevo rol: ${updatedUser.role}`);
                console.log(`   - Admin Panel: ${updatedUser.permissions.adminPanel}`);
                console.log(`   - Productos: ${updatedUser.permissions.products.view}`);
                
                migratedCount++;
                
                // Contar por roles
                if (updatedUser.role === 'ROOT') rootCount++;
                else if (updatedUser.role === 'ADMIN') adminCount++;
                else if (updatedUser.role === 'GENERAL') generalCount++;
                
            } catch (error) {
                console.error(`❌ Error migrando usuario ${user.email}:`, error.message);
            }
        }
        
        console.log('\n📊 RESUMEN DE MIGRACIÓN:');
        console.log(`✅ Usuarios migrados: ${migratedCount}`);
        console.log(`🔑 Usuarios ROOT: ${rootCount}`);
        console.log(`👨‍💼 Usuarios ADMIN: ${adminCount}`);
        console.log(`👤 Usuarios GENERAL: ${generalCount}`);
        
        console.log('\n🎉 Migración completada exitosamente!');
        
    } catch (error) {
        console.error('❌ Error en la migración:', error);
    } finally {
        // Cerrar conexión
        await mongoose.disconnect();
        console.log('🔌 Desconectado de la base de datos');
        process.exit(0);
    }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
    migratePermissions();
}

module.exports = migratePermissions;
