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

  }
} catch (error) {
  // console.error removed for production
}

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const compression = require('compression');
const helmet = require('helmet');
require('dotenv').config();
const connectDB = require('./config/db');
const router = require('./routes');
const exchangeRateRoutes = require('./routes/exchangeRateRoutes');

const app = express();

// Verificar variables de entorno requeridas
const requiredEnvVars = ['SESSION_SECRET', 'MONGODB_URI', 'TOKEN_SECRET_KEY', 'FRONTEND_URL'];
let missingEnvVars = false;
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    // console.error removed for production
    missingEnvVars = true;
  }
}

// Solo salir en entorno de desarrollo
if (missingEnvVars && process.env.NODE_ENV !== 'production') {
  process.exit(1);
}

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false
}));

// Compression middleware for better performance
app.use(compression());

// Cache middleware for static resources
app.use((req, res, next) => {
  // Set cache headers for static assets
  if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
  } else if (req.path.match(/^\/banners\//)) {
    // Banner images - long cache
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
  } else if (req.path.startsWith('/api/')) {
    // API responses - shorter cache
    res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minutes
  }
  next();
});

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
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With', 'Accept']
}));

// Agregar un middleware personalizado para asegurar que los preflight CORS funcionan correctamente
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, X-Requested-With, Accept');
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
app.use("/api/exchange-rate", exchangeRateRoutes);

// Manejo de errores global
app.use((err, req, res, next) => {
  // console.error removed for production
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
    
    // console.log removed for production
    // console.log removed for production
    // console.log removed for production
    
    // Conectar a la base de datos
    // console.log removed for production
    await connectDB();
    // console.log removed for production
    
    // Solo iniciar el servidor explícitamente en desarrollo
    if (process.env.NODE_ENV !== 'production') {
      app.listen(PORT, () => {
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
      });
    }
  } catch (error) {
    // console.error removed for production
    // console.error removed for production
    // console.error removed for production
    
    // No salir del proceso en producción
    if (process.env.NODE_ENV !== 'production') {
      // console.log removed for production
      setTimeout(() => {
        startServer();
      }, 5000);
    }
  }
};

// Iniciar el servidor
startServer();

// Exportar la aplicación para entornos serverless
module.exports = app;