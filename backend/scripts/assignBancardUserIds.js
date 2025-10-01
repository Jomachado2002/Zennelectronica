// backend/scripts/assignBancardUserIds.js - SCRIPT DE MIGRACIÓN
const mongoose = require('mongoose');
require('dotenv').config();

// Importar el modelo de usuario
const userModel = require('../models/userModel');

async function assignBancardUserIds() {
    try {
        console.log('🚀 === INICIANDO SCRIPT DE MIGRACIÓN BANCARD USER IDS ===');
        
        // Conectar a MongoDB
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');
        
        // Obtener estadísticas antes
        const totalUsers = await userModel.countDocuments();
        const usersWithBancardId = await userModel.countDocuments({ 
            bancardUserId: { $exists: true, $ne: null } 
        });
        const usersWithoutBancardId = totalUsers - usersWithBancardId;
        
        console.log('📊 ESTADÍSTICAS INICIALES:');
        console.log(`   Total usuarios: ${totalUsers}`);
        console.log(`   Con bancardUserId: ${usersWithBancardId}`);
        console.log(`   Sin bancardUserId: ${usersWithoutBancardId}`);
        
        if (usersWithoutBancardId === 0) {
            console.log('✅ Todos los usuarios ya tienen bancardUserId asignado');
            return;
        }
        
        console.log('🔄 Iniciando asignación...');
        
        // Usar el método estático del modelo
        const success = await userModel.assignBancardUserIds();
        
        if (success) {
            // Verificar estadísticas después
            const totalUsersAfter = await userModel.countDocuments();
            const usersWithBancardIdAfter = await userModel.countDocuments({ 
                bancardUserId: { $exists: true, $ne: null } 
            });
            
            console.log('📊 ESTADÍSTICAS FINALES:');
            console.log(`   Total usuarios: ${totalUsersAfter}`);
            console.log(`   Con bancardUserId: ${usersWithBancardIdAfter}`);
            console.log(`   Usuarios migrados: ${usersWithBancardIdAfter - usersWithBancardId}`);
            
            if (usersWithBancardIdAfter === totalUsersAfter) {
                console.log('🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');
            } else {
                console.log('⚠️ Algunos usuarios no pudieron ser migrados');
            }
        } else {
            console.log('❌ Error durante la migración');
        }
        
    } catch (error) {
        console.error('❌ Error en el script de migración:', error);
    } finally {
        // Cerrar conexión
        await mongoose.connection.close();
        console.log('🔌 Conexión cerrada');
        process.exit(0);
    }
}

// Función para mostrar usuarios y sus IDs
async function showUsers() {
    try {
        console.log('👥 === MOSTRANDO USUARIOS Y SUS BANCARD IDS ===');
        
        await mongoose.connect(process.env.MONGODB_URI);
        
        const users = await userModel.find({}, 'name email bancardUserId role createdAt').sort({ createdAt: 1 });
        
        console.log(`📋 Total de usuarios: ${users.length}\n`);
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   BancardUserId: ${user.bancardUserId || 'NO ASIGNADO'}`);
            console.log(`   Creado: ${user.createdAt.toLocaleDateString()}`);
            console.log('   ---');
        });
        
    } catch (error) {
        console.error('❌ Error mostrando usuarios:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

// Verificar argumentos de línea de comandos
const command = process.argv[2];

switch (command) {
    case 'migrate':
        assignBancardUserIds();
        break;
    case 'show':
        showUsers();
        break;
    default:
        console.log('🔧 USO DEL SCRIPT:');
        console.log('   npm run bancard:migrate    - Asignar IDs a usuarios sin bancardUserId');
        console.log('   npm run bancard:show       - Mostrar todos los usuarios y sus IDs');
        console.log('');
        console.log('📝 INSTRUCCIONES:');
        console.log('1. Asegúrate de que tu .env esté configurado correctamente');
        console.log('2. Ejecuta "npm run bancard:show" para ver el estado actual');
        console.log('3. Ejecuta "npm run bancard:migrate" para asignar IDs faltantes');
        console.log('4. Ejecuta "npm run bancard:show" nuevamente para verificar');
        process.exit(1);
}

module.exports = { assignBancardUserIds, showUsers };