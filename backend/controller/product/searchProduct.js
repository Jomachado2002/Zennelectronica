const productModel = require("../../models/productModel")

const searchProduct = async(req,res)=>{
    try{
        const query = req.query.q 

        // Separar palabras de búsqueda
        const searchTerms = query.split(/\s+/).filter(term => term.trim() !== '')

        // Construir condiciones de búsqueda
        const searchConditions = searchTerms.map(term => {
            const regex = new RegExp(term, 'i')
            return {
                "$or": [
                    { productName: regex },
                    { category: regex },
                    { subcategory: regex },
                    { brandName: regex },
                    { processor: regex },
                    { memory: regex },
                    { storage: regex },
                    { disk: regex },
                    { graphicsCard: regex },
                    { monitorSize: regex },
                    { monitorRefreshRate: regex },
                    { cameraResolution: regex },
                    { dvrChannels: regex },
                    { nasCapacity: regex },
                    { printerType: regex },
                    { printerFunctions: regex },
                    { psuWattage: regex },
                    { upsCapacity: regex },
                    { airpodsModel: regex },
                    { softwareLicenseType: regex },
                    { phoneType: regex },
                    { phoneStorage: regex }
                ]
            }
        })

        // ✅ FILTRAR PRODUCTOS CON STOCK > 0
        const stockFilter = {
            "$or": [
                { stock: { $exists: false } },
                { stock: null },
                { stock: { $gt: 0 } }
            ]
        };

        // Buscar productos que coincidan con todos los términos Y tengan stock
        const products = await productModel.find({
            "$and": [
                ...searchConditions,
                stockFilter
            ]
        })

        res.json({
            data: products,
            message: "Búsqueda de productos completada",
            error: false,
            success: true
        })
    }catch(err){
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        })
    }
}

module.exports = searchProduct