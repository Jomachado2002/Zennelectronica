// src/common/index.js
// 🌐 USANDO CONFIG DESDE .env - IGUAL QUE TU FRONTEND WEB

import { CONFIG } from '../constants/config';

const backendDomain = CONFIG.API_BASE_URL.replace('/api', ''); // Remover /api para obtener dominio base

const SummaryApi = {
    // ===========================================
    // AUTENTICACIÓN - IGUAL QUE TU WEB
    // ===========================================
    signIn: {
        url: `${CONFIG.API_BASE_URL}/iniciar-sesion`,
        method: "post"
    },
    SignUP: {
        url: `${CONFIG.API_BASE_URL}/registro`,
        method: "post"
    },
    current_user: {
        url: `${CONFIG.API_BASE_URL}/detalles-usuario`,
        method: "get"
    },
    logout_user: {
        url: `${CONFIG.API_BASE_URL}/cerrar-sesion`,
        method: "get"
    },

    // ===========================================
    // PRODUCTOS - PREPARADO PARA DESPUÉS
    // ===========================================
    allProduct: {
        url: `${CONFIG.API_BASE_URL}/obtener-productos-admin`,
        method: 'get'
    },
    categoryWiseProduct: {
        url: `${CONFIG.API_BASE_URL}/productos-por-categoria`,
        method: 'post'
    },
    productDetails: {
        url: `${CONFIG.API_BASE_URL}/detalles-producto`,
        method: 'post'
    },
    searchProduct: {
        url: `${CONFIG.API_BASE_URL}/buscar`,
        method: 'get'
    },

    // Base URL para uso general
    baseURL: backendDomain,
};

// 🔍 Debug en desarrollo
if (__DEV__) {
  console.log('🌐 SummaryApi configurado:', {
    baseURL: SummaryApi.baseURL,
    signInUrl: SummaryApi.signIn.url
  });
}

export default SummaryApi;