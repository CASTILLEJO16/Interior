const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de keep-alive y timeouts para mayor estabilidad
app.use((req, res, next) => {
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=300, max=100'); // 5 minutos como el socket timeout
    next();
});

// Configuración CORS y body parsing
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173',
        'http://127.0.0.1:4173'
    ],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// NOTA: Rate limiter deshabilitado para desarrollo local sin restricciones
// En producción, agregar: app.use('/api', rateLimit({...}))

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

// Función helper para registrar en el historial del sistema
async function registrarHistorial(tipoAccion, descripcion, entidadId, entidadTipo, usuarioId, usuarioNombre, secretariaOrigen, secretariaDestino, detalles) {
    try {
        await run(`
            INSERT INTO historial_sistema
            (tipo_accion, descripcion, entidad_id, entidad_tipo, usuario_responsable_id, usuario_responsable_nombre, secretaria_origen, secretaria_destino, detalles_adicionales)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [tipoAccion, descripcion, entidadId || null, entidadTipo || null, usuarioId, usuarioNombre || null, secretariaOrigen || null, secretariaDestino || null, detalles ? JSON.stringify(detalles) : null]);
    } catch (error) {
        console.error('❌ Error al registrar en historial:', error.message);
    }
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
                        nombre_articulo TEXT NOT NULL,
                        categoria TEXT,
                        subcategoria TEXT,
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
                        estado_uso TEXT DEFAULT 'en_uso' CHECK(estado_uso IN ('en_uso', 'en_almacen')),
                        FOREIGN KEY (usuario_registro) REFERENCES usuarios(id)
                    )
                `);

                // Migración: agregar columnas nuevas si no existen (para bases de datos antiguas)
                try {
                    await run(`ALTER TABLE inventario ADD COLUMN nombre_articulo TEXT NOT NULL DEFAULT 'Sin nombre'`);
                    console.log('✅ Columna nombre_articulo agregada a tabla inventario');
                } catch (err) {
                    if (!err.message.includes('duplicate column') && !err.message.includes('already exists')) {
                        console.error('Error al agregar columna nombre_articulo:', err);
                    }
                }

                try {
                    await run(`ALTER TABLE inventario ADD COLUMN categoria TEXT`);
                    console.log('✅ Columna categoria agregada a tabla inventario');
                } catch (err) {
                    if (!err.message.includes('duplicate column') && !err.message.includes('already exists')) {
                        console.error('Error al agregar columna categoria:', err);
                    }
                }

                try {
                    await run(`ALTER TABLE inventario ADD COLUMN subcategoria TEXT`);
                    console.log('✅ Columna subcategoria agregada a tabla inventario');
                } catch (err) {
                    if (!err.message.includes('duplicate column') && !err.message.includes('already exists')) {
                        console.error('Error al agregar columna subcategoria:', err);
                    }
                }

                try {
                    await run(`ALTER TABLE inventario ADD COLUMN estado_uso TEXT DEFAULT 'en_uso' CHECK(estado_uso IN ('en_uso', 'en_almacen'))`);
                    console.log('✅ Columna estado_uso agregada a tabla inventario');
                } catch (err) {
                    if (!err.message.includes('duplicate column') && !err.message.includes('already exists')) {
                        console.error('Error al agregar columna estado_uso:', err);
                    }
                }

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

                // Tabla de historial del sistema (unificada para auditoría)
                await run(`
                    CREATE TABLE IF NOT EXISTS historial_sistema (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        tipo_accion TEXT NOT NULL CHECK(tipo_accion IN ('creacion_usuario', 'registro_mueble', 'traslado_mueble', 'modificacion_mueble', 'eliminacion_mueble', 'login', 'logout', 'activacion_usuario', 'desactivacion_usuario')),
                        descripcion TEXT NOT NULL,
                        entidad_id INTEGER,
                        entidad_tipo TEXT,
                        usuario_responsable_id INTEGER NOT NULL,
                        usuario_responsable_nombre TEXT,
                        secretaria_origen TEXT,
                        secretaria_destino TEXT,
                        detalles_adicionales TEXT,
                        fecha_accion DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (usuario_responsable_id) REFERENCES usuarios(id)
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

// Middleware para autenticación de páginas HTML (redirige en lugar de JSON)
const authenticateHTML = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Lista de rutas que NO requieren autenticación
    const publicRoutes = ['/login.html', '/registro.html', '/'];
    const isPublicRoute = publicRoutes.includes(req.path);
    
    // Lista de extensiones de archivos estáticos
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2'];
    const isStaticFile = staticExtensions.some(ext => req.path.endsWith(ext));
    
    if (!token && !isPublicRoute && !isStaticFile) {
        console.log(`No token found for path: ${req.path}, redirecting to login...`);
        return res.redirect('/login.html');
    }

    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                console.log('Invalid token, redirecting to login...');
                return res.redirect('/login.html');
            }
            req.user = user;
            next();
        });
    } else {
        next();
    }
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
        const { page = 1, limit = 10, search = '', secretaria = '', estado_uso = '' } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT i.*, u.nombre_completo as nombre_registro 
            FROM inventario i 
            LEFT JOIN usuarios u ON i.usuario_registro = u.id 
            WHERE 1=1
        `;
        let params = [];

        if (search) {
            query += ` AND (i.numero_inventario LIKE ? OR i.nombre_articulo LIKE ? OR i.descripcion LIKE ? OR i.resguardante LIKE ?)`;
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam, searchParam);
        }

        if (secretaria) {
            query += ` AND i.secretaria = ?`;
            params.push(secretaria);
        }

        if (estado_uso) {
            query += ` AND i.estado_uso = ?`;
            params.push(estado_uso);
        }

        query += ` ORDER BY i.fecha_registro DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const items = await all(query, params);

        // Contar total
        let countQuery = `SELECT COUNT(*) as total FROM inventario i WHERE 1=1`;
        let countParams = [];

        if (search) {
            countQuery += ` AND (i.numero_inventario LIKE ? OR i.nombre_articulo LIKE ? OR i.descripcion LIKE ? OR i.resguardante LIKE ?)`;
            const searchParam = `%${search}%`;
            countParams.push(searchParam, searchParam, searchParam, searchParam);
        }

        if (secretaria) {
            countQuery += ` AND i.secretaria = ?`;
            countParams.push(secretaria);
        }

        if (estado_uso) {
            countQuery += ` AND i.estado_uso = ?`;
            countParams.push(estado_uso);
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
            nombre_articulo,
            categoria,
            subcategoria,
            fecha_alta,
            descripcion,
            costo,
            resguardante,
            secretaria: secretariaBody,
            estado_uso
        } = req.body;

        let secretaria;

        // Si el artículo va al almacén, no asignar secretaría
        if (estado_uso === 'en_almacen') {
            secretaria = 'Almacén';
        } else if (req.user.rol === 'admin') {
            // Si es admin, puede especificar la secretaría en el body
            if (secretariaBody) {
                secretaria = secretariaBody;
            } else {
                // Si no especificó, obtener la del usuario admin (si tiene)
                const usuario = await get('SELECT secretaria FROM usuarios WHERE id = ?', [req.user.id]);
                secretaria = usuario?.secretaria || 'Sin Secretaría';
            }
        } else {
            // Usuario normal: usar su secretaría asignada
            const usuario = await get('SELECT secretaria FROM usuarios WHERE id = ?', [req.user.id]);
            if (!usuario || !usuario.secretaria) {
                return res.status(400).json({
                    success: false,
                    message: 'El usuario no tiene una secretaría asignada. Contacte al administrador.'
                });
            }
            secretaria = usuario.secretaria;
        }

        // Validar campos requeridos con mensajes específicos
        const camposFaltantes = [];
        if (!numero_inventario || numero_inventario.trim() === '') camposFaltantes.push('Número de Inventario');
        if (!nombre_articulo || nombre_articulo.trim() === '') camposFaltantes.push('Nombre del Artículo');
        if (!fecha_alta) camposFaltantes.push('Fecha de Alta');
        if (!descripcion || descripcion.trim() === '') camposFaltantes.push('Descripción');
        if (!costo || isNaN(parseFloat(costo))) camposFaltantes.push('Costo');
        if (!resguardante || resguardante.trim() === '') camposFaltantes.push('Resguardante');

        if (camposFaltantes.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Campos requeridos faltantes: ${camposFaltantes.join(', ')}`
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
            (numero_inventario, nombre_articulo, categoria, subcategoria, secretaria, fecha_alta, descripcion, costo, resguardante, imagen, usuario_registro, estado_uso)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [numero_inventario, nombre_articulo, categoria || null, subcategoria || null, secretaria, fecha_alta, descripcion, parseFloat(costo), resguardante, imagen, req.user.id, estado_uso || 'en_uso']);

        // Registrar movimiento
        await run(`
            INSERT INTO movimientos_inventario
            (id_inventario, tipo_movimiento, descripcion_movimiento, usuario_movimiento)
            VALUES (?, 'alta', 'Registro de nuevo artículo en el sistema', ?)
        `, [result.lastID, req.user.id]);

        // Registrar en historial del sistema
        await registrarHistorial(
            'registro_mueble',
            `Mueble registrado: ${numero_inventario} - ${nombre_articulo} en ${secretaria}`,
            result.lastID,
            'mueble',
            req.user.id,
            req.user.usuario,
            null,
            secretaria,
            { numero_inventario, nombre_articulo, categoria, subcategoria, descripcion, secretaria, costo, resguardante }
        );

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

// Endpoint para generar QR de un artículo (DEBE ir antes de /api/inventario/:id)
app.get('/api/inventario/:id/qr', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener los datos del artículo
        const item = await get(`
            SELECT i.*, u.nombre_completo as usuario_registro_nombre
            FROM inventario i
            LEFT JOIN usuarios u ON i.usuario_registro = u.id
            WHERE i.id = ?
        `, [id]);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Artículo no encontrado'
            });
        }

        // Crear objeto con la información del QR
        const qrData = {
            numero_inventario: item.numero_inventario,
            descripcion: item.descripcion,
            secretaria: item.secretaria,
            resguardante: item.resguardante,
            costo: item.costo,
            fecha_alta: item.fecha_alta,
            estatus: item.estatus,
            fecha_registro: item.fecha_registro
        };

        // Convertir a string JSON
        const qrText = JSON.stringify(qrData, null, 2);

        // Generar el QR como Data URL (base64)
        const qrDataUrl = await QRCode.toDataURL(qrText, {
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        res.json({
            success: true,
            data: {
                qr_image: qrDataUrl,
                item_info: qrData
            }
        });

    } catch (error) {
        console.error('Error al generar QR:', error);
        res.status(500).json({
            success: false,
            message: 'Error al generar el código QR'
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

// Endpoint para trasladar mueble entre secretarías
app.put('/api/inventario/:id/trasladar', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { secretaria_destino, motivo_traslado } = req.body;

        // Validar datos requeridos
        if (!secretaria_destino) {
            return res.status(400).json({
                success: false,
                message: 'La secretaría de destino es requerida'
            });
        }

        // Obtener datos del artículo actual
        const item = await get('SELECT * FROM inventario WHERE id = ?', [id]);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Artículo no encontrado'
            });
        }

        // Verificar que la secretaría de destino sea diferente a la actual
        if (item.secretaria === secretaria_destino) {
            return res.status(400).json({
                success: false,
                message: 'La secretaría de destino debe ser diferente a la secretaría actual'
            });
        }

        const secretaria_origen = item.secretaria;

        // Actualizar la secretaría del artículo
        await run(`
            UPDATE inventario
            SET secretaria = ?, ultima_actualizacion = datetime('now')
            WHERE id = ?
        `, [secretaria_destino, id]);

        // Registrar el movimiento de traslado
        const descripcionMovimiento = `Traslado de ${secretaria_origen} a ${secretaria_destino}. ${motivo_traslado || 'Sin motivo especificado'}`;

        await run(`
            INSERT INTO movimientos_inventario
            (id_inventario, tipo_movimiento, descripcion_movimiento, usuario_movimiento)
            VALUES (?, 'traslado', ?, ?)
        `, [id, descripcionMovimiento, req.user.id]);

        // Registrar en historial del sistema
        await registrarHistorial(
            'traslado_mueble',
            `Mueble trasladado: ${item.numero_inventario} de ${secretaria_origen} a ${secretaria_destino}`,
            item.id,
            'mueble',
            req.user.id,
            req.user.usuario,
            secretaria_origen,
            secretaria_destino,
            { numero_inventario: item.numero_inventario, descripcion: item.descripcion, motivo: motivo_traslado }
        );

        res.json({
            success: true,
            message: `Artículo trasladado exitosamente de ${secretaria_origen} a ${secretaria_destino}`,
            data: {
                id: item.id,
                numero_inventario: item.numero_inventario,
                secretaria_anterior: secretaria_origen,
                secretaria_nueva: secretaria_destino,
                motivo: motivo_traslado
            }
        });

    } catch (error) {
        console.error('Error al trasladar artículo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al trasladar el artículo'
        });
    }
});

