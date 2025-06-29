const express = require('express');
const saleController = require('../controllers/sale.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Todas las rutas de ventas requieren autenticación
router.use(authMiddleware.verifyAuth);

// Rutas para ventas
router.get('/', saleController.getAllSales);
router.get('/stats', saleController.getSalesStats);
router.get('/:id', saleController.getSaleById);
router.post('/', saleController.createSale);
router.put('/:id/payment-status', saleController.updatePaymentStatus);
router.post('/:id/cancel', saleController.cancelSale);

module.exports = router;
