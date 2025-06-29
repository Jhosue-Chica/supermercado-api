const logger = require('../utils/logger');
const Sale = require('../models/sale.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');

/**
 * Obtener todas las ventas
 */
exports.getAllSales = async (req, res) => {
  try {
    logger.info('Obteniendo todas las ventas');
    
    // Construir filtros
    const filters = {};
    
    // Filtro por fechas
    if (req.query.startDate) {
      filters.createdAt = { ...filters.createdAt, $gte: new Date(req.query.startDate) };
    }
    
    if (req.query.endDate) {
      filters.createdAt = { ...filters.createdAt, $lte: new Date(req.query.endDate) };
    }
    
    // Filtro por estado de pago
    if (req.query.paymentStatus) {
      filters.paymentStatus = req.query.paymentStatus;
    }
    
    // Filtro por método de pago
    if (req.query.paymentMethod) {
      filters.paymentMethod = req.query.paymentMethod;
    }
    
    // Filtro por cliente
    if (req.query.customerId) {
      filters.customer = req.query.customerId;
    }
    
    // Filtro por vendedor
    if (req.query.sellerId) {
      filters.seller = req.query.sellerId;
    }
    
    // Si no es admin, limitar a ventas del usuario
    if (req.user && req.user.role !== 'admin') {
      filters.seller = req.user.id;
    }
    
    const sales = await Sale.find(filters)
      .populate('customer', 'firstName lastName username')
      .populate('seller', 'firstName lastName username')
      .sort({ createdAt: -1 });
    
    logger.info(`Se encontraron ${sales.length} ventas`);
    return res.status(200).json(sales);
  } catch (error) {
    logger.error(`Error al obtener ventas: ${error.message}`);
    return res.status(500).json({ message: 'Error al obtener ventas', error: error.message });
  }
};

/**
 * Obtener una venta por ID
 */
exports.getSaleById = async (req, res) => {
  try {
    const saleId = req.params.id;
    logger.info(`Buscando venta con ID: ${saleId}`);
    
    const sale = await Sale.findById(saleId)
      .populate('customer', 'firstName lastName username email')
      .populate('seller', 'firstName lastName username');
    
    if (!sale) {
      logger.warn(`Venta con ID ${saleId} no encontrada`);
      return res.status(404).json({ message: 'Venta no encontrada' });
    }
    
    return res.status(200).json(sale);
  } catch (error) {
    logger.error(`Error al obtener venta: ${error.message}`);
    return res.status(500).json({ message: 'Error al obtener venta', error: error.message });
  }
};

/**
 * Crear una nueva venta
 */
