const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const logger = require('./utils/logger');
const dbInit = require('./utils/dbInit');
const responseMiddleware = require('./middleware/response.middleware');

// Routes
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const userRoutes = require('./routes/user.routes');
const saleRoutes = require('./routes/sale.routes');

// Config
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request Logger Middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Response Transformer Middleware (convierte _id a id para compatibilidad con frontend)
app.use(responseMiddleware.transformResponse);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sales', saleRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Supermercado API funcionando correctamente' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`${err.name}: ${err.message}`);
  res.status(500).json({
    error: {
      message: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    }
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    logger.info('Conexión a MongoDB establecida');
    // Inicializar datos por defecto si es necesario
    await dbInit.initializeDatabase();
  })
  .catch((err) => {
    logger.error(`Error de conexión a MongoDB: ${err.message}`);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Servidor ejecutándose en el puerto ${PORT}`);
});

module.exports = app;
