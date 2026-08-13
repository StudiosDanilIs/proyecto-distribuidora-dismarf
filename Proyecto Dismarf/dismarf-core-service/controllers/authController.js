const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.registrarUsuario = async (req, res) => {
    console.log("---> [REGISTER] Payload recibido en backend:", req.body);

    const { nombre, email, password, rol_id, pregunta_seguridad, respuesta_seguridad } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        console.log("---> [REGISTER] Intentando guardar en PostgreSQL...");
        
        const result = await db.query(
            'INSERT INTO usuarios (nombre, email, password_hash, rol_id, pregunta_seguridad, respuesta_seguridad) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nombre, email',
            [nombre, email, passwordHash, rol_id, pregunta_seguridad, respuesta_seguridad]
        );

        console.log("---> [REGISTER] ¡Éxito! Usuario guardado:", result.rows[0]);
        res.status(201).json({ mensaje: 'Usuario registrado con éxito', usuario: result.rows[0] });
    } catch (error) {
        console.error("---> [REGISTER ERROR DB]:", error.message);
        res.status(500).json({ error: 'Error al registrar usuario. Verifica la terminal del backend.' }); 
    }
};

exports.loginUsuario = async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const usuario = result.rows[0];

        if (usuario.activo === false) {
            return res.status(403).json({ 
                error: 'ACCESO DENEGADO: Tu cuenta ha sido suspendida. Contacta a un Administrador.' 
            });
        }

        const passwordValida = await bcrypt.compare(password, usuario.password_hash);
        if (!passwordValida) {
            return res.status(401).json({ error: 'Contraseña incorrecta.' });
        }

        const token = jwt.sign(
            { 
                id: usuario.id, 
                nombre: usuario.nombre,
                rol_id: usuario.rol_id, 
                email: usuario.email,
                icono_perfil: usuario.icono_perfil
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ 
            mensaje: 'Login exitoso', 
            token: token, 
            rol_id: usuario.rol_id,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol_id: usuario.rol_id,
                icono_perfil: usuario.icono_perfil
            }
        });
    } catch (error) {
        console.error("---> [LOGIN ERROR]:", error.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

exports.getSecurityQuestion = async (req, res) => {
    console.log("---> [RECOVERY] Buscando pregunta para email:", req.body.email);
    const { email } = req.body;

    try {
        const result = await db.query('SELECT pregunta_seguridad FROM usuarios WHERE email = $1 AND activo = TRUE', [email]);
        
        if (result.rows.length === 0) {
            console.log("---> [RECOVERY] Email no encontrado en DB.");
            return res.status(404).json({ error: 'No se encontró un usuario activo con ese correo.' });
        }

        console.log("---> [RECOVERY] Pregunta encontrada:", result.rows[0].pregunta_seguridad);
        res.json({ pregunta_seguridad: result.rows[0].pregunta_seguridad });
    } catch (error) {
        console.error("---> [RECOVERY ERROR DB]:", error.message);
        res.status(500).json({ error: 'Error al obtener la pregunta de seguridad.' });
    }
};

exports.resetPasswordSecurity = async (req, res) => {
    console.log("---> [RESET] Intentando resetear clave para:", req.body.email);
    const { email, respuesta_seguridad, nueva_password } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(nueva_password, salt);

        const result = await db.query(
            'UPDATE usuarios SET password_hash = $1 WHERE email = $2 AND respuesta_seguridad = $3 RETURNING id',
            [passwordHash, email, respuesta_seguridad]
        );

        if (result.rowCount === 0) {
            console.log("---> [RESET] Falló: Respuesta incorrecta o email no existe.");
            return res.status(401).json({ error: 'La respuesta de seguridad es incorrecta o el usuario no existe.' });
        }

        console.log("---> [RESET] ¡Clave actualizada con éxito!");
        res.json({ mensaje: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error("---> [RESET ERROR DB]:", error.message);
        res.status(500).json({ error: 'Error al restablecer la contraseña.' });
    }
};