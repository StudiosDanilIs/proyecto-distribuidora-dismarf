// simuladorESP32.js

// ⚠️ CAMBIA ESTO por la URL real de tu backend donde guardas el historial IoT
const API_URL = "http://localhost:3001/api/telemetry/ingest"; 
const MAC_ESP32 = "EEEEEEAAAA"; // Coloca aquí la MAC de una cava que ya tengas registrada

function generarDatosSensores() {
    // Simulamos una cava que debería estar entre -15°C y -20°C
    const tempRandom = (Math.random() * (-15 - (-20)) + (-20)).toFixed(2);
    // Humedad típica entre 40% y 60%
    const humRandom = (Math.random() * (60 - 40) + 40).toFixed(2);
    // Hay un 10% de probabilidad de que simulemos que la puerta está abierta
    const puertaAbierta = Math.random() > 0.9;

    return {
        mac_esp32: MAC_ESP32,
        temperatura: parseFloat(tempRandom),
        humedad: parseFloat(humRandom),
        puerta_abierta: puertaAbierta,
        timestamp: new Date().toISOString()
    };
}

console.log("🚀 Iniciando Simulador ESP32 de Dismarf...");
console.log(`📡 Enviando telemetría cada 6 segundos a: ${API_URL}`);

// Ejecutar cada 6000 milisegundos (6 segundos)
setInterval(async () => {
    const payload = generarDatosSensores();
    
    try {
        // Usamos fetch (nativo en Node.js 18+) para hacer el POST al backend
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log(`[✅ ÉXITO] Temp: ${payload.temperatura}°C | Hum: ${payload.humedad}% | Puerta: ${payload.puerta_abierta ? 'ABIERTA' : 'CERRADA'}`);
        } else {
            console.log(`[⚠️ RECHAZADO] El servidor respondió con código: ${response.status}`);
        }
    } catch (error) {
        console.error("[❌ ERROR DE CONEXIÓN] ¿Está encendido tu servidor Node.js?", error.message);
    }
}, 6000);