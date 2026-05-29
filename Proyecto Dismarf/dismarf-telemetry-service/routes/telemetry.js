const express = require('express');
const router = express.Router();
const telemetryController = require('../controllers/telemetryController');

// POST para recibir datos del ESP32
router.post('/ingest', telemetryController.ingestarDatos);

// GET para el dashboard (requiere la MAC de la cava)
router.get('/history/:mac', telemetryController.obtenerHistorial);

module.exports = router;