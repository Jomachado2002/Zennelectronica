const mongoose = require('mongoose');

// Esquema para especificaciones
const specificationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    default: 'text',
    enum: ['text', 'number', 'boolean', 'select']
  },
  placeholder: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  },
  options: [{
    value: String,
    label: String
  }],
  order: {
    type: Number,
    default: 1
  }
}, { _id: true });

// Esquema para subcategorías
const subcategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 1
  },
  specifications: [specificationSchema]
}, { _id: true });

// Esquema principal para categorías
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  order: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    default: '#3B82F6'
  },
  icon: {
    type: String,
    default: 'FaFolder'
  },
  subcategories: [subcategorySchema]
}, {
  timestamps: true
});

// Índices para mejorar rendimiento
categorySchema.index({ name: 1 });
categorySchema.index({ value: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ order: 1 });
subcategorySchema.index({ value: 1 });

// Métodos del modelo
categorySchema.methods.toJSON = function() {
  const category = this.toObject();
  return category;
};

// Método estático para obtener categorías activas
categorySchema.statics.getActiveCategories = function() {
  return this.find({ isActive: true }).sort({ order: 1 });
};

// Método estático para obtener todas las categorías
categorySchema.statics.getAllCategories = function() {
  return this.find({}).sort({ order: 1 });
};

module.exports = mongoose.model('Category', categorySchema);
