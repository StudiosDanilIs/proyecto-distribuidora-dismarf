const pool = require('../db');

exports.getLogs = async (req, res) => {
    try {
        const result = await pool.query(
          'SELECT * FROM bitacora ORDER BY fecha DESC LIMIT 100'
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener bitácora" });
    }
};