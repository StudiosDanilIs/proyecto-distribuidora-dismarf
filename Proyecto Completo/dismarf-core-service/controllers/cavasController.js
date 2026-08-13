const db = require('../db');
const { registrarBitacora } = require('../utils/logger');

exports.crearCava = async (req, res) => {
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
    const { nombre, ubicacion, mac_esp32, temp_min, temp_max, estado, tipo_producto, capacidad_ocupada, ultimo_mantenimiento } = req.body;

    try {
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

exports.recibirTelemetria = async (req, res) => {
    const { cava_id, temperatura, humedad } = req.body;
    
    try {
        console.log(`[IoT ESP32] Telemetría entrante - Cava #${cava_id} | Temp: ${temperatura}°C | Hum: ${humedad}%`);

        const result = await db.query(
            `UPDATE cavas SET 
            temp_actual = $1, 
            humedad_actual = $2, 
            ultima_lectura = CURRENT_TIMESTAMP 
            WHERE id = $3 RETURNING nombre, temp_min, temp_max`,
            [temperatura, humedad, cava_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'La Cava con ese ID no existe en el sistema' });
        }

        const cava = result.rows[0];
        
        if (temperatura > cava.temp_max || temperatura < cava.temp_min) {
            console.log(`ALERTA: La cava '${cava.nombre}' está fuera de los rangos seguros (${cava.temp_min}° a ${cava.temp_max}°C)`);
        }

        res.status(200).json({ msg: `Telemetría guardada para la cava: ${cava.nombre}` });
    } catch (err) {
        console.error("Error guardando telemetría del ESP32:", err.message);
        res.status(500).json({ error: err.message });
    }
};