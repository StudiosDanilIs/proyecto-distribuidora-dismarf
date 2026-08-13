const db = require('../db');
const { registrarBitacora } = require('../utils/logger');

exports.registrarMovimiento = async (req, res) => {
    const { cava_id, producto, tipo_movimiento, cantidad, unidad, capacidad_nueva, fecha } = req.body;

    try {
        await db.query('BEGIN');

        await db.query(
            `INSERT INTO movimientos_inventario 
            (cava_id, producto, tipo_movimiento, cantidad, unidad, fecha) 
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [cava_id, producto, tipo_movimiento, cantidad, unidad, fecha || new Date()]
        );

        if (capacidad_nueva !== undefined) {
            await db.query(
                'UPDATE cavas SET capacidad_ocupada = $1 WHERE id = $2',
                [capacidad_nueva, cava_id]
            );
        }

        await db.query('COMMIT');

        await registrarBitacora(
            req, 
            'MOVIMIENTO', 
            'INVENTARIO', 
            `Registró movimiento (${tipo_movimiento}) de ${cantidad} ${unidad} del producto: ${producto} en la cava ID: ${cava_id}`
        );

        res.status(200).json({ msg: 'Movimiento registrado de forma atómica y segura' });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error("Error al registrar inventario en PostgreSQL:", error);
        res.status(500).json({ error: 'Error interno del servidor al sincronizar lote' });
    }
};

exports.obtenerHistorialCava = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            'SELECT * FROM movimientos_inventario WHERE cava_id = $1 ORDER BY fecha DESC',
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Error obteniendo historial de existencias:", error);
        res.status(500).json({ error: 'Error al consultar la base de datos' });
    }
};