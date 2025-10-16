const mongoose = require('mongoose');
require('dotenv').config();

// Modelo de ExchangeRate
const exchangeRateSchema = new mongoose.Schema({
  currency: { type: String, required: true, default: 'USD' },
  toPYG: { type: Number, required: true },
  effectiveDate: { type: Date, default: Date.now },
  source: { type: String, default: 'system' },
  updatedBy: { type: String, default: 'system' },
  isActive: { type: Boolean, default: true },
  notes: { type: String, default: 'Configuración inicial' },
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

async function createInitialExchangeRate() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB conectado exitosamente');

    // Verificar si ya existe un registro activo
    const existingRate = await ExchangeRate.findOne({ isActive: true });
    if (existingRate) {
      console.log('⚠️ Ya existe un tipo de cambio activo:', existingRate.toPYG);
      return;
    }

    // Crear registro inicial
    const initialRate = new ExchangeRate({
      currency: 'USD',
      toPYG: 7300,
      source: 'system',
      updatedBy: 'system',
      isActive: true,
      notes: 'Configuración inicial del sistema',
      updateMetadata: {
        affectedProducts: 0,
        priceIncreaseCount: 0,
        priceDecreaseCount: 0,
        averagePriceChange: 0,
        updateDuration: 0
      }
    });

    await initialRate.save();
    console.log('✅ Tipo de cambio inicial creado:', initialRate.toPYG);

    // Verificar que se creó correctamente
    const createdRate = await ExchangeRate.findOne({ isActive: true });
    console.log('📊 Registro creado:', {
      rate: createdRate.toPYG,
      currency: createdRate.currency,
      effectiveDate: createdRate.effectiveDate,
      isActive: createdRate.isActive
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

createInitialExchangeRate();
