// backend/helpers/bancardUtils.js - VERSIÓN COMPLETA CON generateShopProcessId
const crypto = require('crypto');

/**
 * Utilidades para trabajar con Bancard vPOS 2.0
 */

/**
 * Genera el token MD5 requerido por Bancard para single_buy
 * @param {string} shopProcessId - ID único de la transacción
 * @param {number} amount - Monto en guaraníes
 * @param {string} currency - Moneda (PYG)
 * @returns {string} Token MD5
 */
const generateSingleBuyToken = (shopProcessId, amount, currency = 'PYG') => {
    const privateKey = process.env.BANCARD_PRIVATE_KEY;
    
    // ✅ IMPORTANTE: Formatear el monto EXACTAMENTE como lo requiere Bancard
    const formattedAmount = Number(amount).toFixed(2);
    
    // ✅ ORDEN CORRECTO: private_key + shop_process_id + amount + currency
    const hashString = `${privateKey}${shopProcessId}${formattedAmount}${currency}`;
    
    console.log('🔐 Generando token MD5 para Bancard:', {
        privateKey: privateKey ? `${privateKey.substring(0, 10)}...` : 'NO CONFIGURADA',
        shopProcessId,
        amount: formattedAmount,
        currency,
        hashString: `${hashString.substring(0, 20)}...` // Solo mostrar inicio por seguridad
    });
    
    // ✅ Generar MD5
    const token = crypto.createHash('md5').update(hashString, 'utf8').digest('hex');
    
    
    
    return token;
};

/**
 * ✅ FUNCIÓN MEJORADA: Genera un ID de proceso único (SOLO NÚMEROS como requiere Bancard)
 * @returns {number} ID único numérico
 */
const generateShopProcessId = () => {
    // ✅ ESTRATEGIA ULTRA ÚNICA: Combinar timestamp + microsegundos + aleatorio
    const now = Date.now();
    const microseconds = process.hrtime ? process.hrtime.bigint() : BigInt(now * 1000);
    const random = Math.floor(Math.random() * 99999);
    
    // Crear ID único de 10-12 dígitos para evitar conflictos
    const uniquePart = Number(microseconds.toString().slice(-6)); // Últimos 6 dígitos de microsegundos
    const timePart = Number(now.toString().slice(-6)); // Últimos 6 dígitos del timestamp
    const randomPart = Math.floor(Math.random() * 999); // 3 dígitos aleatorios
    
    // Combinar las partes para crear un ID único
    const shopProcessId = parseInt(`${timePart}${randomPart}`);
    
    console.log('🆔 Generando shop_process_id ÚNICO:', {
        shopProcessId,
        timestamp: now,
        microseconds: microseconds.toString(),
        timePart,
        randomPart,
        length: shopProcessId.toString().length
    });
    
    // ✅ VERIFICAR QUE SEA UN NÚMERO VÁLIDO
    if (isNaN(shopProcessId) || shopProcessId <= 0) {
        console.error('❌ shop_process_id inválido generado:', shopProcessId);
        // Fallback a timestamp simple
        return Date.now();
    }
    
    return shopProcessId;
};

/**
 * Verifica si un token de confirmación es válido
 * @param {string} receivedToken - Token recibido de Bancard
 * @param {string} shopProcessId - ID de la transacción
 * @param {number} amount - Monto de la transacción
 * @param {string} currency - Moneda
 * @returns {boolean} True si el token es válido
 */
const verifyConfirmationToken = (receivedToken, shopProcessId, amount, currency = 'PYG') => {
    const privateKey = process.env.BANCARD_PRIVATE_KEY;
    const formattedAmount = Number(amount).toFixed(2);
    
    // ✅ Para confirmación: private_key + shop_process_id + "confirm" + amount + currency
    const hashString = `${privateKey}${shopProcessId}confirm${formattedAmount}${currency}`;
    const expectedToken = crypto.createHash('md5').update(hashString, 'utf8').digest('hex');
    
    console.log('🔍 Verificando token de confirmación:', {
        received: receivedToken,
        expected: expectedToken,
        match: receivedToken === expectedToken
    });
    
    return receivedToken === expectedToken;
};

/**
 * Obtiene la URL base según el ambiente
 * @returns {string} URL base de Bancard
 */
const getBancardBaseUrl = () => {
    const environment = process.env.BANCARD_ENVIRONMENT || 'staging';
    
    if (environment === 'production') {
        return 'https://vpos.infonet.com.py';
    } else {
        return 'https://vpos.infonet.com.py:8888';
    }
};

