const express = require('express');
const mysql = require('mysql2'); 
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Necesario para encriptar
const jwt = require('jsonwebtoken');   // Necesario para los tokens de sesión
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        return;
    }
    console.log('Conexión exitosa a la base de datos');
});

// === Rutas ===

// RUTA PARA REGISTRAR UN NUEVO USUARIO
app.post('/api/auth/register', (req, res) => {
    const { nombre_usuario, nombre_restaurante, correo_usuario, contra } = req.body;

    // Hashear la contraseña
    bcrypt.hash(contra, 10, (err, contra_hash) => {
        if (err) {
            return res.status(500).json({ message: "Error al encriptar la contraseña." });
        }

        // 1. Primero creamos el restaurante
        db.query('INSERT INTO restaurantes (nombre_restaurante) VALUES (?)', [nombre_restaurante], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'El nombre del restaurante ya existe.' });
                }
                return res.status(500).json({ message: 'Error al crear el restaurante.', error: err });
            }

            const id_restaurante = result.insertId;

            // 2. Después creamos el usuario con el ID del nuevo restaurante
            db.query('INSERT INTO m_usuarios (nombre_usuario, correo_usuario, contra_hash, id_restaurante) VALUES (?, ?, ?, ?)', 
            [nombre_usuario, correo_usuario, contra_hash, id_restaurante], 
            (err, result) => {
                if (err) {
                     if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(409).json({ message: 'El correo electrónico ya está en uso.' });
                    }
                    return res.status(500).json({ message: 'Error al registrar el usuario.', error: err });
                }
                res.status(201).json({ message: "Usuario registrado exitosamente." });
            });
        });
    });
});

// RUTA PARA INICIAR SESIÓN
app.post('/api/auth/login', (req, res) => {
    const { correo_usuario, contra } = req.body;

    // Buscamos al usuario por su correo
    db.query('SELECT * FROM m_usuarios WHERE correo_usuario = ?', [correo_usuario], (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ message: 'Credenciales incorrectas.' });
        }

        const usuario = results[0];

        // Comparamos la contraseña que nos envían con la encriptada en la BD
        bcrypt.compare(contra, usuario.contra_hash, (err, esCorrecta) => {
            if (err || !esCorrecta) {
                return res.status(401).json({ message: 'Credenciales incorrectas.' });
            }

            // Si es correcta, creamos el token
            const payload = { id_usuario: usuario.id_usuario, id_restaurante: usuario.id_restaurante };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

            res.json({ message: 'Inicio de sesión exitoso', token });
        });
    });
});


const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));