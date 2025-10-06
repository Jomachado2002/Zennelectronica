// backend/scripts/assignBancardUserIds.js - SCRIPT DE MIGRACIÓN
const mongoose = require('mongoose');
require('dotenv').config();

// Importar el modelo de usuario
const userModel = require('../models/userModel');

async function assignBancardUserIds() {
    try {
        
        
        // Conectar a MongoDB
        
        await mongoose.connect(process.env.MONGODB_URI);
        
        
        // Obtener estadísticas antes
        const totalUsers = await userModel.countDocuments();
        const usersWithBancardId = await userModel.countDocuments({ 
            bancardUserId: { $exists: true, $ne: null } 
        });
        const usersWithoutBancardId = totalUsers - usersWithBancardId;
        
        
        
        
        
        
        if (usersWithoutBancardId === 0) {
            
            return;
        }
        
        
        
        // Usar el método estático del modelo
        const success = await userModel.assignBancardUserIds();
        
        if (success) {
            // Verificar estadísticas después
            const totalUsersAfter = await userModel.countDocuments();
            const usersWithBancardIdAfter = await userModel.countDocuments({ 
                bancardUserId: { $exists: true, $ne: null } 
            });
            
            
            
            
            
            
            if (usersWithBancardIdAfter === totalUsersAfter) {
                
            } else {
                
            }
        } else {
            
        }
        
    } catch (error) {
        console.error('❌ Error en el script de migración:', error);
    } finally {
        // Cerrar conexión
        await mongoose.connection.close();
        
        process.exit(0);
    }
}

// Función para mostrar usuarios y sus IDs
async function showUsers() {
    try {
        
        
        await mongoose.connect(process.env.MONGODB_URI);
        
        const users = await userModel.find({}, 'name email bancardUserId role createdAt').sort({ createdAt: 1 });
        
        
        
        users.forEach((user, index) => {
            
            
            
            
            
            
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
        
        
        
        
        
        
        
        
        
        process.exit(1);
}

module.exports = { assignBancardUserIds, showUsers };