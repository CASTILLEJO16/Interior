const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de seguridad
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

app.use(limiter);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos desde la carpeta frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'inventory-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen (jpeg, jpg, png, gif, webp)'));
        }
    }
});

// Configuración de SQLite
const dbPath = path.join(__dirname, 'inventory.db');
let db;

// Promisify database operations
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, async (err) => {
            if (err) {
                console.error('❌ Error al abrir base de datos:', err.message);
                reject(err);
                return;
            }
            console.log('✅ Base de datos SQLite conectada:', dbPath);
            
            try {
                // Crear tablas
                await run(`
                    CREATE TABLE IF NOT EXISTS usuarios (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        usuario TEXT UNIQUE NOT NULL,
                        contraseña TEXT NOT NULL,
                        nombre_completo TEXT NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        rol TEXT DEFAULT 'usuario' CHECK(rol IN ('admin', 'usuario')),
                        secretaria TEXT,
                        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                        ultimo_acceso DATETIME,
                        activo INTEGER DEFAULT 1
                    )
                `);

                await run(`
                    CREATE TABLE IF NOT EXISTS inventario (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        numero_inventario TEXT UNIQUE NOT NULL,
                        secretaria TEXT NOT NULL,
                        fecha_alta DATE NOT NULL,
                        descripcion TEXT NOT NULL,
                        costo REAL NOT NULL,
                        resguardante TEXT NOT NULL,
                        imagen TEXT,
                        usuario_registro INTEGER NOT NULL,
                        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
                        ultima_actualizacion DATETIME,
                        estatus TEXT DEFAULT 'activo' CHECK(estatus IN ('activo', 'dado_de_baja', 'en_mantenimiento')),
                        FOREIGN KEY (usuario_registro) REFERENCES usuarios(id)
                    )
                `);

                await run(`
                    CREATE TABLE IF NOT EXISTS movimientos_inventario (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        id_inventario INTEGER NOT NULL,
                        tipo_movimiento TEXT NOT NULL CHECK(tipo_movimiento IN ('alta', 'baja', 'modificacion', 'traslado')),
                        descripcion_movimiento TEXT NOT NULL,
                        usuario_movimiento INTEGER NOT NULL,
                        fecha_movimiento DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (id_inventario) REFERENCES inventario(id) ON DELETE CASCADE,
                        FOREIGN KEY (usuario_movimiento) REFERENCES usuarios(id)
                    )
                `);

                // Agregar campo secretaria a tabla usuarios si no existe (migración)
                try {
                    await run(`ALTER TABLE usuarios ADD COLUMN secretaria TEXT`);
                } catch (error) {
                    // Si la columna ya existe, ignoramos el error
                    if (!error.message.includes('duplicate column name')) {
                        throw error;
                    }
                }

                // Crear índices
                await run('CREATE INDEX IF NOT EXISTS idx_inventario_numero ON inventario(numero_inventario)');
                await run('CREATE INDEX IF NOT EXISTS idx_inventario_secretaria ON inventario(secretaria)');
                await run('CREATE INDEX IF NOT EXISTS idx_inventario_fecha ON inventario(fecha_alta)');
                await run('CREATE INDEX IF NOT EXISTS idx_inventario_resguardante ON inventario(resguardante)');

                // Insertar usuarios por defecto con hashes generados
                const bcrypt = require('bcryptjs');
                const saltRounds = 10;
                const adminPass = bcrypt.hashSync('admin123', saltRounds);
                const userPass = bcrypt.hashSync('usuario123', saltRounds);
                
                await run(`
                    INSERT OR IGNORE INTO usuarios (usuario, contraseña, nombre_completo, email, rol)
                    VALUES (?, ?, ?, ?, ?)
                `, ['admin', adminPass, 'Administrador del Sistema', 'admin@inventory.com', 'admin']);
                
                await run(`
                    INSERT OR IGNORE INTO usuarios (usuario, contraseña, nombre_completo, email, rol)
                    VALUES (?, ?, ?, ?, ?)
                `, ['usuario', userPass, 'Usuario de Prueba', 'usuario@inventory.com', 'usuario']);
                
                console.log('✅ Tablas creadas y usuarios por defecto insertados');
                resolve();
            } catch (error) {
                console.error('❌ Error al inicializar tablas:', error.message);
                reject(error);
            }
        });
    });
}

