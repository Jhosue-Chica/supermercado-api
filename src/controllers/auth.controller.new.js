const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/user.model');
const logger = require('../utils/logger');

/**
 * Login con credenciales (email/username y contraseña)
 */
exports.login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    if (!password || (!email && !username)) {
      logger.warn('Intento de login sin credenciales completas');
      return res.status(400).json({ 
        message: 'Se requiere email/username y contraseña' 
      });
    }
    
    // Buscar usuario por email o username
    const query = email ? { email } : { username };
    const user = await User.findOne(query);
    
    if (!user) {
      logger.warn(`Usuario no encontrado: ${email || username}`);
      return res.status(401).json({ 
        message: 'Credenciales inválidas' 
      });
    }
    
    // Verificar si el usuario está activo
    if (!user.isActive) {
      logger.warn(`Intento de login con usuario inactivo: ${email || username}`);
      return res.status(401).json({ 
        message: 'Usuario desactivado. Contacte al administrador.' 
      });
    }
    
    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      logger.warn(`Contraseña incorrecta para usuario: ${email || username}`);
      return res.status(401).json({ 
        message: 'Credenciales inválidas' 
      });
    }
    
    // Generar token JWT
    const token = jwt.sign(
      { 
        id: user._id, 
        username: user.username, 
        role: user.role 
      }, 
      process.env.JWT_SECRET || 'supermercado-jwt-secret',
      { expiresIn: '24h' }
    );
    
    // Actualizar último login
    user.lastLogin = new Date();
    await user.save();
    
    logger.info(`Login exitoso para usuario: ${user.username}`);
    
    // Responder con token y datos básicos del usuario
    return res.status(200).json({
      message: 'Login exitoso',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
    
  } catch (error) {
    logger.error(`Error en login: ${error.message}`);
    return res.status(500).json({ 
      message: 'Error procesando credenciales', 
      error: error.message 
    });
  }
};

/**
 * Registrar nuevo usuario
 */
exports.register = async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      firstName, 
      lastName,
      role
    } = req.body;
    
    // Validar datos requeridos
    if (!username || !email || !password) {
      logger.warn('Intento de registro sin datos completos');
      return res.status(400).json({ 
        message: 'Se requiere username, email y contraseña' 
      });
    }
    
    // Verificar que el usuario no exista ya
    const existingUser = await User.findOne({
      $or: [
        { email },
        { username }
      ]
    });
    
    if (existingUser) {
      logger.warn(`Intento de registro con credenciales duplicadas: ${email}`);
      return res.status(400).json({ 
        message: 'El email o username ya está en uso' 
      });
    }
    
    // Validar permisos para roles privilegiados
    if (role && role !== 'customer') {
      // Solo admin puede crear usuarios con roles privilegiados
      if (req.user?.role !== 'admin') {
        logger.warn(`Intento no autorizado de crear usuario con rol privilegiado: ${role}`);
        return res.status(403).json({ 
          message: 'No tiene permisos para crear este tipo de usuario' 
        });
      }
    }
    
    // Hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Crear nuevo usuario
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
    
    logger.info(`Usuario registrado exitosamente: ${email}`);
    
    // Generar token para el nuevo usuario
    const token = jwt.sign(
      { 
        id: newUser._id, 
        username: newUser.username, 
        role: newUser.role 
      },
      process.env.JWT_SECRET || 'supermercado-jwt-secret',
      { expiresIn: '24h' }
    );
    
    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        firstName: newUser.firstName,
        lastName: newUser.lastName
      }
    });
    
  } catch (error) {
    logger.error(`Error en registro: ${error.message}`);
    return res.status(500).json({ 
      message: 'Error en registro de usuario', 
      error: error.message 
    });
  }
};

/**
 * Verificar validez del token JWT
 */
exports.verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      logger.warn('Intento de verificación sin token');
      return res.status(401).json({ 
        message: 'No se proporcionó token', 
        valid: false 
      });
    }
    
    // Verificar token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'supermercado-jwt-secret'
    );
    
    // Verificar que el usuario exista y esté activo
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      logger.warn(`Usuario no encontrado en verificación de token: ${decoded.id}`);
      return res.status(401).json({ 
        message: 'Usuario no existe', 
        valid: false 
      });
    }
    
    if (!user.isActive) {
      logger.warn(`Verificación con usuario inactivo: ${decoded.id}`);
      return res.status(401).json({ 
        message: 'Usuario desactivado', 
        valid: false 
      });
    }
    
    logger.info(`Token verificado para usuario: ${user.username}`);
    
    return res.status(200).json({
      valid: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
    
  } catch (error) {
    logger.error(`Error en verificación de token: ${error.message}`);
    return res.status(401).json({ 
      message: 'Token inválido o expirado', 
      valid: false, 
      error: error.message 
    });
  }
};

/**
 * Actualizar contraseña de usuario
 */
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    if (!currentPassword || !newPassword) {
      logger.warn('Intento de actualización de contraseña sin datos completos');
      return res.status(400).json({ 
        message: 'Se requieren la contraseña actual y la nueva' 
      });
    }
    
    // Obtener usuario con contraseña
    const user = await User.findById(userId);
    
    if (!user) {
      logger.warn(`Usuario no encontrado en actualización de contraseña: ${userId}`);
      return res.status(404).json({ 
        message: 'Usuario no encontrado' 
      });
    }
    
    // Verificar contraseña actual
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      logger.warn(`Contraseña actual incorrecta para usuario: ${userId}`);
      return res.status(401).json({ 
        message: 'Contraseña actual incorrecta' 
      });
    }
    
    // Hash nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Actualizar contraseña
    user.password = hashedPassword;
    await user.save();
    
    logger.info(`Contraseña actualizada para usuario: ${user.username}`);
    
    return res.status(200).json({ 
      message: 'Contraseña actualizada exitosamente' 
    });
    
  } catch (error) {
    logger.error(`Error en actualización de contraseña: ${error.message}`);
    return res.status(500).json({ 
      message: 'Error actualizando contraseña', 
      error: error.message 
    });
  }
};
