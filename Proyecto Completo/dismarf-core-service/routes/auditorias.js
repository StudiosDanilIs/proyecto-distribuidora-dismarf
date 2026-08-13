const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const auditoriaController = require('../controllers/auditoriaController');

router.post('/', verificarToken, auditoriaController.crearAuditoria);

module.exports = router;