const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { get, all, run, registrarHistorial, generarOrdenTraslado } = require('../db');
const { authenticateToken, authorizeAdmin } = require('../middlewares');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploads');
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
    limits: { fileSize: 5242880 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) return cb(null, true);
        cb(new Error('Solo se permiten archivos de imagen (jpeg, jpg, png, gif, webp)'));
    }
});

router.get('/', authenticateToken, authorizeAdmin, async (req, res) => {
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

        let countQuery = `SELECT COUNT(*) as total FROM inventario i WHERE 1=1`;
        let countParams = [];

        if (search) {
            countQuery += ` AND (i.numero_inventario LIKE ? OR i.nombre_articulo LIKE ? OR i.descripcion LIKE ? OR i.resguardante LIKE ?)`;
            const searchParam = `%${search}%`;
            countParams.push(searchParam, searchParam, searchParam, searchParam);
        }
        if (secretaria) { countQuery += ` AND i.secretaria = ?`; countParams.push(secretaria); }
        if (estado_uso) { countQuery += ` AND i.estado_uso = ?`; countParams.push(estado_uso); }

        const countResult = await get(countQuery, countParams);
        const total = countResult ? countResult.total : 0;

        res.json({
            success: true,
            data: items,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Error al obtener inventario:', error);
        res.status(500).json({ success: false, message: 'Error al obtener los datos del inventario' });
    }
});

router.post('/', authenticateToken, upload.single('imagen'), async (req, res) => {
    try {
        const { numero_inventario, nombre_articulo, categoria, subcategoria, fecha_alta, descripcion, costo, resguardante, secretaria: secretariaBody, estado_uso } = req.body;
        let secretaria;

        if (estado_uso === 'en_almacen') {
            secretaria = 'Almacén';
        } else if (req.user.rol === 'admin') {
            if (secretariaBody) {
                secretaria = secretariaBody;
            } else {
                const usuario = await get('SELECT secretaria FROM usuarios WHERE id = ?', [req.user.id]);
                secretaria = usuario?.secretaria || 'Sin Secretaría';
            }
        } else {
            const usuario = await get('SELECT secretaria FROM usuarios WHERE id = ?', [req.user.id]);
            if (!usuario || !usuario.secretaria) {
                return res.status(400).json({ success: false, message: 'El usuario no tiene secretaría asignada.' });
            }
            secretaria = usuario.secretaria;
        }

        const camposFaltantes = [];
        if (!numero_inventario || numero_inventario.trim() === '') camposFaltantes.push('Número de Inventario');
        if (!nombre_articulo || nombre_articulo.trim() === '') camposFaltantes.push('Nombre del Artículo');
        if (!fecha_alta) camposFaltantes.push('Fecha de Alta');
        if (!descripcion || descripcion.trim() === '') camposFaltantes.push('Descripción');
        if (!costo || isNaN(parseFloat(costo))) camposFaltantes.push('Costo');
        if (!resguardante || resguardante.trim() === '') camposFaltantes.push('Resguardante');

        if (camposFaltantes.length > 0) {
            return res.status(400).json({ success: false, message: `Campos requeridos: ${camposFaltantes.join(', ')}` });
        }

        const existing = await get('SELECT id FROM inventario WHERE numero_inventario = ?', [numero_inventario]);
        if (existing) {
            return res.status(400).json({ success: false, message: 'El número de inventario ya existe' });
        }

        const imagen = req.file ? `/uploads/${req.file.filename}` : null;

        const result = await run(`
            INSERT INTO inventario
            (numero_inventario, nombre_articulo, categoria, subcategoria, secretaria, fecha_alta, descripcion, costo, resguardante, imagen, usuario_registro, estado_uso)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [numero_inventario, nombre_articulo, categoria || null, subcategoria || null, secretaria, fecha_alta, descripcion, parseFloat(costo), resguardante, imagen, req.user.id, estado_uso || 'en_uso']);

        await run(`
            INSERT INTO movimientos_inventario (id_inventario, tipo_movimiento, descripcion_movimiento, usuario_movimiento)
            VALUES (?, 'alta', 'Registro de nuevo artículo en el sistema', ?)
        `, [result.lastID, req.user.id]);

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
            data: { id: result.lastID, numero_inventario, secretaria, fecha_alta, descripcion, costo: parseFloat(costo), resguardante, imagen }
        });
    } catch (error) {
        console.error('Error al agregar artículo:', error);
        res.status(500).json({ success: false, message: 'Error al agregar el artículo' });
    }
});

router.get('/:id/qr', authenticateToken, async (req, res) => {
    try {
        const item = await get(`
            SELECT i.*, u.nombre_completo as usuario_registro_nombre
            FROM inventario i LEFT JOIN usuarios u ON i.usuario_registro = u.id
            WHERE i.id = ?
        `, [req.params.id]);

        if (!item) return res.status(404).json({ success: false, message: 'Artículo no encontrado' });

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

        const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrData, null, 2), {
            width: 400, margin: 2, color: { dark: '#000000', light: '#FFFFFF' }
        });

        res.json({ success: true, data: { qr_image: qrDataUrl, item_info: qrData } });
    } catch (error) {
        console.error('Error al generar QR:', error);
        res.status(500).json({ success: false, message: 'Error al generar el código QR' });
    }
});

// Obtener todas las órdenes de traslado (Mover arriba de /:id para evitar conflicto)
router.get('/ordenes-traslado', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const ordenes = await all(`SELECT * FROM ordenes_traslado ORDER BY fecha DESC`);
        res.json({ success: true, data: ordenes });
    } catch (error) {
        console.error('Error al obtener órdenes:', error);
        res.status(500).json({ success: false, message: 'Error al obtener órdenes de traslado' });
    }
});

router.get('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const item = await get('SELECT * FROM inventario WHERE id = ?', [req.params.id]);
        if (!item) return res.status(404).json({ success: false, message: 'Artículo no encontrado' });
        res.json({ success: true, data: item });
    } catch (error) {
        console.error('Error al obtener artículo:', error);
        res.status(500).json({ success: false, message: 'Error al obtener el artículo' });
    }
});

router.put('/:id', authenticateToken, authorizeAdmin, upload.single('imagen'), async (req, res) => {
    try {
        const { id } = req.params;
        const { numero_inventario, nombre_articulo, categoria, subcategoria, secretaria, fecha_alta, descripcion, costo, resguardante, estatus, estado_uso } = req.body;
        const existing = await get('SELECT * FROM inventario WHERE id = ?', [id]);
        
        if (!existing) return res.status(404).json({ success: false, message: 'Artículo no encontrado' });
        
        const imagen = req.file ? `/uploads/${req.file.filename}` : existing.imagen;

        await run(`
            UPDATE inventario 
            SET numero_inventario = ?, nombre_articulo = ?, categoria = ?, subcategoria = ?, secretaria = ?, fecha_alta = ?, descripcion = ?, 
                costo = ?, resguardante = ?, imagen = ?, estatus = ?, estado_uso = ?, ultima_actualizacion = datetime('now')
            WHERE id = ?
        `, [numero_inventario, nombre_articulo, categoria || null, subcategoria || null, secretaria, fecha_alta, descripcion, parseFloat(costo), resguardante, imagen, estatus, estado_uso || existing.estado_uso, id]);

        await run(`
            INSERT INTO movimientos_inventario (id_inventario, tipo_movimiento, descripcion_movimiento, usuario_movimiento)
            VALUES (?, 'modificacion', 'Actualización de datos del artículo', ?)
        `, [id, req.user.id]);

        res.json({ success: true, message: 'Artículo actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar artículo:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar el artículo' });
    }
});

router.delete('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await get('SELECT * FROM inventario WHERE id = ?', [id]);
        if (!existing) return res.status(404).json({ success: false, message: 'Artículo no encontrado' });

        await run(`
            INSERT INTO movimientos_inventario (id_inventario, tipo_movimiento, descripcion_movimiento, usuario_movimiento)
            VALUES (?, 'baja', 'Eliminación del artículo del sistema', ?)
        `, [id, req.user.id]);

        if (existing.imagen) {
            const imagePath = path.join(__dirname, '../../', existing.imagen.replace('/uploads/', 'uploads/'));
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        }

        await run('DELETE FROM inventario WHERE id = ?', [id]);
        res.json({ success: true, message: 'Artículo eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar artículo:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar el artículo' });
    }
});

router.put('/:id/trasladar', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { secretaria_destino, motivo_traslado } = req.body;
        if (!secretaria_destino) return res.status(400).json({ success: false, message: 'Secretaría de destino requerida' });

        const item = await get('SELECT * FROM inventario WHERE id = ?', [id]);
        if (!item) return res.status(404).json({ success: false, message: 'Artículo no encontrado' });
        if (item.secretaria === secretaria_destino) return res.status(400).json({ success: false, message: 'Destino igual al origen' });

        const secretaria_origen = item.secretaria;
        await run(`UPDATE inventario SET secretaria = ?, ultima_actualizacion = datetime('now') WHERE id = ?`, [secretaria_destino, id]);

        const msg = `Traslado de ${secretaria_origen} a ${secretaria_destino}. ${motivo_traslado || 'Sin motivo'}`;
        await run(`INSERT INTO movimientos_inventario (id_inventario, tipo_movimiento, descripcion_movimiento, usuario_movimiento) VALUES (?, 'traslado', ?, ?)`, [id, msg, req.user.id]);

        const folio = await generarOrdenTraslado({
            id_inventario: item.id,
            nombre_articulo: item.nombre_articulo,
            numero_inventario: item.numero_inventario,
            secretaria_origen,
            secretaria_destino,
            motivo: motivo_traslado,
            usuario_id: req.user.id,
            usuario_nombre: req.user.usuario
        });

        await registrarHistorial('traslado_mueble', `Trasladado: ${item.numero_inventario} [${folio}]`, item.id, 'mueble', req.user.id, req.user.usuario, secretaria_origen, secretaria_destino, { numero_inventario: item.numero_inventario, motivo: motivo_traslado, folio });

        res.json({ success: true, message: `Trasladado exitosamente de ${secretaria_origen} a ${secretaria_destino}`, folio });
    } catch (error) {
        console.error('Error traslado:', error);
        res.status(500).json({ success: false, message: 'Error al trasladar' });
    }
});

router.put('/:id/mover', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { estado_uso, secretaria } = req.body;
        if (!estado_uso || !['en_uso', 'en_almacen'].includes(estado_uso)) return res.status(400).json({ success: false, message: 'Estado inválido' });

        const item = await get('SELECT * FROM inventario WHERE id = ?', [id]);
        if (!item) return res.status(404).json({ success: false, message: 'Artículo no encontrado' });

        if (estado_uso === 'en_uso' && !secretaria && !item.secretaria) {
            return res.status(400).json({ success: false, message: 'Debe especificar secretaría' });
        }

        const updates = ['estado_uso = ?', "ultima_actualizacion = datetime('now')"];
        const params = [estado_uso];
        if (estado_uso === 'en_almacen') {
            updates.push('secretaria = ?');
            params.push('Almacén');
        } else if (estado_uso === 'en_uso' && secretaria) {
            updates.push('secretaria = ?');
            params.push(secretaria);
        }
        params.push(id);
        await run(`UPDATE inventario SET ${updates.join(', ')} WHERE id = ?`, params);

        const msg = estado_uso === 'en_almacen' ? `Movido al Almacén` : `Asignado a ${secretaria}`;
        await run(`INSERT INTO movimientos_inventario (id_inventario, tipo_movimiento, descripcion_movimiento, usuario_movimiento) VALUES (?, 'traslado', ?, ?)`, [id, msg, req.user.id]);
        
        const secretaria_destino = estado_uso === 'en_almacen' ? 'Almacén' : (secretaria || item.secretaria);
        let folio = null;
        try {
            folio = await generarOrdenTraslado({
                id_inventario: item.id,
                nombre_articulo: item.nombre_articulo,
                numero_inventario: item.numero_inventario,
                secretaria_origen: item.secretaria,
                secretaria_destino,
                motivo: msg,
                usuario_id: req.user.id,
                usuario_nombre: req.user.usuario
            });
        } catch (e) { console.error('Error folio:', e.message); }

        try {
            await registrarHistorial('cambio_estado_uso', `${msg}${folio ? ` [${folio}]` : ''}`, item.id, 'mueble', req.user.id, req.user.usuario, item.secretaria, secretaria_destino, { estado_nuevo: estado_uso, folio });
        } catch (e) { console.error('History error:', e.message); }

        res.json({ success: true, message: 'Artículo movido exitosamente', folio });
    } catch (error) {
        console.error('Error al mover:', error);
        res.status(500).json({ success: false, message: 'Error al mover' });
    }
});

module.exports = router;