// Endpoint para mover artículo entre almacén y secretaría
app.put('/api/inventario/:id/mover', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { estado_uso, secretaria } = req.body;

        // Validar estado_uso
        if (!estado_uso || !['en_uso', 'en_almacen'].includes(estado_uso)) {
            return res.status(400).json({
                success: false,
                message: 'Estado de uso inválido. Debe ser "en_uso" o "en_almacen"'
            });
        }

        // Obtener datos del artículo actual
        const item = await get('SELECT * FROM inventario WHERE id = ?', [id]);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Artículo no encontrado'
            });
        }

        const estadoAnterior = item.estado_uso;
        const secretariaAnterior = item.secretaria;

        // Si se mueve a en_uso, debe tener secretaría
        if (estado_uso === 'en_uso' && !secretaria && !item.secretaria) {
            return res.status(400).json({
                success: false,
                message: 'Debe especificar una secretaría al mover el artículo a "En Uso"'
            });
        }

        // Construir actualización
        const updates = ['estado_uso = ?', 'ultima_actualizacion = datetime(\'now\')'];
        const params = [estado_uso];

        if (estado_uso === 'en_uso' && secretaria) {
            updates.push('secretaria = ?');
            params.push(secretaria);
        }

        params.push(id);
        await run(`UPDATE inventario SET ${updates.join(', ')} WHERE id = ?`, params);

        // Registrar movimiento
        let descripcionMovimiento = '';
        if (estado_uso === 'en_almacen') {
            descripcionMovimiento = `Artículo ${item.numero_inventario} movido de ${secretariaAnterior} al Almacén`;
        } else if (estado_uso === 'en_uso' && secretaria) {
            descripcionMovimiento = `Artículo ${item.numero_inventario} asignado del Almacén a ${secretaria}`;
        } else {
            descripcionMovimiento = `Artículo ${item.numero_inventario} cambió de estado: ${estadoAnterior} → ${estado_uso}`;
        }

        await run(`
            INSERT INTO movimientos_inventario
            (id_inventario, tipo_movimiento, descripcion_movimiento, usuario_movimiento)
            VALUES (?, 'traslado', ?, ?)
        `, [id, descripcionMovimiento, req.user.id]);

        // Registrar en historial
        await registrarHistorial(
            'cambio_estado_uso',
            descripcionMovimiento,
            item.id,
            'mueble',
            req.user.id,
            req.user.usuario,
            estadoAnterior === 'en_almacen' ? 'Almacén' : secretariaAnterior,
            estado_uso === 'en_almacen' ? 'Almacén' : (secretaria || secretariaAnterior),
            { numero_inventario: item.numero_inventario, estado_anterior: estadoAnterior, estado_nuevo: estado_uso }
        );

        res.json({
            success: true,
            message: estado_uso === 'en_almacen'
                ? 'Artículo movido a Almacén exitosamente'
                : 'Artículo asignado a secretaría exitosamente',
            data: {
                id: item.id,
                numero_inventario: item.numero_inventario,
                estado_uso_anterior: estadoAnterior,
                estado_uso_nuevo: estado_uso,
                secretaria_anterior: secretariaAnterior,
                secretaria_nueva: estado_uso === 'en_uso' && secretaria ? secretaria : secretariaAnterior
            }
        });

    } catch (error) {
        console.error('Error al mover artículo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al mover el artículo'
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

// Endpoint para obtener historial del sistema
app.get('/api/historial', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { tipo, fecha_desde, fecha_hasta, limite = 100 } = req.query;

        let query = `
            SELECT h.*, u.usuario as usuario_nombre
            FROM historial_sistema h
            LEFT JOIN usuarios u ON h.usuario_responsable_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (tipo) {
            query += ` AND h.tipo_accion = ?`;
            params.push(tipo);
        }

        if (fecha_desde) {
            query += ` AND h.fecha_accion >= ?`;
            params.push(fecha_desde + ' 00:00:00');
        }

        if (fecha_hasta) {
            query += ` AND h.fecha_accion <= ?`;
            params.push(fecha_hasta + ' 23:59:59');
        }

        query += ` ORDER BY h.fecha_accion DESC LIMIT ?`;
        params.push(parseInt(limite));

        const rows = await all(query, params);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el historial'
        });
    }
});

// Rutas de gestión de usuarios (solo admin)
app.get('/api/usuarios', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const users = await all(`
            SELECT id, usuario, nombre_completo, email, rol, activo, secretaria,
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

        // Registrar en historial
        await registrarHistorial(
            'creacion_usuario',
            `Nuevo usuario creado: ${usuario} (${nombre_completo}) - Rol: ${rol}`,
            result.lastID,
            'usuario',
            req.user.id,
            req.user.usuario,
            null,
            secretaria,
            { rol, email, secretaria }
        );

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

// Endpoint para editar usuario completo (cambiar contraseña, rol, secretaría, etc.)
app.put('/api/usuarios/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_completo, email, rol, secretaria, contraseña, activo } = req.body;

        // Verificar que el usuario existe
        const user = await get('SELECT id, rol FROM usuarios WHERE id = ?', [id]);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // No permitir cambiar el rol del propio admin si se queda sin admins
        if (parseInt(id) === req.user.id && rol && rol !== 'admin') {
            const adminCount = await get('SELECT COUNT(*) as count FROM usuarios WHERE rol = "admin" AND activo = 1');
            if (adminCount.count <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'No puede cambiar su rol. Debe haber al menos un administrador activo.'
                });
            }
        }

        // Construir la consulta de actualización dinámicamente
        const updates = [];
        const params = [];

        if (nombre_completo !== undefined) {
            updates.push('nombre_completo = ?');
            params.push(nombre_completo);
        }

        if (email !== undefined) {
            updates.push('email = ?');
            params.push(email);
        }

        if (rol !== undefined) {
            updates.push('rol = ?');
            params.push(rol);
        }

        if (secretaria !== undefined) {
            updates.push('secretaria = ?');
            params.push(secretaria);
        }

        if (activo !== undefined) {
            updates.push('activo = ?');
            params.push(activo ? 1 : 0);
        }

        // Si se proporciona nueva contraseña, hashearla
        if (contraseña && contraseña.trim() !== '') {
            const hashedPassword = await bcrypt.hash(contraseña, 10);
            updates.push('contraseña = ?');
            params.push(hashedPassword);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No se proporcionaron campos para actualizar'
            });
        }

        params.push(id);

        await run(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`, params);

        // Registrar en historial
        await registrarHistorial(
            'modificacion_usuario',
            `Usuario #${id} actualizado por admin`,
            parseInt(id),
            'usuario',
            req.user.id,
            req.user.usuario,
            null,
            null,
            { campos_actualizados: updates.map(u => u.split(' ')[0]) }
        );

        res.json({
            success: true,
            message: 'Usuario actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el usuario'
        });
    }
});

