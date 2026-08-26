const mongoose = require("mongoose");

async function connectDB() {
    try {
        // ✅ CONFIGURACIÓN OPTIMIZADA PARA PRODUCCIÓN
        const isVercel = Boolean(process.env.VERCEL);
        const options = {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            maxPoolSize: isVercel ? 5 : 10,
            minPoolSize: isVercel ? 0 : 5,
            maxIdleTimeMS: isVercel ? 10000 : 30000,
            retryWrites: true,
            retryReads: true,
        };

        // console.log removed for production
        await mongoose.connect(process.env.MONGODB_URI, options);
        // console.log removed for production
        
        // ✅ MANEJO DE EVENTOS DE CONEXIÓN
        mongoose.connection.on('error', (err) => {
            // console.error removed for production
        });
        
        mongoose.connection.on('disconnected', () => {
            // console.warn removed for production
        });
        
        mongoose.connection.on('reconnected', () => {
            // console.log removed for production
        });
        
    } catch (err) {
        // console.error removed for production
        process.exit(1); // Salir si no puede conectar
    }
}

module.exports = connectDB;
