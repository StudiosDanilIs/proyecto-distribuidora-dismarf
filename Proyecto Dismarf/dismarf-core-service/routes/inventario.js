// routes/inventarioRoutes.js
const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const verificarToken = require('../middlewares/authMiddleware'); // Importamos el middleware

// Inyectamos verificarToken para que req.usuario esté disponible en el controlador y en el logger
router.post('/movimientos', verificarToken, inventarioController.registrarMovimiento);
router.get('/cava/:id', verificarToken, inventarioController.obtenerHistorialCava);

module.exports = router;