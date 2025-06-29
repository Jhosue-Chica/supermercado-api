# Supermercado API

API RESTful para la gestión de un sistema de supermercado desarrollada con Node.js, Express y MongoDB.

## Descripción

Este proyecto implementa una API para gestionar los recursos necesarios en un sistema de supermercado, incluyendo productos, ventas, usuarios y autenticación. La API está diseñada siguiendo los principios REST y proporciona endpoints para realizar operaciones CRUD sobre las diferentes entidades del sistema.

## Características

- **Autenticación**: Sistema de autenticación dual con JWT y API Key
- **Autorización**: Control de acceso basado en roles (admin, manager, employee)
- **Productos**: Gestión de productos con control de stock e inventario
- **Ventas**: Registro y procesamiento de transacciones con detalles de productos vendidos
- **Usuarios**: Administración de usuarios con diferentes niveles de acceso
- **Estadísticas**: Endpoints para obtener información analítica de ventas y productos
- **Logging**: Sistema de registro para monitoreo y depuración

## Tecnologías utilizadas

- Node.js
- Express.js
- MongoDB (con Mongoose)
- JWT para autenticación
- Winston para logging
- Dotenv para variables de entorno
- CORS para permitir solicitudes entre dominios

## Requisitos previos

- Node.js (v14 o superior)
- MongoDB (local o remoto)

## Instalación

1. Clonar el repositorio:
   ```
   git clone <url-del-repositorio>
   cd supermercado-api
   ```

2. Instalar dependencias:
   ```
   npm install
   ```

3. Configurar variables de entorno:
   - Crear un archivo `.env` en la raíz del proyecto basado en `.env.example`
   - Definir las variables necesarias:
     ```
     PORT=5000
     NODE_ENV=development
     MONGO_URI=mongodb://localhost:27017/supermercado
     JWT_SECRET=your_jwt_secret_key
     API_KEY=your_api_key
     JWT_EXPIRATION=24h
     ```

## Ejecución

```
npm start       # Para producción
npm run dev     # Para desarrollo (con nodemon)
```

El servidor se ejecutará en `http://localhost:5000` por defecto, a menos que se especifique un puerto diferente en el archivo `.env`.

## Estructura del proyecto

```
supermercado-api/
├── src/                  # Código fuente
│   ├── controllers/      # Controladores de la aplicación
│   ├── middleware/       # Middleware personalizado
│   ├── models/           # Modelos de datos
│   ├── routes/           # Definición de rutas
│   └── utils/            # Utilidades y funciones auxiliares
├── .env                  # Variables de entorno
├── .gitignore            # Archivos y directorios ignorados por Git
├── package.json          # Dependencias y scripts
└── README.md             # Este archivo
```

## API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar nuevo usuario
- `GET /api/auth/verify` - Verificar token JWT

### Productos
- `GET /api/products` - Listar productos
- `GET /api/products/:id` - Obtener un producto por ID
- `POST /api/products` - Crear un nuevo producto
- `PUT /api/products/:id` - Actualizar un producto
- `DELETE /api/products/:id` - Eliminar un producto
- `POST /api/products/:id/stock` - Ajustar el stock de un producto

### Ventas
- `GET /api/sales` - Listar ventas
- `GET /api/sales/:id` - Obtener una venta por ID
- `POST /api/sales` - Crear una nueva venta
- `PUT /api/sales/:id/payment-status` - Actualizar estado de pago
- `POST /api/sales/:id/cancel` - Cancelar una venta
- `GET /api/sales/stats` - Obtener estadísticas de ventas

### Usuarios
- `GET /api/users` - Listar usuarios
- `GET /api/users/:id` - Obtener un usuario por ID
- `POST /api/users` - Crear un nuevo usuario
- `PUT /api/users/:id` - Actualizar un usuario
- `DELETE /api/users/:id` - Eliminar un usuario
- `PUT /api/users/:id/status` - Actualizar estado de un usuario

## Estado de desarrollo

Este proyecto se encuentra actualmente en desarrollo y algunas funcionalidades podrían cambiar. Para más información sobre próximos cambios, consulte la sección de issues en el repositorio.

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo LICENSE para más detalles.
