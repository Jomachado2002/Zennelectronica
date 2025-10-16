const mongoose = require('mongoose');

const exchangeRateSchema = new mongoose.Schema({
  currency: {
    type: String,
    required: true,
    enum: ['USD', 'EUR', 'BRL', 'ARS'],
    default: 'USD'
  },
  toPYG: {
    type: Number,
    required: true,
    min: 0
  },
  effectiveDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  source: {
    type: String,
    required: true,
    enum: ['manual', 'api', 'system'],
    default: 'manual'
  },
  updatedBy: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    maxlength: 500
  },
  updateMetadata: {
    affectedProducts: {
      type: Number,
      default: 0
    },
    priceIncreaseCount: {
      type: Number,
      default: 0
    },
    priceDecreaseCount: {
      type: Number,
      default: 0
    },
    averagePriceChange: {
      type: Number,
      default: 0
    },
    updateDuration: {
      type: Number,
      default: 0
    },
    previousRate: {
      type: Number
    },
    totalPriceChange: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
exchangeRateSchema.index({ currency: 1, isActive: 1 });
exchangeRateSchema.index({ effectiveDate: -1 });
exchangeRateSchema.index({ currency: 1, effectiveDate: -1 });

// Middleware para desactivar otros tipos de cambio cuando se crea uno nuevo
exchangeRateSchema.pre('save', async function(next) {
  if (this.isNew && this.isActive) {
    // Desactivar todos los otros tipos de cambio de la misma moneda
    await this.constructor.updateMany(
      { 
        currency: this.currency, 
        _id: { $ne: this._id },
        isActive: true 
      },
      { isActive: false }
    );
  }
  next();
});

// Método estático para obtener el tipo de cambio actual
exchangeRateSchema.statics.getCurrentRate = async function(currency = 'USD') {
  try {
    const currentRate = await this.findOne({ 
      currency: currency.toUpperCase(), 
      isActive: true 
    }).sort({ effectiveDate: -1 });
    
    if (currentRate) {
      return currentRate;
    }
    
    // Si no existe, retornar un valor por defecto
    return {
      currency: currency.toUpperCase(),
      toPYG: 7300,
      effectiveDate: new Date(),
      source: 'system',
      isActive: true,
      _id: null
    };
  } catch (error) {
    console.error('Error getting current exchange rate:', error);
    throw error;
  }
};

// Método estático para obtener historial de tipos de cambio
exchangeRateSchema.statics.getRateHistory = async function(currency = 'USD', days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const history = await this.find({
      currency: currency.toUpperCase(),
      effectiveDate: { $gte: startDate }
    }).sort({ effectiveDate: -1 });
    
    return history;
  } catch (error) {
    console.error('Error getting exchange rate history:', error);
    throw error;
  }
};

// Método estático para obtener estadísticas de actualización
exchangeRateSchema.statics.getUpdateStats = async function(currency = 'USD', days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const stats = await this.aggregate([
      {
        $match: {
          currency: currency.toUpperCase(),
          effectiveDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalUpdates: { $sum: 1 },
          avgAffectedProducts: { $avg: '$updateMetadata.affectedProducts' },
          totalAffectedProducts: { $sum: '$updateMetadata.affectedProducts' },
          avgPriceIncrease: { $avg: '$updateMetadata.priceIncreaseCount' },
          avgPriceDecrease: { $avg: '$updateMetadata.priceDecreaseCount' },
          avgPriceChange: { $avg: '$updateMetadata.averagePriceChange' },
          avgUpdateDuration: { $avg: '$updateMetadata.updateDuration' }
        }
      }
    ]);
    
    return stats[0] || {
      totalUpdates: 0,
      avgAffectedProducts: 0,
      totalAffectedProducts: 0,
      avgPriceIncrease: 0,
      avgPriceDecrease: 0,
      avgPriceChange: 0,
      avgUpdateDuration: 0
    };
  } catch (error) {
    console.error('Error getting update stats:', error);
    throw error;
  }
};

// Método de instancia para calcular el cambio porcentual
exchangeRateSchema.methods.getChangePercentage = function(previousRate) {
  if (!previousRate || previousRate === 0) return 0;
  return ((this.toPYG - previousRate) / previousRate) * 100;
};

// Método de instancia para formatear el tipo de cambio
exchangeRateSchema.methods.formatRate = function() {
  return `${this.toPYG.toLocaleString()} Gs`;
};

// Método de instancia para obtener información de actualización
exchangeRateSchema.methods.getUpdateInfo = function() {
  return {
    rate: this.toPYG,
    currency: this.currency,
    effectiveDate: this.effectiveDate,
    source: this.source,
    affectedProducts: this.updateMetadata.affectedProducts,
    priceChanges: {
      increased: this.updateMetadata.priceIncreaseCount,
      decreased: this.updateMetadata.priceDecreaseCount
    },
    averageChange: this.updateMetadata.averagePriceChange,
    updateDuration: this.updateMetadata.updateDuration
  };
};

module.exports = mongoose.model('ExchangeRate', exchangeRateSchema);
