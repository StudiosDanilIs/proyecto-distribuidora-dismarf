const pool = require('../db');

const crearAuditoria = async (req, res) => {
    const { cava_id, estado_limpieza, observaciones, fecha_inspeccion } = req.body;
    const usuario_id = req.usuario.id; // Viene del token JWT

    try {
        await pool.query(
            'INSERT INTO auditorias (usuario_id, cava_id, estado_limpieza, observaciones, fecha_inspeccion) VALUES ($1, $2, $3, $4, $5)',
            [usuario_id, cava_id, estado_limpieza, observaciones, fecha_inspeccion]
        );
        res.status(201).json({ msg: 'Auditoría sincronizada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al guardar auditoría' });
    }
};

module.exports = { crearAuditoria };