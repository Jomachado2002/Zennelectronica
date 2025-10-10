// exportProductsForFacebookMarketplace.js
// Script para generar CSV y descargar imágenes para Facebook Marketplace Bot

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); // Cargar variables de entorno

const ProductModel = require('../models/productModel'); // ✅ Ruta corregida desde scripts/

// ========== CONFIGURACIÓN ==========
const CONFIG = {
    // Carpeta donde se guardarán las imágenes (en tu escritorio)
    IMAGES_BASE_PATH: path.join(require('os').homedir(), 'Desktop', 'imagenes_marketplace'),
    
    // Ruta del archivo CSV - ✅ AHORA EN LA MISMA CARPETA DE IMÁGENES
    CSV_OUTPUT_PATH: path.join(require('os').homedir(), 'Desktop', 'imagenes_marketplace', 'items.csv'),
    
    // MongoDB URI desde .env
    MONGODB_URI: process.env.MONGODB_URI,
    
    // Configuración del marketplace
    DEFAULT_CATEGORY: 'Electronics', // O 'Computers & Tech'
    DEFAULT_CONDITION: 'New',
    DEFAULT_LOCATION: 'Asunción, Paraguay',
    DEFAULT_GROUPS: '', // Nombres de grupos separados por ;
    
    // Límite de productos a exportar (0 = todos)
    LIMIT: 25, // ✅ SOLO 25 PRODUCTOS
    
    // Filtros de productos
    ONLY_WITH_STOCK: true,
    MIN_PRICE: 1000
};

