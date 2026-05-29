// routes/bitacoraRoutes.js
const express = require('express');
const router = express.Router();
const bitacoraController = require('../controllers/bitacoraController');

// Importamos tu middleware de autenticación para proteger estos datos sensibles
const verificarToken = require('../middlewares/authMiddleware'); 

// Ruta para obtener los logs (GET /api/bitacora)
// Solo permitimos el acceso si el token es válido
router.get('/', verificarToken, bitacoraController.getLogs);

module.exports = router;