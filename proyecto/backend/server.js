const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json()); // Para que entienda los datos JSON que mandará el ESP32

// Configuración de conexión a tu base de datos PostgreSQL en Docker
const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'inventario_dismarf',
  password: 'superpassword123',
  port: 5433, // El puerto que configuramos en Docker
});

// Ruta de prueba para saber si el servidor está vivo
app.get('/api/estado', (req, res) => {
    res.json({ mensaje: "Microservicio de Dismarf funcionando al 100%" });
});

// LA RUTA ESTRELLA: Aquí el ESP32 enviará la temperatura
app.post('/api/telemetria', (req, res) => {
    const { id_cava, temperatura, humedad } = req.body;

    console.log(`📡 Recibido de Cava ${id_cava}: Temp: ${temperatura}°C | Humedad: ${humedad}%`);

    // Lógica rápida de alerta de calidad alimentaria
    if(temperatura > 8.0) {
        console.log(`⚠️ ALERTA: Temperatura crítica en la Cava ${id_cava}. Riesgo para el inventario.`);
    }

    res.status(200).json({ mensaje: "Datos de telemetría recibidos correctamente" });
});

// Encender el servidor en el puerto 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});