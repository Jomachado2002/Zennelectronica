const express = require('express');
const router = express.Router();
const {
  getCurrentExchangeRate,
  updateExchangeRate,
  getExchangeRateHistory,
  simulateExchangeRateUpdate
} = require('../controller/exchangeRate/exchangeRateController');
const { recalculatePricesEndpoint } = require('../controller/product/recalculatePrices');
const { authToken } = require('../middleware/authToken');
const uploadProductPermission = require('../helpers/permission');

// Middleware para verificar permisos de administrador usando el mismo sistema que otros endpoints
const requireAdmin = async (req, res, next) => {
  try {
    const hasPermission = await uploadProductPermission(req.userId);
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requieren permisos de administrador.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error verificando permisos de admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// GET /api/exchange-rate/current
// Obtener tipo de cambio actual
router.get('/current', getCurrentExchangeRate);

// GET /api/exchange-rate/history
// Obtener historial de tipos de cambio
router.get('/history', getExchangeRateHistory);

// POST /api/exchange-rate/simulate
// Simular actualización de tipo de cambio (requiere autenticación)
router.post('/simulate', simulateExchangeRateUpdate);

// POST /api/exchange-rate/update
// Actualizar tipo de cambio (requiere admin)
router.post('/update', updateExchangeRate);

// POST /api/exchange-rate/recalculate-prices
// Recalcular precios de productos (requiere admin)
router.post('/recalculate-prices', recalculatePricesEndpoint);

module.exports = router;
