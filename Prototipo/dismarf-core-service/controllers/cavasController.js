// Este archivo define los controladores para manejar las operaciones relacionadas con las cavas en la aplicación. Incluye funciones para crear una nueva cava y obtener todas las cavas existentes. Utiliza la conexión a la base de datos configurada en el archivo db.js para ejecutar las consultas SQL necesarias.
const db = require('../db');

exports.crearCava = async (req, res) => {
    const { nombre, ubicacion, mac_esp32, temp_min, temp_max } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO cavas (nombre, ubicacion, mac_esp32, temp_min, temp_max) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [nombre, ubicacion, mac_esp32, temp_min, temp_max]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.obtenerCavas = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM cavas ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.actualizarCava = async (req, res) => {
    const { id } = req.params;
    const { nombre, ubicacion, temp_min, temp_max, estado } = req.body;

    try {
        const result = await db.query(
            'UPDATE cavas SET nombre = $1, ubicacion = $2, temp_min = $3, temp_max = $4, estado = $5, ultima_actualizacion = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
            [nombre, ubicacion, temp_min, temp_max, estado, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Cava no encontrada' });
        res.json({ mensaje: 'Cava actualizada', cava: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Elimina o desactiva una cava del sistema.
 */
exports.eliminarCava = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM cavas WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Cava no encontrada' });
        
        res.json({ mensaje: 'Cava eliminada del sistema' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};