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
    try {
        token = localStorage.getItem('authToken');
    } catch (e) {
        // localStorage puede no estar disponible en algunos contextos
    }

    // 2. Intentar obtener de window (si se guardó ahí)
    if (!token && typeof window !== 'undefined' && window.authToken) {
        token = window.authToken;
    }

    // 3. Intentar leer de cookies manualmente (solo en navegador)
    if (!token && typeof document !== 'undefined' && document.cookie) {
        try {
            const cookies = document.cookie.split(';');
            for (const cookie of cookies) {
                const [key, value] = cookie.trim().split('=');
                if (key === 'token' && value && value !== 'undefined' && value !== 'null') {
                    token = decodeURIComponent(value);
                    break;
                }
            }
        } catch (e) {
            // Error al leer cookies, continuar sin token
        }
    }

    // ✅ SI HAY TOKEN VÁLIDO, AGREGARLO A LOS HEADERS
    // authFetch funciona tanto con token (usuario logueado) como sin token (invitado)
    if (token && token !== 'undefined' && token !== 'null' && token.trim() !== '') {
        headers['Authorization'] = `Bearer ${token}`;
        // También como header alternativo para compatibilidad con iOS/Vercel
        headers['x-auth-token'] = token;
    }
    // ✅ SI NO HAY TOKEN, NO AGREGAR NADA - EL BACKEND MANEJARÁ COMO INVITADO

    // ✅ PREPARAR OPCIONES FINALES
    const finalOptions = {
        ...options,
        credentials: 'include', // Siempre incluir cookies (puede haber cookies de sesión)
        headers
    };

    // ✅ LOG PARA DEBUG (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
        console.log('🔐 authFetch:', {
            url,
            method: finalOptions.method || 'GET',
            hasToken: !!token,
            tokenPreview: token ? `${token.substring(0, 15)}...` : 'NO TOKEN (invitado)',
            headers: Object.keys(headers),
            mode: token ? 'authenticated' : 'guest'
        });
    }

    // Realizar la petición
    // ✅ EL BACKEND DEBE MANEJAR AMBOS CASOS:
    // - Con token: usuario autenticado
    // - Sin token: usuario invitado (si el endpoint lo permite)
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

