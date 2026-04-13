// dismarf-core-service/routes/cavas.js
const express = require('express');
const router = express.Router();
const cavasController = require('../controllers/cavasController');
const { verificarToken } = require('../middlewares/authMiddleware');

// TODAS estas rutas están protegidas por verificarToken
router.post('/', verificarToken, cavasController.crearCava);
router.get('/', verificarToken, cavasController.obtenerCavas);
router.put('/:id', verificarToken, cavasController.actualizarCava);
router.delete('/:id', verificarToken, cavasController.eliminarCava);

module.exports = router;