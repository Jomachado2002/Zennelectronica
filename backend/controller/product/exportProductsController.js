// backend/controller/product/exportProductsController.js
// Controlador para exportar productos con Excel e imágenes

const productModel = require('../../models/productModel');
const categoryModel = require('../../models/categoryModel');
const XLSX = require('xlsx');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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
            // Convertir especificaciones de objeto a string si es necesario
            let especificaciones = '';
            if (product.specifications) {
                if (typeof product.specifications === 'object') {
                    especificaciones = Object.entries(product.specifications)
                        .filter(([key, value]) => value && value !== '')
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(' / ');
                } else {
                    especificaciones = product.specifications;
                }
            }

            // Generar descripción con mensaje de contacto
            let descripcionCompleta = '';
            const mensajeContacto = 'Para más información podrías escribirnos al 0973/345/284 contamos con productos al por mayor para reventa';
            
            if (product.description && product.description.trim() !== '') {
                descripcionCompleta = `${product.description} ${mensajeContacto}`;
            } else {
                descripcionCompleta = mensajeContacto;
            }

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

        // Generar Excel
        const excelData = filteredProducts.map((product, index) => {
            // Generar descripción con mensaje de contacto
            let descripcionCompleta = '';
            const mensajeContacto = 'Para más información podrías escribirnos al 0973/345/284 contamos con productos al por mayor para reventa';
            
            if (product.description && product.description.trim() !== '') {
                descripcionCompleta = `${product.description} ${mensajeContacto}`;
            } else {
                descripcionCompleta = mensajeContacto;
            }

            return {
                'N°': index + 1,
                'Título del producto': product.productName,
                'Descripción': descripcionCompleta,
                'Precio de venta': product.sellingPrice,
                'Stock': product.stock
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

        // Guardar Excel
        const excelPath = path.join(subcategoryDir, `productos_${subcategory.toLowerCase()}.xlsx`);
        XLSX.writeFile(workbook, excelPath);

        // Descargar y organizar TODAS las imágenes de cada producto
        const imagePromises = filteredProducts.map(async (product, index) => {
            const productDir = path.join(subcategoryDir, `${index + 1}`);
            fs.mkdirSync(productDir, { recursive: true });

            if (product.productImage && product.productImage.length > 0) {
                // Descargar TODAS las imágenes del producto
                const imageDownloadPromises = product.productImage.map(async (imageUrl, imageIndex) => {
                    try {
                        const response = await axios.get(imageUrl, {
                            responseType: 'stream',
                            timeout: 30000
                        });

                        const imageExtension = path.extname(new URL(imageUrl).pathname) || '.jpg';
                        const imagePath = path.join(productDir, `imagen_${imageIndex + 1}${imageExtension}`);
                        
                        const writer = fs.createWriteStream(imagePath);
                        response.data.pipe(writer);

                        return new Promise((resolve, reject) => {
                            writer.on('finish', () => {
                                console.log(`✅ Imagen ${imageIndex + 1} descargada para producto ${product.productName}`);
                                resolve();
                            });
                            writer.on('error', reject);
                        });
                    } catch (error) {
                        console.warn(`Error descargando imagen ${imageIndex + 1} para producto ${product.productName}:`, error.message);
                        // Crear archivo de texto indicando que la imagen no se pudo descargar
                        const errorPath = path.join(productDir, `imagen_${imageIndex + 1}_error.txt`);
                        fs.writeFileSync(errorPath, `Imagen ${imageIndex + 1} no disponible: ${imageUrl}\nError: ${error.message}`);
                    }
                });

                // Esperar a que se descarguen todas las imágenes del producto
                await Promise.allSettled(imageDownloadPromises);
            } else {
                // Crear archivo de texto indicando que no hay imágenes
                const noImagePath = path.join(productDir, 'sin_imagenes.txt');
                fs.writeFileSync(noImagePath, 'Este producto no tiene imágenes asociadas');
            }
        });

        // Esperar a que se descarguen todas las imágenes
        await Promise.allSettled(imagePromises);

        // Crear archivo ZIP
        const zipPath = path.join(tempDir, `productos_${subcategory.toLowerCase()}_${Date.now()}.zip`);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
            output.on('close', () => {
                // Enviar archivo ZIP
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader('Content-Disposition', `attachment; filename="productos_${subcategory.toLowerCase()}.zip"`);
                
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
