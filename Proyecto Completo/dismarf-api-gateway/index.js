const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(cors());

console.log("Iniciando configuración de rutas del API Gateway...");

// 1. Gateway -> PostgreSQL (Core / Cavas / Auth)
app.use('/core', createProxyMiddleware({ 
    target: 'http://localhost:3000', 
    changeOrigin: true,
    pathRewrite: {
        '^/core': '/api',
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log(`[GATEWAY] Redirigiendo al CORE: ${req.method} ${req.url}`);
    }
}));

// 2. Gateway -> MongoDB (Telemetria IoT)
app.use('/iot', createProxyMiddleware({ 
    target: 'http://localhost:5000',
    changeOrigin: true,
    pathRewrite: {
        '^/iot': '/api/iot',
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log(`[GATEWAY] Redirigiendo a IoT: ${req.method} ${req.url}`);
    }
}));

// 3. BYPASS DIRECTO PARA EL ESP32
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`API Gateway de Dismarf corriendo impecable en el puerto ${PORT}`);
});