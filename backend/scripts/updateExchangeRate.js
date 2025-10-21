const mongoose = require('mongoose');
require('dotenv').config();

// Modelo de ExchangeRate
const exchangeRateSchema = new mongoose.Schema({
  currency: { type: String, required: true, default: 'USD' },
  toPYG: { type: Number, required: true },
  effectiveDate: { type: Date, default: Date.now },
  source: { type: String, default: 'manual' },
  updatedBy: { type: String, default: 'admin' },
  isActive: { type: Boolean, default: true },
  notes: { type: String, default: '' },
  updateMetadata: {
    affectedProducts: { type: Number, default: 0 },
    priceIncreaseCount: { type: Number, default: 0 },
    priceDecreaseCount: { type: Number, default: 0 },
    averagePriceChange: { type: Number, default: 0 },
    updateDuration: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

const ExchangeRate = mongoose.model('ExchangeRate', exchangeRateSchema);

async function updateExchangeRate(newRate, notes = '') {
  try {
    // console.log removed for production
    await mongoose.connect(process.env.MONGODB_URI);
    // console.log removed for production

    // Desactivar el tipo de cambio actual
    await ExchangeRate.updateMany({ isActive: true }, { isActive: false });
    // console.log removed for production

    // Crear nuevo tipo de cambio
    const newExchangeRate = new ExchangeRate({
      currency: 'USD',
      toPYG: newRate,
      source: 'manual',
      updatedBy: 'admin',
      isActive: true,
      notes: notes || `Actualización a ${newRate} PYG por USD`,
      updateMetadata: {
        affectedProducts: 0,
        priceIncreaseCount: 0,
        priceDecreaseCount: 0,
        averagePriceChange: 0,
        updateDuration: 0
      }
    });

    await newExchangeRate.save();
    // console.log removed for production

    // Verificar que se creó correctamente
    const currentRate = await ExchangeRate.findOne({ isActive: true });
    console.log('📊 Tipo de cambio actual:', {
      rate: currentRate.toPYG,
      currency: currentRate.currency,
      effectiveDate: currentRate.effectiveDate,
      isActive: currentRate.isActive,
      notes: currentRate.notes
    });

    // Mostrar historial
    const history = await ExchangeRate.find().sort({ effectiveDate: -1 }).limit(5);
    // console.log removed for production
    history.forEach((rate, index) => {
      console.log(`${index + 1}. ${rate.toPYG} PYG - ${rate.effectiveDate.toISOString()} - ${rate.isActive ? 'ACTIVO' : 'INACTIVO'}`);
    });

  } catch (error) {
    // console.error removed for production
  } finally {
    await mongoose.connection.close();
    // console.log removed for production
  }
}

// Obtener el nuevo tipo de cambio del argumento
const newRate = process.argv[2];
const notes = process.argv[3] || '';

if (!newRate) {
  // console.log removed for production
  // console.log removed for production
  process.exit(1);
}

updateExchangeRate(parseInt(newRate), notes);
