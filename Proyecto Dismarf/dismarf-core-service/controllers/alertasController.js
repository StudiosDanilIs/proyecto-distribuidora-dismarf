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


const recibirAlertaAutomatica = async (req, res) => {
    const { cava_id, tipo, mensaje, valor_registrado } = req.body;
    try {
        // Validación inteligente: Revisamos si la cava YA TIENE una alerta activa.
        // Esto evita que el sistema se llene de 100 alertas iguales por minuto.
        const activa = await pool.query(
            'SELECT id FROM alertas WHERE cava_id = $1 AND resuelta = FALSE',
            [cava_id]
        );
        
        // Si no hay alerta activa, la creamos
        if (activa.rows.length === 0) {
            await pool.query(
                'INSERT INTO alertas (cava_id, tipo, mensaje, valor_registrado, resuelta) VALUES ($1, $2, $3, $4, FALSE)',
                [cava_id, tipo, mensaje, valor_registrado]
            );
            console.log("🚨 NUEVA ALERTA CREADA EN BASE DE DATOS");
        }
        res.status(201).json({ msg: "Procesado" });
    } catch (error) {
        console.error("Error guardando alerta automática:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    obtenerAlertasActivas,
    resolverAlerta,
    obtenerHistorialAlertas,
    recibirAlertaAutomatica
};