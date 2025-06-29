const bcrypt = require('bcrypt');
const logger = require('./logger');
const User = require('../models/user.model');
const Product = require('../models/product.model');
const Sale = require('../models/sale.model');

exports.initializeDatabase = async () => {
  try {
    logger.info('Verificando datos iniciales en la base de datos...');
    await initializeUsers();
    await initializeProducts();
    await initializeSales();
    logger.info('Verificación de datos iniciales completada');
  } catch (error) {
    logger.error(`Error al inicializar la base de datos: ${error.message}`);
    throw error;
  }
};

async function initializeUsers() {
  const usersCount = await User.countDocuments();
  
  if (usersCount === 0) {
    logger.info('No se encontraron usuarios, creando usuarios por defecto...');
    
    const salt = await bcrypt.genSalt(10);
    
    const users = [
      { 
        username: 'admin', 
        email: 'admin@supermercado.com', 
        password: await bcrypt.hash('admin123', salt), 
        role: 'admin',
        firstName: 'Admin',
        lastName: 'Super',
        isActive: true
      },
      { 
        username: 'employee', 
        email: 'employee@supermercado.com', 
        password: await bcrypt.hash('employee123', salt), 
        role: 'employee',
        firstName: 'Empleado',
        lastName: 'Ejemplo',
        isActive: true
      },
      { 
        username: 'customer', 
        email: 'customer@example.com', 
        password: await bcrypt.hash('customer123', salt), 
        role: 'customer',
        firstName: 'María',
        lastName: 'Gómez',
        isActive: true
      }
    ];
    
    await User.insertMany(users);
    logger.info(`${users.length} usuarios creados correctamente`);
  } else {
    logger.info(`Se encontraron ${usersCount} usuarios existentes`);
  }
}

/**
 * Inicializa productos por defecto si no existen
 */
async function initializeProducts() {
  const productsCount = await Product.countDocuments();
  
  if (productsCount === 0) {
    logger.info('No se encontraron productos, creando productos por defecto...');
    
    const products = [
      {
        code: 'P001',
        name: 'Leche Deslactosada',
        description: 'Leche deslactosada entera, 1 litro',
        price: 1200,
        cost: 800,
        stock: 50,
        category: 'lácteos',
        imageUrl: 'https://via.placeholder.com/150',
        isActive: true,
        barcode: '7501055000001',
        supplier: 'Lácteos del Norte',
        discount: 0
      },
      {
        code: 'P002',
        name: 'Pan Blanco',
        description: 'Pan de molde blanco, 500g',
        price: 950,
        cost: 550,
        stock: 30,
        category: 'panadería',
        imageUrl: 'https://via.placeholder.com/150',
        isActive: true,
        barcode: '7501055000002',
        supplier: 'Panadería Central',
        discount: 0
      },
      {
        code: 'P003',
        name: 'Detergente Líquido',
        description: 'Detergente líquido multiusos, 1L',
        price: 1500,
        cost: 900,
        stock: 45,
        category: 'limpieza',
        imageUrl: 'https://via.placeholder.com/150',
        isActive: true,
        barcode: '7501055000003',
        supplier: 'Limpieza Total',
        discount: 5
      },
      {
        code: 'P004',
        name: 'Manzana Roja',
        description: 'Manzana roja fresca por kilo',
        price: 850,
        cost: 500,
        stock: 100,
        category: 'frutas',
        imageUrl: 'https://via.placeholder.com/150',
        isActive: true,
        barcode: '7501055000004',
        supplier: 'Frutas del Valle',
        discount: 0
      },
      {
        code: 'P005',
        name: 'Arroz Premium',
        description: 'Arroz grano largo, 1kg',
        price: 1800,
        cost: 1100,
        stock: 5,     // Producto con poco stock (menor a 10)
        category: 'abarrotes',
        imageUrl: 'https://via.placeholder.com/150',
        isActive: true,
        barcode: '7501055000005',
        supplier: 'Distribuidora de Granos',
        discount: 0
      }
    ];
    
    await Product.insertMany(products);
    logger.info(`${products.length} productos creados correctamente`);
  } else {
    logger.info(`Se encontraron ${productsCount} productos existentes`);
  }
}

