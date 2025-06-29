const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Rutas públicas de autenticación
router.post('/login', authController.login);
router.post('/register', authController.register);

// Ruta protegida que requiere autenticación
router.get('/verify', authMiddleware.verifyToken, authController.verifyToken);

module.exports = router;
