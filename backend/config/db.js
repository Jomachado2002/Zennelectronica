const mongoose = require("mongoose");

async function connectDB() {
    try {
        // ✅ CONFIGURACIÓN OPTIMIZADA PARA PRODUCCIÓN
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000, // 30 segundos
            socketTimeoutMS: 45000, // 45 segundos
            bufferMaxEntries: 0,
            bufferCommands: false,
            maxPoolSize: 10,
            minPoolSize: 5,
            maxIdleTimeMS: 30000,
            retryWrites: true,
            retryReads: true,
        };

        console.log('🔄 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, options);
        console.log('✅ MongoDB conectado exitosamente');
        
        // ✅ MANEJO DE EVENTOS DE CONEXIÓN
        mongoose.connection.on('error', (err) => {
            console.error('❌ Error de MongoDB:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB desconectado');
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log('🔄 MongoDB reconectado');
        });
        
    } catch (err) {
        console.error('❌ Error crítico conectando a MongoDB:', err);
        process.exit(1); // Salir si no puede conectar
    }
}

module.exports = connectDB;
