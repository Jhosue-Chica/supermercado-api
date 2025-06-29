/**
 * Utilidades para estandarizar las respuestas HTTP de la API
 * Este archivo complementa el middleware de transformación de respuestas
 */

/**
 * Crea una respuesta de éxito estándar
 * @param {Object} data - Datos a enviar en la respuesta
 * @param {String} message - Mensaje descriptivo
 * @param {Number} statusCode - Código de estado HTTP (default: 200)
 * @returns {Object} Objeto de respuesta estandarizado
 */
exports.success = (data, message = 'Operación completada con éxito', statusCode = 200) => {
  return {
    success: true,
    statusCode,
    message,
    data
  };
};

/**
 * Crea una respuesta de error estándar
 * @param {String} message - Mensaje de error
 * @param {Number} statusCode - Código de estado HTTP (default: 400)
 * @param {Object} error - Detalles del error (opcional)
 * @returns {Object} Objeto de error estandarizado
 */
exports.error = (message = 'Ha ocurrido un error', statusCode = 400, error = null) => {
  const response = {
    success: false,
    statusCode,
    message
  };

  if (error) {
    response.error = error;
  }

  return response;
};

/**
 * Envía una respuesta de éxito
 * @param {Object} res - Objeto de respuesta Express
 * @param {Object} data - Datos a enviar
 * @param {String} message - Mensaje descriptivo
 * @param {Number} statusCode - Código de estado HTTP
 */
exports.sendSuccess = (res, data, message, statusCode = 200) => {
  return res.status(statusCode).json(
    exports.success(data, message, statusCode)
  );
};

/**
 * Envía una respuesta de error
 * @param {Object} res - Objeto de respuesta Express
 * @param {String} message - Mensaje de error
 * @param {Number} statusCode - Código de estado HTTP
 * @param {Object} error - Detalles del error (opcional)
 */
exports.sendError = (res, message, statusCode = 400, error = null) => {
  return res.status(statusCode).json(
    exports.error(message, statusCode, error)
  );
};
