// backend/controller/product/exportProductsController.js
// Controlador para exportar productos con Excel e imágenes

const productModel = require('../../models/productModel');
const categoryModel = require('../../models/categoryModel');
const XLSX = require('xlsx');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { toMerchantJpegUrl } = require('../../helpers/merchantJpeg');

const EXPORT_CONTACTO =
    'Para más información podrías escribirnos al 0973/345/284 contamos con productos al por mayor para reventa';

/** Columnas que AutoList (Chrome) mapea al formulario de Facebook Marketplace. */
const AUTOLIST_COLUMNS = [
    'Title',
    'Price',
    'Category',
    'Condition',
    'Description',
    'Image URLs',
    'SKU',
    'Stock'
];

/** Máx. descargas simultáneas (sin esto el export abre cientos de sockets y el CDN corta/timeout). */
const IMAGE_DOWNLOAD_CONCURRENCY = 6;
const IMAGE_DOWNLOAD_TIMEOUT_MS = 45000;
const IMAGE_DOWNLOAD_RETRIES = 3;
const AUTOLIST_MAX_IMAGES = 10;
const AUTOLIST_MAX_TITLE = 100;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableDownloadError(err) {
    const code = err?.code || '';
    const msg = String(err?.message || '');
    return (
        code === 'ECONNRESET' ||
        code === 'ETIMEDOUT' ||
        code === 'ECONNABORTED' ||
        code === 'EAI_AGAIN' ||
        /timeout/i.test(msg) ||
        /ECONNRESET/i.test(msg) ||
        /socket hang up/i.test(msg)
    );
}

/**
 * Pool simple: procesa `items` con como máximo `concurrency` trabajos en paralelo.
 */
async function mapWithConcurrency(items, concurrency, worker) {
    const results = new Array(items.length);
    let next = 0;

    async function run() {
        while (next < items.length) {
            const i = next++;
            results[i] = await worker(items[i], i);
        }
    }

    const workers = Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, () => run());
    await Promise.all(workers);
    return results;
}

async function downloadImageToFile(imageUrl, imagePath) {
    let lastError;
    for (let attempt = 1; attempt <= IMAGE_DOWNLOAD_RETRIES; attempt++) {
        try {
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: IMAGE_DOWNLOAD_TIMEOUT_MS,
                maxRedirects: 5,
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (compatible; ZennExport/1.0; +https://www.zenn.com.py)',
                    Accept: 'image/*,*/*;q=0.8'
                },
                validateStatus: (s) => s >= 200 && s < 300
            });
            fs.writeFileSync(imagePath, Buffer.from(response.data));
            return;
        } catch (err) {
            lastError = err;
            if (attempt < IMAGE_DOWNLOAD_RETRIES && isRetryableDownloadError(err)) {
                await sleep(400 * attempt + Math.floor(Math.random() * 300));
                continue;
            }
            throw err;
        }
    }
    throw lastError;
}

/** Clave canónica (slug) → texto legible para copiar en redes */
function humanizeSpecKey(key) {
    if (!key || typeof key !== 'string') return '';
    const s = key.replace(/_/g, ' ').trim();
    return s ? s.replace(/\b\w/g, (c) => c.toUpperCase()) : '';
}

/** Mapa unificado: technicalSpecifications pisa claves repetidas de specifications */
function mergedSpecifications(product) {
    const a = product.specifications && typeof product.specifications === 'object' ? product.specifications : {};
    const b =
        product.technicalSpecifications && typeof product.technicalSpecifications === 'object'
            ? product.technicalSpecifications
            : {};
    return { ...a, ...b };
}

/**
 * Una línea por especificación: Etiqueta<TAB>valor (útil al pegar en Facebook).
 */
function buildSpecsLinesTabbed(product) {
    const raw = mergedSpecifications(product);
    if (!raw || typeof raw !== 'object') return '';
    return Object.entries(raw)
        .filter(([k, v]) => k && v != null && String(v).trim() !== '')
        .map(([k, v]) => `${humanizeSpecKey(k)}\t${String(v).trim()}`)
        .join('\n');
}

/**
 * Descripción larga: texto PDP, bloque de specs, pie de contacto (saltos de línea reales).
 */
