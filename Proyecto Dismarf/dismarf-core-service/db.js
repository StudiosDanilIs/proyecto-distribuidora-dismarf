// Este archivo se encarga de configurar la conexión a la base de datos PostgreSQL utilizando el paquete 'pg'.
// Se utiliza el paquete 'dotenv' para cargar las variables de entorno desde el archivo .env, lo que permite mantener la información sensible como las credenciales de la base de datos fuera del código fuente.
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};