exports.createSale = async (req, res) => {
  // Usar una transacción para garantizar integridad de datos
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const saleData = req.body;
    logger.info('Creando nueva venta');
    
    // Validar datos requeridos
    if (!saleData.items || saleData.items.length === 0) {
      logger.warn('Intento de crear venta sin items');
      return res.status(400).json({ message: 'La venta debe tener al menos un item' });
    }
    
    if (!saleData.paymentMethod) {
      logger.warn('Intento de crear venta sin método de pago');
      return res.status(400).json({ message: 'El método de pago es requerido' });
    }
    
    // Generar número de venta único
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    
    // Contar ventas existentes para generar secuencia
    const salesCount = await Sale.countDocuments({}, { session });
    const saleNumber = `V${year}-${(salesCount + 1).toString().padStart(3, '0')}`;
    
    // Preparar items y calcular total
    let totalAmount = 0;
    const processedItems = [];
    
    for (const item of saleData.items) {
      // Verificar existencia del producto
      const product = await Product.findById(item.product, null, { session });
      
      if (!product) {
        logger.warn(`Producto con ID ${item.product} no encontrado`);
        await session.abortTransaction();
        return res.status(404).json({ message: `Producto con ID ${item.product} no encontrado` });
      }
      
      // Verificar stock suficiente
      if (product.stock < item.quantity) {
        logger.warn(`Stock insuficiente para producto ${product.name}`);
        await session.abortTransaction();
        return res.status(400).json({ 
          message: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Solicitado: ${item.quantity}` 
        });
      }
      
      // Calcular subtotal
      const discount = item.discount || product.discount || 0;
      const subtotal = (item.quantity * product.price) * (1 - discount / 100);
      
      // Añadir item procesado
      processedItems.push({
        product: product._id,
        productCode: product.code,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        discount,
        subtotal
      });
      
      totalAmount += subtotal;
      
      // Actualizar stock del producto
      product.stock -= item.quantity;
      await product.save({ session });
    }
    
    // Crear la venta
    const newSale = new Sale({
      saleNumber,
      customer: saleData.customer,
      items: processedItems,
      totalAmount,
      paymentMethod: saleData.paymentMethod,
      paymentStatus: saleData.paymentStatus || 'pendiente',
      seller: req.user.id,
      notes: saleData.notes,
      tax: saleData.tax || 0
    });
    
    await newSale.save({ session });
    
    // Confirmar la transacción
    await session.commitTransaction();
    
    logger.info(`Venta creada con ID: ${newSale._id} y número ${saleNumber}`);
    
    // Obtener la venta completa con datos de cliente y vendedor
    const completeSale = await Sale.findById(newSale._id)
      .populate('customer', 'firstName lastName username')
      .populate('seller', 'firstName lastName username');
    
    return res.status(201).json(completeSale);
  } catch (error) {
    // Revertir cambios en caso de error
    await session.abortTransaction();
    
    logger.error(`Error al crear venta: ${error.message}`);
    return res.status(500).json({ message: 'Error al crear venta', error: error.message });
  } finally {
    // Finalizar sesión
    session.endSession();
  }
};

/**
 * Actualizar el estado de pago de una venta
 */
exports.updatePaymentStatus = async (req, res) => {
  try {
    const saleId = req.params.id;
    const { paymentStatus, paymentMethod } = req.body;
    
    logger.info(`Actualizando estado de pago de venta ${saleId} a ${paymentStatus}`);
    
    if (!paymentStatus) {
      logger.warn('Intento de actualizar estado de pago sin proporcionar estado');
      return res.status(400).json({ message: 'Se requiere el estado de pago' });
    }
    
    const sale = await Sale.findById(saleId);
    
    if (!sale) {
      logger.warn(`Venta con ID ${saleId} no encontrada`);
      return res.status(404).json({ message: 'Venta no encontrada' });
    }
    
    // Validar que la venta no esté cancelada
    if (sale.paymentStatus === 'cancelado') {
      logger.warn(`Intento de actualizar estado de pago de una venta cancelada`);
      return res.status(400).json({ message: 'No se puede modificar una venta cancelada' });
    }
    
    // Actualizar estado de pago
    sale.paymentStatus = paymentStatus;
    
    // Actualizar método de pago si se proporciona
    if (paymentMethod) {
      sale.paymentMethod = paymentMethod;
    }
    
    await sale.save();
    
    logger.info(`Estado de pago actualizado para venta ${saleId}`);
    return res.status(200).json({ message: 'Estado de pago actualizado', sale });
  } catch (error) {
    logger.error(`Error al actualizar estado de pago: ${error.message}`);
    return res.status(500).json({ message: 'Error al actualizar estado de pago', error: error.message });
  }
};

/**
 * Cancelar una venta
 */
exports.cancelSale = async (req, res) => {
  // Usar una transacción para garantizar integridad de datos
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const saleId = req.params.id;
    logger.info(`Cancelando venta con ID: ${saleId}`);
    
    const sale = await Sale.findById(saleId).session(session);
    
    if (!sale) {
      logger.warn(`Venta con ID ${saleId} no encontrada`);
      await session.abortTransaction();
      return res.status(404).json({ message: 'Venta no encontrada' });
    }
    
    // Validar que la venta no esté ya cancelada
    if (sale.paymentStatus === 'cancelado') {
      logger.warn(`Intento de cancelar una venta que ya está cancelada`);
      await session.abortTransaction();
      return res.status(400).json({ message: 'La venta ya está cancelada' });
    }
    
    // Devolver stock a productos
    for (const item of sale.items) {
      const product = await Product.findById(item.product).session(session);
      
      if (product) {
        product.stock += item.quantity;
        await product.save({ session });
        logger.info(`Stock actualizado para producto ${item.productName}: +${item.quantity}`);
      } else {
        logger.warn(`No se encontró el producto ${item.product} para restaurar stock`);
      }
    }
    
    // Marcar venta como cancelada
    sale.paymentStatus = 'cancelado';
    await sale.save({ session });
    
    // Confirmar transacción
    await session.commitTransaction();
    
    logger.info(`Venta ${saleId} cancelada exitosamente`);
    return res.status(200).json({ message: 'Venta cancelada exitosamente', sale });
  } catch (error) {
    // Revertir cambios en caso de error
    await session.abortTransaction();
    
    logger.error(`Error al cancelar venta: ${error.message}`);
    return res.status(500).json({ message: 'Error al cancelar venta', error: error.message });
  } finally {
    // Finalizar sesión
    session.endSession();
  }
};

/**
 * Obtener estadísticas de ventas
 */
exports.getSalesStats = async (req, res) => {
  try {
    logger.info('Obteniendo estadísticas de ventas');
    
    // Construir filtros
    const filters = { paymentStatus: { $ne: 'cancelado' } };
    
    // Filtro por fechas
    if (req.query.startDate) {
      filters.createdAt = { ...filters.createdAt, $gte: new Date(req.query.startDate) };
    }
    
    if (req.query.endDate) {
      filters.createdAt = { ...filters.createdAt, $lte: new Date(req.query.endDate) };
    }
    
    // Si no es admin, limitar a ventas del usuario
    if (req.user && req.user.role !== 'admin') {
      filters.seller = req.user.id;
    }
    
    // Total de ventas
    const totalSales = await Sale.countDocuments(filters);
    
    // Monto total vendido
    const totalAmountResult = await Sale.aggregate([
      { $match: filters },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].total : 0;
    
    // Ventas por método de pago
    const paymentMethodStats = await Sale.aggregate([
      { $match: filters },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$totalAmount' } } },
      { $sort: { total: -1 } }
    ]);
    
    // Ventas por estado de pago
    const paymentStatusStats = await Sale.aggregate([
      { $match: { ...filters, paymentStatus: { $exists: true } } },
      { $group: { _id: '$paymentStatus', count: { $sum: 1 }, total: { $sum: '$totalAmount' } } }
    ]);
    
    // Productos más vendidos
    const topProducts = await Sale.aggregate([
      { $match: filters },
      { $unwind: '$items' },
      {
        $group: {
          _id: { productId: '$items.product', productName: '$items.productName' },
          totalQuantity: { $sum: '$items.quantity' },
          totalAmount: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 }
    ]);
    
    // Ventas por día
    const salesByDay = await Sale.aggregate([
      { $match: filters },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          total: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
      { $limit: 30 }
    ]);
    
    // Formatear resultados de ventas por día
    const formattedSalesByDay = salesByDay.map(day => ({
      date: `${day._id.year}-${day._id.month.toString().padStart(2, '0')}-${day._id.day.toString().padStart(2, '0')}`,
      count: day.count,
      total: day.total
    }));
    
    const stats = {
      totalSales,
      totalAmount,
      paymentMethods: paymentMethodStats,
      paymentStatus: paymentStatusStats,
      topProducts: topProducts.map(p => ({
        productId: p._id.productId,
        productName: p._id.productName,
        totalQuantity: p.totalQuantity,
        totalAmount: p.totalAmount
      })),
      salesByDay: formattedSalesByDay
    };
    
    logger.info('Estadísticas de ventas generadas correctamente');
    return res.status(200).json(stats);
  } catch (error) {
    logger.error(`Error al obtener estadísticas: ${error.message}`);
    return res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message });
  }
};
