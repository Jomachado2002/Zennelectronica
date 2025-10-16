const ExchangeRateModel = require('../../models/exchangeRateModel');
const ProductModel = require('../../models/productModel');
const { recalculateProductPrices } = require('../product/recalculatePrices');
// const { logger } = require('../../utils/logger');

// Obtener tipo de cambio actual
const getCurrentExchangeRate = async (req, res) => {
  try {
    const { currency = 'USD' } = req.query;
    
    const currentRate = await ExchangeRateModel.getCurrentRate(currency);
    
    res.json({
      success: true,
      data: {
        rate: currentRate.toPYG,
        currency: currentRate.currency,
        effectiveDate: currentRate.effectiveDate,
        source: currentRate.source,
        isActive: currentRate.isActive
      }
    });
  } catch (error) {
    console.error('Error getting current exchange rate:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo tipo de cambio actual',
      error: error.message
    });
  }
};

// Actualizar tipo de cambio
const updateExchangeRate = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      currency = 'USD', 
      newRate, 
      notes = '', 
      updateProducts = false,
      source = 'manual'
    } = req.body;
    
    const userId = req.user?.id || req.user?._id;
    
    // Validar datos
    if (!newRate || newRate <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El nuevo tipo de cambio debe ser un número positivo'
      });
    }
    
    // Obtener tipo de cambio actual para comparación
    const currentRate = await ExchangeRateModel.getCurrentRate(currency);
    const previousRate = currentRate.toPYG;
    
    // Inicializar resultados de actualización
    let updateResults = {
      affectedProducts: 0,
      priceIncreaseCount: 0,
      priceDecreaseCount: 0,
      totalPriceChange: 0,
      averagePriceChange: 0,
      updateDuration: 0
    };
    
    // Si se solicita actualizar productos
    if (updateProducts) {
      console.log('🔄 Actualizando precios de productos...');
      updateResults = await recalculateProductPrices(newRate, {
        updateProducts: true,
        dryRun: false
      });
      console.log('✅ Precios de productos actualizados');
    }
    
    // Desactivar tipo de cambio anterior
    await ExchangeRateModel.updateMany(
      { currency: currency.toUpperCase(), isActive: true },
      { isActive: false }
    );
    
    // Crear nuevo registro de tipo de cambio
    const newExchangeRate = new ExchangeRateModel({
      currency: currency.toUpperCase(),
      toPYG: newRate,
      source,
      updatedBy: userId || 'admin',
      notes,
      updateMetadata: {
        previousRate,
        ...updateResults,
        updateDuration: Date.now() - startTime
      }
    });
    
    // Guardar nuevo tipo de cambio
    await newExchangeRate.save();
    
    console.log(`✅ Exchange rate updated: ${currency} ${previousRate} -> ${newRate}`, {
      userId,
      affectedProducts: updateResults.affectedProducts,
      updateDuration: newExchangeRate.updateMetadata.updateDuration
    });
    
    res.json({
      success: true,
      message: 'Tipo de cambio actualizado exitosamente',
      data: {
        newRate: newExchangeRate.toPYG,
        previousRate,
        change: newRate - previousRate,
        changePercentage: ((newRate - previousRate) / previousRate * 100).toFixed(2),
        updateResults
      }
    });
    
  } catch (error) {
    console.error('Error updating exchange rate:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando tipo de cambio',
      error: error.message
    });
  }
};

// Función eliminada - ahora usamos recalculateProductPrices

// Obtener historial de tipos de cambio
const getExchangeRateHistory = async (req, res) => {
  try {
    const { currency = 'USD', days = 30 } = req.query;
    
    const history = await ExchangeRateModel.getRateHistory(currency, parseInt(days));
    
    // Agregar información de cambio a cada registro
    const historyWithChanges = history.map((rate, index) => {
      const previousRate = index < history.length - 1 ? history[index + 1].toPYG : null;
      const change = previousRate ? rate.toPYG - previousRate : 0;
      const changePercentage = previousRate ? (change / previousRate * 100) : 0;
      
      return {
        ...rate.toObject(),
        change,
        changePercentage: changePercentage.toFixed(2)
      };
    });
    
    res.json({
      success: true,
      data: historyWithChanges
    });
    
  } catch (error) {
    console.error('Error getting exchange rate history:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo historial de tipos de cambio',
      error: error.message
    });
  }
};

