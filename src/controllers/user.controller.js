const bcrypt = require('bcrypt');
const User = require('../models/user.model');
const logger = require('../utils/logger');

/**
 * Obtener todos los usuarios
 */
exports.getAllUsers = async (req, res) => {
  try {
    logger.info('Obteniendo todos los usuarios');

    // Verificar si es una petición con API key o token JWT
    const isApiKeyAuth = req.headers['x-api-key'] && !req.user;
    
    // Si es autenticación por token JWT, verificar que sea admin
    if (!isApiKeyAuth && req.user && req.user.role !== 'admin') {
      logger.warn(`Usuario no autorizado (${req.user.username}) intentó acceder a lista de usuarios`);
      return res.status(403).json({ message: 'No autorizado para acceder a esta información' });
    }
    
    // Filtro por rol si se especifica
    const filter = {};
    if (req.query.role) {
      filter.role = req.query.role;
    }
    
    // Filtro por estado activo
    if (req.query.active !== undefined) {
      filter.isActive = req.query.active === 'true';
    }
    
    // No incluir contraseñas en la respuesta
    const users = await User.find(filter).select('-password');
    
    logger.info(`Se encontraron ${users.length} usuarios`);
    return res.status(200).json(users);
  } catch (error) {
    logger.error(`Error al obtener usuarios: ${error.message}`);
    return res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
  }
};

/**
 * Obtener un usuario por ID
 */
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    logger.info(`Buscando usuario con ID: ${userId}`);
    
    // Verificar si es una petición con API key o token JWT
    const isApiKeyAuth = req.headers['x-api-key'] && !req.user;
    
    // Si no es API key y tampoco es admin o el propio usuario, denegar acceso
    if (!isApiKeyAuth && req.user && req.user.role !== 'admin' && req.user.id !== userId) {
      logger.warn(`Usuario no autorizado (${req.user.username}) intentó acceder a perfil de otro usuario`);
      return res.status(403).json({ message: 'No autorizado para acceder a esta información' });
    }
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      logger.warn(`Usuario con ID ${userId} no encontrado`);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    return res.status(200).json(user);
  } catch (error) {
    logger.error(`Error al obtener usuario: ${error.message}`);
    return res.status(500).json({ message: 'Error al obtener usuario', error: error.message });
  }
};

/**
 * Crear un nuevo usuario
 */
exports.createUser = async (req, res) => {
  try {
    // Solo administradores pueden crear ciertos tipos de usuarios
    if (req.body.role !== 'customer' && req.user.role !== 'admin') {
      logger.warn(`Usuario no autorizado (${req.user.username}) intentó crear usuario con rol ${req.body.role}`);
      return res.status(403).json({ message: 'No autorizado para crear este tipo de usuario' });
    }
    
    const { username, email, password, firstName, lastName, role } = req.body;
    
    // Validar datos obligatorios
    if (!username || !email || !password) {
      logger.warn('Intento de crear usuario sin datos obligatorios');
      return res.status(400).json({ message: 'Se requiere username, email y password' });
    }
    
    // Verificar que el usuario no exista
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      logger.warn(`Intento de crear usuario con email o username duplicado: ${email}`);
      return res.status(400).json({ message: 'El email o username ya está en uso' });
    }
    
    // Hash de contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Crear usuario
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || 'customer',
      isActive: true
    });
    
    await newUser.save();
    
    // No incluir contraseña en respuesta
    const userResponse = { ...newUser.toObject() };
    delete userResponse.password;
    
    logger.info(`Usuario creado con ID: ${newUser._id}`);
    return res.status(201).json(userResponse);
  } catch (error) {
    logger.error(`Error al crear usuario: ${error.message}`);
    return res.status(500).json({ message: 'Error al crear usuario', error: error.message });
  }
};

/**
 * Actualizar un usuario existente
 */
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Verificar autorización
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      logger.warn(`Usuario no autorizado (${req.user.username}) intentó actualizar a otro usuario`);
      return res.status(403).json({ message: 'No autorizado para actualizar este usuario' });
    }
    
    // Si no es admin y trata de cambiar el rol, bloquear
    if (req.body.role && req.user.role !== 'admin') {
      logger.warn(`Usuario no autorizado (${req.user.username}) intentó cambiar su rol`);
      return res.status(403).json({ message: 'No autorizado para cambiar roles' });
    }
    
    const userData = req.body;
    
    // Eliminar campos sensibles que no deberían actualizarse directamente
    delete userData.password;
    
    // Verificar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      logger.warn(`Intento de actualizar usuario inexistente: ${userId}`);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Verificar si el email o username ya está en uso por otro usuario
    if (userData.email && userData.email !== user.email) {
      const existingEmail = await User.findOne({ email: userData.email });
      if (existingEmail) {
        logger.warn(`Intento de actualizar a email duplicado: ${userData.email}`);
        return res.status(400).json({ message: 'El email ya está en uso' });
      }
    }
    
    if (userData.username && userData.username !== user.username) {
      const existingUsername = await User.findOne({ username: userData.username });
      if (existingUsername) {
        logger.warn(`Intento de actualizar a username duplicado: ${userData.username}`);
        return res.status(400).json({ message: 'El username ya está en uso' });
      }
    }
    
    // Actualizar usuario
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      userData,
      { new: true, runValidators: true }
    ).select('-password');
    
    logger.info(`Usuario ${userId} actualizado exitosamente`);
    return res.status(200).json(updatedUser);
  } catch (error) {
    logger.error(`Error al actualizar usuario: ${error.message}`);
    return res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
  }
};

/**
 * Eliminar un usuario (desactivar o eliminar físicamente)
 */
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { permanent } = req.query;
    
    // Solo admin puede eliminar usuarios
    if (req.user.role !== 'admin') {
      logger.warn(`Usuario no autorizado (${req.user.username}) intentó eliminar a un usuario`);
      return res.status(403).json({ message: 'No autorizado para eliminar usuarios' });
    }
    
    // Verificar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      logger.warn(`Intento de eliminar usuario inexistente: ${userId}`);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Evitar eliminar al propio usuario administrador
    if (user._id.toString() === req.user.id) {
      logger.warn(`Administrador ${req.user.username} intentó eliminarse a sí mismo`);
      return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta de administrador' });
    }
    
    if (permanent === 'true') {
      // Eliminación física
      await User.findByIdAndDelete(userId);
      logger.info(`Usuario ${userId} eliminado permanentemente`);
      return res.status(200).json({ message: 'Usuario eliminado permanentemente' });
    } else {
      // Desactivar
      user.isActive = false;
      await user.save();
      logger.info(`Usuario ${userId} desactivado`);
      return res.status(200).json({ message: 'Usuario desactivado correctamente', user });
    }
  } catch (error) {
    logger.error(`Error al eliminar usuario: ${error.message}`);
    return res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
  }
};
