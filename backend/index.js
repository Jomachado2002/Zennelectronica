// Fix para el problema de gOPD
try {
  const fs = require('fs');
  const path = require('path');
  const gopdPath = path.join(__dirname, 'node_modules', 'gopd');
  if (fs.existsSync(gopdPath) && !fs.existsSync(path.join(gopdPath, 'gOPD.js'))) {
    fs.writeFileSync(
      path.join(gopdPath, 'gOPD.js'),
      'module.exports = require("./index.js");'
    );
    console.log('Fixed gOPD module');
  }
} catch (error) {
  console.error('Error fixing gOPD:', error);
}

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
require('dotenv').config();
const connectDB = require('./config/db');
const router = require('./routes');

const app = express();

// Verificar variables de entorno requeridas
const requiredEnvVars = ['SESSION_SECRET', 'MONGODB_URI', 'TOKEN_SECRET_KEY', 'FRONTEND_URL'];
let missingEnvVars = false;
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} no está definida en el archivo .env`);
    missingEnvVars = true;
  }
}

// Solo salir en entorno de desarrollo
if (missingEnvVars && process.env.NODE_ENV !== 'production') {
  process.exit(1);
}

// Ruta de prueba para verificar que el servidor responde
app.get('/test', (req, res) => {
  res.json({ message: 'Backend funcionando correctamente' });
});

// Configuración de CORS mejorada con múltiples orígenes permitidos y añadiendo PATCH
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'https://www.zenn.com.py',  // ✅ AGREGAR ESTE
    'https://zenn.com.py',      // ✅ AGREGAR ESTE TAMBIÉN (sin www)
    'https://zenn.vercel.app'   // ✅ AGREGAR ESTE POR SI ACASO
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Agregar un middleware personalizado para asegurar que los preflight CORS funcionan correctamente
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).send();
});

// Middlewares
app.use(express.json());
app.use(cookieParser(process.env.SESSION_SECRET));

// Configuración de sesión mejorada para invitados
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret_for_development',
  resave: false,
  saveUninitialized: true,
  name: 'sessionId',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  },
  store: new session.MemoryStore()
}));

// Rutas API
app.use("/api", router);

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    message: "Error interno del servidor",
    error: true,
    success: false
  });
});

// Función para iniciar el servidor
const startServer = async () => {
  try {
    const PORT = process.env.PORT || 8080;
    
    // Conectar a la base de datos
    await connectDB();
    console.log('Conexión a la base de datos establecida');
    
    // Solo iniciar el servidor explícitamente en desarrollo
    if (process.env.NODE_ENV !== 'production') {
      app.listen(PORT, () => {
        console.log(`Servidor ejecutándose en el puerto ${PORT}`);
      });
    }
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    // No salir del proceso en producción
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

// Iniciar el servidor
startServer();

// Exportar la aplicación para entornos serverless
module.exports = app;