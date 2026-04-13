// Este archivo es el punto de entrada del servicio core de Dismarf. Configura el servidor Express, habilita CORS y define las rutas para manejar las solicitudes relacionadas con las cavas.
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth')
const cavaRoutes = require('./routes/cavas');

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/cavas', cavaRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Core de Dismarf corriendo en puerto ${PORT}`);
});