// Middleware de autenticación JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Token de autenticación requerido' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                message: 'Token inválido o expirado' 
            });
        }
        req.user = user;
        next();
    });
};

// Middleware para verificar rol de administrador
const authorizeAdmin = (req, res, next) => {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado. Se requieren privilegios de administrador'
        });
    }
    next();
};

// Middleware para manejar errores
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.stack);
    
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'El archivo es demasiado grande. Máximo 5MB.'
            });
        }
    }
    
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};

// Rutas de autenticación
app.post('/api/login', async (req, res) => {
    try {
        const { usuario, contraseña, tipo_usuario } = req.body;

        if (!usuario || !contraseña || !tipo_usuario) {
            return res.status(400).json({
                success: false,
                message: 'Usuario, contraseña y tipo de usuario son requeridos'
            });
        }

        const user = await get('SELECT * FROM usuarios WHERE usuario = ? AND activo = 1', [usuario]);

        console.log('Login intento - Usuario encontrado:', user ? 'Sí' : 'No');
        
        if (!user) {
            console.log('Login fallido: Usuario no encontrado');
            return res.status(401).json({
                success: false,
                message: 'Usuario o contraseña incorrectos'
            });
        }

        // Validar que el tipo de usuario seleccionado coincida con el rol del usuario
        if (user.rol !== tipo_usuario) {
            console.log('Login fallido: Tipo de usuario no coincide');
            const tipoEsperado = user.rol === 'admin' ? 'Administrador' : 'Usuario Estándar';
            return res.status(403).json({
                success: false,
                message: `Este usuario debe iniciar sesión como ${tipoEsperado}`
            });
        }

        console.log('Hash en DB:', user.contraseña);
        console.log('Contraseña ingresada:', contraseña);
        
        const isValidPassword = await bcrypt.compare(contraseña, user.contraseña);
        console.log('Password válido:', isValidPassword);

        if (!isValidPassword) {
            console.log('Login fallido: Password incorrecto');
            return res.status(401).json({
                success: false,
                message: 'Usuario o contraseña incorrectos'
            });
        }

        // Actualizar último acceso
        await run('UPDATE usuarios SET ultimo_acceso = datetime("now") WHERE id = ?', [user.id]);

        const token = jwt.sign(
            { 
                id: user.id, 
                usuario: user.usuario, 
                rol: user.rol 
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            token,
            user: {
                id: user.id,
                usuario: user.usuario,
                nombre_completo: user.nombre_completo,
                rol: user.rol,
                secretaria: user.secretaria
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar la solicitud'
        });
    }
});

// Ruta para verificar token
app.get('/api/verify-token', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Token válido',
        user: req.user
    });
});

// Rutas del inventario
app.get('/api/inventario', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', secretaria = '' } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT i.*, u.nombre_completo as nombre_registro 
            FROM inventario i 
            LEFT JOIN usuarios u ON i.usuario_registro = u.id 
            WHERE 1=1
        `;
        let params = [];

        if (search) {
            query += ` AND (i.numero_inventario LIKE ? OR i.descripcion LIKE ? OR i.resguardante LIKE ?)`;
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        if (secretaria) {
            query += ` AND i.secretaria = ?`;
            params.push(secretaria);
        }

        query += ` ORDER BY i.fecha_registro DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const items = await all(query, params);

        // Contar total
        let countQuery = `SELECT COUNT(*) as total FROM inventario i WHERE 1=1`;
        let countParams = [];

        if (search) {
            countQuery += ` AND (i.numero_inventario LIKE ? OR i.descripcion LIKE ? OR i.resguardante LIKE ?)`;
            const searchParam = `%${search}%`;
            countParams.push(searchParam, searchParam, searchParam);
        }

        if (secretaria) {
            countQuery += ` AND i.secretaria = ?`;
            countParams.push(secretaria);
        }

        const countResult = await get(countQuery, countParams);
        const total = countResult ? countResult.total : 0;

        res.json({
            success: true,
            data: items,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error al obtener inventario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los datos del inventario'
        });
    }
});

