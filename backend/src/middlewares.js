const jwt = require('jsonwebtoken');
const multer = require('multer');
const rateLimit = require('express-rate-limit');

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

const authenticateHTML = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    const publicRoutes = ['/login.html', '/registro.html', '/'];
    const isPublicRoute = publicRoutes.includes(req.path);
    
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2'];
    const isStaticFile = staticExtensions.some(ext => req.path.endsWith(ext));
    
    if (!token && !isPublicRoute && !isStaticFile) {
        return res.redirect('/login.html');
    }

    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res.redirect('/login.html');
            }
            req.user = user;
            next();
        });
    } else {
        next();
    }
};

const authorizeAdmin = (req, res, next) => {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado. Se requieren privilegios de administrador'
        });
    }
    next();
};

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

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login requests per windowMs
    message: { success: false, message: 'Demasiados intentos de inicio de sesión, intenta de nuevo en 15 minutos.' }
});

module.exports = {
    authenticateToken,
    authenticateHTML,
    authorizeAdmin,
    errorHandler,
    loginLimiter
};
