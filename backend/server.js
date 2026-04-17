const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { initializeDatabase } = require('./src/db');
const { authenticateHTML, errorHandler } = require('./src/middlewares');

const authRoutes = require('./src/routes/auth');
const inventarioRoutes = require('./src/routes/inventario');
const usuariosRoutes = require('./src/routes/usuarios');
const estadisticasRoutes = require('./src/routes/estadisticas');
const secretariasRoutes = require('./src/routes/secretarias');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=300, max=100');
    next();
});

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

// API Routes maps
app.use('/api', authRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api', estadisticasRoutes);
app.use('/api/secretarias', secretariasRoutes);

// Static file routes
const FRONTEND_DIST = path.join(__dirname, '../frontend/dist');
const FRONTEND_LEGACY = path.join(__dirname, '../frontend-legacy');
const distIndex = path.join(FRONTEND_DIST, 'index.html');
const hasDist = fs.existsSync(distIndex);
const hasLegacy = fs.existsSync(path.join(FRONTEND_LEGACY, 'login.html'));
const staticRoot = hasDist ? FRONTEND_DIST : hasLegacy ? FRONTEND_LEGACY : path.join(__dirname, '../frontend');

app.use(express.static(staticRoot));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    if (hasDist) return res.sendFile(distIndex);
    if (hasLegacy) return res.sendFile(path.join(FRONTEND_LEGACY, 'login.html'));
    return res.status(200).send('Frontend no compilado. Ejecuta: cd frontend && npm install && npm run dev (o npm run build).');
});

const legacyRoutes = ['/login.html', '/dashboard', '/dashboard_secretarias.html', '/registro.html'];
legacyRoutes.forEach(route => {
    app.get(route, route !== '/login.html' && route !== '/dashboard' ? authenticateHTML : (req, res, next) => next(), (req, res) => {
        if (hasLegacy) {
            const fileName = route === '/dashboard' ? 'dashboard_secretarias.html' : route.substring(1);
            return res.sendFile(path.join(FRONTEND_LEGACY, fileName));
        }
        if (hasDist) return res.sendFile(distIndex);
        return res.redirect('/');
    });
});

if (hasDist) {
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
            res.sendFile(distIndex);
        } else {
            res.status(404).json({ success: false, message: 'Endpoint no encontrado' });
        }
    });
}

app.use(errorHandler);

async function startServer() {
    await initializeDatabase();
    
    const server = app.listen(PORT, () => {
        console.log(`🚀 Servidor iniciado en http://localhost:${PORT}`);
        console.log(`📁 Archivos estáticos en: ${staticRoot}`);
    });

    server.keepAliveTimeout = 300000;
    server.headersTimeout = 301000;
    
    server.on('connection', (socket) => {
        socket.setTimeout(300000);
        socket.on('timeout', () => socket.destroy());
    });
}

startServer().catch(console.error);

module.exports = app;
