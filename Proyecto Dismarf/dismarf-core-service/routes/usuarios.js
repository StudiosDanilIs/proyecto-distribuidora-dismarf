const express = require('express');
const router = express.Router();

// Importamos los middlewares de seguridad
const verificarToken = require('../middlewares/authMiddleware');
const checkRole = require('../middlewares/roleAuth');
const userController = require('../controllers/userController');

// 1. OBTENER LISTA DE PERSONAL
// Permitimos acceso a Administradores (1) y Supervisores (2)
router.get('/', verificarToken, checkRole([1, 2]), userController.obtenerUsuarios);

// 2. SUSPENDER / ACTIVAR ACCESO
// Solo un Administrador (1) puede suspender cuentas
router.put('/:id/estado', verificarToken, checkRole([1]), userController.cambiarEstadoUsuario);

// 3. CAMBIAR ROL JERÁRQUICO
// Solo un Administrador (1) puede ascender o degradar personal
router.put('/:id/rol', verificarToken, checkRole([1]), userController.cambiarRolUsuario);

// 4. ELIMINAR CUENTA PERMANENTEMENTE
// Solo un Administrador (1) puede destruir registros de usuario
router.delete('/:id', verificarToken, checkRole([1]), userController.eliminarUsuario);

module.exports = router;