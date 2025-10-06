// backend/controller/product/stockManagementController.js - VERSIÓN MEJORADA
const ProductModel = require('../../models/productModel');
const uploadProductPermission = require('../../helpers/permission');

/**
 * Controlador mejorado para analizar stock con datos de mayoristas
 */
async function analyzeStockController(req, res) {
    try {
        // Verificar permisos de administrador
        if (!uploadProductPermission(req.userId)) {
            throw new Error("Permiso denegado");
        }

        const { mayoristasData, category, subcategory } = req.body;

        if (!mayoristasData || !mayoristasData.trim()) {
            return res.status(400).json({
                message: "Datos de mayoristas son requeridos",
                success: false,
                error: true
            });
        }

        

        // Construir filtro dinámico
        let productQuery = {};
        if (category) productQuery.category = category;
        if (subcategory) productQuery.subcategory = subcategory;

        // Obtener productos filtrados de la BD
        const myProducts = await ProductModel.find(productQuery).select(
            'productName brandName category subcategory sellingPrice stock'
        );

        

        if (myProducts.length === 0) {
            return res.json({
                message: `No tienes productos${subcategory ? ` en ${subcategory}` : ''}`,
                success: true,
                error: false,
                data: {
                    summary: {
                        total_my_products: 0,
                        in_stock: 0,
                        out_of_stock: 0,
                        new_available: 0,
                        category: category || 'todas',
                        subcategory: subcategory || 'todas'
                    },
                    inStock: [],
                    outOfStock: [],
                    newProducts: []
                }
            });
        }

        // Procesar datos de mayoristas con algoritmo mejorado
        const mayoristasNotebooks = extractMayoristasProductsImproved(mayoristasData);
        

        // Realizar análisis con algoritmo mejorado
        const analysis = performImprovedStockAnalysis(myProducts, mayoristasNotebooks);

        
        
        
        

        res.json({
            message: "Análisis de stock completado",
            success: true,
            error: false,
            data: {
                summary: {
                    total_my_products: myProducts.length,
                    in_stock: analysis.inStock.length,
                    out_of_stock: analysis.outOfStock.length,
                    new_available: analysis.newProducts.length,
                    category: category || 'todas',
                    subcategory: subcategory || 'todas',
                    analysis_date: new Date().toISOString(),
                    algorithm_version: "2.0"
                },
                ...analysis
            }
        });

    } catch (err) {
        console.error('❌ Error en análisis de stock:', err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
}

/**
 * EXTRACCIÓN MEJORADA DE PRODUCTOS DE MAYORISTAS
 */
function extractMayoristasProductsImproved(mayoristasData) {
    const lines = mayoristasData.split('\n');
    const products = [];

    for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i].trim();
    const nextLine = lines[i + 1]?.trim() || '';
    
    // Detectar si la línea actual es un producto (descripción larga)
    const isProductLine = currentLine.length > 50 && 
                         /\b(notebook|laptop|pc|monitor|teclado|mouse|impresora|telefono|tablet)\b/i.test(currentLine);
    
    // Detectar si la siguiente línea tiene precio en G$
    const hasPriceNext = /G\$\s*([\d,.]+)/i.test(nextLine);
    
    if (isProductLine && hasPriceNext) {
        let productInfo = parseProductLine(currentLine, nextLine);
        
        if (productInfo.name && productInfo.name.length > 15) {
            products.push(productInfo);
            
        }
        i++; // Saltar la línea del precio para no procesarla como producto
    }
}

    // Remover duplicados por similitud de nombre
    const uniqueProducts = removeDuplicates(products);
    
    
    return uniqueProducts;
}

/**
 * PARSER MEJORADO PARA LÍNEAS DE PRODUCTOS
 */
