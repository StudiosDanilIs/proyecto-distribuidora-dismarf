const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.registrarUsuario);
router.post('/login', authController.loginUsuario);

router.post('/get-security-question', authController.getSecurityQuestion);
router.post('/reset-password-security', authController.resetPasswordSecurity);

module.exports = router;