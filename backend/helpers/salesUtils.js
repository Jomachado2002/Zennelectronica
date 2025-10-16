/**
 * Sales Utilities - Helper functions for sales calculations and formatting
 */

/**
 * Calculate tax based on Paraguay IVA system
 * @param {number} amount - Base amount
 * @param {string} taxType - 'exempt', 'iva_5', 'iva_10'
 * @param {boolean} priceIncludesTax - Whether price includes tax
 * @returns {object} Tax calculation result
 */
function calculateTax(amount, taxType = 'iva_10', priceIncludesTax = true) {
    const taxRates = {
        'exempt': 0,
        'iva_5': 5,
        'iva_10': 10
    };

    const taxRate = taxRates[taxType] !== undefined ? taxRates[taxType] : 10;
    
    if (taxRate === 0) {
        return {
            baseAmount: amount,
            taxAmount: 0,
            totalAmount: amount,
            taxRate: 0
        };
    }

    if (priceIncludesTax) {
        // Fórmulas específicas de Paraguay para IVA incluido
        let baseAmount, taxAmount;
        
        if (taxRate === 10) {
            // IVA 10%: IVA = Total / 11
            taxAmount = Math.round(amount / 11);
            baseAmount = amount - taxAmount;
        } else if (taxRate === 5) {
            // IVA 5%: IVA = Total / 21
            taxAmount = Math.round(amount / 21);
            baseAmount = amount - taxAmount;
        } else {
            // Para otros porcentajes, usar fórmula estándar
            baseAmount = amount / (1 + (taxRate / 100));
            taxAmount = amount - baseAmount;
        }
        
        return {
            baseAmount: Math.round(baseAmount),
            taxAmount: Math.round(taxAmount),
            totalAmount: amount,
            taxRate
        };
    } else {
        // Calculate forward: base amount without tax
        const taxAmount = amount * (taxRate / 100);
        const totalAmount = amount + taxAmount;
        
        return {
            baseAmount: amount,
            taxAmount: Math.round(taxAmount),
            totalAmount: Math.round(totalAmount),
            taxRate
        };
    }
}

/**
 * Convert number to words in Spanish (Paraguay)
 * @param {number} amount - Amount to convert
 * @param {string} currency - Currency type ('PYG', 'USD', 'EUR')
 * @returns {string} Amount in words
 */
function numberToWords(amount, currency = 'PYG') {
    if (amount === 0) return 'Cero';
    
    const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
    
    const currencyNames = {
        'PYG': 'guaraníes',
        'USD': 'dólares estadounidenses',
        'EUR': 'euros'
    };
    
    function convertHundreds(num) {
        if (num === 0) return '';
        if (num < 10) return units[num];
        if (num < 20) return teens[num - 10];
        if (num < 100) {
            const ten = Math.floor(num / 10);
            const unit = num % 10;
            if (unit === 0) return tens[ten];
            return tens[ten] + ' y ' + units[unit];
        }
        
        const hundred = Math.floor(num / 100);
        const remainder = num % 100;
        let result = hundreds[hundred];
        if (remainder > 0) {
            result += ' ' + convertHundreds(remainder);
        }
        return result;
    }
    
    function convertThousands(num) {
        if (num < 1000) return convertHundreds(num);
        
        const thousand = Math.floor(num / 1000);
        const remainder = num % 1000;
        
        let result = '';
        if (thousand === 1) {
            result = 'mil';
        } else {
            result = convertHundreds(thousand) + ' mil';
        }
        
        if (remainder > 0) {
            result += ' ' + convertHundreds(remainder);
        }
        
        return result;
    }
    
    function convertMillions(num) {
        if (num < 1000000) return convertThousands(num);
        
        const million = Math.floor(num / 1000000);
        const remainder = num % 1000000;
        
        let result = '';
        if (million === 1) {
            result = 'un millón';
        } else {
            result = convertHundreds(million) + ' millones';
        }
        
        if (remainder > 0) {
            result += ' ' + convertThousands(remainder);
        }
        
        return result;
    }
    
    function convertBillions(num) {
        if (num < 1000000000) return convertMillions(num);
        
        const billion = Math.floor(num / 1000000000);
        const remainder = num % 1000000000;
        
        let result = '';
        if (billion === 1) {
            result = 'mil millones';
        } else {
            result = convertHundreds(billion) + ' mil millones';
        }
        
        if (remainder > 0) {
            result += ' ' + convertMillions(remainder);
        }
        
        return result;
    }
    
    const words = convertBillions(amount);
    const currencyName = currencyNames[currency] || 'guaraníes';
    
    return words.charAt(0).toUpperCase() + words.slice(1) + ' ' + currencyName;
}