// Simular actualización de tipo de cambio
const simulateExchangeRateUpdate = async (req, res) => {
  try {
    const { currency = 'USD', newRate } = req.body;
    
    if (!newRate || newRate <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El nuevo tipo de cambio debe ser un número positivo'
      });
    }
    
    // Obtener tipo de cambio actual
    const currentRate = await ExchangeRateModel.getCurrentRate(currency);
    const previousRate = currentRate.toPYG;
    
    // Buscar productos que serían afectados
    const products = await ProductModel.find({
      purchasePriceUSD: { $exists: true, $gt: 0 }
    }).select('name purchasePriceUSD loanInterest deliveryCost profitMargin sellingPrice');
    
    const simulationResults = {
      currentRate: previousRate,
      newRate,
      change: newRate - previousRate,
      changePercentage: ((newRate - previousRate) / previousRate * 100).toFixed(2),
      affectedProducts: products.length,
      priceIncreaseCount: 0,
      priceDecreaseCount: 0,
      totalPriceChange: 0,
      averagePriceChange: 0,
      productDetails: []
    };
    
    // Simular cambios para cada producto
    products.forEach(product => {
      const oldSellingPrice = product.sellingPrice || 0;
      
      // Calcular nuevos valores
      const newPurchasePrice = product.purchasePriceUSD * newRate;
      const interestAmount = newPurchasePrice * ((product.loanInterest || 15) / 100);
      const totalCost = newPurchasePrice + interestAmount + (product.deliveryCost || 0);
      const newSellingPrice = totalCost * (1 + (product.profitMargin || 30) / 100);
      
      const priceChange = newSellingPrice - oldSellingPrice;
      simulationResults.totalPriceChange += priceChange;
      
      if (priceChange > 0) {
        simulationResults.priceIncreaseCount++;
      } else if (priceChange < 0) {
        simulationResults.priceDecreaseCount++;
      }
      
      simulationResults.productDetails.push({
        productId: product._id,
        name: product.name,
        currentPrice: oldSellingPrice,
        newPrice: Math.round(newSellingPrice),
        priceChange: Math.round(priceChange),
        priceChangePercentage: oldSellingPrice > 0 ? (priceChange / oldSellingPrice * 100).toFixed(2) : 0
      });
    });
    
    // Calcular promedio
    if (simulationResults.affectedProducts > 0) {
      simulationResults.averagePriceChange = simulationResults.totalPriceChange / simulationResults.affectedProducts;
    }
    
    res.json({
      success: true,
      data: simulationResults
    });
    
  } catch (error) {
    console.error('Error simulating exchange rate update:', error);
    res.status(500).json({
      success: false,
      message: 'Error simulando actualización de tipo de cambio',
      error: error.message
    });
  }
};

// Obtener estadísticas de actualizaciones
const getUpdateStats = async (req, res) => {
  try {
    const { currency = 'USD', days = 30 } = req.query;
    
    const stats = await ExchangeRateModel.getUpdateStats(currency, parseInt(days));
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error getting update stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas de actualización',
      error: error.message
    });
  }
};

// Obtener información detallada del tipo de cambio actual
const getExchangeRateInfo = async (req, res) => {
  try {
    const { currency = 'USD' } = req.query;
    
    const currentRate = await ExchangeRateModel.getCurrentRate(currency);
    const stats = await ExchangeRateModel.getUpdateStats(currency, 7); // Últimos 7 días
    
    res.json({
      success: true,
      data: {
        current: currentRate,
        recentStats: stats
      }
    });
    
  } catch (error) {
    console.error('Error getting exchange rate info:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo información del tipo de cambio',
      error: error.message
    });
  }
};

module.exports = {
  getCurrentExchangeRate,
  updateExchangeRate,
  getExchangeRateHistory,
  simulateExchangeRateUpdate
};
