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