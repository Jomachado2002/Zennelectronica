// backend/controller/product/updateProductFinance.js
const ProductModel = require('../../models/productModel');
const uploadProductPermission = require('../../helpers/permission');

/**
 * Actualiza la información financiera de un producto y calcula el margen de ganancia
 */
async function updateProductFinanceController(req, res) {
    try {
        if (!uploadProductPermission(req.userId)) {
            throw new Error("Permiso denegado");
        }

        const { 
            productId, 
            purchasePriceUSD,    // Nuevo: precio en USD
            exchangeRate,        // Nuevo: tipo de cambio
            purchasePrice,       // Precio en PYG (puede ser calculado o enviado directamente)
            loanInterest, 
            deliveryCost, 
            profitMargin,        // Nuevo: margen de ganancia como porcentaje
            sellingPrice 
        } = req.body;

        if (!productId) {
            throw new Error("ID de producto no proporcionado");
        }

        // Verificamos que el producto existe
        const product = await ProductModel.findById(productId);
        if (!product) {
            throw new Error("Producto no encontrado");
        }

        // Convertimos a números y validamos con valores predeterminados
        // Si el valor es cero o no está definido, usamos el valor predeterminado
        const purchaseUSD = Number(purchasePriceUSD) || 0;
        const exchange = Number(exchangeRate) || 7300;
        const purchase = Number(purchasePrice) || (purchaseUSD * exchange); // Calcular si no se proporciona
        
        // Aplicar valores predeterminados para interés, envío y margen si no existen o son cero
        let interest = Number(loanInterest);
        interest = (isNaN(interest) || interest <= 0) ? 15 : interest;
        
        let delivery = Number(deliveryCost);
        delivery = (isNaN(delivery) || delivery <= 0) ? 10000 : delivery;
        
        let margin = Number(profitMargin);
        margin = (isNaN(margin) || margin <= 0) ? 10 : margin;
        
        const selling = Number(sellingPrice) || 0;

        if (purchaseUSD <= 0) {
            throw new Error("El precio de compra en USD debe ser mayor que cero");
        }

        if (selling <= 0) {
            throw new Error("El precio de venta debe ser mayor que cero");
        }

        // Calculamos los costos totales
        const interestAmount = purchase * (interest / 100);
        const totalCosts = purchase + interestAmount + delivery;
        
        // Calculamos la utilidad y el margen de ganancia real
        const profitAmount = selling - totalCosts;
        const realProfitMargin = (profitAmount / selling) * 100;

        // Actualizamos el producto
        const updatedProduct = await ProductModel.findByIdAndUpdate(
            productId,
            {
                purchasePriceUSD: purchaseUSD,
                exchangeRate: exchange,
                purchasePrice: purchase,
                loanInterest: interest,
                deliveryCost: delivery,
                profitMargin: margin,
                profitAmount: profitAmount,
                sellingPrice: selling,
                lastUpdatedFinance: new Date()
            },
            { new: true }
        );

        res.json({
            message: "Información financiera actualizada correctamente",
            data: {
                product: updatedProduct,
                financialSummary: {
                    purchasePriceUSD: purchaseUSD,
                    exchangeRate: exchange,
                    purchasePricePYG: purchase,
                    interestAmount: interestAmount,
                    deliveryCost: delivery,
                    totalCosts: totalCosts,
                    profitAmount: profitAmount,
                    profitMargin: realProfitMargin.toFixed(2),
                    sellingPrice: selling
                }
            },
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

/**
 * Obtiene un resumen financiero de un producto
 */
async function getProductFinanceController(req, res) {
    try {
        if (!uploadProductPermission(req.userId)) {
            throw new Error("Permiso denegado");
        }

        const { productId } = req.params;

        if (!productId) {
            throw new Error("ID de producto no proporcionado");
        }

        const product = await ProductModel.findById(productId);
        
        if (!product) {
            throw new Error("Producto no encontrado");
        }

        // Calculamos los valores financieros con valores predeterminados mejorados
        const purchaseUSD = product.purchasePriceUSD || 0;
        const exchange = product.exchangeRate || 7300;
        const purchase = product.purchasePrice || 0;
        
        // Aplicar valores predeterminados si no existen o son cero
        let interest = product.loanInterest;
        interest = (isNaN(interest) || interest <= 0) ? 15 : interest;
        
        let delivery = product.deliveryCost;
        delivery = (isNaN(delivery) || delivery <= 0) ? 10000 : delivery;
        
        let margin = product.profitMargin;
        margin = (isNaN(margin) || margin <= 0) ? 10 : margin;
        
        const selling = product.sellingPrice || 0;

        const interestAmount = purchase * (interest / 100);
        const totalCosts = purchase + interestAmount + delivery;
        const profitAmount = selling - totalCosts;
        const realProfitMargin = selling > 0 ? (profitAmount / selling) * 100 : 0;

        res.json({
            message: "Información financiera del producto",
            data: {
                product: {
                    _id: product._id,
                    productName: product.productName,
                    purchasePriceUSD: purchaseUSD,
                    exchangeRate: exchange,
                    purchasePrice: purchase,
                    loanInterest: interest,
                    profitMargin: margin,
                    deliveryCost: delivery,
                    sellingPrice: selling,
                    lastUpdatedFinance: product.lastUpdatedFinance
                },
                financialSummary: {
                    purchasePriceUSD: purchaseUSD,
                    exchangeRate: exchange,
                    purchasePricePYG: purchase,
                    interestAmount: interestAmount,
                    deliveryCost: delivery,
                    totalCosts: totalCosts,
                    profitAmount: profitAmount,
                    profitMargin: realProfitMargin.toFixed(2),
                    sellingPrice: selling
                }
            },
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
    updateProductFinanceController,
    getProductFinanceController
};