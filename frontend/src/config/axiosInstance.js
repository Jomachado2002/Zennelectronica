import axios from "axios";

// Detectar el dominio del backend
// Si REACT_APP_BACKEND_URL está definido, usarlo
// Si no, usar URL relativa (mismo dominio) para producción en Vercel
const getBackendURL = () => {
    if (process.env.REACT_APP_BACKEND_URL) {
        return process.env.REACT_APP_BACKEND_URL;
    }
    // En producción (Vercel), usar el mismo dominio
    if (typeof window !== 'undefined' && window.location.origin) {
        return window.location.origin;
    }
    // Fallback para desarrollo local
    return 'http://localhost:8080';
};

const axiosInstance = axios.create({
    baseURL: getBackendURL(),
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // Include cookies in requests
});
    
export default axiosInstance;
