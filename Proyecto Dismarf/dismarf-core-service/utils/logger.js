const pool = require('../db');

const registrarBitacora = async (req, accion, modulo, detalle) => {
    try {
        const id_usuario = req.usuario?.id || req.user?.id;
        let nombre_usuario = req.usuario?.nombre || req.user?.nombre;

        if (id_usuario && !nombre_usuario) {
            const resUser = await pool.query('SELECT nombre FROM usuarios WHERE id = $1', [id_usuario]);
            if (resUser.rows.length > 0) {
                nombre_usuario = resUser.rows[0].nombre;
            }
        }

        nombre_usuario = nombre_usuario || 'Sistema';

        await pool.query(
            `INSERT INTO bitacora (id_usuario, nombre_usuario, accion, modulo, detalle) 
             VALUES ($1, $2, $3, $4, $5)`,
            [id_usuario, nombre_usuario, accion, modulo, detalle]
        );
    } catch (error) {
        console.error("Error al escribir en bitácora:", error);
    }
};

module.exports = { registrarBitacora };