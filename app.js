require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const app = express();

app.use(cors({
    origin: 'http://localhost:10000',
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()
    .then(connection => {
        console.log('Conexión exitosa a la base de datos');
        connection.release();
    })
    .catch(err => {
        console.error('Error al conectar a la base de datos:', err);
    });

const sessionStore = new MySQLStore({}, pool);

app.use(session({
    key: 'sid',
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    }
}));

// === Middlewares de Autorización ===
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.status(401).json({ message: 'No autorizado. Por favor, inicia sesión.' });
}

function requireOwner(req, res, next) {
    if (req.session && req.session.rol === 'dueño') {
        return next();
    }
    res.status(403).json({ message: 'Acceso prohibido. Requiere permisos de administrador.' });
}

// === Rutas de Autenticación ===
app.post('/api/auth/register', async (req, res) => {
    const { nombre_usuario, nombre_restaurante, correo_usuario, contra } = req.body;
    try {
        const contra_hash = await bcrypt.hash(contra, 10);
        const [restaurantResult] = await pool.query('INSERT INTO restaurante (nombre_restaurante) VALUES (?)', [nombre_restaurante]);
        const id_restaurante = restaurantResult.insertId;
        await pool.query('INSERT INTO m_usuarios (nombre_usuario, correo_usuario, contra_hash, id_restaurante) VALUES (?, ?, ?, ?)',
            [nombre_usuario, correo_usuario, contra_hash, id_restaurante]);
        res.status(201).json({ message: "Usuario registrado exitosamente." });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
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

app.post('/api/auth/login', async (req, res) => {
    const { correo_usuario, contra } = req.body;
    try {
        const [results] = await pool.query("SELECT * FROM m_usuarios WHERE correo_usuario = ? AND estado = 'activo'", [correo_usuario]);
        if (results.length === 0) {
            return res.status(401).json({ message: 'Credenciales incorrectas o usuario inactivo.' });
        }
        const usuario = results[0];
        const esCorrecta = await bcrypt.compare(contra, usuario.contra_hash);
        if (!esCorrecta) {
            return res.status(401).json({ message: 'Credenciales incorrectas.' });
        }

        req.session.userId = usuario.id_usuario;
        req.session.restauranteId = usuario.id_restaurante;
        req.session.nombreUsuario = usuario.nombre_usuario;
        req.session.rol = usuario.rol; 

        res.json({ message: 'Inicio de sesión exitoso', rol: usuario.rol });

    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ message: 'Error interno del servidor al iniciar sesión.' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            return res.status(500).json({ message: 'Error al cerrar sesión' });
        }
        res.clearCookie('sid');
        res.json({ message: 'Has cerrado sesión' });
    });
});

app.get('/api/auth/status', requireAuth, (req, res) => {
    res.json({
        loggedIn: true,
        userId: req.session.userId,
        restauranteId: req.session.restauranteId,
        nombreUsuario: req.session.nombreUsuario,
        rol: req.session.rol
    });
});


// === RUTAS CRUD (PROTEGIDAS) ===

// --- PRODUCTOS (ACTUALIZADO CON RECETAS) ---
app.get('/api/productos', requireAuth, requireOwner, async (req, res) => {
    try {
        const [productos] = await pool.query(
            `SELECT 
                id_producto, nombre, descripcion, precio_venta, tipo 
             FROM productos 
             WHERE id_restaurante = ? AND estado = 'activo'`, 
            [req.session.restauranteId]
        );
        res.json(productos);
    } catch(error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({message: 'Error al cargar los productos.'});
    }
});

app.post('/api/productos', requireAuth, requireOwner, async (req, res) => {
    const { nombre, descripcion, precio_venta, tipo, receta } = req.body;
    const id_restaurante = req.session.restauranteId;
    
    // Iniciar transacción
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        // 1. Insertar el producto
        const [productoResult] = await connection.query(
            `INSERT INTO productos (id_restaurante, nombre, descripcion, precio_venta, tipo) 
             VALUES (?, ?, ?, ?, ?)`,
            [id_restaurante, nombre, descripcion, precio_venta, tipo]
        );
        
        const id_producto = productoResult.insertId;

        // 2. Insertar la receta (si existe)
        if (receta && receta.length > 0) {
            const valoresReceta = receta.map(item => [id_producto, item.id_ingrediente, item.cantidad_usada]);
            await connection.query(
                `INSERT INTO recetas (id_producto, id_ingrediente, cantidad_usada) VALUES ?`,
                [valoresReceta]
            );
        }

        // 3. Confirmar transacción
        await connection.commit();
        res.status(201).json({ message: 'Producto y receta creados exitosamente.' });

    } catch(error) {
        // 4. Revertir en caso de error
        await connection.rollback();
        console.error('Error al crear producto con receta:', error);
        res.status(500).json({message: 'Error al crear el producto.'});
    } finally {
        connection.release();
    }
});

app.put('/api/productos/:id', requireAuth, requireOwner, async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, precio_venta, tipo, receta } = req.body;
    const id_restaurante = req.session.restauranteId;

    // Iniciar transacción
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        // 1. Actualizar el producto
        await connection.query(
            `UPDATE productos 
             SET nombre = ?, descripcion = ?, precio_venta = ?, tipo = ? 
             WHERE id_producto = ? AND id_restaurante = ?`,
            [nombre, descripcion, precio_venta, tipo, id, id_restaurante]
        );

        // 2. Borrar la receta anterior
        await connection.query(
            `DELETE FROM recetas WHERE id_producto = ?`,
            [id]
        );

        // 3. Insertar la nueva receta (si existe)
        if (receta && receta.length > 0) {
            const valoresReceta = receta.map(item => [id, item.id_ingrediente, item.cantidad_usada]);
            await connection.query(
                `INSERT INTO recetas (id_producto, id_ingrediente, cantidad_usada) VALUES ?`,
                [valoresReceta]
            );
        }

        // 4. Confirmar transacción
        await connection.commit();
        res.json({ message: 'Producto y receta actualizados exitosamente.' });

    } catch(error) {
        // 5. Revertir en caso de error
        await connection.rollback();
        console.error('Error al actualizar producto con receta:', error);
        res.status(500).json({message: 'Error al actualizar el producto.'});
    } finally {
        connection.release();
    }
});

