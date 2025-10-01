const productModel = require("../../models/productModel");

const searchProduct = async (req, res) => {
    try {
        const { q, category, subcategory } = req.query;

        // Construir el objeto de filtro
        let filter = {};

        // Si hay un término de búsqueda, crear una búsqueda insensible a mayúsculas/minúsculas
        if (q) {
            filter.$or = [
                { productName: { $regex: q, $options: 'i' } },
                { category: { $regex: q, $options: 'i' } },
                { subcategory: { $regex: q, $options: 'i' } }
            ];
        }

        // Filtrar por categoría si se proporciona
        if (category) {
            filter.category = category;
        }

        // Filtrar por subcategoría si se proporciona
        if (subcategory) {
            filter.subcategory = subcategory;
        }

        // Realizar la búsqueda con los filtros
        const products = await productModel.find(filter);

        res.json({
            message: "Búsqueda de productos",
            data: products,
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

module.exports = searchProduct;
