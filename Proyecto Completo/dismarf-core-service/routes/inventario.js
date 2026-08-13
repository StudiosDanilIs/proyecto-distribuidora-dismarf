const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const verificarToken = require('../middlewares/authMiddleware');

router.post('/movimientos', verificarToken, inventarioController.registrarMovimiento);
router.get('/cava/:id', verificarToken, inventarioController.obtenerHistorialCava);

module.exports = router;