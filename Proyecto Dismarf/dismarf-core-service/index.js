// index.js
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const cavaRoutes = require('./routes/cavas');
const rutasUsuarios = require('./routes/usuarios');
const rutasAlertas = require('./routes/alertas');
const rutasAuditorias = require('./routes/auditorias');
const inventarioRoutes = require('./routes/inventario');
const perfilRoutes = require('./routes/perfil');
const bitacoraRoutes = require('./routes/bitacora');
const reporteRoutes = require('./routes/reportes');

const app = express();
app.use(cors());
app.use(express.json());

// Radar de peticiones
app.use((req, res, next) => {
    console.log("Petición recibida en el Core:", req.method, req.url);
    next();
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/cavas', cavaRoutes);
app.use('/api/usuarios', rutasUsuarios);
app.use('/api/alertas', rutasAlertas);
app.use('/api/auditorias', rutasAuditorias);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/bitacora', bitacoraRoutes);
app.use('/api/reportes', reporteRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Core de Dismarf corriendo en puerto ${PORT}`);
});