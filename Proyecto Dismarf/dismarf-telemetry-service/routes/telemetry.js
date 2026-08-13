const express = require('express');
const router = express.Router();
const telemetryController = require('../controllers/telemetryController');

router.post('/ingest', telemetryController.ingestarDatos);

router.get('/history/:mac', telemetryController.obtenerHistorial);

module.exports = router;