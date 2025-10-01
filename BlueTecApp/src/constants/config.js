// src/constants/config.js
// 🌍 CONFIGURACIÓN LEYENDO DESDE .env

import Constants from 'expo-constants';

// 🔧 Obtener variables del .env a través de Expo Constants
const extra = Constants.expoConfig?.extra || {};

export const CONFIG = {
  // 🌐 API Configuration desde .env
  API_BASE_URL: `${extra.backendUrl}/api` || 'http://192.168.0.8:8080/api',
  API_TIMEOUT: parseInt(extra.apiTimeout) || 10000,

  // 🗺️ Google Maps desde .env
  GOOGLE_MAPS_API_KEY: extra.googleMapsApiKey || '',

  // 🔥 Firebase desde .env
  FIREBASE_CONFIG: extra.firebase || {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    measurementId: ''
  },

  // 💳 Bancard desde .env
  BANCARD: extra.bancard || {
    environment: 'staging',
    publicKey: ''
  },

  // 🔑 Llaves para almacenamiento seguro
  STORAGE_KEYS: {
    USER_TOKEN: 'zenn_user_token',
    USER_DATA: 'zenn_user_data',
    CART_DATA: 'zenn_cart_data',
    GUEST_ID: 'zenn_guest_id',
  },

  // 🎨 Tema de la app
  COLORS: {
    primary: '#2196F3',
    secondary: '#FFC107',
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#212121',
    textSecondary: '#757575',
  },

  // 📏 Dimensiones
  SPACING: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  // 📱 Configuraciones de la app
  APP: {
    name: 'Zenn Mobile',
    version: '1.0.0',
    description: 'E-commerce de tecnología',
  },

  // 🛒 Configuraciones del carrito
  CART: {
    maxQuantity: 10,
    minQuantity: 1,
  },

  // 💳 Configuraciones de pago
  PAYMENT: {
    currency: 'PYG',
    bancardEnvironment: extra.bancard?.environment || 'staging',
  },
};

// 🔍 Debug en desarrollo
if (__DEV__) {
  console.log('🔧 CONFIG cargado desde .env:', {
    API_BASE_URL: CONFIG.API_BASE_URL,
    BANCARD_ENV: CONFIG.BANCARD.environment,
    HAS_GOOGLE_MAPS_KEY: !!CONFIG.GOOGLE_MAPS_API_KEY,
    HAS_FIREBASE_CONFIG: !!CONFIG.FIREBASE_CONFIG.apiKey
  });
}

export default CONFIG;