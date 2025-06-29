const logger = require('../utils/logger');
const Product = require('../models/product.model');
const responseUtil = require('../utils/response.util');

/**
 * Obtener todos los productos
 */
exports.getAllProducts = async (req, res) => {
  try {
    logger.info('Obteniendo todos los productos');
    
    // Construir filtros
    const filters = {};
    
    if (req.query.category) {
      filters.category = req.query.category;
    }
    
    if (req.query.active !== undefined) {
      filters.isActive = req.query.active === 'true';
    }
    
    if (req.query.minPrice !== undefined) {
      filters.price = { ...filters.price, $gte: Number(req.query.minPrice) };
    }
    
    if (req.query.maxPrice !== undefined) {
      filters.price = { ...filters.price, $lte: Number(req.query.maxPrice) };
    }
    
    if (req.query.search) {
      filters.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { code: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Limitar a productos activos si no es admin
    if (req.user && req.user.role !== 'admin') {
      filters.isActive = true;
    }
    
    const products = await Product.find(filters);
    logger.info(`Se encontraron ${products.length} productos`);
    
    // Devolver directamente el array de productos para compatibilidad con el frontend
    return res.status(200).json(products);
  } catch (error) {
    logger.error(`Error al obtener productos: ${error.message}`);
    return responseUtil.sendError(res, 'Error al obtener productos', 500, error.message);
  }
};

/**
 * Obtener un producto por ID
 */
exports.getProductById = async (req, res) => {
  try {
    const productId = req.params.id;
    logger.info(`Buscando producto con ID: ${productId}`);
    
    const product = await Product.findById(productId);
    
    if (!product) {
      logger.warn(`Producto con ID ${productId} no encontrado`);
      return responseUtil.sendError(res, 'Producto no encontrado', 404);
    }
    
    return responseUtil.sendSuccess(res, product, 'Producto obtenido correctamente');
  } catch (error) {
    logger.error(`Error al obtener producto: ${error.message}`);
    return responseUtil.sendError(res, 'Error al obtener producto', 500, error.message);
  }
};

/**
 * Crear un nuevo producto
 */
exports.createProduct = async (req, res) => {
  try {
    const productData = req.body;
    logger.info(`Creando nuevo producto: ${productData.name}`);
    
    // Validar datos requeridos
    if (!productData.name || !productData.price || !productData.category) {
      logger.warn('Intento de crear producto con datos incompletos');
      return responseUtil.sendError(res, 'Se requiere nombre, precio y categoría', 400);
    }
    
    // Verificar que el código no esté duplicado
    const existingProduct = await Product.findOne({ code: productData.code });
    if (existingProduct) {
      logger.warn(`Intento de crear producto con código duplicado: ${productData.code}`);
      return responseUtil.sendError(res, 'El código del producto ya existe', 400);
    }
    
    // Crear nuevo producto
    const newProduct = new Product(productData);
    await newProduct.save();
    
    logger.info(`Producto creado con ID: ${newProduct._id}`);
    return responseUtil.sendSuccess(res, newProduct, 'Producto creado correctamente', 201);
  } catch (error) {
    logger.error(`Error al crear producto: ${error.message}`);
    return responseUtil.sendError(res, 'Error al crear producto', 500, error.message);
  }
};

/**
 * Actualizar un producto existente
 */
exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const productData = req.body;
    logger.info(`Actualizando producto con ID: ${productId}`);
    
    // Comprobar existencia del producto
    const product = await Product.findById(productId);
    if (!product) {
      logger.warn(`Intento de actualizar producto inexistente con ID: ${productId}`);
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    
    // Verificar si el código actualizado no está duplicado
    if (productData.code && productData.code !== product.code) {
      const existingProduct = await Product.findOne({ code: productData.code });
      if (existingProduct) {
        logger.warn(`Intento de actualizar producto con código duplicado: ${productData.code}`);
        return res.status(400).json({ message: 'El código del producto ya está en uso' });
      }
    }
    
    // Actualizar producto
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      productData,
      { new: true, runValidators: true }
    );
    
    logger.info(`Producto actualizado con éxito: ${updatedProduct._id}`);
    return res.status(200).json(updatedProduct);
  } catch (error) {
    logger.error(`Error al actualizar producto: ${error.message}`);
    return res.status(500).json({ message: 'Error al actualizar producto', error: error.message });
  }
};

/**
 * Eliminar un producto (cambio a inactivo o eliminación física)
 */
exports.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const { permanent } = req.query;
    logger.info(`Eliminando producto con ID: ${productId}, eliminación permanente: ${permanent === 'true'}`);
    
    // Comprobar existencia del producto
    const product = await Product.findById(productId);
    if (!product) {
      logger.warn(`Intento de eliminar producto inexistente con ID: ${productId}`);
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    
    if (permanent === 'true') {
      // Eliminación física del producto
      await Product.findByIdAndDelete(productId);
      logger.info(`Producto eliminado permanentemente: ${productId}`);
      return res.status(200).json({ message: 'Producto eliminado permanentemente' });
    } else {
      // Marcar como inactivo
      product.isActive = false;
      await product.save();
      logger.info(`Producto marcado como inactivo: ${productId}`);
      return res.status(200).json({ message: 'Producto desactivado correctamente', product });
    }
  } catch (error) {
    logger.error(`Error al eliminar producto: ${error.message}`);
    return res.status(500).json({ message: 'Error al eliminar producto', error: error.message });
  }
};

/**
 * Ajustar stock de un producto
 */
exports.adjustStock = async (req, res) => {
  try {
    const productId = req.params.id;
    const { quantity, operation = 'add' } = req.body;
    
    if (quantity === undefined || isNaN(Number(quantity))) {
      logger.warn(`Intento de ajustar stock con cantidad inválida: ${quantity}`);
      return res.status(400).json({ message: 'Se requiere una cantidad válida' });
    }
    
    logger.info(`Ajustando stock del producto ${productId}: ${operation} ${quantity}`);
    
    const product = await Product.findById(productId);
    if (!product) {
      logger.warn(`Intento de ajustar stock de producto inexistente: ${productId}`);
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    
    let newStock;
    if (operation === 'add') {
      newStock = product.stock + Number(quantity);
    } else if (operation === 'subtract') {
      newStock = product.stock - Number(quantity);
      
      // Validar stock suficiente
      if (newStock < 0) {
        logger.warn(`Intento de reducir stock a cantidad negativa para producto ${productId}`);
        return res.status(400).json({ message: 'Stock insuficiente para realizar esta operación' });
      }
    } else if (operation === 'set') {
      newStock = Number(quantity);
    } else {
      logger.warn(`Operación de stock inválida: ${operation}`);
      return res.status(400).json({ message: 'Operación inválida. Valores permitidos: add, subtract, set' });
    }
    
    // Actualizar stock
    product.stock = newStock;
    await product.save();
    
    logger.info(`Stock actualizado para producto ${productId}: nuevo stock ${product.stock}`);
    return res.status(200).json({ message: 'Stock actualizado correctamente', product });
  } catch (error) {
    logger.error(`Error al ajustar stock: ${error.message}`);
    return res.status(500).json({ message: 'Error al ajustar stock', error: error.message });
  }
};
