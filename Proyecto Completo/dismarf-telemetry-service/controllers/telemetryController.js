const Telemetria = require('../models/Telemetria');
const axios = require('axios');

const IP_CORE_SERVICE = '10.113.15.156'; 

exports.ingestarDatos = async (req, res) => {
    try {
        const { mac_esp32, temperatura, humedad } = req.body;
        const nuevaLectura = new Telemetria(req.body);
        await nuevaLectura.save();

        try {
            const cavasRes = await axios.get(`http://${IP_CORE_SERVICE}:3000/api/cavas`);
            const cavas = cavasRes.data;
            const cava = cavas.find(c => c.mac_esp32 === mac_esp32);

            if (cava) {
                let tipoAlerta = null;
                let mensaje = null;
                
                const tempActual = parseFloat(temperatura);
                const tempMax = parseFloat(cava.temp_max);
                const tempMin = parseFloat(cava.temp_min);

                if (tempActual > tempMax) {
                    tipoAlerta = 'TEMPERATURA_ALTA';
                    mensaje = `ALERTA TÉRMICA: La temperatura actual (${tempActual}°C) superó el máximo de ${tempMax}°C.`;
                } else if (tempActual < tempMin) {
                    tipoAlerta = 'TEMPERATURA_BAJA';
                    mensaje = `ALERTA TÉRMICA: La temperatura actual (${tempActual}°C) cayó por debajo de ${tempMin}°C.`;
                }

                if (tipoAlerta) {
                    await axios.post(`http://${IP_CORE_SERVICE}:3000/api/alertas/automatica`, {
                        cava_id: cava.id,
                        tipo: tipoAlerta,
                        mensaje: mensaje,
                        valor_registrado: tempActual
                    });
                    console.log(`⚠️ [ALERTA] Disparada para la cava: ${cava.nombre} (${tempActual}°C)`);
                }
            } else {
                console.log(`[AVISO] No se encontró la cava con MAC: ${mac_esp32} en PostgreSQL.`);
            }
        } catch (ruleError) {
            console.error("Error en el Motor de Reglas:", ruleError.message);
            if(ruleError.response) console.error("Detalle:", ruleError.response.data);
        }

        res.status(201).json({ status: 'ok', msg: 'Telemetría guardada y evaluada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', msg: 'Falla al procesar telemetría' });
    }
};

exports.obtenerHistorial = async (req, res) => {
    const { mac } = req.params;
    try {
        const historial = await Telemetria.find({ mac_esp32: mac }).sort({ timestamp: -1 }).limit(50);
        res.json(historial);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo historial' });
    }
};