const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { get, all, run, registrarHistorial } = require('../db');
const { authenticateToken, authorizeAdmin } = require('../middlewares');

router.get('/', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const users = await all('SELECT id, usuario, nombre_completo, email, rol, secretaria, fecha_creacion, ultimo_acceso, activo FROM usuarios ORDER BY id DESC');
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
    }
});

router.post('/', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { usuario, contraseña, nombre_completo, email, rol, secretaria } = req.body;
        if (!usuario || !contraseña || !nombre_completo || !email) {
            return res.status(400).json({ success: false, message: 'Todos los campos básicos son requeridos' });
        }

        const existing = await get('SELECT * FROM usuarios WHERE usuario = ? OR email = ?', [usuario, email]);
        if (existing) {
            return res.status(400).json({ success: false, message: 'El usuario o el correo ya están en uso' });
        }

        const hashedPassword = await bcrypt.hash(contraseña, 10);
        const userRol = rol || 'usuario';

        const result = await run(`
            INSERT INTO usuarios (usuario, contraseña, nombre_completo, email, rol, secretaria) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [usuario, hashedPassword, nombre_completo, email, userRol, secretaria || null]);

        await registrarHistorial('creacion_usuario', `Usuario nuevo creado: ${usuario}`, result.lastID, 'usuario', req.user.id, req.user.usuario, null, null, { email, rol: userRol });

        res.status(201).json({ success: true, message: 'Usuario creado exitosamente' });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ success: false, message: 'Error al crear el usuario' });
    }
});

router.get('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const user = await get('SELECT id, usuario, nombre_completo, email, rol, secretaria, activo FROM usuarios WHERE id = ?', [req.params.id]);
        if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener datos' });
    }
});

router.put('/:id/estado', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { activo } = req.body;

        const userTarget = await get('SELECT id, usuario FROM usuarios WHERE id = ?', [id]);
        if (!userTarget) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

        await run('UPDATE usuarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
        
        // Log priority #4: Registrar_activacion_desactivacion_usuario
        const accion = activo ? 'activacion_usuario' : 'desactivacion_usuario';
        const msg = activo ? `Usuario ${userTarget.usuario} activado` : `Usuario ${userTarget.usuario} desactivado`;
        
        await registrarHistorial(accion, msg, id, 'usuario', req.user.id, req.user.usuario, null, null, { activo });

        res.json({ success: true, message: msg });
    } catch (error) {
        console.error('Error al cambiar estado:', error);
        res.status(500).json({ success: false, message: 'Error al cambiar estado' });
    }
});

router.put('/:id/password', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { nueva_contrasena } = req.body;
        if (!nueva_contrasena || nueva_contrasena.length < 6) return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' });

        const hashedPassword = await bcrypt.hash(nueva_contrasena, 10);
        await run('UPDATE usuarios SET contraseña = ? WHERE id = ?', [hashedPassword, id]);
        
        const userTarget = await get('SELECT id, usuario FROM usuarios WHERE id = ?', [id]);
        await registrarHistorial('modificacion_usuario', `Cambio de contraseña para: ${userTarget?.usuario || id}`, id, 'usuario', req.user.id, req.user.usuario, null, null, null);

        res.json({ success: true, message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar contraseña' });
    }
});

router.delete('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (parseInt(id) === req.user.id) return res.status(400).json({ success: false, message: 'No puedes eliminarte a ti mismo' });
        
        const checkRef = await get('SELECT id FROM inventario WHERE usuario_registro = ? LIMIT 1', [id]);
        if (checkRef) {
            return res.status(400).json({ success: false, message: 'No se puede eliminar, el usuario tiene inventarios registrados. Usa desactivar.' });
        }

        const userTarget = await get('SELECT id, usuario FROM usuarios WHERE id = ?', [id]);
        if (!userTarget) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

        await run('DELETE FROM usuarios WHERE id = ?', [id]);
        await registrarHistorial('eliminacion_usuario', `Usuario eliminado: ${userTarget.usuario}`, null, 'usuario', req.user.id, req.user.usuario, null, null, null);

        res.json({ success: true, message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
    }
});

module.exports = router;
