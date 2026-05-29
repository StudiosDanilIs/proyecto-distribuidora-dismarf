// controllers/inventarioController.js
const db = require('../db'); // Conexión a tu base de datos
const { registrarBitacora } = require('../utils/logger');

// 1. Guardar movimiento y actualizar capacidad con TRANSACCION SEGURA CORREGIDA
exports.registrarMovimiento = async (req, res) => {
    const { cava_id, producto, tipo_movimiento, cantidad, unidad, capacidad_nueva, fecha } = req.body;

    try {
        // Iniciamos el bloque transaccional nativamente
        await db.query('BEGIN');

        // PASO 1: Insertar en la tabla maestra de movimientos de inventario
        await db.query(
            `INSERT INTO movimientos_inventario 
            (cava_id, producto, tipo_movimiento, cantidad, unidad, fecha) 
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [cava_id, producto, tipo_movimiento, cantidad, unidad, fecha || new Date()]
        );

        // PASO 2: Actualizar la ocupación física de la cava
        if (capacidad_nueva !== undefined) {
            await db.query(
                'UPDATE cavas SET capacidad_ocupada = $1 WHERE id = $2',
                [capacidad_nueva, cava_id]
            );
        }

        // Confirmamos los cambios de forma atómica
        await db.query('COMMIT');

        // Auditoría operativa en la bitácora
        await registrarBitacora(
            req, 
            'MOVIMIENTO', 
            'INVENTARIO', 
            `Registró movimiento (${tipo_movimiento}) de ${cantidad} ${unidad} del producto: ${producto} en la cava ID: ${cava_id}`
        );

        res.status(200).json({ msg: 'Movimiento registrado de forma atómica y segura' });
    } catch (error) {
        // Si ocurre cualquier fallo, revertimos absolutamente todo
        await db.query('ROLLBACK');
        console.error("Error al registrar inventario en PostgreSQL:", error);
        res.status(500).json({ error: 'Error interno del servidor al sincronizar lote' });
    }
};

// 2. Obtener el historial optimizado de una cava específica
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