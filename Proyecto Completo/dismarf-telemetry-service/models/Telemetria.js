const mongoose = require('mongoose');

const TelemetriaSchema = mongoose.Schema({
    mac_esp32: {
        type: String,
        required: true,
        index: true
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
        default: false
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

module.exports = mongoose.model('Telemetria', TelemetriaSchema);