app.delete('/api/productos/:id', requireAuth, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            `UPDATE productos SET estado = 'inactivo' 
             WHERE id_producto = ? AND id_restaurante = ?`,
            [id, req.session.restauranteId]
        );
        res.json({ message: 'Producto inactivado exitosamente.' });
    } catch(error) {
        console.error('Error al inactivar producto:', error);
        res.status(500).json({message: 'Error al inactivar el producto.'});
    }
});


// --- RECETAS (NUEVAS RUTAS) ---
// Obtiene la receta de UN producto (para el modal de Editar)
app.get('/api/recetas/:id_producto', requireAuth, requireOwner, async (req, res) => {
    try {
        const { id_producto } = req.params;
        const [receta] = await pool.query(
            `SELECT id_ingrediente, cantidad_usada 
             FROM recetas 
             WHERE id_producto = ?`,
            [id_producto]
        );
        res.json(receta);
    } catch(error) {
        console.error('Error al obtener receta:', error);
        res.status(500).json({message: 'Error al cargar la receta.'});
    }
});


// --- INGREDIENTES (CRUD COMPLETO) ---
app.get('/api/ingredientes', requireAuth, requireOwner, async (req, res) => {
    try {
        const [ingredientes] = await pool.query(
            `SELECT 
                id_ingrediente AS id_ing,
                id_ingrediente, 
                nombre AS nombre_ing,
                nombre, 
                unidad_medida, 
                costo_unitario AS costo_ing, 
                stock AS cantidad_disponible 
             FROM ingredientes 
             WHERE id_restaurante = ? AND estado = 'activo'`, 
            [req.session.restauranteId]
        );
        res.json(ingredientes);
    } catch(error) {
        console.error('Error al obtener ingredientes:', error);
        res.status(500).json({message: 'Error al cargar los ingredientes.'});
    }
});

app.post('/api/ingredientes', requireAuth, requireOwner, async (req, res) => {
    try {
        const { nombre, unidad_medida, costo_unitario, stock } = req.body;
        const id_restaurante = req.session.restauranteId;
        
        await pool.query(
            `INSERT INTO ingredientes (id_restaurante, nombre, unidad_medida, costo_unitario, stock, estado) 
             VALUES (?, ?, ?, ?, ?, 'activo')`,
            [id_restaurante, nombre, unidad_medida, costo_unitario, stock]
        );
        res.status(201).json({ message: 'Ingrediente creado exitosamente.' });
    } catch(error) {
        console.error('Error al crear ingrediente:', error);
        res.status(500).json({message: 'Error al crear el ingrediente.'});
    }
});

app.put('/api/ingredientes/:id', requireAuth, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, unidad_medida, costo_unitario, stock } = req.body;
        const id_restaurante = req.session.restauranteId;
        
        await pool.query(
            `UPDATE ingredientes 
             SET nombre = ?, unidad_medida = ?, costo_unitario = ?, stock = ? 
             WHERE id_ingrediente = ? AND id_restaurante = ?`,
            [nombre, unidad_medida, costo_unitario, stock, id, id_restaurante]
        );
        res.json({ message: 'Ingrediente actualizado exitosamente.' });
    } catch(error) {
        console.error('Error al actualizar ingrediente:', error);
        res.status(500).json({message: 'Error al actualizar el ingrediente.'});
    }
});

