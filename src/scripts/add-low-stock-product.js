/**
 * Script para agregar un producto con poco stock a la base de datos
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/product.model');
const logger = require('../utils/logger');

// Cargar variables de entorno
dotenv.config();

async function addLowStockProduct() {
  try {
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('Conexión a MongoDB establecida');

    // Verificar si el producto ya existe
    const existingProduct = await Product.findOne({ code: 'P005' });
    
    if (existingProduct) {
      // Actualizar el stock si ya existe
      existingProduct.stock = 5;
      await existingProduct.save();
      logger.info('Producto existente actualizado con poco stock');
    } else {
      // Crear nuevo producto con poco stock
      const newProduct = new Product({
        code: 'P005',
        name: 'Arroz Premium',
        description: 'Arroz grano largo, 1kg',
        price: 1800,
        cost: 1100,
        stock: 5,     // Producto con poco stock (menor a 10)
        category: 'otros',  // Usando una categoría válida según el modelo
        imageUrl: 'https://via.placeholder.com/150',
        isActive: true,
        barcode: '7501055000005',
        supplier: 'Distribuidora de Granos',
        discount: 0
      });

      await newProduct.save();
      logger.info('Nuevo producto con poco stock agregado correctamente');
    }

    logger.info('Proceso completado con éxito');
  } catch (error) {
    logger.error(`Error al agregar producto con poco stock: ${error.message}`);
    throw error;
  } finally {
    // Cerrar la conexión
    mongoose.connection.close();
  }
}

// Ejecutar la función principal
addLowStockProduct()
  .then(() => {
    logger.info('Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    logger.error(`Error en el script: ${error.message}`);
    process.exit(1);
  });
