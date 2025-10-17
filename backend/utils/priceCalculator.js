// backend/utils/priceCalculator.js
// Utilidades para el cálculo de precios en el sistema de sincronización de inventario

/**
 * Calcula todos los precios relacionados con un producto basado en el precio USD
 * @param {number} purchasePriceUSD - Precio de compra en USD
 * @param {number} exchangeRate - Tipo de cambio (por defecto: 7300)
 * @param {number} deliveryCost - Costo de envío (por defecto: 30000)
 * @param {number} profitMargin - Margen de ganancia como decimal (por defecto: 0.25 = 25%)
 * @returns {Object} Objeto con todos los precios calculados
 */
function calculatePrices(purchasePriceUSD, exchangeRate = 7300, deliveryCost = 30000, profitMargin = 0.25) {
    try {
        // Validar parámetros
        if (!purchasePriceUSD || purchasePriceUSD <= 0) {
            throw new Error('El precio de compra en USD debe ser mayor a 0');
        }

        // Convertir tipos
        const priceUSD = parseFloat(purchasePriceUSD);
        const rate = parseFloat(exchangeRate);
        const delivery = parseFloat(deliveryCost);
        const margin = parseFloat(profitMargin);

        // Validar que el margen esté entre 0 y 1
        if (margin < 0 || margin >= 1) {
            throw new Error('El margen de ganancia debe estar entre 0 y 1 (0-100%)');
        }

        // Cálculo del precio de compra en PYG
        const purchasePrice = priceUSD * rate;

        // Costo total (precio de compra + envío)
        const totalCost = purchasePrice + delivery;

        // Precio de venta (aplicando margen de ganancia)
        const sellingPrice = Math.round(totalCost / (1 - margin));

        // Monto de ganancia
        const profitAmount = sellingPrice - totalCost;

        return {
            purchasePriceUSD: priceUSD,
            exchangeRate: rate,
            deliveryCost: delivery,
            profitMargin: margin,
            purchasePrice: Math.round(purchasePrice),
            totalCost: Math.round(totalCost),
            sellingPrice: sellingPrice,
            profitAmount: Math.round(profitAmount),
            // Campos adicionales para compatibilidad
            price: 0, // Siempre 0 como especificado
            profitMarginPercent: Math.round(margin * 100) // Margen como porcentaje
        };

    } catch (error) {
        console.error('Error calculando precios:', error.message);
        throw error;
    }
}

/**
 * Valida si un precio USD es válido
 * @param {any} priceUSD - Precio a validar
 * @returns {boolean} True si es válido
 */
function isValidPriceUSD(priceUSD) {
    const price = parseFloat(priceUSD);
    return !isNaN(price) && price > 0 && price < 100000; // Límite razonable
}

/**
 * Formatea un precio para mostrar
 * @param {number} price - Precio a formatear
 * @param {string} currency - Moneda ('USD', 'PYG')
 * @returns {string} Precio formateado
 */
function formatPrice(price, currency = 'PYG') {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return '0';

    if (currency === 'USD') {
        return `U$ ${numPrice.toFixed(2)}`;
    } else {
        // Formato para PYG (guaraníes)
        return `G$ ${numPrice.toLocaleString('es-PY')}`;
    }
}

/**
 * Convierte precio de PYG a USD
 * @param {number} pricePYG - Precio en PYG
 * @param {number} exchangeRate - Tipo de cambio
 * @returns {number} Precio en USD
 */
function convertPYGtoUSD(pricePYG, exchangeRate = 7300) {
    return parseFloat(pricePYG) / parseFloat(exchangeRate);
}

/**
 * Convierte precio de USD a PYG
 * @param {number} priceUSD - Precio en USD
 * @param {number} exchangeRate - Tipo de cambio
 * @returns {number} Precio en PYG
 */
function convertUSDtoPYG(priceUSD, exchangeRate = 7300) {
    return parseFloat(priceUSD) * parseFloat(exchangeRate);
}

module.exports = {
    calculatePrices,
    isValidPriceUSD,
    formatPrice,
    convertPYGtoUSD,
    convertUSDtoPYG
};
