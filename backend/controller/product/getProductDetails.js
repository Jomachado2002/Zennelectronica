const productModel = require("../../models/productModel")
const { attachBrandLogo } = require("../../services/brandLogoService")

const getProductDetails = async(req,res)=>{
    try{
        const { productId } = req.body

        const product = await productModel.findById(productId).lean()
        const data = await attachBrandLogo(product)

        res.json({
            data,
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