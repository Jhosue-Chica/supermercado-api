const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  cost: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['lácteos', 'bebidas', 'limpieza', 'frutas', 'verduras', 'carnes', 'panadería', 'otros']
  },
  imageUrl: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  barcode: {
    type: String
  },
  supplier: {
    type: String
  },
  discount: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  expirationDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Índices para mejorar la búsqueda
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ code: 1 });

// Simulación de modelo para desarrollo
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

module.exports = Product;