function parseProductLine(productLine, priceLine) {
    const original = `${productLine}\n${priceLine}`;
    
    // Extraer precio de la línea separada (G$ formato)
    const guaranieMatch = priceLine.match(/G\$\s*([\d,.]+)/i);
    let price = null;
    
    if (guaranieMatch) {
        const cleanNumber = guaranieMatch[1].replace(/[,.]/g, '');
        price = parseFloat(cleanNumber);
    }
    
    // El nombre del producto es la línea completa
    const cleanName = productLine;
    
    // Normalizar nombre
    const normalizedName = normalizeProductName(cleanName);
    
    // Extraer características técnicas
    const specs = extractProductSpecs(cleanName);
    
    return {
        name: cleanName,
        normalizedName: normalizedName,
        price: price,
        priceFormatted: guaranieMatch ? guaranieMatch[0] : null,
        currency: 'PYG',
        code: null, // No hay códigos en este formato
        original: original,
        ...specs
    };
}

/**
 * NORMALIZACIÓN AVANZADA DE NOMBRES DE PRODUCTOS
 */
function normalizeProductName(name) {
    let normalized = name.toLowerCase();
    
    // Mapeo de abreviaciones y sinónimos
    const normalizations = {
        'nb ': 'notebook ',
        ' nb ': ' notebook ',
        'pc ': 'computadora ',
        ' ram': ' memoria',
        ' ssd': ' disco_ssd',
        ' hdd': ' disco_hdd',
        ' emmc': ' almacenamiento_emmc',
        ' ufs': ' almacenamiento_ufs',
        'pantalla': 'display',
        'tela': 'display',
        'full hd': 'fhd',
        'quad hd': 'qhd',
        'ultra hd': 'uhd',
        '4k': 'uhd',
        'gaming': 'gamer',
        'inglés': '',
        'ingles': '',
        'español': '',
        'portugués': '',
        'português': '',
        'english': '',
        'spanish': '',
        'portuguese': ''
    };
    
    // Aplicar normalizaciones
    for (let [from, to] of Object.entries(normalizations)) {
        normalized = normalized.replace(new RegExp(from, 'gi'), to);
    }
    
    // Limpiar caracteres especiales y espacios múltiples
    normalized = normalized
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    return normalized;
}

/**
 * EXTRACCIÓN DE ESPECIFICACIONES TÉCNICAS
 */
function extractProductSpecs(productName) {
    const name = productName.toLowerCase();
    
    return {
        brand: extractBrandAdvanced(name),
        processor: extractProcessorAdvanced(name),
        ram: extractRAM(name),
        storage: extractStorage(name),
        screenSize: extractScreenSize(name),
        gpu: extractGPU(name),
        isGaming: /gaming|gamer|rog|tuf|nitro|victus|omen|alienware|msi|predator/i.test(name)
    };
}

/**
 * DETECCIÓN AVANZADA DE MARCAS
 */
function extractBrandAdvanced(productName) {
    const name = productName.toLowerCase();
    
    const brandPatterns = [
        { pattern: /\b(hp|victus|omen|pavilion|envy|omnibook)\b/, brand: 'HP' },
        { pattern: /\b(lenovo|ideapad|thinkpad|yoga|loq|legion)\b/, brand: 'Lenovo' },
        { pattern: /\b(dell|inspiron|xps|latitude|vostro)\b/, brand: 'Dell' },
        { pattern: /\b(asus|vivobook|rog|tuf|zenbook|proart)\b/, brand: 'ASUS' },
        { pattern: /\b(acer|aspire|nitro|predator|swift)\b/, brand: 'Acer' },
        { pattern: /\b(apple|macbook|imac|mac)\b/, brand: 'Apple' },
        { pattern: /\b(msi|katana|vector|cyborg|thin|gaming)\b/, brand: 'MSI' },
        { pattern: /\balienware\b/, brand: 'Alienware' },
        { pattern: /\b(samsung|galaxy)\b/, brand: 'Samsung' },
        { pattern: /\blg\b/, brand: 'LG' },
        { pattern: /\b(razer|blade)\b/, brand: 'Razer' }
    ];
    
    for (let { pattern, brand } of brandPatterns) {
        if (pattern.test(name)) {
            return brand;
        }
    }
    
    return 'Unknown';
}

