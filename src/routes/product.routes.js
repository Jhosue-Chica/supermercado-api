const express = require('express');
const productController = require('../controllers/product.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Rutas públicas de productos (solo lectura)
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Rutas protegidas (requieren autenticación)
router.post('/', authMiddleware.verifyAuth, productController.createProduct);
router.put('/:id', authMiddleware.verifyAuth, productController.updateProduct);
router.delete('/:id', authMiddleware.verifyAuth, productController.deleteProduct);
router.post('/:id/stock', authMiddleware.verifyAuth, productController.adjustStock);

module.exports = router;