// Endpoint para eliminar usuario (solo admin)
app.delete('/api/usuarios/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que no se elimine a sí mismo
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'No puede eliminar su propia cuenta'
            });
        }

        // Verificar que el usuario existe
        const user = await get('SELECT id, usuario, nombre_completo FROM usuarios WHERE id = ?', [id]);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Verificar que hay al menos un admin activo
        const adminCount = await get('SELECT COUNT(*) as count FROM usuarios WHERE rol = "admin" AND activo = 1');
        if (adminCount.count <= 1) {
            const userToDelete = await get('SELECT rol FROM usuarios WHERE id = ?', [id]);
            if (userToDelete.rol === 'admin') {
                return res.status(400).json({
                    success: false,
                    message: 'No puede eliminar al único administrador activo'
                });
            }
        }

        // Eliminar usuario
        await run('DELETE FROM usuarios WHERE id = ?', [id]);

        // Registrar en historial
        await registrarHistorial(
            'eliminacion_usuario',
            `Usuario eliminado: ${user.usuario} - ${user.nombre_completo}`,
            parseInt(id),
            'usuario',
            req.user.id,
            req.user.usuario,
            null,
            null,
            { usuario_eliminado: user.usuario, nombre_completo: user.nombre_completo }
        );

        res.json({
            success: true,
            message: 'Usuario eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el usuario'
        });
    }
});