function buildExportDescription(product) {
    const parts = [];
    const desc = (product.description || '').trim();
    if (desc) parts.push(desc);

    const specsBlock = buildSpecsLinesTabbed(product);
    if (specsBlock) {
        if (parts.length) parts.push('');
        parts.push(specsBlock);
    }

    if (parts.length) parts.push('');
    parts.push(EXPORT_CONTACTO);

    return parts.join('\n');
}

function clipText(value, max) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1).replace(/\s+\S*$/, '').trim()}`;
}

function taxonomyLabels(categoryDoc, categoryValue, subcategoryValue) {
    const categoryLabel = categoryDoc?.label || humanizeSpecKey(categoryValue) || String(categoryValue || '');
    const sub = (categoryDoc?.subcategories || []).find(
        (item) => String(item.value || '').trim() === String(subcategoryValue || '').trim()
    );
    const subcategoryLabel = sub?.label || humanizeSpecKey(subcategoryValue) || String(subcategoryValue || '');
    return { categoryLabel, subcategoryLabel };
}

/**
 * En Marketplace (EN) de esta cuenta el drawer útil es Electronics / Computers.
 * Una sola etiqueta estable para que AutoList (o el clic manual) sea siempre la misma.
 */
function marketplaceCategory() {
    return 'Electronics';
}

function listingPrice(product) {
    const selling = Number(product.sellingPrice);
    if (Number.isFinite(selling) && selling > 0) return Math.round(selling);
    const price = Number(product.price);
    if (Number.isFinite(price) && price > 0) return Math.round(price);
    return 0;
}

function safeAutolistId(product, rowNumber) {
    const sku = String(product.codigo || '')
        .trim()
        .replace(/[^\w.-]+/g, '_')
        .slice(0, 40);
    return sku || `item${rowNumber}`;
}

/**
 * URLs para AutoList: JPEG (CDN hermano / proxy), no WebP.
 * AutoList suele fallar al bajar .webp del CDN → Items quedan "(no images)".
 */
function imageUrlsForAutolist(product) {
    const seen = new Set();
    return (Array.isArray(product.productImage) ? product.productImage : [])
        .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url.trim()))
        .map((url) => String(toMerchantJpegUrl(url.trim()) || url.trim()).replace(/,\s*/g, ''))
        .filter((url) => /^https?:\/\//i.test(url))
        .filter((url) => {
            if (seen.has(url)) return false;
            seen.add(url);
            return true;
        })
        .slice(0, AUTOLIST_MAX_IMAGES);
}

/**
 * AutoList parte mal el CSV si una celda trae saltos de línea reales
 * (cuenta cientos/miles de "rows" fantasma). Una sola línea por celda.
 */
function flattenAutolistText(value) {
    return String(value ?? '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map((line) => line.replace(/\t+/g, ': ').trim())
        .filter(Boolean)
        .join(' | ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Specs en una sola línea (sin tabs ni \\n) para el CSV de AutoList. */
function buildAutolistDescription(product) {
    const parts = [];
    const desc = flattenAutolistText(product.description || '');
    if (desc) parts.push(desc);

    const specs = Object.entries(mergedSpecifications(product))
        .filter(([key, value]) => key && value != null && String(value).trim() !== '')
        .map(([key, value]) => `${humanizeSpecKey(key)}: ${flattenAutolistText(value)}`);
    if (specs.length) parts.push(specs.join(' | '));

    parts.push(flattenAutolistText(EXPORT_CONTACTO));
    return flattenAutolistText(parts.join(' | '));
}

/**
 * Una fila lista para AutoList / Excel / CSV.
 * Image URLs van separadas por coma; Description siempre en una sola línea.
 */
function buildAutolistRow(product, categoryDoc) {
    return {
        Title: flattenAutolistText(clipText(product.productName, AUTOLIST_MAX_TITLE)),
        Price: listingPrice(product),
        Category: marketplaceCategory(),
        Condition: 'New',
        Description: buildAutolistDescription(product),
        'Image URLs': imageUrlsForAutolist(product).join(','),
        SKU: flattenAutolistText(product.codigo || ''),
        Stock: Math.max(0, Math.round(Number(product.stock) || 0))
    };
}

function csvCell(value) {
    // Defensa final: nunca escribir \\n/\\r dentro de una celda del CSV AutoList.
    const text = flattenAutolistText(value);
    if (/[",]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
}

function buildAutolistCsv(rows) {
    const lines = [AUTOLIST_COLUMNS.join(',')];
    rows.forEach((row) => {
        const line = AUTOLIST_COLUMNS.map((col) => csvCell(row[col])).join(',');
        if (/[\r\n]/.test(line)) {
            throw new Error('AutoList CSV inválido: una fila todavía tiene saltos de línea');
        }
        lines.push(line);
    });
    // BOM para que Excel abra bien tildes/ñ. 1 header + N productos = N+1 líneas.
    return `\uFEFF${lines.join('\n')}\n`;
}

/**
 * GET /api/export-products
 * Obtiene productos filtrados por categoría y subcategoría para exportación
 */
async function getExportProductsController(req, res) {
    try {
        const { category_id, subcategory_id } = req.query;

        if (!category_id || !subcategory_id) {
            return res.status(400).json({
                success: false,
                error: 'category_id y subcategory_id son requeridos'
            });
        }

        // Normalizar los valores (trim y convertir a string)
        const normalizedCategoryId = String(category_id).trim();
        const normalizedSubcategoryId = String(subcategory_id).trim();

        // Validar que la subcategoría pertenece a la categoría
        const category = await categoryModel.findOne({
            value: normalizedCategoryId,
            isActive: true
        }).lean();

        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Categoría no encontrada'
            });
        }

        // Verificar que la subcategoría existe y pertenece a esta categoría
        const subcategoryExists = category.subcategories.some(
            sub => sub.value === normalizedSubcategoryId && sub.isActive !== false
        );

        if (!subcategoryExists) {
            return res.status(404).json({
                success: false,
                error: 'Subcategoría no encontrada o no pertenece a la categoría seleccionada'
            });
        }

        // Buscar productos por categoría y subcategoría con stock > 0
        // Usar comparación estricta y normalizada
        const products = await productModel.find({
            category: normalizedCategoryId,
            subcategory: normalizedSubcategoryId,
            stock: { $gt: 0 } // Solo productos con stock mayor a 0
        }).select({
            _id: 1,
            productName: 1,
            description: 1,
            specifications: 1,
            technicalSpecifications: 1,
            sellingPrice: 1,
            productImage: 1,
            codigo: 1,
            brandName: 1,
            stock: 1,
            category: 1,
            subcategory: 1
        }).lean();

        // Filtrar productos que realmente coincidan (doble verificación)
        const filteredProducts = products.filter(product => {
            const productCategory = String(product.category || '').trim();
            const productSubcategory = String(product.subcategory || '').trim();
            return productCategory === normalizedCategoryId && 
                   productSubcategory === normalizedSubcategoryId;
        });

        // Formatear datos para la respuesta
        const formattedProducts = filteredProducts.map(product => {
            const tabbed = buildSpecsLinesTabbed(product);
            const especificaciones = tabbed
                ? tabbed.split('\n').map((line) => line.replace(/\t+/, ': ')).join(' / ')
                : '';

            const descripcionCompleta = buildExportDescription(product);

            return {
                id: product._id,
                titulo: product.productName,
                descripcion: descripcionCompleta,
                especificaciones: especificaciones,
                precio_venta: product.sellingPrice,
                image_url: product.productImage && product.productImage.length > 0 ? product.productImage[0] : null,
                codigo: product.codigo,
                marca: product.brandName,
                stock: product.stock
            };
        });

        res.status(200).json({
            success: true,
            data: {
                products: formattedProducts,
                total: formattedProducts.length,
                category: category_id,
                subcategory: subcategory_id
            }
        });

    } catch (error) {
        console.error('Error en getExportProductsController:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
}

/**
 * POST /api/download-product-images
 * Genera un archivo ZIP con Excel y carpetas de imágenes organizadas
 */
async function downloadProductImagesController(req, res) {
    try {
        const { product_ids, category, subcategory } = req.body;

        if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'product_ids es requerido y debe ser un array'
            });
        }

        if (!category || !subcategory) {
            return res.status(400).json({
                success: false,
                error: 'category y subcategory son requeridos'
            });
        }

        // Normalizar los valores
        const normalizedCategory = String(category).trim();
        const normalizedSubcategory = String(subcategory).trim();

        // Validar que la subcategoría pertenece a la categoría
        const categoryDoc = await categoryModel.findOne({
            value: normalizedCategory,
            isActive: true
        }).lean();

        if (!categoryDoc) {
            return res.status(404).json({
                success: false,
                error: 'Categoría no encontrada'
            });
        }

        // Verificar que la subcategoría existe y pertenece a esta categoría
        const subcategoryExists = categoryDoc.subcategories.some(
            sub => sub.value === normalizedSubcategory && sub.isActive !== false
        );

        if (!subcategoryExists) {
            return res.status(404).json({
                success: false,
                error: 'Subcategoría no encontrada o no pertenece a la categoría seleccionada'
            });
        }

        // Obtener productos seleccionados con stock > 0
        // Filtrar también por categoría y subcategoría para asegurar que pertenecen
        const products = await productModel.find({
            _id: { $in: product_ids },
            category: normalizedCategory,
            subcategory: normalizedSubcategory,
            stock: { $gt: 0 } // Solo productos con stock mayor a 0
        }).select({
            _id: 1,
            productName: 1,
            description: 1,
            specifications: 1,
            technicalSpecifications: 1,
            sellingPrice: 1,
            productImage: 1,
            codigo: 1,
            brandName: 1,
            stock: 1,
            category: 1,
            subcategory: 1
        }).lean();

        // Filtrar productos que realmente coincidan (doble verificación)
        const filteredProducts = products.filter(product => {
            const productCategory = String(product.category || '').trim();
            const productSubcategory = String(product.subcategory || '').trim();
            return productCategory === normalizedCategory && 
                   productSubcategory === normalizedSubcategory;
        });

        if (filteredProducts.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No se encontraron productos válidos con los IDs proporcionados que pertenezcan a la subcategoría seleccionada'
            });
        }

        // Crear directorio temporal - Compatible con Vercel
        // En Vercel solo se puede escribir en /tmp
        // Detectar si estamos en Vercel o en un entorno serverless
        // Verificar múltiples formas de detectar Vercel
        const isVercel = process.env.VERCEL === '1' || 
                        process.env.VERCEL_ENV || 
                        process.env.VERCEL_URL ||
                        process.cwd().includes('/var/task') ||
                        __dirname.includes('/var/task');
        
        // Usar /tmp en Vercel/serverless, o el directorio local en desarrollo
        let tempDir = '/tmp'; // Por defecto usar /tmp (funciona en Vercel y local)
        
        // Solo usar directorio local si NO estamos en Vercel y estamos en desarrollo
        if (!isVercel && process.env.NODE_ENV !== 'production') {
            const localTempDir = path.join(__dirname, '../../temp');
            try {
                // Intentar usar directorio local en desarrollo
                if (!fs.existsSync(localTempDir)) {
                    fs.mkdirSync(localTempDir, { recursive: true });
                }
                tempDir = localTempDir;
            } catch (error) {
                console.warn('No se pudo crear directorio local, usando /tmp:', error.message);
                tempDir = '/tmp';
            }
        }
        
        // Asegurarse de que el directorio temporal existe
        // En Vercel, /tmp siempre existe pero puede estar vacío
        try {
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
        } catch (error) {
            // Si falla, forzar uso de /tmp
            console.warn('Error verificando directorio temporal, usando /tmp:', error.message);
            tempDir = '/tmp';
        }

        const exportDir = path.join(tempDir, `export_${Date.now()}`);
        fs.mkdirSync(exportDir, { recursive: true });

        // Crear estructura de carpetas
        const subcategoryDir = path.join(exportDir, subcategory);
        fs.mkdirSync(subcategoryDir, { recursive: true });

        // Planilla AutoList: Title / Price / Category / Condition / Description / Image URLs
        const excelData = filteredProducts.map((product) => buildAutolistRow(product, categoryDoc));

        const worksheet = XLSX.utils.json_to_sheet(excelData, { header: AUTOLIST_COLUMNS });
        worksheet['!cols'] = [
            { wch: 42 }, // Title
            { wch: 12 }, // Price
            { wch: 36 }, // Category
            { wch: 12 }, // Condition
            { wch: 80 }, // Description
            { wch: 70 }, // Image URLs
            { wch: 16 }, // SKU
            { wch: 8 } // Stock
        ];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'AutoList');

        const safeSub = String(subcategory || 'productos').toLowerCase().replace(/[^\w.-]+/g, '_');
        const excelPath = path.join(subcategoryDir, `autolist_${safeSub}.xlsx`);
        XLSX.writeFile(workbook, excelPath);

        // CSV limpio para AutoList: 1 producto = 1 línea (sin \\n dentro de celdas).
        const csvBody = buildAutolistCsv(excelData);
        const expectedLines = excelData.length + 1; // header + filas
        const actualLines = csvBody.replace(/^\uFEFF/, '').replace(/\n$/, '').split('\n').length;
        if (actualLines !== expectedLines) {
            throw new Error(
                `AutoList CSV corrupto: ${actualLines} líneas vs ${expectedLines} esperadas`
            );
        }
        const csvPath = path.join(subcategoryDir, `autolist_${safeSub}.csv`);
        fs.writeFileSync(csvPath, csvBody, 'utf8');

        // Fotos locales con nombre AutoList: Row{n}_{sku}_{i}.jpg (sección 5 de la extensión).
        const autolistImagesDir = path.join(subcategoryDir, 'autolist_images');
        fs.mkdirSync(autolistImagesDir, { recursive: true });

        const downloadJobs = [];
        filteredProducts.forEach((product, index) => {
            const rowNumber = index + 1;
            const productDir = path.join(subcategoryDir, String(rowNumber));
            fs.mkdirSync(productDir, { recursive: true });

            const images = imageUrlsForAutolist(product);
            if (!images.length) {
                fs.writeFileSync(
                    path.join(productDir, 'sin_imagenes.txt'),
                    'Este producto no tiene imágenes asociadas'
                );
                return;
            }

            const rowId = safeAutolistId(product, rowNumber);
            images.forEach((imageUrl, imageIndex) => {
                downloadJobs.push({
                    product,
                    productDir,
                    imageUrl,
                    imageIndex,
                    rowNumber,
                    rowId
                });
            });
        });

        console.log(
            `[export] Descargando ${downloadJobs.length} imágenes JPEG (máx ${IMAGE_DOWNLOAD_CONCURRENCY} en paralelo)…`
        );

        let okCount = 0;
        let failCount = 0;

        await mapWithConcurrency(downloadJobs, IMAGE_DOWNLOAD_CONCURRENCY, async (job) => {
            const { product, productDir, imageUrl, imageIndex, rowNumber, rowId } = job;
            const fileName = `Row${rowNumber}_${rowId}_${imageIndex + 1}.jpg`;
            const imagePath = path.join(productDir, fileName);
            const flatPath = path.join(autolistImagesDir, fileName);

            try {
                await downloadImageToFile(imageUrl, imagePath);
                fs.copyFileSync(imagePath, flatPath);
                okCount += 1;
                console.log(
                    `✅ Imagen ${imageIndex + 1} descargada para producto ${product.productName}`
                );
            } catch (error) {
                failCount += 1;
                console.warn(
                    `Error descargando imagen ${imageIndex + 1} para producto ${product.productName}:`,
                    error.message
                );
                const errorPath = path.join(productDir, `imagen_${imageIndex + 1}_error.txt`);
                fs.writeFileSync(
                    errorPath,
                    `Imagen ${imageIndex + 1} no disponible: ${imageUrl}\nError: ${error.message}`
                );
            }
        });

        console.log(`[export] Imágenes OK=${okCount} fallidas=${failCount}`);

        // Crear archivo ZIP
        const zipPath = path.join(tempDir, `productos_${subcategory.toLowerCase()}_${Date.now()}.zip`);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 6 } });

        return new Promise((resolve, reject) => {
            output.on('close', () => {
                // Enviar archivo ZIP
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader(
                    'Content-Disposition',
                    `attachment; filename="autolist_${String(subcategory || 'productos').toLowerCase().replace(/[^\w.-]+/g, '_')}.zip"`
                );
                
                const fileStream = fs.createReadStream(zipPath);
                fileStream.pipe(res);

                fileStream.on('end', () => {
                    // Limpiar archivos temporales
                    fs.rmSync(exportDir, { recursive: true, force: true });
                    fs.unlinkSync(zipPath);
                    resolve();
                });

                fileStream.on('error', (error) => {
                    console.error('Error enviando archivo:', error);
                    // Limpiar archivos temporales
                    fs.rmSync(exportDir, { recursive: true, force: true });
                    if (fs.existsSync(zipPath)) {
                        fs.unlinkSync(zipPath);
                    }
                    reject(error);
                });
            });

            archive.on('error', (error) => {
                console.error('Error creando ZIP:', error);
                reject(error);
            });

            archive.pipe(output);
            archive.directory(subcategoryDir, subcategory);
            archive.finalize();
        });

    } catch (error) {
        console.error('Error en downloadProductImagesController:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
}

module.exports = {
    getExportProductsController,
    downloadProductImagesController
};
