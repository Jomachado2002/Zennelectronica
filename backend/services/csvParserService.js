// backend/services/csvParserService.js
// Servicio para parsear archivos CSV del proveedor

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Readable } = require('stream');

/**
 * Extrae el código del producto desde el formato "Cód.: 54460"
 * @param {string} codeString - String con el código
 * @returns {string} Código extraído
 */
function extractCode(codeString) {
    try {
        if (!codeString || typeof codeString !== 'string') {
            return '';
        }
        
        // Buscar patrón "Cód.: 54460" o similar
        const match = codeString.match(/Cód\.:?\s*(\d+)/i);
        if (match) {
            return match[1].trim();
        }
        
        // Si no encuentra el patrón, devolver el string limpio
        return codeString.trim();
        
    } catch (error) {
        // console.error removed for production
        return '';
    }
}

/**
 * Extrae el precio USD desde el formato "U$ 865,00"
 * @param {string} priceString - String con el precio
 * @returns {number} Precio extraído
 */
function extractPrice(priceString) {
    try {
        if (!priceString || typeof priceString !== 'string') {
            return 0;
        }
        
        // Limpiar el string y extraer números
        const cleanPrice = priceString
            .replace(/[^\d.,]/g, '') // Solo números, puntos y comas
            .replace(',', '.'); // Coma decimal por punto
        
        const price = parseFloat(cleanPrice);
        return isNaN(price) ? 0 : price;
        
    } catch (error) {
        // console.error removed for production
        return 0;
    }
}

/**
 * Normaliza el nombre del producto para comparación
 * @param {string} productName - Nombre del producto
 * @returns {string} Nombre normalizado
 */
function normalizeProductName(productName) {
    if (!productName || typeof productName !== 'string') {
        return '';
    }
    
    return productName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/[^a-z0-9\s]/g, ' ')    // Solo alfanuméricos y espacios
        .replace(/\s+/g, ' ')            // Múltiples espacios por uno solo
        .trim();
}

/**
 * Parsea una fila CSV del proveedor
 * @param {Object} csvRow - Fila del CSV parseado
 * @returns {Object} Producto parseado
 */
function parseCSVRow(csvRow) {
    try {
        // Extraer campos
        const providerCode = extractCode(csvRow['card-dtw-codigo-lista']);
        const productName = csvRow['card-dtw-subtitulo'] || '';
        const priceUSD = extractPrice(csvRow['card-dtw-preco-dolar']);
        const imageUrl = csvRow['img-dtw-prod src'] || '';
        const productUrl = csvRow['link-dtw-prod href'] || '';
        const priceReal = csvRow['card-dtw-preco-real'] || '';
        const priceGuarani = csvRow['card-dtw-preco-guarani'] || '';

        // Validar campos requeridos
        if (!providerCode) {
            throw new Error('Código del producto no encontrado');
        }
        
        if (!productName) {
            throw new Error('Nombre del producto no encontrado');
        }

        return {
            providerCode,
            productName,
            priceUSD,
            imageUrl,
            productUrl,
            priceReal,
            priceGuarani,
            normalizedName: normalizeProductName(productName),
            // Campos adicionales para compatibilidad
            rawData: csvRow
        };

    } catch (error) {
        // console.error removed for production
        throw error;
    }
}

/**
 * Parsea un archivo CSV completo usando csv-parser
 * @param {Buffer} csvBuffer - Buffer del archivo CSV
 * @returns {Promise<Object>} Resultado del parsing
 */
async function parseCSVFile(csvBuffer) {
    return new Promise((resolve, reject) => {
        const products = [];
        const errors = [];
        let rowCount = 0;

        const stream = Readable.from(csvBuffer.toString());

        stream
            .pipe(csv({
                separator: ',',
                skipEmptyLines: true,
                skipLinesWithError: false
            }))
            .on('data', (data) => {
                rowCount++;
                try {
                    // Parsear producto
                    const product = parseCSVRow(data);
                    products.push(product);
                } catch (error) {
                    // console.error removed for production
                    errors.push({
                        row: rowCount,
                        error: error.message,
                        data: data
                    });
                }
            })
            .on('end', () => {
                // console.log removed for production
                resolve({
                    products,
                    errors,
                    totalRows: rowCount,
                    validProducts: products.length,
                    invalidRows: errors.length
                });
            })
            .on('error', (error) => {
                // console.error removed for production
                reject(error);
            });
    });
}

/**
 * Valida la estructura de un archivo CSV
 * @param {Buffer} csvBuffer - Buffer del archivo CSV
 * @returns {Promise<Object>} Resultado de la validación
 */
async function validateCSVStructure(csvBuffer) {
    return new Promise((resolve, reject) => {
        const stream = Readable.from(csvBuffer.toString());
        let headers = [];
        let hasData = false;

        stream
            .pipe(csv({
                separator: ',',
                skipEmptyLines: true,
                skipLinesWithError: false
            }))
            .on('headers', (headerList) => {
                headers = headerList;
            })
            .on('data', () => {
                hasData = true;
            })
            .on('end', () => {
                // Validar encabezados requeridos
                const requiredHeaders = [
                    'link-dtw-prod href',
                    'img-dtw-prod src',
                    'card-dtw-subtitulo',
                    'card-dtw-preco-dolar', 
                    'card-dtw-codigo-lista',
                    'card-dtw-preco-real',
                    'card-dtw-preco-guarani'
                ];

                const missingHeaders = requiredHeaders.filter(header => 
                    !headers.includes(header)
                );

                if (missingHeaders.length > 0) {
                    resolve({
                        isValid: false,
                        error: `Encabezados faltantes: ${missingHeaders.join(', ')}`
                    });
                    return;
                }

                if (!hasData) {
                    resolve({
                        isValid: false,
                        error: 'El archivo no contiene datos'
                    });
                    return;
                }

                resolve({
                    isValid: true,
                    headers,
                    message: 'Estructura del CSV válida'
                });
            })
            .on('error', (error) => {
                resolve({
                    isValid: false,
                    error: error.message
                });
            });
    });
}

module.exports = {
    extractCode,
    extractPrice,
    normalizeProductName,
    parseCSVRow,
    parseCSVFile,
    validateCSVStructure
};