// Rutas de archivos estáticos - DEBEN ir al final para no interferir con API
// Servir archivos estáticos desde la carpeta frontend
// Frontend (React + Vite):
// - ProducciÃ³n: ../frontend/dist (Vite build)
// - Fallback: ../frontend-legacy (HTML original, por si no estÃ¡ compilado aÃºn)
const FRONTEND_DIST = path.join(__dirname, '../frontend/dist');
const FRONTEND_LEGACY = path.join(__dirname, '../frontend-legacy');
const distIndex = path.join(FRONTEND_DIST, 'index.html');
const hasDist = fs.existsSync(distIndex);
const hasLegacy = fs.existsSync(path.join(FRONTEND_LEGACY, 'login.html'));
const staticRoot = hasDist ? FRONTEND_DIST : hasLegacy ? FRONTEND_LEGACY : path.join(__dirname, '../frontend');

app.use(express.static(staticRoot));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    if (hasDist) {
        return res.sendFile(distIndex);
    }
    if (hasLegacy) {
        return res.sendFile(path.join(FRONTEND_LEGACY, 'login.html'));
    }
    return res
        .status(200)
        .send('Frontend no compilado. Ejecuta: cd frontend && npm install && npm run dev (o npm run build).');
});

app.get('/login.html', (req, res) => {
    if (hasLegacy) {
        return res.sendFile(path.join(FRONTEND_LEGACY, 'login.html'));
    }
    if (hasDist) {
        return res.sendFile(distIndex);
    }
    return res.redirect('/');
});

