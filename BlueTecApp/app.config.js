// app.config.js - CONFIGURACIÓN DE EXPO PARA LEER .env
import 'dotenv/config';

export default {
  expo: {
    name: process.env.EXPO_PUBLIC_APP_NAME || "Zenn Mobile",
    slug: "zenn-mobile",
    version: process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#2196F3"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.zenn.mobile"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#2196F3"
      },
      package: "com.zenn.mobile"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      // 🌐 Hacer variables disponibles en la app
      backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL,
      apiTimeout: process.env.EXPO_PUBLIC_API_TIMEOUT,
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      firebase: {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
      },
      bancard: {
        environment: process.env.EXPO_PUBLIC_BANCARD_ENVIRONMENT,
        publicKey: process.env.EXPO_PUBLIC_BANCARD_PUBLIC_KEY
      }
    }
  }
};