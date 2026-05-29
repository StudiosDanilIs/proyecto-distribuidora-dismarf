const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const conectarDB = require('./config/db');
const telemetryRoutes = require('./routes/telemetry');

// Cargar variables de entorno y conectar a Mongo
dotenv.config();
conectarDB();

const app = express();
app.use(cors());
app.use(express.json());

// Rutas del microservicio
app.use('/api/telemetry', telemetryRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor de Telemetría IoT corriendo en puerto ${PORT}`);
});