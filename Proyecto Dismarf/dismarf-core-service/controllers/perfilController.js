// controllers/perfilController.js
const pool = require('../db');
const bcrypt = require('bcryptjs');

exports.actualizarPerfil = async (req, res) => {
    const { nombre, passwordActual, nuevaPassword, pregunta_seguridad, respuesta_seguridad, icono_perfil } = req.body;
    
    const usuarioLogueado = req.usuario || req.user;
    if (!usuarioLogueado) {
        return res.status(401).json({ msg: "Error: No se detectaron los datos de sesión." });
    }

    const userId = usuarioLogueado.id || usuarioLogueado.id_usuario;

    try {
        if (nombre) {
            await pool.query('UPDATE usuarios SET nombre = $1 WHERE id = $2', [nombre, userId]);
        }

        // Guardamos el ícono de perfil predeterminado
        if (icono_perfil !== undefined) {
            await pool.query('UPDATE usuarios SET icono_perfil = $1 WHERE id = $2', [icono_perfil, userId]);
        }

        if (pregunta_seguridad && respuesta_seguridad) {
            await pool.query(
                'UPDATE usuarios SET pregunta_seguridad = $1, respuesta_seguridad = $2 WHERE id = $3',
                [pregunta_seguridad, respuesta_seguridad, userId]
            );
        }

        if (passwordActual && nuevaPassword) {
            const user = await pool.query('SELECT password_hash FROM usuarios WHERE id = $1', [userId]);
            if (user.rows.length === 0) return res.status(404).json({ msg: "Usuario no encontrado." });

            const esValida = await bcrypt.compare(passwordActual, user.rows[0].password_hash);
            if (!esValida) return res.status(400).json({ msg: "La contraseña actual es incorrecta." });

            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(nuevaPassword, salt);
            
            await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [hash, userId]);
        }

        res.json({ msg: "Perfil actualizado con éxito" });
    } catch (err) {
        console.error("Error actualizando perfil:", err);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};