// ========== FUNCIÓN PRINCIPAL ==========
async function exportProductsToFacebookMarketplace() {
    try {
        console.log('🚀 Iniciando exportación para Facebook Marketplace...\n');
        
        // 0. Verificar configuración
        console.log('🔍 Verificando configuración...');
        console.log(`   MongoDB URI: ${CONFIG.MONGODB_URI ? '✅ Configurado' : '❌ NO CONFIGURADO'}`);
        console.log(`   Carpeta imágenes: ${CONFIG.IMAGES_BASE_PATH}`);
        console.log(`   Archivo CSV: ${CONFIG.CSV_OUTPUT_PATH}\n`);
        
        if (!CONFIG.MONGODB_URI) {
            throw new Error('❌ MONGODB_URI no está configurado en .env');
        }
        
        // 1. Conectar a MongoDB
        console.log('📦 Conectando a MongoDB...');
        await mongoose.connect(CONFIG.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');
        
        // 2. Crear carpeta de imágenes si no existe
        if (!fs.existsSync(CONFIG.IMAGES_BASE_PATH)) {
            fs.mkdirSync(CONFIG.IMAGES_BASE_PATH, { recursive: true });
            console.log(`📁 Carpeta creada: ${CONFIG.IMAGES_BASE_PATH}\n`);
        }
        
        // 3. Obtener productos de la BD
        console.log('🔍 Obteniendo productos de la base de datos...');
        console.log(`   Filtros aplicados:`);
        console.log(`   - Con imágenes: ✅`);
        console.log(`   - Con nombre: ✅`);
        console.log(`   - Precio mínimo: ${CONFIG.MIN_PRICE} Gs`);
        console.log(`   - Con stock: ${CONFIG.ONLY_WITH_STOCK ? '✅' : '❌'}`);
        console.log(`   - Límite: ${CONFIG.LIMIT > 0 ? CONFIG.LIMIT + ' productos' : 'Sin límite'}\n`);
        
        const query = {
            productImage: { $exists: true, $ne: [], $not: { $size: 0 } },
            productName: { $exists: true, $ne: '' },
            sellingPrice: { $gte: CONFIG.MIN_PRICE }
        };
        
        if (CONFIG.ONLY_WITH_STOCK) {
            query.$or = [
                { stock: { $gte: 1 } },
                { stockStatus: 'in_stock' }
            ];
        }
        
        let products = await ProductModel.find(query).lean();
        
        console.log(`   Total encontrados en BD: ${products.length} productos`);
        
        if (products.length === 0) {
            console.log('\n⚠️  NO SE ENCONTRARON PRODUCTOS que cumplan los filtros');
            console.log('   Intenta ajustar los filtros en CONFIG\n');
            await mongoose.connection.close();
            return;
        }
        
        if (CONFIG.LIMIT > 0 && products.length > CONFIG.LIMIT) {
            products = products.slice(0, CONFIG.LIMIT);
            console.log(`   Limitado a: ${CONFIG.LIMIT} productos`);
        }
        
        console.log(`\n✅ Procesaremos ${products.length} productos\n`);
        
        // 4. Procesar cada producto
        console.log('⏳ Procesando productos y descargando imágenes...\n');
        const csvRows = [];
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            console.log(`[${i + 1}/${products.length}] Procesando: ${product.productName}`);
            
            try {
                const csvRow = await processProduct(product);
                if (csvRow) {
                    csvRows.push(csvRow);
                    successCount++;
                    console.log(`   ✅ Éxito\n`);
                } else {
                    errorCount++;
                    console.log(`   ⚠️  Sin imágenes válidas\n`);
                }
            } catch (error) {
                errorCount++;
                console.log(`   ❌ Error: ${error.message}\n`);
            }
        }
        
        // 5. Generar archivo CSV
        if (csvRows.length === 0) {
            console.log('⚠️  NO SE GENERARON FILAS PARA EL CSV');
            console.log('   Todos los productos tuvieron errores o no tienen imágenes válidas\n');
            await mongoose.connection.close();
            return;
        }
        
        console.log(`📝 Generando archivo CSV con ${csvRows.length} productos...`);
        await generateCSV(csvRows);
        
        // Verificar que el archivo se creó
        if (fs.existsSync(CONFIG.CSV_OUTPUT_PATH)) {
            const stats = fs.statSync(CONFIG.CSV_OUTPUT_PATH);
            console.log(`✅ CSV generado exitosamente`);
            console.log(`   Ubicación: ${CONFIG.CSV_OUTPUT_PATH}`);
            console.log(`   Tamaño: ${(stats.size / 1024).toFixed(2)} KB\n`);
        } else {
            console.log(`❌ ERROR: No se pudo crear el archivo CSV\n`);
        }
        
        // 6. Resumen final
        console.log('═══════════════════════════════════════');
        console.log('✨ EXPORTACIÓN COMPLETADA');
        console.log('═══════════════════════════════════════');
        console.log(`✅ Productos procesados exitosamente: ${successCount}`);
        console.log(`❌ Productos con errores: ${errorCount}`);
        console.log(`📁 Imágenes guardadas en: ${CONFIG.IMAGES_BASE_PATH}`);
        console.log(`📄 CSV guardado en: ${CONFIG.CSV_OUTPUT_PATH}`);
        console.log('═══════════════════════════════════════\n');
        
        await mongoose.connection.close();
        console.log('🔌 Conexión a MongoDB cerrada');
        
    } catch (error) {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    }
}

// ========== PROCESAR UN PRODUCTO ==========
async function processProduct(product) {
    // Crear nombre de carpeta seguro
    const safeFolderName = sanitizeFileName(product.productName);
    const productFolder = path.join(CONFIG.IMAGES_BASE_PATH, safeFolderName);
    
    // Crear carpeta del producto
    if (!fs.existsSync(productFolder)) {
        fs.mkdirSync(productFolder, { recursive: true });
    }
    
    // Descargar imágenes
    const downloadedImages = [];
    const validImages = product.productImage.filter(url => 
        url && typeof url === 'string' && url.startsWith('http')
    );
    
    if (validImages.length === 0) {
        return null;
    }
    
    for (let j = 0; j < Math.min(validImages.length, 10); j++) { // Máximo 10 imágenes
        const imageUrl = validImages[j];
        const imageExtension = getImageExtension(imageUrl);
        const imageName = `${safeFolderName}_${j + 1}.${imageExtension}`;
        const imagePath = path.join(productFolder, imageName);
        
        try {
            await downloadImage(imageUrl, imagePath);
            downloadedImages.push(imageName);
            console.log(`   📷 Imagen ${j + 1} descargada`);
        } catch (error) {
            console.log(`   ⚠️  Error descargando imagen ${j + 1}: ${error.message}`);
        }
    }
    
    if (downloadedImages.length === 0) {
        return null;
    }
    
    // Generar fila del CSV
    return {
        Title: cleanText(product.productName),
        'Photos Folder': productFolder,
        'Photos Names': downloadedImages.join('; '),
        Price: Math.round(product.sellingPrice || product.price || 0),
        Category: CONFIG.DEFAULT_CATEGORY,
        Condition: CONFIG.DEFAULT_CONDITION,
        Brand: cleanText(product.brandName || 'Genérico'),
        Description: cleanText(generateDescription(product)),
        Location: CONFIG.DEFAULT_LOCATION,
        Groups: CONFIG.DEFAULT_GROUPS
    };
}

