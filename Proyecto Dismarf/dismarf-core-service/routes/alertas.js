const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const alertasController = require('../controllers/alertasController');

router.get('/', verificarToken, alertasController.obtenerAlertasActivas);
router.get('/historial', alertasController.obtenerHistorialAlertas);
router.put('/:id/resolver', verificarToken, alertasController.resolverAlerta);
router.post('/automatica', alertasController.recibirAlertaAutomatica);

module.exports = router;