app.delete('/api/ingredientes/:id', requireAuth, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            `UPDATE ingredientes SET estado = 'inactivo' 
             WHERE id_ingrediente = ? AND id_restaurante = ?`,
            [id, req.session.restauranteId]
        );
        res.json({ message: 'Ingrediente inactivado exitosamente.' });
    } catch(error) {
        console.error('Error al inactivar ingrediente:', error);
        res.status(500).json({message: 'Error al inactivar el ingrediente.'});
    }
});


// --- EMPLEADOS (CRUD) ---
app.get('/api/empleados', requireAuth, requireOwner, async (req, res) => {
    try {
        const [empleados] = await pool.query(
            `SELECT 
                id_empleado, 
                nombre_empleado, 
                rol, 
                sueldo 
             FROM empleados 
             WHERE id_restaurante = ? AND estado = 'activo'`, 
            [req.session.restauranteId]
        );
        res.json(empleados);
    } catch(error) {
        console.error('Error al obtener empleados:', error);
        res.status(500).json({message: 'Error al cargar los empleados.'});
    }
});
// POST (Crear) - /api/empleados
app.post('/api/empleados', requireAuth, requireOwner, async (req, res) => {
    try {
        const { nombre_empleado, rol, sueldo } = req.body;
        const id_restaurante = req.session.restauranteId;
        
        await pool.query(
            `INSERT INTO empleados (id_restaurante, nombre_empleado, rol, sueldo, estado) 
             VALUES (?, ?, ?, ?, 'activo')`,
            [id_restaurante, nombre_empleado, rol, sueldo]
        );
        res.status(201).json({ message: 'Empleado creado exitosamente.' });
    } catch(error) {
        console.error('Error al crear empleado:', error);
        res.status(500).json({message: 'Error al crear el empleado.'});
    }
});

// PUT (Actualizar) - /api/empleados/:id
app.put('/api/empleados/:id', requireAuth, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_empleado, rol, sueldo } = req.body;
        const id_restaurante = req.session.restauranteId;
        
        await pool.query(
            `UPDATE empleados 
             SET nombre_empleado = ?, rol = ?, sueldo = ? 
             WHERE id_empleado = ? AND id_restaurante = ?`,
            [nombre_empleado, rol, sueldo, id, id_restaurante]
        );
        res.json({ message: 'Empleado actualizado exitosamente.' });
    } catch(error) {
        console.error('Error al actualizar empleado:', error);
        res.status(500).json({message: 'Error al actualizar el empleado.'});
    }
});

// DELETE (Soft Delete) - /api/empleados/:id
app.delete('/api/empleados/:id', requireAuth, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const id_restaurante = req.session.restauranteId;
        
        await pool.query(
            `UPDATE empleados SET estado = 'inactivo' 
             WHERE id_empleado = ? AND id_restaurante = ?`,
            [id, id_restaurante]
        );
        res.json({ message: 'Empleado inactivado exitosamente.' });
    } catch(error) {
        console.error('Error al inactivar empleado:', error);
        res.status(500).json({message: 'Error al inactivar el empleado.'});
    }
});

// === RUTAS DE PEDIDOS (Para el Chef y el Dueño) ===
app.get('/api/pedidos/activos', requireAuth, async (req, res) => {
    try {
        const [pedidosActivos] = await pool.query(
            `SELECT * FROM pedidos 
             WHERE id_restaurante = ? AND (estado = 'sin ver' OR estado = 'en proceso')
             ORDER BY fecha_creacion ASC`,
            [req.session.restauranteId]
        );
        res.json(pedidosActivos);
    } catch(error) {
        console.error('Error al obtener pedidos activos:', error);
        res.status(500).json({message: 'Error al cargar los pedidos.'});
    }
});

app.put('/api/pedidos/:id/estado', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevoEstado } = req.body;
        
        if (!['en proceso', 'completado', 'cancelado'].includes(nuevoEstado)) {
            return res.status(400).json({ message: 'Estado no válido.' });
        }
        
        await pool.query(
            "UPDATE pedidos SET estado = ? WHERE id_pedido = ? AND id_restaurante = ?",
            [nuevoEstado, id, req.session.restauranteId]
        );
        res.json({ message: `Pedido ${id} actualizado a ${nuevoEstado}`});
    } catch(error) {
        console.error('Error al actualizar estado de pedido:', error);
        res.status(500).json({message: 'Error al actualizar el pedido.'});
    }
});

app.get('/api/pedidos/completados', requireAuth, requireOwner, async (req, res) => {
    try {
        const [pedidosCompletados] = await pool.query(
            `SELECT * FROM pedidos 
             WHERE id_restaurante = ? AND estado = 'completado'
             ORDER BY fecha_creacion DESC`,
            [req.session.restauranteId]
        );
        res.json(pedidosCompletados);
    } catch(error) {
        console.error('Error al obtener pedidos completados:', error);
        res.status(500).json({message: 'Error al cargar los pedidos completados.'});
    }
});


const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));