app.post('/api/inventario', authenticateToken, upload.single('imagen'), async (req, res) => {
    try {
        const {
            numero_inventario,
            fecha_alta,
            descripcion,
            costo,
            resguardante
        } = req.body;

        // Obtener la secretaría asignada al usuario
        const usuario = await get('SELECT secretaria FROM usuarios WHERE id = ?', [req.user.id]);
        
        if (!usuario || !usuario.secretaria) {
            return res.status(400).json({
                success: false,
                message: 'El usuario no tiene una secretaría asignada. Contacte al administrador.'
            });
        }

        const secretaria = usuario.secretaria;

        if (!numero_inventario || !fecha_alta || !descripcion || !costo || !resguardante) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son requeridos'
            });
        }

        // Verificar si existe
        const existing = await get('SELECT id FROM inventario WHERE numero_inventario = ?', [numero_inventario]);

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'El número de inventario ya existe'
            });
        }

        const imagen = req.file ? `/uploads/${req.file.filename}` : null;

        const result = await run(`
            INSERT INTO inventario 
            (numero_inventario, secretaria, fecha_alta, descripcion, costo, resguardante, imagen, usuario_registro)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [numero_inventario, secretaria, fecha_alta, descripcion, parseFloat(costo), resguardante, imagen, req.user.id]);

        // Registrar movimiento
        await run(`
            INSERT INTO movimientos_inventario 
            (id_inventario, tipo_movimiento, descripcion_movimiento, usuario_movimiento)
            VALUES (?, 'alta', 'Registro de nuevo artículo en el sistema', ?)
        `, [result.lastID, req.user.id]);

        res.status(201).json({
            success: true,
            message: 'Artículo agregado exitosamente',
            data: {
                id: result.lastID,
                numero_inventario,
                secretaria,
                fecha_alta,
                descripcion,
                costo: parseFloat(costo),
                resguardante,
                imagen
            }
        });

    } catch (error) {
        console.error('Error al agregar artículo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al agregar el artículo'
        });
    }
});

app.get('/api/inventario/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const item = await get('SELECT * FROM inventario WHERE id = ?', [id]);
        
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Artículo no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: item
        });
        
    } catch (error) {
        console.error('Error al obtener artículo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el artículo'
        });
    }
});

app.put('/api/inventario/:id', authenticateToken, authorizeAdmin, upload.single('imagen'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            numero_inventario,
            secretaria,
            fecha_alta,
            descripcion,
            costo,
            resguardante,
            estatus
        } = req.body;

        const existing = await get('SELECT * FROM inventario WHERE id = ?', [id]);

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Artículo no encontrado'
            });
        }

        const imagen = req.file ? `/uploads/${req.file.filename}` : existing.imagen;

        await run(`
            UPDATE inventario 
            SET numero_inventario = ?, secretaria = ?, fecha_alta = ?, descripcion = ?, 
                costo = ?, resguardante = ?, imagen = ?, estatus = ?, ultima_actualizacion = datetime('now')
            WHERE id = ?
        `, [numero_inventario, secretaria, fecha_alta, descripcion, parseFloat(costo), resguardante, imagen, estatus, id]);

        // Registrar movimiento
        await run(`
            INSERT INTO movimientos_inventario 
            (id_inventario, tipo_movimiento, descripcion_movimiento, usuario_movimiento)
            VALUES (?, 'modificacion', 'Actualización de datos del artículo', ?)
        `, [id, req.user.id]);

        res.json({
            success: true,
            message: 'Artículo actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error al actualizar artículo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el artículo'
        });
    }
});

app.delete('/api/inventario/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await get('SELECT * FROM inventario WHERE id = ?', [id]);

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Artículo no encontrado'
            });
        }

        // Registrar movimiento
        await run(`
            INSERT INTO movimientos_inventario 
            (id_inventario, tipo_movimiento, descripcion_movimiento, usuario_movimiento)
            VALUES (?, 'baja', 'Eliminación del artículo del sistema', ?)
        `, [id, req.user.id]);

        // Eliminar imagen si existe
        if (existing.imagen) {
            const imagePath = path.join(__dirname, existing.imagen.replace('/uploads/', 'uploads/'));
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await run('DELETE FROM inventario WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Artículo eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar artículo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el artículo'
        });
    }
});

// Rutas de estadísticas
app.get('/api/estadisticas', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const stats = await get(`
            SELECT 
                COUNT(*) as total_articulos,
                COUNT(CASE WHEN estatus = 'activo' THEN 1 END) as articulos_activos,
                COUNT(CASE WHEN estatus = 'dado_de_baja' THEN 1 END) as articulos_baja,
                COUNT(CASE WHEN estatus = 'en_mantenimiento' THEN 1 END) as articulos_mantenimiento,
                SUM(costo) as valor_total_inventario,
                AVG(costo) as costo_promedio,
                MAX(costo) as costo_maximo,
                MIN(costo) as costo_minimo
            FROM inventario
        `);

        const bySecretaria = await all(`
            SELECT 
                secretaria,
                COUNT(*) as total_articulos,
                SUM(costo) as valor_total,
                AVG(costo) as costo_promedio
            FROM inventario 
            WHERE estatus = 'activo'
            GROUP BY secretaria
            ORDER BY valor_total DESC
        `);
        
        res.json({
            success: true,
            data: {
                generales: stats || {},
                porSecretaria: bySecretaria
            }
        });

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las estadísticas'
        });
    }
});

// Ruta para obtener secretarías
app.get('/api/secretarias', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const rows = await all('SELECT DISTINCT secretaria FROM inventario ORDER BY secretaria');
        
        res.json({
            success: true,
            data: rows.map(row => row.secretaria)
        });

    } catch (error) {
        console.error('Error al obtener secretarías:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las secretarías'
        });
    }
});

// Rutas de gestión de usuarios (solo admin)
app.get('/api/usuarios', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const users = await all(`
            SELECT id, usuario, nombre_completo, email, rol, activo,
                   datetime(fecha_creacion) as fecha_registro,
                   datetime(ultimo_acceso) as ultimo_acceso
            FROM usuarios
            ORDER BY fecha_creacion DESC
        `);
        
        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los usuarios'
        });
    }
});

app.post('/api/usuarios', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { usuario, contraseña, nombre_completo, email, rol = 'usuario', secretaria } = req.body;

        // Validaciones
        if (!usuario || !contraseña || !nombre_completo || !secretaria) {
            return res.status(400).json({
                success: false,
                message: 'Usuario, contraseña, nombre completo y secretaría son requeridos'
            });
        }

        if (usuario.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'El usuario debe tener al menos 3 caracteres'
            });
        }

        if (contraseña.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        // Verificar si el usuario ya existe
        const existingUser = await get('SELECT id FROM usuarios WHERE usuario = ?', [usuario]);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de usuario ya está en uso'
            });
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(contraseña, 10);

        // Insertar nuevo usuario
        const result = await run(`
            INSERT INTO usuarios (usuario, contraseña, nombre_completo, email, rol, secretaria, activo, fecha_creacion)
            VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
        `, [usuario, hashedPassword, nombre_completo, email || null, rol, secretaria]);

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: {
                id: result.lastID,
                usuario,
                nombre_completo,
                email,
                rol,
                secretaria
            }
        });

    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el usuario'
        });
    }
});

app.put('/api/usuarios/:id/estado', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { activo } = req.body;

        // No permitir desactivar al propio admin que está haciendo la petición
        if (parseInt(id) === req.user.id && !activo) {
            return res.status(400).json({
                success: false,
                message: 'No puede desactivar su propia cuenta'
            });
        }

        await run('UPDATE usuarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);

        res.json({
            success: true,
            message: `Usuario ${activo ? 'activado' : 'desactivado'} exitosamente`
        });

    } catch (error) {
        console.error('Error al cambiar estado del usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar el estado del usuario'
        });
    }
});

// Rutas de archivos estáticos
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/dashboard', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard_secretarias.html'));
});

app.get('/dashboard_secretarias.html', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard_secretarias.html'));
});

// Ruta para usuarios estándar (solo registro)
app.get('/registro.html', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/registro.html'));
});

// Manejo de errores
app.use(errorHandler);

// Iniciar servidor
async function startServer() {
    await initializeDatabase();
    
    app.listen(PORT, () => {
        console.log(`🚀 Servidor iniciado en http://localhost:${PORT}`);
        console.log(`📁 Archivos estáticos en: ${path.join(__dirname, '../frontend')}`);
        console.log(`📸 Imágenes en: ${path.join(__dirname, 'uploads')}`);
        console.log(`🗄️  Base de datos: ${dbPath}`);
    });
}




startServer().catch(console.error);

module.exports = app;
