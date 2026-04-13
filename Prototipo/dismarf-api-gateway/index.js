const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
app.use(cors());

// --- TABLA DE ENRUTAMIENTO DEL API GATEWAY ---

// 1. Gateway -> PostgreSQL (Core / Cavas / Auth)
app.use('/api/core', createProxyMiddleware({ 
    target: 'http://localhost:3000', 
    changeOrigin: true,
    pathRewrite: (path, req) => {
        // Como Express recorta '/api/core', la variable 'path' llega como '/auth/login'.
        // Le agregamos '/api' al principio para que el puerto 3000 lo entienda.
        return '/api' + path;
    }
}));

// 2. Gateway -> MongoDB (Telemetría IoT)
app.use('/api/iot', createProxyMiddleware({ 
    target: 'http://localhost:3001', 
    changeOrigin: true,
    pathRewrite: (path, req) => {
        // Mismo caso: la variable 'path' llega como '/ingest'.
        // Le agregamos '/api/telemetry' al principio.
        return '/api/telemetry' + path;
    }
}));

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`API Gateway de Dismarf operando en el puerto ${PORT}`);
    console.log(`-> /api/core enruta a PostgreSQL (Auth/Cavas)`);
    console.log(`-> /api/iot enruta a MongoDB (Telemetría ESP32)`);
});