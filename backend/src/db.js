const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../inventory.db');

let db;

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

async function registrarHistorial(tipoAccion, descripcion, entidadId, entidadTipo, usuarioId, usuarioNombre, secretariaOrigen, secretariaDestino, detalles) {
    try {
        console.log('📝 Registrando en historial:', { tipoAccion, descripcion, entidadId, usuarioNombre, secretariaOrigen, secretariaDestino });
        
        const result = await run(`
            INSERT INTO historial_sistema
            (tipo_accion, descripcion, entidad_id, entidad_tipo, usuario_responsable_id, usuario_responsable_nombre, secretaria_origen, secretaria_destino, detalles_adicionales)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [tipoAccion, descripcion, entidadId || null, entidadTipo || null, usuarioId, usuarioNombre || null, secretariaOrigen || null, secretariaDestino || null, detalles ? JSON.stringify(detalles) : null]);
        
        console.log('✅ Historial registrado correctamente, ID:', result.lastID);
        return result;
    } catch (error) {
        console.error('❌ Error al registrar en historial:', error.message);
        throw error;
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

                try {
                    await run(`ALTER TABLE inventario ADD COLUMN nombre_articulo TEXT NOT NULL DEFAULT 'Sin nombre'`);
                } catch (err) {
                    if (!err.message.includes('duplicate column') && !err.message.includes('already exists')) console.error(err);
                }

                try {
                    await run(`ALTER TABLE inventario ADD COLUMN categoria TEXT`);
                } catch (err) {
                    if (!err.message.includes('duplicate column') && !err.message.includes('already exists')) console.error(err);
                }

                try {
                    await run(`ALTER TABLE inventario ADD COLUMN subcategoria TEXT`);
                } catch (err) {
                    if (!err.message.includes('duplicate column') && !err.message.includes('already exists')) console.error(err);
                }

                try {
                    await run(`ALTER TABLE inventario ADD COLUMN estado_uso TEXT DEFAULT 'en_uso' CHECK(estado_uso IN ('en_uso', 'en_almacen'))`);
                } catch (err) {
                    if (!err.message.includes('duplicate column') && !err.message.includes('already exists')) console.error(err);
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

                await run(`
                    CREATE TABLE IF NOT EXISTS ordenes_traslado (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        folio TEXT UNIQUE NOT NULL,
                        anio INTEGER NOT NULL,
                        consecutivo INTEGER NOT NULL,
                        id_inventario INTEGER NOT NULL,
                        nombre_articulo TEXT NOT NULL,
                        numero_inventario TEXT NOT NULL,
                        secretaria_origen TEXT NOT NULL,
                        secretaria_destino TEXT NOT NULL,
                        motivo TEXT,
                        usuario_id INTEGER NOT NULL,
                        usuario_nombre TEXT NOT NULL,
                        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (id_inventario) REFERENCES inventario(id),
                        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
                    )
                `);

                await run(`
                    CREATE TABLE IF NOT EXISTS historial_sistema (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        tipo_accion TEXT NOT NULL CHECK(tipo_accion IN ('creacion_usuario', 'registro_mueble', 'traslado_mueble', 'modificacion_mueble', 'eliminacion_mueble', 'login', 'logout', 'activacion_usuario', 'desactivacion_usuario', 'cambio_estado_uso', 'modificacion_usuario', 'eliminacion_usuario')),
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

                try {
                    await run(`ALTER TABLE usuarios ADD COLUMN secretaria TEXT`);
                } catch (error) {
                    if (!error.message.includes('duplicate column name')) throw error;
                }

                try {
                    const tableInfo = await new Promise((resolve, reject) => {
                        db.all(`PRAGMA table_info(historial_sistema)`, (err, rows) => {
                            if (err) reject(err);
                            else resolve(rows);
                        });
                    });

                    if (tableInfo && tableInfo.length > 0) {
                        try {
                            await run(`INSERT INTO historial_sistema (tipo_accion, descripcion, usuario_responsable_id) VALUES ('cambio_estado_uso', 'Test migración', 1)`);
                            await run(`DELETE FROM historial_sistema WHERE descripcion = 'Test migración'`);
                        } catch (testError) {
                            if (testError.message.includes('CHECK constraint failed')) {
                                console.log('🔄 Migrando tabla historial_sistema para incluir nuevos tipos de acción...');
                                await run(`
                                    CREATE TABLE historial_sistema_new (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        tipo_accion TEXT NOT NULL CHECK(tipo_accion IN ('creacion_usuario', 'registro_mueble', 'traslado_mueble', 'modificacion_mueble', 'eliminacion_mueble', 'login', 'logout', 'activacion_usuario', 'desactivacion_usuario', 'cambio_estado_uso', 'modificacion_usuario', 'eliminacion_usuario')),
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
                                await run(`INSERT INTO historial_sistema_new SELECT * FROM historial_sistema`);
                                await run(`DROP TABLE historial_sistema`);
                                await run(`ALTER TABLE historial_sistema_new RENAME TO historial_sistema`);
                                await run(`CREATE INDEX IF NOT EXISTS idx_historial_usuario ON historial_sistema(usuario_responsable_id)`);
                                await run(`CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_sistema(fecha_accion)`);
                                await run(`CREATE INDEX IF NOT EXISTS idx_historial_tipo ON historial_sistema(tipo_accion)`);
                            } else {
                                throw testError;
                            }
                        }
                    }
                } catch (migrateError) {
                    console.error('⚠️ Error en migración de historial_sistema:', migrateError.message);
                }

                await run('CREATE INDEX IF NOT EXISTS idx_inventario_numero ON inventario(numero_inventario)');
                await run('CREATE INDEX IF NOT EXISTS idx_inventario_secretaria ON inventario(secretaria)');
                await run('CREATE INDEX IF NOT EXISTS idx_inventario_fecha ON inventario(fecha_alta)');
                await run('CREATE INDEX IF NOT EXISTS idx_inventario_resguardante ON inventario(resguardante)');

                const bcrypt = require('bcryptjs');
                const adminPass = bcrypt.hashSync('admin123', 10);
                const userPass = bcrypt.hashSync('usuario123', 10);
                
                await run(`
                    INSERT OR IGNORE INTO usuarios (usuario, contraseña, nombre_completo, email, rol)
                    VALUES (?, ?, ?, ?, ?)
                `, ['admin', adminPass, 'Administrador del Sistema', 'admin@inventory.com', 'admin']);
                
                await run(`
                    INSERT OR IGNORE INTO usuarios (usuario, contraseña, nombre_completo, email, rol)
                    VALUES (?, ?, ?, ?, ?)
                `, ['usuario', userPass, 'Usuario de Prueba', 'usuario@inventory.com', 'usuario']);
                
                resolve();
            } catch (error) {
                console.error('❌ Error al inicializar tablas:', error.message);
                reject(error);
            }
        });
    });
}

async function generarOrdenTraslado({ id_inventario, nombre_articulo, numero_inventario, secretaria_origen, secretaria_destino, motivo, usuario_id, usuario_nombre }) {
    const anio = new Date().getFullYear();
    const lastRow = await get(`SELECT MAX(consecutivo) as last FROM ordenes_traslado WHERE anio = ?`, [anio]);
    const consecutivo = (lastRow?.last || 0) + 1;
    const folio = `OT-${anio}-${String(consecutivo).padStart(4, '0')}`;
    
    await run(`
        INSERT INTO ordenes_traslado
        (folio, anio, consecutivo, id_inventario, nombre_articulo, numero_inventario, secretaria_origen, secretaria_destino, motivo, usuario_id, usuario_nombre)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [folio, anio, consecutivo, id_inventario, nombre_articulo, numero_inventario, secretaria_origen, secretaria_destino, motivo || null, usuario_id, usuario_nombre]);
    
    return folio;
}

module.exports = {
    run,
    get,
    all,
    initializeDatabase,
    registrarHistorial,
    generarOrdenTraslado
};