/**
 * Inicializa ventas de ejemplo si no existen
 */
async function initializeSales() {
  const salesCount = await Sale.countDocuments();
  
  if (salesCount === 0) {
    logger.info('No se encontraron ventas, creando ventas de ejemplo...');
    
    // Obtenemos algunos usuarios y productos para asociarlos a las ventas
    const customers = await User.find({ role: 'customer' }).limit(2);
    const employees = await User.find({ role: 'employee' }).limit(2);
    const products = await Product.find().limit(4);
    
    // Verificamos si existen suficientes datos para crear ventas
    if (customers.length === 0 || employees.length === 0 || products.length === 0) {
      logger.warn('No hay suficientes usuarios o productos para crear ventas de ejemplo');
      return;
    }
    
    // Función para generar número de venta único
    const generateSaleNumber = (index) => {
      const date = new Date();
      const year = date.getFullYear().toString().substr(-2);
      const month = ('0' + (date.getMonth() + 1)).slice(-2);
      const day = ('0' + date.getDate()).slice(-2);
      return `V${year}${month}${day}-${index + 1}`;
    };
    
    // Crear ventas de ejemplo con fechas recientes
    const sales = [
      {
        saleNumber: generateSaleNumber(0),
        customer: customers[0]._id,
        seller: employees[0]._id,
        items: [
          {
            product: products[0]._id,
            productCode: products[0].code,
            productName: products[0].name,
            unitPrice: products[0].price,
            quantity: 2,
            discount: 0,
            subtotal: products[0].price * 2
          },
          {
            product: products[1]._id,
            productCode: products[1].code,
            productName: products[1].name,
            unitPrice: products[1].price,
            quantity: 1,
            discount: 0,
            subtotal: products[1].price
          }
        ],
        totalAmount: (products[0].price * 2) + products[1].price,
        paymentMethod: 'efectivo',
        paymentStatus: 'completado',
        tax: 0,
        notes: 'Venta de ejemplo creada automáticamente'
      },
      {
        saleNumber: generateSaleNumber(1),
        customer: customers[0]._id,
        seller: employees[0]._id,
        items: [
          {
            product: products[2]._id,
            productCode: products[2].code,
            productName: products[2].name,
            unitPrice: products[2].price,
            quantity: 3,
            discount: 0,
            subtotal: products[2].price * 3
          }
        ],
        totalAmount: products[2].price * 3,
        paymentMethod: 'tarjeta_credito',
        paymentStatus: 'completado',
        tax: 0,
        notes: 'Venta con tarjeta de crédito'
      },
      {
        saleNumber: generateSaleNumber(2),
        customer: customers.length > 1 ? customers[1]._id : customers[0]._id,
        seller: employees.length > 1 ? employees[1]._id : employees[0]._id,
        items: [
          {
            product: products[3]._id,
            productCode: products[3].code,
            productName: products[3].name,
            unitPrice: products[3].price,
            quantity: 5,
            discount: 0,
            subtotal: products[3].price * 5
          },
          {
            product: products[0]._id,
            productCode: products[0].code,
            productName: products[0].name,
            unitPrice: products[0].price,
            quantity: 1,
            discount: 0,
            subtotal: products[0].price
          }
        ],
        totalAmount: (products[3].price * 5) + products[0].price,
        paymentMethod: 'efectivo',
        paymentStatus: 'pendiente',
        tax: 0,
        notes: 'Venta pendiente de pago'
      }
    ];
    
    await Sale.insertMany(sales);
    logger.info(`${sales.length} ventas de ejemplo creadas correctamente`);
  } else {
    logger.info(`Se encontraron ${salesCount} ventas existentes`);
  }
}
