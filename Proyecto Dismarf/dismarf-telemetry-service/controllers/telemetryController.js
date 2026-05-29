const Telemetria = require('../models/Telemetria');

/**
 * Endpoint para que el ESP32 envíe sus lecturas.
 * No usamos validación JWT aquí porque los microcontroladores usan mecanismos más ligeros.
 */
exports.ingestarDatos = async (req, res) => {
    try {
        // En un entorno real de producción, aquí se evaluaría un motor de reglas (ej. si la temp es muy alta, disparar alerta).
        const nuevaLectura = new Telemetria(req.body);
        await nuevaLectura.save();

        // Respondemos rápido al hardware
        res.status(201).json({ status: 'ok', msg: 'Telemetría guardada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', msg: 'Falla al procesar telemetría' });
    }
};

/**
 * Endpoint para que el frontend o la app móvil consulte el historial de una cava específica.
 */
exports.obtenerHistorial = async (req, res) => {
    const { mac } = req.params;
    try {
        // Buscamos las últimas 50 lecturas de esa cava, ordenadas de la más reciente a la más antigua
        const historial = await Telemetria.find({ mac_esp32: mac })
                                          .sort({ timestamp: -1 })
                                          .limit(50);
        res.json(historial);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo historial' });
    }
};