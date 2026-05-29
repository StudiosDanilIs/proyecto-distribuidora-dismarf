// controllers/userController.js
const pool = require('../db'); 

// 1: Obtener la lista completa del personal incluyendo su ícono de perfil
const obtenerUsuarios = async (req, res) => {
    try {
        // Añadimos 'icono_perfil' a la consulta maestra para embellecer la lista en la app
        const result = await pool.query(
            'SELECT id, nombre, email, rol_id, activo, icono_perfil FROM usuarios ORDER BY id ASC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Error en obtenerUsuarios:", error);
        res.status(500).json({ msg: "Error obteniendo la nómina de usuarios" });
    }
};

// 2: Cambiar el estado operativo (Suspender/Activar)
const cambiarEstadoUsuario = async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body; 
    try {
        await pool.query('UPDATE usuarios SET activo = $1 WHERE id = $2', [activo, id]);
        res.json({ msg: 'Estado operativo actualizado correctamente' });
    } catch (error) {
        console.error("Error en cambiarEstadoUsuario:", error);
        res.status(500).json({ msg: "Error actualizando el estado del usuario" });
    }
};

// 3: Cambiar el Rol Jerárquico del Usuario
const cambiarRolUsuario = async (req, res) => {
    const { id } = req.params;
    const nuevoRol = req.body.rol_id || req.body.id_rol; 
    try {
        await pool.query('UPDATE usuarios SET rol_id = $1 WHERE id = $2', [nuevoRol, id]);
        res.json({ msg: 'Rol jerárquico actualizado exitosamente' });
    } catch (error) {
        console.error("Error en cambiarRolUsuario:", error);
        res.status(500).json({ msg: "Error actualizando el rol del personal" });
    }
};

// 4: Eliminar Cuenta de Usuario
const eliminarUsuario = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
        res.json({ msg: 'Registro de usuario eliminado del sistema' });
    } catch (error) {
        console.error("Error en eliminarUsuario:", error);
        res.status(500).json({ msg: "Error al intentar eliminar la cuenta" });
    }
};

module.exports = {
    obtenerUsuarios,
    cambiarEstadoUsuario,
    cambiarRolUsuario,
    eliminarUsuario
};