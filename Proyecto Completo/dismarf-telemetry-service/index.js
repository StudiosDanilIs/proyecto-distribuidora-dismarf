const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const conectarDB = require('./config/db');
const telemetryRoutes = require('./routes/telemetry');

dotenv.config();
conectarDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/telemetry', telemetryRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor de Telemetría IoT corriendo en puerto ${PORT}`);
});