/**
 * DETECCIÓN AVANZADA DE PROCESADORES
 */
function extractProcessorAdvanced(productName) {
    const name = productName.toLowerCase();
    
    // Intel (más específico)
    if (/intel|core/i.test(name)) {
        if (/core\s+ultra/i.test(name)) return 'Intel Core Ultra';
        if (/(i9|core\s+i9)/i.test(name)) return 'Intel i9';
        if (/(i7|core\s+i7)/i.test(name)) return 'Intel i7';
        if (/(i5|core\s+i5)/i.test(name)) return 'Intel i5';
        if (/(i3|core\s+i3)/i.test(name)) return 'Intel i3';
        if (/celeron/i.test(name)) return 'Intel Celeron';
        if (/pentium/i.test(name)) return 'Intel Pentium';
    }
    
    // AMD (más específico)
    if (/amd|ryzen/i.test(name)) {
        if (/ryzen\s+ai\s+9/i.test(name)) return 'AMD Ryzen AI 9';
        if (/ryzen\s+ai\s+7/i.test(name)) return 'AMD Ryzen AI 7';
        if (/ryzen\s+ai\s+5/i.test(name)) return 'AMD Ryzen AI 5';
        if (/ryzen\s+9/i.test(name)) return 'AMD Ryzen 9';
        if (/ryzen\s+7/i.test(name)) return 'AMD Ryzen 7';
        if (/ryzen\s+5/i.test(name)) return 'AMD Ryzen 5';
        if (/ryzen\s+3/i.test(name)) return 'AMD Ryzen 3';
    }
    
    // Apple
    if (/m[1-4]/i.test(name)) return 'Apple Silicon';
    
    // Qualcomm
    if (/snapdragon/i.test(name)) return 'Snapdragon';
    
    return 'Unknown';
}

/**
 * EXTRAER RAM
 */
function extractRAM(productName) {
    const ramMatch = productName.match(/(\d+)\s*gb.*?ram|ram.*?(\d+)\s*gb|\/\s*(\d+)gb\s*de\s*ram/i);
    return ramMatch ? `${ramMatch[1] || ramMatch[2] || ramMatch[3]}GB` : null;
}

/**
 * EXTRAER ALMACENAMIENTO
 */
function extractStorage(productName) {
    const storageMatch = productName.match(/(\d+)\s*(gb|tb)\s*(ssd|hdd|emmc|ufs)/i);
    return storageMatch ? `${storageMatch[1]}${storageMatch[2].toUpperCase()} ${storageMatch[3].toUpperCase()}` : null;
}

/**
 * EXTRAER TAMAÑO DE PANTALLA
 */
