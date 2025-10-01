// backend/controller/product/getProductBySlug.js
const productModel = require("../../models/productModel");

const getProductBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const product = await productModel.findOne({ slug });

        if (!product) {
            return res.status(404).json({
                message: "Producto no encontrado",
                success: false,
                error: true
            });
        }

        res.json({
            data: product,
            message: "Ok",
            success: true,
            error: false
        });
    } catch (err) {
        res.json({
            message: err?.message || err,
            error: true,
            success: false
        });
    }
};

module.exports = getProductBySlug;