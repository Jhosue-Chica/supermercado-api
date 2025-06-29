const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const userController = require('../controllers/user.controller');

const router = express.Router();

// Todas las rutas de usuarios requieren autenticación
router.use(authMiddleware.verifyAuth);

/**
 * Obtener todos los usuarios
 */
router.get('/', userController.getAllUsers);

/**
 * Obtener un usuario por ID
 */
router.get('/:id', userController.getUserById);

/**
 * Crear un nuevo usuario
 */
router.post('/', userController.createUser);

/**
 * Actualizar un usuario
 */
router.put('/:id', userController.updateUser);

/**
 * Eliminar un usuario (desactivar o eliminar físicamente)
 */
router.delete('/:id', userController.deleteUser);

module.exports = router;
