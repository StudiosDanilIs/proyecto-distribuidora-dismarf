const checkRole = (rolesPermitidos) => {
    return (req, res, next) => {
        try {
            // Asumimos que verifyToken ya extrajo los datos en req.usuario
            // CONVERSIÓN ROBUSTA: Garantiza que siempre sea un número entero
            const userRole = parseInt(req.usuario.rol_id, 10);

            // Validamos correctamente la inclusión
            if (rolesPermitidos.includes(userRole)) {
                next();
            } else {
                return res.status(403).json({ 
                    msg: "Acceso Denegado: No tienes el nivel de autorización necesario." 
                });
            }
        } catch (error) {
            return res.status(500).json({ msg: "Error validando los permisos del usuario" });
        }
    };
};

module.exports = checkRole;