require('dotenv').config(); // Asegúrate que dotenv se carga primero
const express = require('express');
const mysql = require('mysql2/promise'); // Usamos la versión con promesas para el pool
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session'); // Paquete para sesiones
const MySQLStore = require('express-mysql-session')(session); // Para guardar sesiones en MySQL

const app = express();

app.use(cors({
    origin: 'http://localhost:10000', // Reemplaza con tu URL de frontend si es diferente
    credentials: true // Importante para que las cookies funcionen con CORS
}));
app.use(express.json());
app.use(express.static('public'));

// --- CONFIGURACIÓN DE LA BASE DE DATOS ---
// Usamos un Pool para manejar múltiples conexiones (mejor para sesiones)
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Mensaje para verificar la conexión inicial (opcional pero útil)
pool.getConnection()
    .then(connection => {
        console.log('Conexión exitosa a la base de datos');
        connection.release(); // Libera la conexión
    })
    .catch(err => {
        console.error('Error al conectar a la base de datos:', err);
    });

// --- CONFIGURACIÓN DE SESIONES ---
const sessionStore = new MySQLStore({
    // Opciones para la tabla de sesiones (puedes dejar las por defecto)
    // clearExpired: true,
    // checkExpirationInterval: 900000, // Cada 15 minutos
    // expiration: 86400000, // 1 día (se sobrescribe con cookie.maxAge)
}, pool); // Usa el pool de conexiones

app.use(session({
    key: 'sid', // Nombre de la cookie de sesión
    secret: process.env.SESSION_SECRET, // Clave secreta del .env
    store: sessionStore, // Dónde guardar las sesiones
    resave: false, // No volver a guardar si no hay cambios
    saveUninitialized: false, // No guardar sesiones vacías
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en milisegundos
        httpOnly: true, // La cookie no es accesible por JavaScript en el navegador (seguridad)
        secure: false, // Poner 'true' en producción si usas HTTPS
        sameSite: 'lax' // Protección contra ataques CSRF
    }
}));

// === Middleware de Autenticación ===
// Función para verificar si el usuario tiene una sesión activa
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next(); // Si hay sesión, continúa
    }
    // Si no hay sesión, envía un error 401
    res.status(401).json({ message: 'No autorizado. Por favor, inicia sesión.' });
}

// === Rutas de Autenticación ===

// RUTA PARA REGISTRAR (sin cambios, solo quitamos la transacción manual si no la necesitas explícitamente)
app.post('/api/auth/register', async (req, res) => { // Usamos async/await con el pool
    const { nombre_usuario, nombre_restaurante, correo_usuario, contra } = req.body;
    try {
        const contra_hash = await bcrypt.hash(contra, 10);
        const [restaurantResult] = await pool.query('INSERT INTO restaurantes (nombre_restaurante) VALUES (?)', [nombre_restaurante]);
        const id_restaurante = restaurantResult.insertId;
        await pool.query('INSERT INTO m_usuarios (nombre_usuario, correo_usuario, contra_hash, id_restaurante) VALUES (?, ?, ?, ?)',
            [nombre_usuario, correo_usuario, contra_hash, id_restaurante]);
        res.status(201).json({ message: "Usuario registrado exitosamente." });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
             // Devolvemos un mensaje más específico si es posible
             if (error.message.includes('correo_usuario')) {
                 return res.status(409).json({ message: 'El correo electrónico ya está en uso.' });
             } else if (error.message.includes('nombre_restaurante')) {
                 return res.status(409).json({ message: 'El nombre del restaurante ya existe.' });
             }
        }
        console.error('Error al registrar:', error);
        res.status(500).json({ message: 'Error interno del servidor al registrar.' });
    }
});

// RUTA PARA INICIAR SESIÓN (Actualizada para usar sesiones)
app.post('/api/auth/login', async (req, res) => {
    const { correo_usuario, contra } = req.body;
    try {
        const [results] = await pool.query('SELECT * FROM m_usuarios WHERE correo_usuario = ?', [correo_usuario]);
        if (results.length === 0) {
            return res.status(401).json({ message: 'Credenciales incorrectas.' });
        }
        const usuario = results[0];
        const esCorrecta = await bcrypt.compare(contra, usuario.contra_hash);
        if (!esCorrecta) {
            return res.status(401).json({ message: 'Credenciales incorrectas.' });
        }

        // Guardamos la información del usuario en la sesión
        req.session.userId = usuario.id_usuario;
        req.session.restauranteId = usuario.id_restaurante; // Guardamos también el ID del restaurante
        req.session.nombreUsuario = usuario.nombre_usuario;

        // Enviamos solo un mensaje de éxito, la cookie se establece automáticamente
        res.json({ message: 'Inicio de sesión exitoso' });

    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ message: 'Error interno del servidor al iniciar sesión.' });
    }
});

// RUTA PARA CERRAR SESIÓN
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            return res.status(500).json({ message: 'Error al cerrar sesión' });
        }
        // Limpiamos la cookie del navegador
        res.clearCookie('sid'); // Asegúrate que 'sid' coincide con la 'key' de la sesión
        res.json({ message: 'Has cerrado sesión' });
    });
});

// RUTA PARA VERIFICAR ESTADO DE SESIÓN (para el frontend)
app.get('/api/auth/status', requireAuth, (req, res) => {
    // Si requireAuth pasa, significa que hay sesión. Devolvemos los datos.
    res.json({
        loggedIn: true,
        userId: req.session.userId,
        restauranteId: req.session.restauranteId,
        nombreUsuario: req.session.nombreUsuario
    });
});


// === Rutas CRUD (Protegidas) ===
// Aquí irán tus rutas para /api/platillos, /api/bebidas, etc.
// Ejemplo:
app.get('/api/platillos', requireAuth, async (req, res) => {
    try {
        // Obtenemos solo los platillos del restaurante del usuario logueado
        const [platillos] = await pool.query(
            'SELECT id_platillo as id, nombre_platillo as nombre, descripcion, costo_platillo as precio FROM eplatillos WHERE id_restaurante = ?', 
            [req.session.restauranteId]
        );
        res.json(platillos);
    } catch(error) {
        console.error('Error al obtener platillos:', error);
        res.status(500).json({message: 'Error al cargar los platillos.'});
    }
});

// ... (Añadir aquí las demás rutas GET, POST, PUT, DELETE para todas las secciones, usando requireAuth)


const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));