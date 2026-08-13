const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const reporteController = require('../controllers/reporteController');

const verificarTokenDescarga = (req, res, next) => {
    let token = req.query.token; 
    
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ error: "Acceso denegado: No se puede descargar sin una sesión activa." });
    }

    try {
        const secretKey = process.env.JWT_SECRET || 'secretkey';
        const verificado = jwt.verify(token, secretKey); 
        req.usuario = verificado;
        next();
    } catch (error) {
        console.error("Auditoría - Rechazo al generar PDF:", error.message);
        return res.status(403).json({ error: "Sesión de descarga inválida o expirada." });
    }
};

router.get('/inventario', verificarTokenDescarga, reporteController.reporteInventario);
router.get('/bitacora', verificarTokenDescarga, reporteController.reporteBitacora);
router.get('/cavas', verificarTokenDescarga, reporteController.reporteCavas);

module.exports = router;