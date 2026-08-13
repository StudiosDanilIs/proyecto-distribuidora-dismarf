const express = require('express');
const router = express.Router();

const verificarToken = require('../middlewares/authMiddleware');
const checkRole = require('../middlewares/roleAuth');
const userController = require('../controllers/userController');

router.get('/', verificarToken, checkRole([1, 2]), userController.obtenerUsuarios);
router.put('/:id/estado', verificarToken, checkRole([1]), userController.cambiarEstadoUsuario);
router.put('/:id/rol', verificarToken, checkRole([1]), userController.cambiarRolUsuario);
router.delete('/:id', verificarToken, checkRole([1]), userController.eliminarUsuario);

module.exports = router;