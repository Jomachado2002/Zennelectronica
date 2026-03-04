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
 * - Soporta CSV antiguo y los distintos formatos nuevos de Visaovip
 * - Normaliza encabezados para evitar problemas de espacios / BOM
 * - Elige SIEMPRE el nombre más específico cuando hay varias columnas (p-0, p-0 2)
 * @param {Object} csvRow - Fila del CSV parseado
 * @returns {Object} Producto parseado
 */
function parseCSVRow(csvRow) {
    try {
        // Normalizar claves de la fila (encabezados):
        // - quitar BOM
        // - colapsar espacios múltiples
        // - recortar espacios al inicio/fin
        const normalizedRow = {};
        Object.keys(csvRow || {}).forEach((key) => {
            if (!key) return;
            const normalizedKey = key
                .replace(/\uFEFF/g, '')   // BOM
                .replace(/\s+/g, ' ')     // espacios múltiples -> uno solo
                .trim();
            normalizedRow[normalizedKey] = csvRow[key];
        });

        // Extraer campos
        // Soportar tanto el CSV antiguo como los nuevos de Visaovip
        const providerCode = extractCode(
            normalizedRow['card-dtw-codigo-lista'] || // formato antiguo
            normalizedRow['m-0 2'] ||                 // nuevo formato: código/id
            normalizedRow['codigo'] ||
            normalizedRow['code'] ||
            normalizedRow['productCode']
        );

        // Nombre del producto:
        // - legacy: card-dtw-subtitulo
        // - formatos nuevos: p-0 (categoría / nombre corto) y p-0 2 (nombre largo)
        //   → cuando existan ambos, elegimos el string MÁS LARGO (más específico)
        let productName = '';

        if (normalizedRow['card-dtw-subtitulo']) {
            // CSV antiguo
            productName = normalizedRow['card-dtw-subtitulo'];
        } else {
            const nameFromP02 = normalizedRow['p-0 2'];
            const nameFromP0 = normalizedRow['p-0'];

            if (nameFromP02 && nameFromP0) {
                const n1 = String(nameFromP02).trim();
                const n2 = String(nameFromP0).trim();
                productName = n1.length >= n2.length ? n1 : n2;
            } else {
                productName =
                    nameFromP02 ||
                    nameFromP0 ||
                    normalizedRow['title'] ||
                    '';
            }
        }

        const priceUSD = extractPrice(
            normalizedRow['card-dtw-preco-dolar'] || // formato antiguo
            normalizedRow['m-0'] ||                  // nuevo formato: precio en USD "U$ 39,00"
            normalizedRow['priceUSD'] ||
            normalizedRow['price'] ||
            ''
        );

        const imageUrl =
            normalizedRow['img-dtw-prod src'] || // formato antiguo
            normalizedRow['mb-2 src'] ||         // nuevo formato: URL de imagen
            normalizedRow['image'] ||
            '';

        const productUrl =
            normalizedRow['link-dtw-prod href'] || // formato antiguo
            normalizedRow['no-underline href'] ||  // nuevo formato: URL del producto
            normalizedRow['url'] ||
            '';

        const priceReal =
            normalizedRow['card-dtw-preco-real'] || // solo disponible en formato antiguo
            normalizedRow['priceReal'] ||
            '';

        const priceGuarani =
            normalizedRow['card-dtw-preco-guarani'] || // solo disponible en formato antiguo
            normalizedRow['priceGuarani'] ||
            '';

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
            rawData: normalizedRow
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
                // Validar encabezados requeridos para ambos formatos (antiguo y nuevos)
                const legacyHeaders = [
                    'link-dtw-prod href',
                    'img-dtw-prod src',
                    'card-dtw-subtitulo',
                    'card-dtw-preco-dolar',
                    'card-dtw-codigo-lista',
                    'card-dtw-preco-real',
                    'card-dtw-preco-guarani'
                ];

                // Formato nuevo "largo" (el primero que usamos)
                const newVisaovipHeadersFull = [
                    'no-underline href', // URL del producto
                    'mb-2 src',          // URL de la imagen
                    'p-0',               // texto/categoría
                    'p-0 2',             // nombre del producto
                    'p-0 3',             // marca
                    'm-0',               // precio USD "U$ 39,00"
                    'm-0 2'              // código/id del producto
                ];

                // Formato nuevo "corto" actual (sin columna "p-0 2")
                const newVisaovipHeadersShort = [
                    'no-underline href', // URL del producto
                    'mb-2 src',          // URL de la imagen
                    'p-0',               // nombre del producto
                    'p-0 3',             // marca
                    'm-0',               // precio USD "U$ 39,00"
                    'm-0 2'              // código/id del producto
                ];

                // Encabezados esenciales comunes a cualquier CSV nuevo de Visaovip
                const newVisaovipEssentialHeaders = [
                    'no-underline href', // URL del producto
                    'mb-2 src',          // URL de la imagen
                    'm-0',               // precio USD
                    'm-0 2'              // código/id del producto
                ];

                const missingLegacy = legacyHeaders.filter(header => !headers.includes(header));
                const missingNewFull = newVisaovipHeadersFull.filter(header => !headers.includes(header));
                const missingNewShort = newVisaovipHeadersShort.filter(header => !headers.includes(header));

                const hasLegacyStructure = missingLegacy.length === 0;
                const hasNewFullStructure = missingNewFull.length === 0;
                const hasNewShortStructure = missingNewShort.length === 0;

                // Versión flexible: permitir variaciones mientras tenga campos esenciales + nombre
                const hasNewEssentialHeaders = newVisaovipEssentialHeaders.every(header => headers.includes(header));
                const hasNewNameField = headers.includes('p-0 2') || headers.includes('p-0');
                const hasNewFlexibleStructure = hasNewEssentialHeaders && hasNewNameField;

                if (!hasLegacyStructure && !hasNewFullStructure && !hasNewShortStructure && !hasNewFlexibleStructure) {
                    resolve({
                        isValid: false,
                        error: 'Encabezados del CSV no coinciden con el formato esperado (antiguo o nuevos del proveedor).'
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