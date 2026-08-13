const express = require('express');
const router = express.Router();
const perfilController = require('../controllers/perfilController');
const authMiddleware = require('../middlewares/authMiddleware'); 

router.put('/update', authMiddleware, perfilController.actualizarPerfil);

module.exports = router;