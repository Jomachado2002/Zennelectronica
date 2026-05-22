const ProductModel = require('../../models/productModel');
const { calculateVisaoVipPrices } = require('../../utils/priceCalculator');

const VISAO_SYNC_SOURCE = 'visao_vip';

// Función para recalcular precios de productos basado en nuevo tipo de cambio
const recalculateProductPrices = async (newExchangeRate, options = {}) => {
  const {
    updateProducts = true,
    dryRun = false, // Si es true, solo simula sin actualizar
    productIds = null // Array de IDs específicos, si es null actualiza todos
  } = options;

  const startTime = Date.now();
  const results = {
    totalProducts: 0,
    updatedProducts: 0,
    skippedProducts: 0,
    priceIncreases: 0,
    priceDecreases: 0,
    unchangedPrices: 0,
    errors: [],
    averagePriceChange: 0,
    totalPriceChange: 0,
    products: []
  };

  try {
    // Buscar productos que necesitan actualización
    let query = {
      purchasePriceUSD: { $exists: true, $ne: null, $gt: 0 },
      exchangeRate: { $exists: true, $ne: null }
    };

    // Si se especifican IDs específicos
    if (productIds && Array.isArray(productIds)) {
      query._id = { $in: productIds };
    }

    const products = await ProductModel.find(query);
    results.totalProducts = products.length;

    // console.log removed for production

    if (products.length === 0) {
      return results;
    }

    let totalPriceChange = 0;
    let priceChangeCount = 0;

    for (const product of products) {
      try {
        let newSellingPrice;
        let purchasePricePYG;
        let visaoPrices = null;

        if (product.syncSource === VISAO_SYNC_SOURCE) {
          const fuente = String(product.visaoPrecioFuente || '').toUpperCase();
          const visaoInput =
            fuente === 'PYG' && product.purchasePrice > 0
              ? { precioFuente: 'PYG', precioPygRaw: Math.round(product.purchasePrice) }
              : { precioFuente: 'USD', precioUsd: product.purchasePriceUSD };
          visaoPrices = calculateVisaoVipPrices({
            ...visaoInput,
            exchangeRate: newExchangeRate
          });
          newSellingPrice = visaoPrices.sellingPrice;
          purchasePricePYG = visaoPrices.purchasePrice;
        } else {
          purchasePricePYG = product.purchasePriceUSD * newExchangeRate;
          const interestAmount = (purchasePricePYG * product.loanInterest) / 100;
          const costBeforeProfit = purchasePricePYG + interestAmount;
          const sellingPriceBeforeDelivery = costBeforeProfit / (1 - (product.profitMargin / 100));
          newSellingPrice = sellingPriceBeforeDelivery + (product.deliveryCost || 0);
        }

        const oldSellingPrice = product.sellingPrice || 0;
        const priceChange = newSellingPrice - oldSellingPrice;
        const priceChangePercentage = oldSellingPrice > 0 ? (priceChange / oldSellingPrice) * 100 : 0;

        // Clasificar el cambio
        let changeType = 'unchanged';
        if (priceChange > 100) { // Consideramos cambio si es más de 100 PYG
          changeType = 'increase';
          results.priceIncreases++;
        } else if (priceChange < -100) {
          changeType = 'decrease';
          results.priceDecreases++;
        } else {
          results.unchangedPrices++;
        }

        const productResult = {
          _id: product._id,
          productName: product.productName,
          codigo: product.codigo,
          oldSellingPrice,
          newSellingPrice: Math.round(newSellingPrice),
          priceChange: Math.round(priceChange),
          priceChangePercentage: Math.round(priceChangePercentage * 100) / 100,
          changeType,
          purchasePriceUSD: product.purchasePriceUSD,
          exchangeRate: product.exchangeRate,
          newExchangeRate
        };

        results.products.push(productResult);

        if (priceChange !== 0) {
          totalPriceChange += Math.abs(priceChange);
          priceChangeCount++;
        }

        // Actualizar producto si no es dry run y se debe actualizar
        if (updateProducts && !dryRun) {
          const updatePayload = {
            sellingPrice: Math.round(newSellingPrice),
            exchangeRate: newExchangeRate,
            lastUpdatedFinance: new Date(),
            purchasePrice: Math.round(purchasePricePYG)
          };
          if (visaoPrices) {
            updatePayload.purchasePriceUSD = visaoPrices.purchasePriceUSD;
            updatePayload.deliveryCost = visaoPrices.deliveryCost;
            updatePayload.profitMargin = visaoPrices.profitMargin;
            updatePayload.profitAmount = visaoPrices.profitAmount;
          } else {
            const interestAmount = (purchasePricePYG * product.loanInterest) / 100;
            const costBeforeProfit = purchasePricePYG + interestAmount;
            updatePayload.profitAmount = Math.round(
              newSellingPrice - costBeforeProfit - (product.deliveryCost || 0)
            );
          }
          await ProductModel.findByIdAndUpdate(product._id, updatePayload);

          results.updatedProducts++;
        } else {
          results.skippedProducts++;
        }

      } catch (error) {
        // console.error removed for production
        results.errors.push({
          productId: product._id,
          productName: product.productName,
          error: error.message
        });
      }
    }

    // Calcular estadísticas finales
    results.averagePriceChange = priceChangeCount > 0 ? totalPriceChange / priceChangeCount : 0;
    results.totalPriceChange = totalPriceChange;
    results.updateDuration = Date.now() - startTime;

    // console.log removed for production
    // console.log removed for production
    // console.log removed for production
    // console.log removed for production
    // console.log removed for production
    // console.log removed for production

    return results;

  } catch (error) {
    // console.error removed for production
    throw error;
  }
};

// Endpoint para recalcular precios (puede ser llamado independientemente)
const recalculatePricesEndpoint = async (req, res) => {
  try {
    const { 
      newExchangeRate, 
      productIds, 
      dryRun = false 
    } = req.body;

    if (!newExchangeRate || newExchangeRate <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de cambio inválido'
      });
    }

    const results = await recalculateProductPrices(newExchangeRate, {
      updateProducts: !dryRun,
      dryRun,
      productIds
    });

    res.json({
      success: true,
      message: dryRun ? 'Simulación completada' : 'Precios recalculados exitosamente',
      data: results
    });

  } catch (error) {
    // console.error removed for production
    res.status(500).json({
      success: false,
      message: 'Error recalculando precios',
      error: error.message
    });
  }
};

module.exports = {
  recalculateProductPrices,
  recalculatePricesEndpoint
};