/**
 * Valida la configuración de Bancard
 * @returns {Object} Resultado de la validación
 */
const validateBancardConfig = () => {
    const errors = [];
    
    if (!process.env.BANCARD_PUBLIC_KEY) {
        errors.push('BANCARD_PUBLIC_KEY no está configurada');
    }
    
    if (!process.env.BANCARD_PRIVATE_KEY) {
        errors.push('BANCARD_PRIVATE_KEY no está configurada');
    }
    
    if (!process.env.BANCARD_CONFIRMATION_URL) {
        errors.push('BANCARD_CONFIRMATION_URL no está configurada');
    }
    
    // ✅ Validar formato de las claves según documentación
    if (process.env.BANCARD_PUBLIC_KEY && process.env.BANCARD_PUBLIC_KEY.length !== 32) {
        errors.push('BANCARD_PUBLIC_KEY debe tener exactamente 32 caracteres');
    }
    
    if (process.env.BANCARD_PRIVATE_KEY && process.env.BANCARD_PRIVATE_KEY.length !== 40) {
        errors.push('BANCARD_PRIVATE_KEY debe tener exactamente 40 caracteres');
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        config: {
            publicKey: process.env.BANCARD_PUBLIC_KEY,
            privateKey: process.env.BANCARD_PRIVATE_KEY ? `${process.env.BANCARD_PRIVATE_KEY.substring(0, 10)}...` : null,
            environment: process.env.BANCARD_ENVIRONMENT || 'staging',
            baseUrl: getBancardBaseUrl(),
            confirmationUrl: process.env.BANCARD_CONFIRMATION_URL
        }
    };
};

/**
 * Formatea un monto para Bancard (siempre con 2 decimales)
 * @param {number} amount - Monto a formatear
 * @returns {string} Monto formateado
 */
const formatAmount = (amount) => {
    return Number(amount).toFixed(2);
};

/**
 * Parsea el monto desde string a número
 * @param {string} amountStr - Monto como string
 * @returns {number} Monto como número
 */
const parseAmount = (amountStr) => {
    return parseFloat(amountStr || '0');
};

/**
 * ✅ NUEVA FUNCIÓN: Genera token para pago con alias
 * @param {string} shopProcessId - ID de la transacción
 * @param {number} amount - Monto
 * @param {string} currency - Moneda
 * @param {string} aliasToken - Token de la tarjeta
 * @returns {string} Token MD5
 */
const generateChargeToken = (shopProcessId, amount, currency, aliasToken) => {
    const privateKey = process.env.BANCARD_PRIVATE_KEY;
    const formattedAmount = Number(amount).toFixed(2);
    
    // ✅ ORDEN PARA CHARGE: private_key + shop_process_id + "charge" + amount + currency + alias_token
    const hashString = `${privateKey}${shopProcessId}charge${formattedAmount}${currency}${aliasToken}`;
    const token = crypto.createHash('md5').update(hashString, 'utf8').digest('hex');
    
    console.log('🔐 Token de charge generado:', {
        shopProcessId,
        amount: formattedAmount,
        currency,
        aliasToken: `${aliasToken.substring(0, 20)}...`,
        token
    });
    
    return token;
};

/**
 * ✅ NUEVA FUNCIÓN: Genera token para eliminar tarjeta
 * @param {string} userId - ID del usuario
 * @param {string} aliasToken - Token de la tarjeta
 * @returns {string} Token MD5
 */
const generateDeleteCardToken = (userId, aliasToken) => {
    const privateKey = process.env.BANCARD_PRIVATE_KEY;
    
    // ✅ ORDEN PARA DELETE: private_key + "delete_card" + user_id + alias_token
    const hashString = `${privateKey}delete_card${userId}${aliasToken}`;
    const token = crypto.createHash('md5').update(hashString, 'utf8').digest('hex');
    
    console.log('🔐 Token de eliminación generado:', {
        userId,
        aliasToken: `${aliasToken.substring(0, 20)}...`,
        token
    });
    
    return token;
};

module.exports = {
    generateSingleBuyToken,
    verifyConfirmationToken,
    generateShopProcessId, // ✅ EXPORTAR NUEVA FUNCIÓN
    getBancardBaseUrl,
    validateBancardConfig,
    formatAmount,
    parseAmount,
    generateChargeToken, // ✅ EXPORTAR NUEVA FUNCIÓN
    generateDeleteCardToken // ✅ EXPORTAR NUEVA FUNCIÓN
};