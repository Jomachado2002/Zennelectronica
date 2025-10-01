// backend/controller/product/updateAllPrices.js
const ProductModel = require('../../models/productModel');
const uploadProductPermission = require('../../helpers/permission');

/**
 * Actualiza los precios de todos los productos basados en el tipo de cambio proporcionado
 * Este controlador actualiza todos los precios de compra en PYG basados en el precio USD y 
 * el nuevo tipo de cambio
 */
async function updateAllPricesController(req, res) {
    try {
        // Verificar permisos
        if (!uploadProductPermission(req.userId)) {
            throw new Error("Permiso denegado");
        }

        // Obtener el tipo de cambio del request
        const { exchangeRate } = req.body;
        
        if (!exchangeRate || exchangeRate <= 0) {
            throw new Error("Tipo de cambio inválido");
        }

        // Convertir a número
        const newExchangeRate = Number(exchangeRate);

        // Obtener todos los productos que tienen un precio de compra en USD
        const products = await ProductModel.find({ 
            purchasePriceUSD: { $exists: true, $gt: 0 } 
        });

        if (products.length === 0) {
            return res.json({
                message: "No se encontraron productos con precio en USD para actualizar",
                data: {
                    updatedCount: 0
                },
                success: true,
                error: false
            });
        }

        // Contador de productos actualizados
        let updatedCount = 0;

        // Actualizar cada producto
        for (const product of products) {
            const purchaseUSD = Number(product.purchasePriceUSD);
            
            // Calcular el nuevo precio en PYG
            const newPurchasePrice = purchaseUSD * newExchangeRate;
            
            // Calcular los nuevos valores financieros
            const interest = Number(product.loanInterest) || 0;
            const delivery = Number(product.deliveryCost) || 0;
            const selling = Number(product.sellingPrice) || 0;
            
            const interestAmount = newPurchasePrice * (interest / 100);
            const totalCosts = newPurchasePrice + interestAmount + delivery;
            const profitAmount = selling - totalCosts;
            const realProfitMargin = selling > 0 ? (profitAmount / selling) * 100 : 0;

            // Actualizar el producto
            await ProductModel.findByIdAndUpdate(
                product._id,
                {
                    exchangeRate: newExchangeRate,
                    purchasePrice: newPurchasePrice,
                    profitAmount: profitAmount,
                    lastUpdatedFinance: new Date()
                }
            );

            updatedCount++;
        }

        res.json({
            message: `Se han actualizado ${updatedCount} productos con el nuevo tipo de cambio (${newExchangeRate.toLocaleString()} Gs)`,
            data: {
                updatedCount,
                exchangeRate: newExchangeRate
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
    updateAllPricesController
};