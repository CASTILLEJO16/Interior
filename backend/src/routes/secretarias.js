const express = require('express');
const router = express.Router();
const { all } = require('../db');
const { authenticateToken } = require('../middlewares');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const secretarias = await all('SELECT DISTINCT secretaria FROM inventario WHERE secretaria IS NOT NULL AND secretaria != "" ORDER BY secretaria');
        res.json({
            success: true,
            data: secretarias.map(s => s.secretaria)
        });
    } catch (error) {
        console.error('Error al obtener secretarías:', error);
        res.status(500).json({ success: false, message: 'Error al obtener secretarías' });
    }
});

module.exports = router;
