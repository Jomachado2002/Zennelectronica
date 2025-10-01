// src/services/api.js
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// 🌐 URL de tu backend (usando tu IP local para que funcione desde el iPhone)
const BASE_URL = 'http://192.168.0.8:8080/api';

// 📡 Configuración principal de Axios
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // 10 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔐 Interceptor para agregar token automáticamente
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Error obteniendo token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 🔄 Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado - limpiar y redirigir a login
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userData');
      // Aquí puedes agregar navegación al login
    }
    return Promise.reject(error);
  }
);

// 🔑 Funciones de Autenticación
export const authAPI = {
  // Login
  login: async (email, password) => {
    try {
      const response = await api.post('/iniciar-sesion', {
        email: email.toLowerCase(),
        password,
      });
      
      if (response.data.success) {
        // Guardar token de forma segura
        await SecureStore.setItemAsync('userToken', 'dummy-token'); // Tu backend usa cookies
        await SecureStore.setItemAsync('userData', JSON.stringify(response.data.user));
        return response.data;
      }
      throw new Error(response.data.message);
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // Registro
  register: async (name, email, password) => {
    try {
      const response = await api.post('/registro', {
        name,
        email: email.toLowerCase(),
        password,
      });
      
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message);
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // Obtener detalles del usuario
  getUserDetails: async () => {
    try {
      const response = await api.get('/detalles-usuario');
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message);
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // Logout
  logout: async () => {
    try {
      await api.get('/cerrar-sesion');
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userData');
    } catch (error) {
      // Limpiar storage aunque falle la API
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userData');
    }
  },
};

// 📦 Funciones de Productos
export const productsAPI = {
  // Obtener productos para home
  getHomeProducts: async () => {
    try {
      const response = await api.get('/obtener-productos-home');
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message);
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // Obtener productos por categoría
  getProductsByCategory: async (category, subcategory) => {
    try {
      const response = await api.post('/productos-por-categoria', {
        category,
        subcategory,
      });
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message);
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // Obtener detalles de un producto
  getProductDetails: async (productId) => {
    try {
      const response = await api.post('/detalles-producto', {
        productId,
      });
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message);
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // Buscar productos
  searchProducts: async (query) => {
    try {
      const response = await api.get(`/buscar?q=${encodeURIComponent(query)}`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message);
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // Obtener producto por slug
  getProductBySlug: async (slug) => {
    try {
      const response = await api.get(`/producto-por-slug/${slug}`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message);
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },
};

// 🛒 Funciones del Carrito (preparadas para cuando las implementes)
export const cartAPI = {
  // Agregar al carrito
  addToCart: async (productId, quantity = 1) => {
    try {
      const response = await api.post('/agregar-al-carrito', {
        productId,
        quantity,
      });
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message);
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // Obtener carrito
  getCart: async () => {
    try {
      const response = await api.get('/obtener-carrito');
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message);
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },
};

// 🔧 Funciones de utilidad
export const apiUtils = {
  // Test de conexión
  testConnection: async () => {
    try {
      const response = await api.get('/health');
      return response.data.success;
    } catch (error) {
      return false;
    }
  },

  // Verificar estado de autenticación
  checkAuthStatus: async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return false;
      
      const response = await api.get('/detalles-usuario');
      return response.data.success;
    } catch (error) {
      return false;
    }
  },
};

export default api;