/**
 * Calculate payment due date based on terms
 * @param {Date} saleDate - Date of sale
 * @param {string} paymentTerms - Payment terms
 * @param {string} customTerms - Custom payment terms (if applicable)
 * @returns {Date} Due date
 */
function calculateDueDate(saleDate, paymentTerms, customTerms = '') {
    const date = new Date(saleDate);
    
    switch (paymentTerms) {
        case 'efectivo':
            return date; // Same day
        case 'net_15':
            date.setDate(date.getDate() + 15);
            break;
        case 'net_30':
            date.setDate(date.getDate() + 30);
            break;
        case 'net_60':
            date.setDate(date.getDate() + 60);
            break;
        case 'net_90':
            date.setDate(date.getDate() + 90);
            break;
        case 'personalizado':
            // Try to parse custom terms (e.g., "45 days", "2 months")
            const customMatch = customTerms.match(/(\d+)\s*(días?|days?|meses?|months?)/i);
            if (customMatch) {
                const number = parseInt(customMatch[1]);
                const unit = customMatch[2].toLowerCase();
                if (unit.includes('día') || unit.includes('day')) {
                    date.setDate(date.getDate() + number);
                } else if (unit.includes('mes') || unit.includes('month')) {
                    date.setMonth(date.getMonth() + number);
                }
            }
            break;
        default:
            date.setDate(date.getDate() + 30); // Default to 30 days
    }
    
    return date;
}

/**
 * Format currency amount for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @param {number} exchangeRate - Exchange rate (for USD/EUR to PYG)
 * @returns {object} Formatted amounts
 */
function formatCurrency(amount, currency = 'PYG', exchangeRate = 1) {
    const formatter = new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: currency === 'PYG' ? 'PYG' : currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
    
    const formattedAmount = formatter.format(amount);
    
    let result = {
        amount: amount,
        formatted: formattedAmount,
        currency: currency
    };
    
    // If not PYG, also show PYG equivalent
    if (currency !== 'PYG' && exchangeRate > 1) {
        const pygAmount = amount * exchangeRate;
        result.pygEquivalent = {
            amount: pygAmount,
            formatted: new Intl.NumberFormat('es-PY', {
                style: 'currency',
                currency: 'PYG',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(pygAmount)
        };
    }
    
    return result;
}

/**
 * Validate RUC (Paraguay tax ID)
 * @param {string} ruc - RUC to validate
 * @returns {boolean} Is valid RUC
 */
function validateRUC(ruc) {
    if (!ruc || typeof ruc !== 'string') return false;
    
    // Remove any non-digit characters
    const cleanRuc = ruc.replace(/\D/g, '');
    
    // RUC should be 7-8 digits
    if (cleanRuc.length < 7 || cleanRuc.length > 8) return false;
    
    // Basic validation - could be enhanced with actual RUC algorithm
    return /^\d{7,8}$/.test(cleanRuc);
}

/**
 * Generate default consumer final data
 * @returns {object} Default consumer final data
 */
function getDefaultConsumerFinal() {
    return {
        name: 'Consumidor Final',
        taxId: '44444401-7',
        address: {
            street: 'Asunción',
            city: 'Asunción',
            state: 'Central',
            country: 'Paraguay'
        },
        email: '',
        phone: ''
    };
}

/**
 * Calculate exchange rate for currency conversion
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency
 * @param {string} toCurrency - Target currency
 * @param {number} exchangeRate - Exchange rate
 * @returns {object} Conversion result
 */
function convertCurrency(amount, fromCurrency, toCurrency, exchangeRate) {
    if (fromCurrency === toCurrency) {
        return {
            originalAmount: amount,
            convertedAmount: amount,
            exchangeRate: 1,
            fromCurrency,
            toCurrency
        };
    }
    
    let convertedAmount;
    if (fromCurrency === 'PYG' && toCurrency === 'USD') {
        convertedAmount = amount / exchangeRate;
    } else if (fromCurrency === 'USD' && toCurrency === 'PYG') {
        convertedAmount = amount * exchangeRate;
    } else {
        // For other currencies, assume USD as intermediate
        const usdAmount = fromCurrency === 'PYG' ? amount / exchangeRate : amount;
        convertedAmount = toCurrency === 'PYG' ? usdAmount * exchangeRate : usdAmount;
    }
    
    return {
        originalAmount: amount,
        convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
        exchangeRate,
        fromCurrency,
        toCurrency
    };
}

module.exports = {
    calculateTax,
    numberToWords,
    calculateDueDate,
    formatCurrency,
    validateRUC,
    getDefaultConsumerFinal,
    convertCurrency
};
