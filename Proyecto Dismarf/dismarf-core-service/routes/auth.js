const express = require('express'); //
const router = express.Router(); //
const authController = require('../controllers/authController'); //

// Rutas públicas (no requieren token)
router.post('/register', authController.registrarUsuario); //
router.post('/login', authController.loginUsuario); //

// Nuevas rutas para el flujo de recuperación por pregunta de seguridad
router.post('/get-security-question', authController.getSecurityQuestion);
router.post('/reset-password-security', authController.resetPasswordSecurity);

module.exports = router; //