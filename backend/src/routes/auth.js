const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run, registrarHistorial } = require('../db');
const { loginLimiter, authenticateToken } = require('../middlewares');

router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { usuario, contraseña, tipo_usuario } = req.body;

        if (!usuario || !contraseña || !tipo_usuario) {
            return res.status(400).json({
                success: false,
                message: 'Usuario, contraseña y tipo de usuario son requeridos'
            });
        }

        const user = await get('SELECT * FROM usuarios WHERE usuario = ? AND activo = 1', [usuario]);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario o contraseña incorrectos'
            });
        }

        if (user.rol !== tipo_usuario) {
            const tipoEsperado = user.rol === 'admin' ? 'Administrador' : 'Usuario Estándar';
            return res.status(403).json({
                success: false,
                message: `Este usuario debe iniciar sesión como ${tipoEsperado}`
            });
        }

        const isValidPassword = await bcrypt.compare(contraseña, user.contraseña);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Usuario o contraseña incorrectos'
            });
        }

        await run('UPDATE usuarios SET ultimo_acceso = datetime("now") WHERE id = ?', [user.id]);

        // Registrar login
        try {
            await registrarHistorial(
                'login',
                `Inicio de sesión exitoso`,
                user.id,
                'usuario',
                user.id,
                user.usuario,
                null,
                null,
                { rol: user.rol }
            );
        } catch (e) { console.error('Error logeando login:', e.message); }

        const token = jwt.sign(
            { id: user.id, usuario: user.usuario, rol: user.rol },
            process.env.JWT_SECRET || 'secret_dev_key',
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

router.get('/verify-token', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Token válido',
        user: req.user
    });
});

router.post('/logout', authenticateToken, async (req, res) => {
    try {
        await registrarHistorial(
            'logout',
            `Cierre de sesión`,
            req.user.id,
            'usuario',
            req.user.id,
            req.user.usuario,
            null,
            null,
            {}
        );
        res.json({ success: true, message: 'Logout registrado' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al procesar logout' });
    }
});

module.exports = router;
