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

        // Buscar productos por categoría y subcategoría
        const products = await productModel.find({
            category: category_id,
            subcategory: subcategory_id
        }).select({
            _id: 1,
            productName: 1,
            description: 1,
            specifications: 1,
            sellingPrice: 1,
            productImage: 1,
            codigo: 1,
            brandName: 1
        }).lean();

        // Formatear datos para la respuesta
        const formattedProducts = products.map(product => {
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

            return {
                id: product._id,
                titulo: product.productName,
                descripcion: product.description || '',
                especificaciones: especificaciones,
                precio_venta: product.sellingPrice,
                image_url: product.productImage && product.productImage.length > 0 ? product.productImage[0] : null,
                codigo: product.codigo,
                marca: product.brandName
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

        // Obtener productos seleccionados
        const products = await productModel.find({
            _id: { $in: product_ids }
        }).select({
            _id: 1,
            productName: 1,
            description: 1,
            specifications: 1,
            sellingPrice: 1,
            productImage: 1,
            codigo: 1,
            brandName: 1
        }).lean();

        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No se encontraron productos con los IDs proporcionados'
            });
        }

        // Crear directorio temporal
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const exportDir = path.join(tempDir, `export_${Date.now()}`);
        fs.mkdirSync(exportDir, { recursive: true });

        // Crear estructura de carpetas
        const subcategoryDir = path.join(exportDir, subcategory);
        fs.mkdirSync(subcategoryDir, { recursive: true });

        // Generar Excel
        const excelData = products.map((product, index) => {
            return {
                'N°': index + 1,
                'Título del producto': product.productName,
                'Descripción': product.description || 'Sin descripción',
                'Precio de venta': product.sellingPrice
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

        // Guardar Excel
        const excelPath = path.join(subcategoryDir, `productos_${subcategory.toLowerCase()}.xlsx`);
        XLSX.writeFile(workbook, excelPath);

        // Descargar y organizar TODAS las imágenes de cada producto
        const imagePromises = products.map(async (product, index) => {
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
