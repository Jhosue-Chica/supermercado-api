const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Lista de API keys válidas (en producción deberían estar en base de datos)
const validApiKeys = ['sk_test_supermercado123', 'sk_prod_supermercado456'];

/**
 * Middleware para verificar JWT token
 */
exports.verifyToken = (req, res, next) => {
  const token = req.headers['x-access-token'] || req.headers['authorization'];
  
  if (!token) {
    logger.warn('Acceso denegado: Token no proporcionado');
    return res.status(401).json({ message: 'Acceso denegado: Token no proporcionado' });
  }

  try {
    // Quitar el prefijo Bearer si existe
    const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
    const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET || 'supermercado_secret_key');
    req.user = decoded;
    logger.info(`Usuario autenticado: ${decoded.username || decoded.email}`);
    next();
  } catch (error) {
    logger.error(`Error de autenticación: ${error.message}`);
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

/**
 * Middleware para verificar API key
 */
exports.verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    logger.warn('Acceso denegado: API key no proporcionada');
    return res.status(401).json({ message: 'Acceso denegado: API key no proporcionada' });
  }

  if (!validApiKeys.includes(apiKey)) {
    logger.warn(`Intento de acceso con API key inválida: ${apiKey}`);
    return res.status(401).json({ message: 'API key inválida' });
  }

  logger.info(`Acceso autenticado con API key: ${apiKey.substring(0, 8)}...`);
  next();
};

/**
 * Middleware para verificar cualquier método de autenticación (JWT o API key)
 */
exports.verifyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const token = req.headers['x-access-token'] || req.headers['authorization'];

  if (apiKey) {
    return this.verifyApiKey(req, res, next);
  } else if (token) {
    return this.verifyToken(req, res, next);
  } else {
    logger.warn('Acceso denegado: No se proporcionó método de autenticación');
    return res.status(401).json({ 
      message: 'Acceso denegado: Se requiere autenticación (token JWT o API key)'
    });
  }
};
