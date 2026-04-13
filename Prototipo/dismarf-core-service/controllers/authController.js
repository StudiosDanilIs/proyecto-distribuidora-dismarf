const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Registra un nuevo empleado en el sistema.
 * Solo debería ser accesible por un administrador.
 */
exports.registrarUsuario = async (req, res) => {
    const { nombre, email, password, rol_id } = req.body;

    try {
        // 1. Encriptar la contraseña (10 rondas de salting es el estándar seguro)
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 2. Guardar en PostgreSQL
        const result = await db.query(
            'INSERT INTO usuarios (nombre, email, password_hash, rol_id) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email',
            [nombre, email, passwordHash, rol_id]
        );

        res.status(201).json({ mensaje: 'Usuario registrado con éxito', usuario: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar usuario. Es posible que el email ya exista.' });
    }
};

/**
 * Autentica un usuario y devuelve un Token JWT para usar en la app móvil o frontend.
 */
exports.loginUsuario = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Buscar al usuario por su email
        const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const usuario = result.rows[0];

        // 2. Comparar la contraseña enviada con el hash guardado en la DB
        const passwordValida = await bcrypt.compare(password, usuario.password_hash);
        if (!passwordValida) {
            return res.status(401).json({ error: 'Contraseña incorrecta.' });
        }

        // 3. Generar el Token JWT firmado (válido por 8 horas)
        const token = jwt.sign(
            { id: usuario.id, rol_id: usuario.rol_id, email: usuario.email },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ mensaje: 'Login exitoso', token });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};