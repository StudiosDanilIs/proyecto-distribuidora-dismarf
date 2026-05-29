const pool = require('../db');

const registrarBitacora = async (req, accion, modulo, detalle) => {
    try {
        // Extraemos los datos del usuario que vienen del middleware de autenticación
        const id_usuario = req.usuario?.id || req.user?.id;
        let nombre_usuario = req.usuario?.nombre || req.user?.nombre;

        // RESPALDO ROBUSTO: Si tenemos el ID pero el token antiguo no incluía el nombre, lo consultamos en la DB
        if (id_usuario && !nombre_usuario) {
            const resUser = await pool.query('SELECT nombre FROM usuarios WHERE id = $1', [id_usuario]);
            if (resUser.rows.length > 0) {
                nombre_usuario = resUser.rows[0].nombre;
            }
        }

        // Si definitivamente no hay usuario (ej. procesos automáticos o rutas públicas), asignamos 'Sistema'
        nombre_usuario = nombre_usuario || 'Sistema';

        await pool.query(
            `INSERT INTO bitacora (id_usuario, nombre_usuario, accion, modulo, detalle) 
             VALUES ($1, $2, $3, $4, $5)`,
            [id_usuario, nombre_usuario, accion, modulo, detalle]
        );
    } catch (error) {
        console.error("⚠️ Error al escribir en bitácora:", error);
    }
};

module.exports = { registrarBitacora };