const uploadProductPermission = require("../../helpers/permission");
const productModel = require("../../models/productModel");
const { generateSlug, generateUniqueSlug } = require('../../helpers/slugGenerator');

async function UploadProductController(req, res) {
    try {
        const sessionUserId = req.userId;

        if (!uploadProductPermission(sessionUserId)) {
            throw new Error("Permiso Denegado");
        }

        // Generar slug para el producto
        const productData = req.body;
        const baseSlug = generateSlug(productData.productName);
        
        // Función para verificar si un slug ya existe
        const checkExistingSlug = async (slug) => {
            const existingProduct = await productModel.findOne({ slug });
            return !!existingProduct;
        };
        
        // Generar slug único
        productData.slug = await generateUniqueSlug(baseSlug, checkExistingSlug);

        // ✅ VALIDAR Y PROCESAR CÓDIGO DEL PRODUCTO
        if (!productData.codigo) {
            throw new Error("El código del producto es requerido");
        }
        
        // Convertir código a mayúsculas y limpiar espacios
        productData.codigo = productData.codigo.toString().toUpperCase().trim();
        
        // Verificar si el código ya existe
        const existingCode = await productModel.findOne({ codigo: productData.codigo });
        if (existingCode) {
            throw new Error(`El código "${productData.codigo}" ya existe. Por favor usa un código diferente.`);
        }

        // ✅ MAPEAR CAMPOS DE PRECIO CORRECTAMENTE
        // El modelo requiere 'price' pero el frontend envía 'sellingPrice'
        if (productData.sellingPrice && !productData.price) {
            productData.price = productData.sellingPrice;
        }
        
        // Asegurar que ambos campos tengan el mismo valor si no se especifica price
        if (!productData.price && productData.sellingPrice) {
            productData.price = productData.sellingPrice;
        }

        const uploadProduct = new productModel(productData);
        const saveProduct = await uploadProduct.save();

        res.status(201).json({
            message: "Producto Cargado Sastifactoriamente",
            error: false,
            success: true,
            data: saveProduct
        });

    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
}

module.exports = UploadProductController;