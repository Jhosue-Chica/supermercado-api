/**
 * Middleware para transformar _id a id en las respuestas JSON
 */
const logger = require('../utils/logger');

/**
 * Transforma las propiedades _id de MongoDB a id para compatibilidad con frontend
 * @param {Object|Array} data - Datos a transformar 
 * @returns {Object|Array} - Datos transformados
 */
function transformIds(data) {
  // Si es un array, transformamos cada elemento
  if (Array.isArray(data)) {
    return data.map(item => transformIds(item));
  }
  
  // Convertir objetos de Mongoose a objetos planos
  if (data !== null && typeof data === 'object') {
    // Si es un documento Mongoose, convertirlo a objeto plano
    if (data.constructor && data.constructor.name === 'model' && typeof data.toObject === 'function') {
      data = data.toObject();
    }
    
    // Si es un ObjectId, convertirlo a string
    if (data._bsontype === 'ObjectId') {
      return data.toString();
    }
    
    // Crear copia para no modificar el original
    const transformed = { ...data };
    
    // Convertir _id a id si existe
    if (transformed._id !== undefined) {
      // Si _id es un ObjectId o tiene método toString(), usarlo
      if (typeof transformed._id === 'object' && transformed._id !== null) {
        transformed.id = transformed._id.toString();
      } else {
        transformed.id = transformed._id;
      }
      
      // Solo eliminamos _id si no causa problemas con métodos de Mongoose
      if (!transformed.$__ && !transformed.schema) {
        delete transformed._id;
      }
    }
    
    // Procesar recursivamente propiedades anidadas
    Object.keys(transformed).forEach(key => {
      // Evitar procesar propiedades especiales de Mongoose o circular referencias
      if (key !== '$__' && key !== 'schema' && key !== 'errors' && 
          typeof transformed[key] === 'object' && transformed[key] !== null) {
        transformed[key] = transformIds(transformed[key]);
      }
    });
    
    return transformed;
  }
  
  return data;
}

/**
 * Middleware para transformar respuestas JSON
 */
exports.transformResponse = (req, res, next) => {
  // Guardamos la función res.json original
  const originalJson = res.json;
  
  // Reemplazamos res.json con nuestra versión personalizada
  res.json = function(data) {
    try {
      // Detectamos si es una respuesta estandarizada o directa
      let transformed;
      
      if (data && typeof data === 'object') {
        // Verifica si estamos usando el formato de respuesta estandarizada
        if (data.success !== undefined && data.data !== undefined) {
          // Preservamos la estructura pero transformamos los datos internos
          transformed = { 
            ...data,
            data: transformIds(data.data)
          };
        } else {
          // Es una respuesta directa, simplemente transformamos los IDs
          transformed = transformIds(data);
        }
        
        return originalJson.call(this, transformed);
      }
    } catch (err) {
      logger.error(`Error transformando respuesta: ${err.message}`);
      // Si hay un error en la transformación, continuamos con los datos originales
    }
    
    // Llamamos al método original con los datos sin transformar
    return originalJson.call(this, data);
  };
  
  next();
};
