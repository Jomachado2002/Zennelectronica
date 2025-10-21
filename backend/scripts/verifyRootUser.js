// backend/scripts/verifyRootUser.js - VERIFICAR USUARIO ROOT

const mongoose = require('mongoose');
const userModel = require('../models/userModel');
require('dotenv').config();

async function verifyRootUser() {
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
        
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        
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
            // console.log removed for production
        } else {
            // console.log removed for production
        }
        
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
    verifyRootUser();
}

module.exports = verifyRootUser;
