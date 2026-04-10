# Sistema Profesional de Control de Inventario

Una aplicación web moderna y elegante para la gestión profesional de inventario, con interfaz tipo dashboard, modo oscuro, y todas las características solicitadas.

## Características Principales

### **Autenticación Avanzada**
- Sistema de login con glassmorphism
- Validaciones completas
- Tokens JWT para seguridad
- Sesiones persistentes
- Diseño moderno con animaciones

### **Dashboard Moderno**
- Interfaz tipo panel administrativo
- Sidebar de navegación responsive
- Estadísticas en tiempo real
- Gráficos y tarjetas informativas
- Modo oscuro elegante

### **Gestión de Inventario**
- CRUD completo (Crear, Leer, Actualizar, Eliminar)
- Formulario de registro con validaciones
- Subida de imágenes con vista previa
- Búsqueda en tiempo real
- Filtrado por secretaría
- Paginación dinámica

### **Base de Datos**
- MySQL/MariaDB con diseño relacional
- Tablas optimizadas con índices
- Vistas para estadísticas
- Auditoría de movimientos
- Datos de prueba incluidos

### **Diseño y UX**
- Glassmorphism y efectos visuales
- Animaciones suaves en toda la app
- Responsive design
- Iconos modernos (FontAwesome)
- Toast notifications
- Loading states

## Tecnologías Utilizadas

- **Backend**: Node.js + Express.js
- **Base de Datos**: MySQL/MariaDB
- **Frontend**: HTML5, CSS3, JavaScript Vanilla
- **Autenticación**: JWT (JSON Web Tokens)
- **Subida de Archivos**: Multer
- **Estilos**: CSS Custom con variables CSS
- **Iconos**: FontAwesome 6.4.0

## Requisitos del Sistema

### Software Requerido
- Node.js 16+ 
- MySQL/MariaDB 8.0+
- NPM o Yarn

### Hardware Recomendado
- 2GB RAM mínimo
- 1GB de espacio en disco
- Procesador de 1GHz o superior

## Instalación y Configuración

### 1. Clonar el Proyecto
```bash
git clone <repository-url>
cd bdinterior
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Base de Datos

#### Opción A: Usar script SQL
```bash
mysql -u root -p < database.sql
```

#### Opción B: Configuración Manual
1. Crear la base de datos:
```sql
CREATE DATABASE inventory_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Importar el script `database.sql` en tu cliente MySQL preferido

### 4. Configurar Variables de Entorno

Editar el archivo `.env` con tus credenciales:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña_mysql
DB_NAME=inventory_system
DB_PORT=3306

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRES_IN=24h

# File Upload Configuration
UPLOAD_PATH=uploads/
MAX_FILE_SIZE=5242880
```

### 5. Iniciar la Aplicación

#### Modo Desarrollo
```bash
npm run dev
```

#### Modo Producción
```bash
npm start
```

### 6. Acceder a la Aplicación

Abrir en tu navegador: `http://localhost:3000`

## Credenciales de Acceso

### Usuario Administrador
- **Usuario**: `admin`
- **Contraseña**: `admin123`

### Usuario Estándar
- **Usuario**: `usuario`
- **Contraseña**: `usuario123`

## Estructura del Proyecto

```
bdinterior/
|-- public/
|   |-- css/
|   |   `-- styles.css          # Estilos principales
|   |-- js/
|   |   |-- login.js           # Lógica del login
|   |   `-- dashboard.js       # Lógica del dashboard
|   |-- login.html             # Página de login
|   |-- dashboard.html         # Dashboard principal
|   `-- index.html             # Redirección al login
|-- uploads/                   # Imágenes subidas
|-- .env                       # Variables de entorno
|-- database.sql              # Script de base de datos
|-- package.json              # Dependencias del proyecto
|-- README.md                 # Documentación
`-- server.js                 # Servidor principal
```

## Funcionalidades Detalladas

### **1. Sistema de Login**
- Validación de campos vacíos
- Verificación de credenciales
- Manejo de errores elegante
- Animaciones de carga
- Recordar sesión

### **2. Dashboard Principal**
- Estadísticas en tiempo real
- Tarjetas informativas con animaciones
- Tabla de artículos recientes
- Navegación intuitiva

### **3. Gestión de Inventario**
- **Agregar Artículo**: Formulario completo con validaciones
- **Editar Artículo**: Modal de edición con todos los campos
- **Eliminar Artículo**: Confirmación antes de eliminar
- **Buscar**: Búsqueda en tiempo real por múltiples campos
- **Filtrar**: Filtrado por secretaría
- **Paginar**: Navegación eficiente de grandes volúmenes

### **4. Manejo de Imágenes**
- Subida de imágenes (JPG, PNG, GIF, WebP)
- Vista previa antes de guardar
- Validación de tamaño (máximo 5MB)
- Almacenamiento optimizado

### **5. Reportes y Estadísticas**
- Estadísticas generales del inventario
- Análisis por secretaría
- Costos promedio y totales
- Estados de los artículos

## API Endpoints

### Autenticación
- `POST /api/login` - Iniciar sesión
- `GET /api/verify-token` - Verificar token

### Inventario
- `GET /api/inventario` - Obtener artículos (con paginación, búsqueda y filtros)
- `POST /api/inventario` - Crear nuevo artículo
- `PUT /api/inventario/:id` - Actualizar artículo
- `DELETE /api/inventario/:id` - Eliminar artículo

### Estadísticas
- `GET /api/estadisticas` - Obtener estadísticas generales
- `GET /api/secretarias` - Obtener lista de secretarías

## Seguridad Implementada

### **Autenticación**
- Tokens JWT con expiración
- Contraseñas encriptadas con bcrypt
- Middleware de verificación de tokens

### **Validaciones**
- Validación de entrada en todos los formularios
- Sanitización de datos
- Límite de tamaño de archivos

### **Protección**
- Rate limiting para prevenir ataques
- CORS configurado
- Manejo seguro de errores

## Personalización

### **Cambiar Colores y Tema**
Editar las variables CSS en `public/css/styles.css`:

```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --accent-color: #f59e0b;
    /* ... otras variables */
}
```

### **Agregar Nuevos Campos**
1. Modificar el esquema de la base de datos
2. Actualizar el backend en `server.js`
3. Modificar los formularios HTML
4. Actualizar el JavaScript del frontend

## Solución de Problemas Comunes

### **Error de Conexión a la Base de Datos**
- Verificar que MySQL esté corriendo
- Confirmar credenciales en `.env`
- Revisar que la base de datos exista

### **Error al Subir Imágenes**
- Verificar permisos de la carpeta `uploads/`
- Confirmar tamaño máximo (5MB)
- Revisar formato del archivo

### **Problemas de Login**
- Limpiar localStorage del navegador
- Verificar que el servidor esté corriendo
- Revisar credenciales de la base de datos

## Deployment en Producción

### **Consideraciones de Seguridad**
- Cambiar `JWT_SECRET` por una clave segura
- Usar HTTPS en producción
- Configurar firewall apropiadamente
- Hacer backup regular de la base de datos

### **Optimización**
- Habilitar compresión gzip
- Configurar CDN para archivos estáticos
- Optimizar imágenes
- Usar PM2 para gestión de procesos

## Contribución

1. Fork del proyecto
2. Crear rama de características
3. Hacer commits descriptivos
4. Push a la rama
5. Crear Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo LICENSE para más detalles.

## Soporte

Para soporte técnico o preguntas:
- Crear un issue en el repositorio
- Enviar correo a: support@inventory-system.com
- Consultar la documentación técnica

---

**Desarrollado con Node.js, Express, MySQL y tecnologías web modernas**
