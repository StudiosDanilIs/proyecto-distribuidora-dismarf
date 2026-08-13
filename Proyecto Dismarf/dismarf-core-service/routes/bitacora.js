const express = require('express');
const router = express.Router();
const bitacoraController = require('../controllers/bitacoraController');

const verificarToken = require('../middlewares/authMiddleware'); 

router.get('/', verificarToken, bitacoraController.getLogs);

module.exports = router;