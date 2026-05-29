const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const alertasController = require('../controllers/alertasController');

// FÍJATE AQUÍ: Debe ser solo '/', NO '/alertas'
router.get('/', verificarToken, alertasController.obtenerAlertasActivas);
router.get('/historial', alertasController.obtenerHistorialAlertas);

// Para resolver la alerta:
router.put('/:id/resolver', verificarToken, alertasController.resolverAlerta);

module.exports = router;