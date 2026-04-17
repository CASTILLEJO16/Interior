const express = require('express');
const router = express.Router();
const { get, all } = require('../db');
const { authenticateToken, authorizeAdmin } = require('../middlewares');

router.get('/estadisticas', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const generales = await get(`
            SELECT 
                COUNT(*) as total_articulos,
                SUM(CASE WHEN estatus = 'activo' THEN 1 ELSE 0 END) as articulos_activos,
                SUM(costo) as valor_total_inventario,
                AVG(costo) as costo_promedio
            FROM inventario
        `);

        const porSecretaria = await all(`
            SELECT 
                secretaria,
                COUNT(*) as total_articulos,
                SUM(costo) as valor_total,
                AVG(costo) as costo_promedio
            FROM inventario
            GROUP BY secretaria
            ORDER BY valor_total DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                generales: {
                    total_articulos: generales.total_articulos || 0,
                    articulos_activos: generales.articulos_activos || 0,
                    valor_total_inventario: generales.valor_total_inventario || 0,
                    costo_promedio: generales.costo_promedio || 0
                },
                porSecretaria: porSecretaria || []
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
});

router.get('/historial', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { page = 1, limite = 100, tipo, fecha_desde, fecha_hasta } = req.query;
        const offset = (page - 1) * limite;
        
        let whereClauses = [];
        let params = [];

        if (tipo) {
            whereClauses.push('h.tipo_accion = ?');
            params.push(tipo);
        }
        
        if (fecha_desde) {
            whereClauses.push('h.fecha_accion >= ?');
            params.push(`${fecha_desde} 00:00:00`);
        }
        
        if (fecha_hasta) {
            whereClauses.push('h.fecha_accion <= ?');
            params.push(`${fecha_hasta} 23:59:59`);
        }

        const whereString = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

        const data = await all(`
            SELECT h.*, u.usuario as exp_usuario
            FROM historial_sistema h
            LEFT JOIN usuarios u ON h.usuario_responsable_id = u.id
            ${whereString}
            ORDER BY h.fecha_accion DESC 
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limite), parseInt(offset)]);

        const totalRes = await get(`SELECT COUNT(*) as count FROM historial_sistema h ${whereString}`, params);
        
        res.json({
            success: true,
            data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limite),
                total: totalRes.count
            }
        });
    } catch (err) {
        console.error('Error historial:', err);
        res.status(500).json({ success: false, message: 'Error al obtener historial' });
    }
});

module.exports = router;
