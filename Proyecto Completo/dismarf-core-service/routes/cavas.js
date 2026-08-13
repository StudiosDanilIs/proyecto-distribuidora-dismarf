const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const cavasController = require('../controllers/cavasController');

router.get('/', cavasController.obtenerCavas);

router.post('/', verificarToken, cavasController.crearCava);
router.put('/:id', verificarToken, cavasController.actualizarCava);
router.delete('/:id', verificarToken, cavasController.eliminarCava);

module.exports = router;