const productModel = require("../../models/productModel")
const { attachBrandLogo } = require("../../services/brandLogoService")
const { isMongoObjectId } = require("../../helpers/productStructuredData")

const getProductDetails = async(req,res)=>{
    try{
        const key = String(req.body?.productId || req.body?.slug || '').trim()

        if (!key) {
            return res.json({
                data: null,
                message: "Producto no encontrado",
                success: false,
                error: true
            })
        }

        let product = null
        if (isMongoObjectId(key)) {
            product = await productModel.findById(key).lean()
        }
        if (!product) {
            product = await productModel.findOne({ slug: key }).lean()
        }

        if (!product) {
            return res.json({
                data: null,
                message: "Producto no encontrado",
                success: false,
                error: true
            })
        }

        res.json({
            data : await attachBrandLogo(product),
            message : "Ok",
            success : true,
            error : false
        })
    }catch(err){
        res.json({
            message : err?.message  || err,
            error : true,
            success : false
        })
    }
}

module.exports = getProductDetails