function extractScreenSize(productName) {
    const screenMatch = productName.match(/(\d+\.?\d*)["\s]/i);
    return screenMatch ? `${screenMatch[1]}"` : null;
}

/**
 * EXTRAER GPU
 */
function extractGPU(productName) {
    const gpuMatch = productName.match(/(rtx|gtx|radeon|vega|iris)\s*(\w+)/i);
    return gpuMatch ? `${gpuMatch[1]} ${gpuMatch[2]}` : null;
}

/**
 * REMOVER DUPLICADOS INTELIGENTE
 */
function removeDuplicates(products) {
    const seen = new Map();
    const unique = [];
    
    for (let product of products) {
        const key = createProductFingerprint(product);
        
        if (!seen.has(key)) {
            seen.set(key, product);
            unique.push(product);
        } else {
            // Si encontramos un duplicado, mantener el que tenga más información
            const existing = seen.get(key);
            if (product.name.length > existing.name.length) {
                // Reemplazar en el array unique
                const index = unique.findIndex(p => createProductFingerprint(p) === key);
                if (index !== -1) {
                    unique[index] = product;
                    seen.set(key, product);
                }
            }
        }
    }
    
    return unique;
}

/**
 * CREAR HUELLA DIGITAL DEL PRODUCTO
 */
function createProductFingerprint(product) {
    const key = [
        product.brand,
        product.processor,
        product.ram,
        product.storage,
        product.screenSize
    ].filter(Boolean).join('|').toLowerCase();
    
    return key || product.normalizedName.substring(0, 50);
}

/**
 * ANÁLISIS AVANZADO DE STOCK
 */
function performImprovedStockAnalysis(myProducts, mayoristasProducts, selectedCategory = 'informatica', selectedSubcategory = 'notebooks') {
    const inStock = [];
    const outOfStock = [];
    const usedMayoristaIndices = new Set();

    

    // Analizar cada producto mío contra los de mayoristas
    for (let myProduct of myProducts) {
        let bestMatch = null;
        let bestScore = 0;
        let bestIndex = -1;

        for (let [index, mayoristasProduct] of mayoristasProducts.entries()) {
            if (usedMayoristaIndices.has(index)) continue;

            const similarity = calculateAdvancedProductSimilarity(myProduct, mayoristasProduct);
            
            if (similarity > bestScore) {
                bestScore = similarity;
                bestMatch = mayoristasProduct;
                bestIndex = index;
            }
        }

        // Umbral dinámico más inteligente
        const threshold = calculateSmartThreshold(myProduct, bestMatch);
        
        if (bestMatch && bestScore >= threshold) {
            inStock.push({
                myProduct: {
                    _id: myProduct._id,
                    productName: myProduct.productName,
                    brandName: myProduct.brandName,
                    sellingPrice: myProduct.sellingPrice,
                    stock: myProduct.stock,
                    category: myProduct.category,
                    subcategory: myProduct.subcategory
                },
                mayoristasProduct: bestMatch,
                similarity: Math.round(bestScore * 100),
                status: 'EN_STOCK',
                threshold: Math.round(threshold * 100),
                matchDetails: {
                    brandMatch: myProduct.brandName?.toLowerCase() === bestMatch.brand?.toLowerCase(),
                    processorMatch: extractProcessorAdvanced(myProduct.productName) === bestMatch.processor,
                    textSimilarity: Math.round(bestScore * 100)
                },
                priceComparison: {
                    myPrice: myProduct.sellingPrice,
                    mayoristasPrice: bestMatch.price ? Math.round(bestMatch.price * 7300) : null,
                    difference: bestMatch.price ? Math.round(myProduct.sellingPrice - (bestMatch.price * 7300)) : null
                }
            });
            usedMayoristaIndices.add(bestIndex);
            
            
        } else {
            outOfStock.push({
                _id: myProduct._id,
                productName: myProduct.productName,
                brandName: myProduct.brandName,
                sellingPrice: myProduct.sellingPrice,
                stock: myProduct.stock,
                category: myProduct.category,
                subcategory: myProduct.subcategory,
                status: 'SIN_STOCK',
                bestSimilarity: Math.round(bestScore * 100),
                threshold: Math.round(threshold * 100),
                closestMatch: bestMatch ? {
                    name: bestMatch.name.substring(0, 60) + '...',
                    similarity: Math.round(bestScore * 100)
                } : null
            });
            
            
        }
    }

    // Productos nuevos disponibles (SIN LÍMITE DE 50)
    const newProducts = mayoristasProducts
    .filter((_, index) => !usedMayoristaIndices.has(index))
    .map(product => ({
        ...product,
        estimatedSellingPrice: product.price ? Math.round(product.price * 1.3) : null,
        status: 'NUEVO_DISPONIBLE',
        category: selectedCategory || 'informatica',
        subcategory: selectedSubcategory || 'notebooks'
    }));

    
    

    return {
        inStock,
        outOfStock,
        newProducts  // Ya no hay límite de 50
    };
}

/**
 * CÁLCULO AVANZADO DE SIMILITUD ENTRE PRODUCTOS
 */
function calculateAdvancedProductSimilarity(myProduct, mayoristasProduct) {
    // Extraer specs de mi producto
    const mySpecs = extractProductSpecs(myProduct.productName);
    const mayoristasSpecs = mayoristasProduct;

    let totalScore = 0;
    let totalWeight = 0;

    // Pesos para diferentes características
    const weights = {
        brand: 0.30,           // 30% - Marca es muy importante
        processor: 0.25,       // 25% - Procesador también
        ram: 0.15,            // 15% - RAM importante
        storage: 0.10,        // 10% - Almacenamiento
        textSimilarity: 0.20  // 20% - Similitud general de texto
    };

    // Similitud de marca (más flexible)
    if (mySpecs.brand && mayoristasSpecs.brand) {
        const brandMatch = mySpecs.brand.toLowerCase() === mayoristasSpecs.brand.toLowerCase();
        totalScore += (brandMatch ? 1 : 0) * weights.brand;
        totalWeight += weights.brand;
    }

    // Similitud de procesador
    if (mySpecs.processor && mayoristasSpecs.processor) {
        const processorMatch = mySpecs.processor === mayoristasSpecs.processor;
        totalScore += (processorMatch ? 1 : 0) * weights.processor;
        totalWeight += weights.processor;
    }

    // Similitud de RAM
    if (mySpecs.ram && mayoristasSpecs.ram) {
        const ramMatch = mySpecs.ram === mayoristasSpecs.ram;
        totalScore += (ramMatch ? 1 : 0) * weights.ram;
        totalWeight += weights.ram;
    }

    // Similitud de almacenamiento
    if (mySpecs.storage && mayoristasSpecs.storage) {
        const storageMatch = mySpecs.storage === mayoristasSpecs.storage;
        totalScore += (storageMatch ? 1 : 0) * weights.storage;
        totalWeight += weights.storage;
    }

    // Similitud de texto general (mejorada)
    const textSimilarity = calculateImprovedTextSimilarity(
        myProduct.productName,
        mayoristasProduct.name
    );
    totalScore += textSimilarity * weights.textSimilarity;
    totalWeight += weights.textSimilarity;

    return totalWeight > 0 ? totalScore / totalWeight : 0;
}

/**
 * SIMILITUD DE TEXTO MEJORADA
 */
function calculateImprovedTextSimilarity(text1, text2) {
    const normalized1 = normalizeProductName(text1);
    const normalized2 = normalizeProductName(text2);
    
    const words1 = normalized1.split(' ').filter(w => w.length > 2);
    const words2 = normalized2.split(' ').filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    // Palabras comunes
    const commonWords = words1.filter(w => words2.includes(w));
    
    // Considerar también palabras similares (no exactas)
    let partialMatches = 0;
    for (let word1 of words1) {
        for (let word2 of words2) {
            if (word1.includes(word2) || word2.includes(word1)) {
                partialMatches += 0.5;
                break;
            }
        }
    }
    
    const exactScore = commonWords.length / Math.max(words1.length, words2.length);
    const partialScore = partialMatches / Math.max(words1.length, words2.length);
    
    return Math.min(exactScore + partialScore * 0.3, 1); // Combinar exactas y parciales
}

/**
 * UMBRAL DINÁMICO INTELIGENTE
 */
function calculateSmartThreshold(myProduct, mayoristasProduct) {
    let baseThreshold = 0.50; // Base más baja: 50%
    
    // Si hay coincidencia de marca, reducir umbral significativamente
    if (myProduct.brandName && mayoristasProduct?.brand) {
        if (myProduct.brandName.toLowerCase() === mayoristasProduct.brand.toLowerCase()) {
            baseThreshold = 0.35; // Solo 35% si la marca coincide
        }
    }
    
    // Si es un producto gaming, ser un poco más estricto
    if (/gaming|gamer|rog|tuf|nitro|victus|omen|alienware/i.test(myProduct.productName)) {
        baseThreshold += 0.05; // +5% para gaming
    }
    
    // Para notebooks básicos, ser más flexible
    if (/celeron|pentium|atom/i.test(myProduct.productName)) {
        baseThreshold -= 0.05; // -5% para productos básicos
    }
    
    return Math.max(Math.min(baseThreshold, 0.70), 0.30); // Entre 30% y 70%
}

// Mantener las funciones existentes que no necesitan cambios
const updateBulkStockController = async (req, res) => {
    try {
        if (!uploadProductPermission(req.userId)) {
            throw new Error("Permiso denegado");
        }

        const { action, productIds } = req.body;

        if (!action || !productIds || !Array.isArray(productIds)) {
            return res.status(400).json({
                message: "Acción y IDs de productos son requeridos",
                success: false,
                error: true
            });
        }

        let updateData = {};
        let message = "";

        switch (action) {
            case 'mark_out_of_stock':
                updateData = { stock: 0 };
                message = `${productIds.length} productos marcados como sin stock`;
                break;
            case 'mark_in_stock':
                updateData = { stock: 1 };
                message = `${productIds.length} productos marcados como en stock`;
                break;
            default:
                return res.status(400).json({
                    message: "Acción no válida",
                    success: false,
                    error: true
                });
        }

        const result = await ProductModel.updateMany(
            { _id: { $in: productIds } },
            { $set: updateData }
        );

        res.json({
            message,
            success: true,
            error: false,
            data: {
                modifiedCount: result.modifiedCount,
                matchedCount: result.matchedCount
            }
        });

    } catch (err) {
        console.error('Error en actualización masiva:', err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
};

const updatePricesFromMayoristasController = async (req, res) => {
    try {
        if (!uploadProductPermission(req.userId)) {
            throw new Error("Permiso denegado");
        }

        const { priceUpdates, exchangeRate = 7300 } = req.body;

        if (!priceUpdates || !Array.isArray(priceUpdates)) {
            return res.status(400).json({
                message: "Actualizaciones de precio requeridas",
                success: false,
                error: true
            });
        }

        let updatedCount = 0;
        const results = [];

        for (let update of priceUpdates) {
            const { productId, mayoristasPrice, suggestedMargin = 30 } = update;
            
            if (!productId || !mayoristasPrice) continue;

            const newPurchasePriceUSD = mayoristasPrice;
            const newPurchasePrice = mayoristasPrice * exchangeRate;
            const suggestedSellingPrice = Math.round(newPurchasePrice * (1 + suggestedMargin / 100));

            const updateResult = await ProductModel.findByIdAndUpdate(
                productId,
                {
                    $set: {
                        purchasePriceUSD: newPurchasePriceUSD,
                        purchasePrice: newPurchasePrice,
                        exchangeRate: exchangeRate,
                        sellingPrice: suggestedSellingPrice,
                        lastUpdatedFinance: new Date()
                    }
                },
                { new: true }
            );

            if (updateResult) {
                updatedCount++;
                results.push({
                    productId,
                    productName: updateResult.productName,
                    oldPrice: updateResult.sellingPrice,
                    newPrice: suggestedSellingPrice,
                    mayoristasPrice: mayoristasPrice
                });
            }
        }

        res.json({
            message: `${updatedCount} productos actualizados con nuevos precios`,
            success: true,
            error: false,
            data: {
                updatedCount,
                exchangeRate,
                results
            }
        });

    } catch (err) {
        console.error('Error actualizando precios:', err);
        res.status(500).json({
            message: err.message || "Error interno del servidor",
            error: true,
            success: false
        });
    }
};

module.exports = {
    analyzeStockController,
    updateBulkStockController,
    updatePricesFromMayoristasController
};