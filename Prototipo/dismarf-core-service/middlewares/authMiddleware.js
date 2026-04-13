const jwt = require('jsonwebtoken');

/**
 * Middleware para verificar la validez del Token JWT.
 * Se debe inyectar en las rutas que requieran autenticación.
 */
const verificarToken = (req, res, next) => {
    // Obtenemos el token del header 'Authorization'
    const token = req.header('Authorization');

    // Si no hay token, denegamos el acceso
    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
    }

    try {
        // El formato estándar es "Bearer <token>", así que lo separamos
        const tokenLimpio = token.split(' ')[1];
        
        // Verificamos el token usando nuestra clave secreta
        const decodificado = jwt.verify(tokenLimpio, process.env.JWT_SECRET);
        
        // Inyectamos los datos del usuario en la request para usarlos en los controladores
        req.usuario = decodificado;
        
        // Continuamos con la ejecución de la ruta
        next();
    } catch (error) {
        res.status(400).json({ error: 'Token inválido o expirado.' });
    }
};

module.exports = { verificarToken };