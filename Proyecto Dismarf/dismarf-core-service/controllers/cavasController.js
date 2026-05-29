// Este archivo define los controladores para manejar las operaciones relacionadas con las cavas en la aplicación. 
// Utiliza la conexión a la base de datos configurada en el archivo db.js para ejecutar las consultas SQL necesarias.
const db = require('../db');
const { registrarBitacora } = require('../utils/logger');

exports.crearCava = async (req, res) => {
    // Aquí es donde abrimos la "caja" (req.body) que mandó el celular
    const { nombre, ubicacion, mac_esp32, temp_min, temp_max, estado, tipo_producto, capacidad_ocupada, ultimo_mantenimiento } = req.body;
    
    try {
        const result = await db.query(
            `INSERT INTO cavas 
            (nombre, ubicacion, mac_esp32, temp_min, temp_max, estado, tipo_producto, capacidad_ocupada, ultimo_mantenimiento) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [nombre, ubicacion, mac_esp32, temp_min, temp_max, estado, tipo_producto, capacidad_ocupada, ultimo_mantenimiento]
        );
        await registrarBitacora(req, 'CREAR', 'CAVAS', `Registró la nueva cava: ${nombre}`);
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
    // CORRECCIÓN: Extraemos todos los datos, incluyendo mac_esp32 para sincronizar con el formulario visual
    const { nombre, ubicacion, mac_esp32, temp_min, temp_max, estado, tipo_producto, capacidad_ocupada, ultimo_mantenimiento } = req.body;

    try {
        // CORRECCIÓN: Eliminamos "ultima_actualizacion = CURRENT_TIMESTAMP" y agregamos "mac_esp32 = $3"
        const result = await db.query(
            `UPDATE cavas SET 
            nombre = $1, 
            ubicacion = $2, 
            mac_esp32 = $3,
            temp_min = $4, 
            temp_max = $5, 
            estado = $6, 
            tipo_producto = $7, 
            capacidad_ocupada = $8, 
            ultimo_mantenimiento = $9
            WHERE id = $10 RETURNING *`,
            [nombre, ubicacion, mac_esp32, temp_min, temp_max, estado, tipo_producto, capacidad_ocupada, ultimo_mantenimiento, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Cava no encontrada' });
        await registrarBitacora(req, 'ACTUALIZAR', 'CAVAS', `Actualizó los parámetros de la cava: ${nombre}`);
        res.json({ mensaje: 'Cava actualizada correctamente', cava: result.rows[0] });
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
        await registrarBitacora(req, 'ELIMINAR', 'CAVAS', `Eliminó la cava con ID: ${id}`);
        
        res.json({ mensaje: 'Cava eliminada del sistema' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};