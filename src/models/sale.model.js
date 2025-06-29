const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  // También incluimos la información básica del producto para histórico
  productCode: String,
  productName: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  subtotal: {
    type: Number,
    required: true
  }
});

const saleSchema = new mongoose.Schema({
  saleNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  items: [saleItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pendiente', 'completado', 'cancelado'],
    default: 'pendiente'
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: String,
  tax: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Índices para mejorar la búsqueda
saleSchema.index({ saleNumber: 1 });
saleSchema.index({ customer: 1 });
saleSchema.index({ createdAt: 1 });
saleSchema.index({ seller: 1 });

// Simulación de modelo para desarrollo
const Sale = mongoose.models.Sale || mongoose.model('Sale', saleSchema);

module.exports = Sale;
