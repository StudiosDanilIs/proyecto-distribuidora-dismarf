const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
    }

    try {
        const tokenLimpio = token.split(' ')[1];
        
        const decodificado = jwt.verify(tokenLimpio, process.env.JWT_SECRET);
        
        req.usuario = decodificado;
        
        next();
    } catch (error) {
        res.status(400).json({ error: 'Token inválido o expirado.' });
    }
};

module.exports = verificarToken;