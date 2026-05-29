// routes/reportes.js (Backend)
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const reporteController = require('../controllers/reporteController');

// Middleware para validar el token desde la URL o la cabecera
const verificarTokenDescarga = (req, res, next) => {
    let token = req.query.token; 
    
    // Soporte secundario por si se envía mediante cabeceras estándar
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ error: "Acceso denegado: No se puede descargar sin una sesión activa." });
    }

    try {
        // CORRECCIÓN CRÍTICA: Consumimos la variable de entorno real del sistema
        const secretKey = process.env.JWT_SECRET || 'secretkey';
        const verificado = jwt.verify(token, secretKey); 
        req.usuario = verificado;
        next();
    } catch (error) {
        // Imprimimos el error en la terminal del backend para facilitar futuras auditorías
        console.error("Auditoría - Rechazo al generar PDF:", error.message);
        return res.status(403).json({ error: "Sesión de descarga inválida o expirada." });
    }
};

// Definición de endpoints protegidos
router.get('/inventario', verificarTokenDescarga, reporteController.reporteInventario);
router.get('/bitacora', verificarTokenDescarga, reporteController.reporteBitacora);
router.get('/cavas', verificarTokenDescarga, reporteController.reporteCavas);

module.exports = router;