const pool = require('../db');

// Obtener alertas no resueltas (con el nombre y tipo de producto de la cava)
const obtenerAlertasActivas = async (req, res) => {
    try {
        // ✅ CORRECCIÓN: Agregamos c.tipo_producto a la selección SQL
        const query = `
            SELECT a.id, a.tipo, a.mensaje, a.valor_registrado, a.fecha, 
                   c.nombre AS cava_nombre, c.tipo_producto 
            FROM alertas a
            JOIN cavas c ON a.cava_id = c.id
            WHERE a.resuelta = FALSE
            ORDER BY a.fecha DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Error obteniendo alertas activas:", error);
        res.status(500).json({ msg: "Error al obtener las alertas" });
    }
};

// Marcar una alerta como resuelta
const resolverAlerta = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE alertas SET resuelta = TRUE WHERE id = $1', [id]);
        res.json({ msg: 'Alerta marcada como resuelta exitosamente' });
    } catch (error) {
        console.error("Error resolviendo alerta:", error);
        res.status(500).json({ msg: "Error al resolver la alerta" });
    }
};

// Obtener el historial de alertas resueltas
const obtenerHistorialAlertas = async (req, res) => {
    try {
        // ✅ CORRECCIÓN: Agregamos c.tipo_producto a la selección del historial
        const query = `
            SELECT a.id, a.tipo, a.mensaje, a.valor_registrado, a.fecha, 
                   c.nombre AS cava_nombre, c.tipo_producto 
            FROM alertas a
            JOIN cavas c ON a.cava_id = c.id
            WHERE a.resuelta = TRUE
            ORDER BY a.fecha DESC LIMIT 50
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error("Error obteniendo historial de alertas:", err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    obtenerAlertasActivas,
    resolverAlerta,
    obtenerHistorialAlertas
};