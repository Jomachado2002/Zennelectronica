// frontend/src/helpers/authFetch.js
// Helper para realizar peticiones autenticadas incluyendo el token

/**
 * Realiza una petición fetch incluyendo automáticamente el token de autenticación
 * @param {string} url - URL del endpoint
 * @param {object} options - Opciones de fetch (method, body, headers, etc.)
 * @returns {Promise<Response>} - Respuesta de la petición
 */
export const authFetch = async (url, options = {}) => {
    // Preparar headers base
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    // ✅ BUSCAR TOKEN EN MÚLTIPLES LUGARES
    let token = null;

    // 1. Intentar obtener de localStorage
    token = localStorage.getItem('authToken');

    // 2. Intentar obtener de window (si se guardó ahí)
    if (!token && window.authToken) {
        token = window.authToken;
    }

    // 3. Intentar leer de cookies manualmente
    if (!token && document.cookie) {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [key, value] = cookie.trim().split('=');
            if (key === 'token' && value && value !== 'undefined') {
                token = decodeURIComponent(value);
                break;
            }
        }
    }

    // ✅ SI HAY TOKEN, AGREGARLO A LOS HEADERS
    if (token && token !== 'undefined' && token !== 'null') {
        headers['Authorization'] = `Bearer ${token}`;
        // También como header alternativo para compatibilidad con iOS/Vercel
        headers['x-auth-token'] = token;
    }

    // ✅ PREPARAR OPCIONES FINALES
    const finalOptions = {
        ...options,
        credentials: 'include', // Siempre incluir cookies
        headers
    };

    // ✅ LOG PARA DEBUG (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
        console.log('🔐 authFetch:', {
            url,
            method: finalOptions.method || 'GET',
            hasToken: !!token,
            tokenPreview: token ? `${token.substring(0, 15)}...` : 'NO TOKEN',
            headers: Object.keys(headers)
        });
    }

    // Realizar la petición
    return fetch(url, finalOptions);
};

/**
 * Helper específico para peticiones GET autenticadas
 */
export const authGet = async (url, options = {}) => {
    return authFetch(url, { ...options, method: 'GET' });
};

/**
 * Helper específico para peticiones POST autenticadas
 */
export const authPost = async (url, data = null, options = {}) => {
    const finalOptions = {
        ...options,
        method: 'POST'
    };

    if (data) {
        finalOptions.body = JSON.stringify(data);
    }

    return authFetch(url, finalOptions);
};

/**
 * Helper específico para peticiones PUT autenticadas
 */
export const authPut = async (url, data = null, options = {}) => {
    const finalOptions = {
        ...options,
        method: 'PUT'
    };

    if (data) {
        finalOptions.body = JSON.stringify(data);
    }

    return authFetch(url, finalOptions);
};

/**
 * Helper específico para peticiones DELETE autenticadas
 */
export const authDelete = async (url, options = {}) => {
    return authFetch(url, { ...options, method: 'DELETE' });
};

export default authFetch;