// ========== GENERAR DESCRIPCIÓN ==========
function generateDescription(product) {
    let description = product.description || product.productName || '';
    
    // Agregar especificaciones técnicas si existen
    const specs = [];
    if (product.processor) specs.push(`Procesador: ${product.processor}`);
    if (product.memory || product.phoneRAM) specs.push(`RAM: ${product.memory || product.phoneRAM}`);
    if (product.storage || product.phoneStorage) specs.push(`Almacenamiento: ${product.storage || product.phoneStorage}`);
    if (product.graphicsCard) specs.push(`GPU: ${product.graphicsCard}`);
    if (product.notebookScreen || product.monitorSize) specs.push(`Pantalla: ${product.notebookScreen || product.monitorSize}`);
    
    if (specs.length > 0) {
        description += '\n\nEspecificaciones:\n' + specs.join('\n');
    }
    
    // Agregar información de contacto
    description += '\n\n✅ Producto nuevo\n📦 Envíos a todo el país\n💳 Aceptamos todos los medios de pago';
    
    return description.substring(0, 1000); // Límite de caracteres para Facebook
}

// ========== DESCARGAR IMAGEN ==========
function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
            
            file.on('error', (err) => {
                fs.unlink(filepath, () => {}); // Eliminar archivo incompleto
                reject(err);
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => {});
            reject(err);
        });
    });
}

// ========== GENERAR CSV ==========
async function generateCSV(rows) {
    // Asegurar que existe el directorio del CSV
    const csvDir = path.dirname(CONFIG.CSV_OUTPUT_PATH);
    if (!fs.existsSync(csvDir)) {
        fs.mkdirSync(csvDir, { recursive: true });
    }
    
    // Encabezados del CSV
    const headers = [
        'Title',
        'Photos Folder',
        'Photos Names',
        'Price',
        'Category',
        'Condition',
        'Brand',
        'Description',
        'Location',
        'Groups'
    ];
    
    // Generar contenido del CSV
    let csvContent = headers.map(h => `"${h}"`).join(',') + '\n';
    
    for (const row of rows) {
        const values = headers.map(header => {
            const value = row[header] || '';
            // Escapar comillas dobles
            const escapedValue = String(value).replace(/"/g, '""');
            return `"${escapedValue}"`;
        });
        csvContent += values.join(',') + '\n';
    }
    
    // Escribir archivo
    fs.writeFileSync(CONFIG.CSV_OUTPUT_PATH, csvContent, 'utf8');
}

// ========== UTILIDADES ==========
function sanitizeFileName(name) {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
        .replace(/[^a-z0-9]/g, '_') // Reemplazar caracteres especiales
        .replace(/_+/g, '_') // Eliminar guiones bajos múltiples
        .substring(0, 50); // Limitar longitud
}

function getImageExtension(url) {
    const match = url.match(/\.(jpg|jpeg|png|gif|webp)/i);
    return match ? match[1].toLowerCase() : 'jpg';
}

function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/[\r\n]+/g, ' ') // Reemplazar saltos de línea
        .replace(/\s+/g, ' ') // Normalizar espacios
        .trim();
}

// ========== EJECUTAR ==========
exportProductsToFacebookMarketplace();