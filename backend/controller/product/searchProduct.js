const productModel = require("../../models/productModel")

function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const SEARCH_SELECT =
    'productName slug sellingPrice price productImage brandName category subcategory stock codigo'

const searchProduct = async (req, res) => {
    try {
        const query = String(req.query.q || '').trim()
        if (query.length < 2) {
            return res.json({
                data: [],
                message: "Búsqueda demasiado corta",
                error: false,
                success: true
            })
        }

        const parsedLimit = parseInt(req.query.limit, 10)
        const limit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 48, 1), 80)

        const searchTerms = query.split(/\s+/).filter((term) => term.trim() !== '').slice(0, 6)

        const searchConditions = searchTerms.map((term) => {
            const regex = new RegExp(escapeRegex(term), 'i')
            return {
                "$or": [
                    { productName: regex },
                    { category: regex },
                    { subcategory: regex },
                    { brandName: regex },
                    { codigo: regex }
                ]
            }
        })

        const stockFilter = {
            "$or": [
                { stock: { $exists: false } },
                { stock: null },
                { stock: { $gt: 0 } }
            ]
        }

        const products = await productModel
            .find({
                "$and": [
                    ...searchConditions,
                    stockFilter
                ]
            })
            .select(SEARCH_SELECT)
            .limit(limit)
            .lean()

        res.json({
            data: products,
            message: "Búsqueda de productos completada",
            error: false,
            success: true
        })
    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        })
    }
}

module.exports = searchProduct
