// backend/utils/priceCalculator.js
// Utilidades para el cálculo de precios en el sistema de sincronización de inventario

/**
 * Calcula todos los precios relacionados con un producto basado en el precio USD
 * @param {number} purchasePriceUSD - Precio de compra en USD
 * @param {number} exchangeRate - Tipo de cambio (por defecto: 7300)
 * @param {number} deliveryCost - Costo de envío (por defecto: 30000)
 * @param {number} profitMargin - Margen de ganancia como porcentaje (por defecto: 20 = 20%)
 * @returns {Object} Objeto con todos los precios calculados
 */
function calculatePrices(purchasePriceUSD, exchangeRate = 7300, deliveryCost = 30000, profitMargin = 20) {
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

        // Validar que el margen esté entre 0 y 100
        if (margin < 0 || margin > 100) {
            throw new Error('El margen de ganancia debe estar entre 0 y 100');
        }

        // Cálculo del precio de compra en PYG
        const purchasePrice = priceUSD * rate;

        // Costo total (precio de compra + envío)
        const totalCost = purchasePrice + delivery;

        // Precio de venta (aplicando margen de ganancia)
        // Convertir porcentaje a decimal para el cálculo
        const marginDecimal = margin / 100;
        const sellingPrice = Math.round(totalCost / (1 - marginDecimal));

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
            profitMarginPercent: Math.round(margin) // Margen como porcentaje
        };

    } catch (error) {
        // console.error removed for production
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

/** Visão Vip: margen vía divisor (ej. 0,83) + envío fijo en Gs. */
const VISAO_VIP_MARGIN_DIVISOR =
    Number(process.env.VISAO_VIP_MARGIN_DIVISOR) > 0 && Number(process.env.VISAO_VIP_MARGIN_DIVISOR) < 1
        ? Number(process.env.VISAO_VIP_MARGIN_DIVISOR)
        : 0.83;

const VISAO_VIP_DELIVERY_PYG =
    Number(process.env.VISAO_VIP_DELIVERY_PYG) >= 0 && Number.isFinite(Number(process.env.VISAO_VIP_DELIVERY_PYG))
        ? Number(process.env.VISAO_VIP_DELIVERY_PYG)
        : 30000;

/**
 * Precio de venta Visão Vip:
 * - Si el PDP viene en USD: basePyg = usd × cotización (Mongo) → ((basePyg / 0,83) + 30000)
 * - Si el PDP viene en Gs.: ((montoGs / 0,83) + 30000) sin pasar por USD para el cálculo
 * - Si hay precio lista (tachado): `price` usa la misma fórmula; si no, `price` = 0
 */
function calculateVisaoVipPrices(opts = {}) {
    const {
        precioFuente,
        precioUsd,
        precioPygRaw,
        exchangeRate,
        precioListaFuente,
        precioListaUsd,
        precioListaPygRaw
    } = opts;
    const rate = Number(exchangeRate);
    if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error('El tipo de cambio debe ser mayor a 0');
    }

    const divisor = VISAO_VIP_MARGIN_DIVISOR;
    const delivery = VISAO_VIP_DELIVERY_PYG;

    function resolveBase(fuenteIn, usdIn, pygIn) {
        const fuente = String(fuenteIn || '').toUpperCase();
        if (fuente === 'PYG') {
            const pyg = Math.round(Number(pygIn));
            if (!Number.isFinite(pyg) || pyg <= 0) {
                throw new Error('Precio en guaraníes inválido');
            }
            return {
                fuente: 'PYG',
                basePyg: pyg,
                purchasePriceUSD: Math.round((pyg / rate) * 100) / 100
            };
        }
        const usd = Number(usdIn);
        if (!Number.isFinite(usd) || usd <= 0) {
            throw new Error('Precio en USD inválido');
        }
        return {
            fuente: 'USD',
            basePyg: Math.round(usd * rate),
            purchasePriceUSD: usd
        };
    }

    const sale = resolveBase(precioFuente, precioUsd, precioPygRaw);
    const sellingPrice = Math.round(sale.basePyg / divisor + delivery);
    const purchasePrice = sale.basePyg;
    const profitAmount = sellingPrice - purchasePrice - delivery;

    let listPrice = 0;
    const listaFuente = String(precioListaFuente || '').toUpperCase();
    if (
        (listaFuente === 'USD' && Number(precioListaUsd) > 0) ||
        (listaFuente === 'PYG' && Number(precioListaPygRaw) > 0)
    ) {
        try {
            const list = resolveBase(listaFuente, precioListaUsd, precioListaPygRaw);
            const computedList = Math.round(list.basePyg / divisor + delivery);
            // Solo tachar si el precio lista (ya transformado) queda por encima del de oferta
            if (computedList > sellingPrice) {
                listPrice = computedList;
            }
        } catch {
            listPrice = 0;
        }
    }

    return {
        purchasePriceUSD: sale.purchasePriceUSD,
        exchangeRate: rate,
        purchasePrice,
        deliveryCost: delivery,
        profitMargin: Math.round((1 - divisor) * 100),
        profitAmount: Math.round(profitAmount),
        sellingPrice,
        totalCost: purchasePrice + delivery,
        price: listPrice,
        precioFuente: sale.fuente,
        precioBasePyg: sale.basePyg,
        visaoMarginDivisor: divisor
    };
}

module.exports = {
    calculatePrices,
    calculateVisaoVipPrices,
    isValidPriceUSD,
    formatPrice,
    convertPYGtoUSD,
    convertUSDtoPYG,
    VISAO_VIP_MARGIN_DIVISOR,
    VISAO_VIP_DELIVERY_PYG
};
