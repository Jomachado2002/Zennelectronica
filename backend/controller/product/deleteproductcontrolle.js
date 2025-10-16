// controllers/product/deleteProduct.js
const ProductModel = require('../../models/productModel');
const uploadProductPermission = require('../../helpers/permission');

async function deleteProductController(req, res) {
    try {
        // Verificar permisos de manera asíncrona
        const hasPermission = await uploadProductPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Permiso denegado. Se requieren permisos de administrador.",
                error: true,
                success: false
            });
        }

        const { productId } = req.body;

        if (!productId) {
            throw new Error("ID de producto no proporcionado");
        }

        const deletedProduct = await ProductModel.findByIdAndDelete(productId);

        if (!deletedProduct) {
            throw new Error("Producto no encontrado");
        }

        res.json({
            message: "Producto eliminado correctamente",
            success: true,
            error: false
        });

    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
}

module.exports = {
    deleteProductController
};