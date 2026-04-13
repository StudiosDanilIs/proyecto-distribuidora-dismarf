const mongoose = require('mongoose');

const TelemetriaSchema = mongoose.Schema({
    mac_esp32: {
        type: String,
        required: true,
        index: true // Indexamos por MAC para que las búsquedas gráficas sean ultrarrápidas
    },
    temperatura: {
        type: Number,
        required: true
    },
    humedad: {
        type: Number,
        required: true
    },
    puerta_abierta: {
        type: Boolean,
        default: false // Viene del sensor magnético (Reed Switch)
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true // Indexamos por fecha para consultas de series temporales
    }
});

module.exports = mongoose.model('Telemetria', TelemetriaSchema);