app.get('/dashboard', (req, res) => {
    if (hasLegacy) {
        return res.sendFile(path.join(FRONTEND_LEGACY, 'dashboard_secretarias.html'));
    }
    if (hasDist) {
        return res.sendFile(distIndex);
    }
    return res.redirect('/');
});

app.get('/dashboard_secretarias.html', authenticateHTML, (req, res) => {
    if (hasLegacy) {
        return res.sendFile(path.join(FRONTEND_LEGACY, 'dashboard_secretarias.html'));
    }
    if (hasDist) {
        return res.sendFile(distIndex);
    }
    return res.redirect('/');
});

// Ruta para usuarios estándar (solo registro)
app.get('/registro.html', authenticateHTML, (req, res) => {
    if (hasLegacy) {
        return res.sendFile(path.join(FRONTEND_LEGACY, 'registro.html'));
    }
    if (hasDist) {
        return res.sendFile(distIndex);
    }
    return res.redirect('/');
});

// Manejo de errores
// SPA fallback (solo cuando hay build de Vite)
if (hasDist) {
    app.get('*', (req, res) => {
        res.sendFile(distIndex);
    });
}

app.use(errorHandler);

// Iniciar servidor
async function startServer() {
    await initializeDatabase();
    
    const server = app.listen(PORT, () => {
        console.log(`? Servidor iniciado en http://localhost:${PORT}`);
        console.log(`? Archivos estáticos en: ${staticRoot}`);
        console.log(`? Imágenes en: ${path.join(__dirname, 'uploads')}`);
        console.log(`? Base de datos: ${dbPath}`);
    });

    // Configuración de keep-alive para mayor estabilidad
    server.keepAliveTimeout = 300000; // 5 minutos (300 segundos)
    server.headersTimeout = 301000; // 301 segundos (un poco más que keepAliveTimeout)
    
    // Manejo de conexiones para evitar pérdida
    server.on('connection', (socket) => {
        socket.setTimeout(300000); // 5 minutos timeout por conexión (300 segundos)
        socket.on('timeout', () => {
            // Timeout silencioso - cerrar socket sin mostrar mensaje
            socket.destroy();
        });
    });

    console.log('? Keep-alive configurado para mayor estabilidad');
}

startServer().catch(console.error);

module.exports = app;
