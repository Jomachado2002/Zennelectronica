// frontend/src/helpers/taxCalculator.js
// Helper para cálculos de IVA (10%)

/**
 * Calcula el desglose de IVA desde un precio que YA incluye IVA
 * @param {number} priceWithIVA - Precio final que incluye IVA
 * @returns {object} - Objeto con el desglose
 */
export const calculateIVABreakdown = (priceWithIVA) => {
    const ivaRate = 0.10; // 10%
    const priceWithoutIVA = priceWithIVA / (1 + ivaRate);
    const ivaAmount = priceWithIVA - priceWithoutIVA;
    
    return {
        priceWithoutIVA: Math.round(priceWithoutIVA),
        ivaAmount: Math.round(ivaAmount),
        priceWithIVA: Math.round(priceWithIVA),
        ivaRate: ivaRate
    };
};

/**
 * Formatea el desglose de IVA para mostrar
 * @param {number} totalPrice - Precio total con IVA incluido
 * @returns {object} - Objeto con valores formateados
 */
export const formatIVABreakdown = (totalPrice) => {
    const breakdown = calculateIVABreakdown(totalPrice);
    
    return {
        subtotal: breakdown.priceWithoutIVA,
        iva: breakdown.ivaAmount,
        total: breakdown.priceWithIVA,
        subtotalFormatted: new Intl.NumberFormat('es-PY', {
            style: 'currency',
            currency: 'PYG',
            minimumFractionDigits: 0
        }).format(breakdown.priceWithoutIVA),
        ivaFormatted: new Intl.NumberFormat('es-PY', {
            style: 'currency',
            currency: 'PYG',
            minimumFractionDigits: 0
        }).format(breakdown.ivaAmount),
        totalFormatted: new Intl.NumberFormat('es-PY', {
            style: 'currency',
            currency: 'PYG',
            minimumFractionDigits: 0
        }).format(breakdown.priceWithIVA)
    };
};