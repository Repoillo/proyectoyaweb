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
    const { nombre_usuario, correo_usuario, contra } = req.body;
    
    const id_restaurante_principal = 1; 

    try {
        const contra_hash = await bcrypt.hash(contra, 10);
        
        await pool.query(
            `INSERT INTO m_usuarios (nombre_usuario, correo_usuario, contra_hash, id_restaurante, rol) 
             VALUES (?, ?, ?, ?, 'cocinero')`,
            [nombre_usuario, correo_usuario, contra_hash, id_restaurante_principal]
        );
        
        res.status(201).json({ message: "Cocinero registrado exitosamente." });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && error.message.includes('correo_usuario')) {
             return res.status(409).json({ message: 'El correo electrónico ya está en uso.' });
        }
        console.error('Error al registrar cocinero:', error);
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
    const { id } = req.params;
    const { nuevoEstado } = req.body;
    const id_restaurante = req.session.restauranteId;

    if (!['en proceso', 'completado', 'cancelado'].includes(nuevoEstado)) {
        return res.status(400).json({ message: 'Estado no válido.' });
    }

    // Iniciar transacción
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        // --- LÓGICA DE VALIDACIÓN Y DESCUENTO DE INVENTARIO ---
        // Solo aplica si el intento es cambiar a 'completado'
        if (nuevoEstado === 'completado') {
            
            // 1. Verificamos el estado ACTUAL para evitar dobles descuentos
            const [pedidoActual] = await connection.query(
                "SELECT estado FROM pedidos WHERE id_pedido = ? AND id_restaurante = ?",
                [id, id_restaurante]
            );

            if (pedidoActual.length === 0) {
                throw new Error('Pedido no encontrado.');
            }
            if (pedidoActual[0].estado === 'completado') {
                await connection.commit(); // No hacemos nada, ya estaba completado
                connection.release();
                return res.json({ message: 'Este pedido ya estaba completado.' });
            }

            // 2. [NUEVO] OBTENER REQUERIMIENTOS VS. STOCK ACTUAL
            // Obtenemos una lista de lo que el pedido necesita y lo que hay.
            const [ingredientesRequeridos] = await connection.query(
                `SELECT 
                    i.id_ingrediente, 
                    i.nombre, 
                    i.stock AS stock_actual, 
                    SUM(r.cantidad_usada * pd.cantidad) AS stock_requerido
                 FROM pedido_detalles pd
                 JOIN recetas r ON pd.id_producto = r.id_producto
                 JOIN ingredientes i ON r.id_ingrediente = i.id_ingrediente
                 WHERE pd.id_pedido = ? AND i.id_restaurante = ?
                 GROUP BY i.id_ingrediente, i.nombre, i.stock`,
                [id, id_restaurante]
            );

            // 3. [NUEVO] VALIDAR SI HAY STOCK SUFICIENTE
            const ingredientesFaltantes = [];
            for (const ing of ingredientesRequeridos) {
                if (parseFloat(ing.stock_actual) < parseFloat(ing.stock_requerido)) {
                    ingredientesFaltantes.push(
                        `${ing.nombre} (requiere ${ing.stock_requerido}, tiene ${ing.stock_actual})`
                    );
                }
            }

            // 4. [NUEVO] SI FALTA ALGO, RECHAZAR LA TRANSACCIÓN
            if (ingredientesFaltantes.length > 0) {
                await connection.rollback(); // Deshacemos todo
                connection.release();
                // 409 Conflict es un buen código HTTP para "no se puede hacer por un conflicto de estado"
                return res.status(409).json({
                    message: `No se puede completar el pedido. Stock insuficiente para: ${ingredientesFaltantes.join(', ')}`
                });
            }

            // 5. SI LLEGAMOS AQUÍ, HAY STOCK. Procedemos a descontar.
            // (Podemos re-usar el bucle anterior, o ejecutar la consulta JOIN)
            await connection.query(
                `UPDATE ingredientes i
                 JOIN recetas r ON i.id_ingrediente = r.id_ingrediente
                 JOIN pedido_detalles pd ON r.id_producto = pd.id_producto
                 SET i.stock = i.stock - (r.cantidad_usada * pd.cantidad)
                 WHERE pd.id_pedido = ? AND i.id_restaurante = ?`,
                [id, id_restaurante]
            );
        }
        
        // --- FIN DE LÓGICA DE DESCUENTO ---

        // 6. Actualizamos el estado del pedido
        await connection.query(
            "UPDATE pedidos SET estado = ? WHERE id_pedido = ? AND id_restaurante = ?",
            [nuevoEstado, id, id_restaurante]
        );

        // 7. Si todo salió bien, confirmamos la transacción
        await connection.commit();
        res.json({ message: `Pedido ${id} actualizado a ${nuevoEstado}. Stock validado y descontado.` });

    } catch (error) {
        // Si algo falló, revertimos todo
        await connection.rollback();
        console.error('Error en la transacción del pedido:', error);
        res.status(500).json({ message: `Error al actualizar el pedido: ${error.message}` });
    } finally {
        // Siempre liberamos la conexión
        connection.release();
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
// GET /api/pedidos/completados/:id (NUEVA RUTA PARA DETALLES)
app.get('/api/pedidos/completados/:id', requireAuth, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const id_restaurante = req.session.restauranteId;

        // 1. Obtener información básica del pedido
        const [pedidoInfo] = await pool.query(
            `SELECT * FROM pedidos 
             WHERE id_pedido = ? AND id_restaurante = ? AND estado = 'completado'`,
            [id, id_restaurante]
        );

        if (pedidoInfo.length === 0) {
            return res.status(404).json({ message: 'Pedido no encontrado o no está completado.' });
        }

        // 2. Obtener los productos de ese pedido
        const [productosDelPedido] = await pool.query(
            `SELECT p.nombre, pd.cantidad, pd.precio_en_pedido 
             FROM pedido_detalles pd
             JOIN productos p ON pd.id_producto = p.id_producto
             WHERE pd.id_pedido = ?`,
            [id]
        );

        // 3. Calcular el total de ingredientes gastados para ESE pedido
        const [ingredientesGastados] = await pool.query(
            `SELECT 
                i.nombre, 
                i.unidad_medida, 
                SUM(r.cantidad_usada * pd.cantidad) AS total_gastado
             FROM pedido_detalles pd
             JOIN recetas r ON pd.id_producto = r.id_producto
             JOIN ingredientes i ON r.id_ingrediente = i.id_ingrediente
             WHERE pd.id_pedido = ?
             GROUP BY i.id_ingrediente, i.nombre, i.unidad_medida`,
            [id]
        );

        res.json({
            info: pedidoInfo[0],
            productos: productosDelPedido,
            ingredientes: ingredientesGastados
        });

    } catch (error) {
        console.error('Error al obtener detalle del pedido completado:', error);
        res.status(500).json({ message: 'Error al cargar los detalles del pedido.' });
    }
});
// PUT /api/pedidos/archivar-completados (NUEVA RUTA)
app.put('/api/pedidos/archivar-completados', requireAuth, requireOwner, async (req, res) => {
    try {
        const id_restaurante = req.session.restauranteId;
        
        const [result] = await pool.query(
            `UPDATE pedidos 
             SET estado = 'inactivo' 
             WHERE id_restaurante = ? AND estado = 'completado'`,
            [id_restaurante]
        );

        res.json({ 
            message: 'Pedidos archivados exitosamente.', 
            pedidosArchivados: result.affectedRows 
        });

    } catch (error) {
        console.error('Error al archivar pedidos:', error);
        res.status(500).json({ message: 'Error interno al archivar los pedidos.' });
    }
});
// [NUEVA RUTA] GET Pedidos para la Cocina (sin ver / en proceso)
app.get('/api/pedidos/cocina/activos', requireAuth, async (req, res) => {
    // No necesita requireOwner, el cocinero puede ver esto
    try {
        const [pedidosActivos] = await pool.query(
            `SELECT id_pedido, mesa, estado, fecha_creacion 
             FROM pedidos 
             WHERE id_restaurante = ? AND (estado = 'sin ver' OR estado = 'en proceso')
             ORDER BY fecha_creacion ASC`,
            [req.session.restauranteId]
        );
        res.json(pedidosActivos);
    } catch(error) {
        console.error('Error al obtener pedidos activos para cocina:', error);
        res.status(500).json({message: 'Error al cargar los pedidos.'});
    }
});

// [NUEVA RUTA] GET Receta/Detalles para el Modal de Cocina
app.get('/api/pedidos/cocina/detalles/:id_pedido', requireAuth, async (req, res) => {
    try {
        const { id_pedido } = req.params;

        // 1. Obtenemos los productos del pedido
        const [productos] = await pool.query(
            `SELECT p.id_producto, p.nombre, pd.cantidad 
             FROM pedido_detalles pd
             JOIN productos p ON pd.id_producto = p.id_producto
             WHERE pd.id_pedido = ?`,
            [id_pedido]
        );

        // 2. Por cada producto, obtenemos su receta
        const productosConReceta = [];
        for (const prod of productos) {
            const [receta] = await pool.query(
                `SELECT i.nombre, r.cantidad_usada, i.unidad_medida
                 FROM recetas r
                 JOIN ingredientes i ON r.id_ingrediente = i.id_ingrediente
                 WHERE r.id_producto = ?`,
                [prod.id_producto]
            );
            
            productosConReceta.push({
                nombre_producto: prod.nombre,
                cantidad_a_preparar: prod.cantidad,
                receta: receta // Array de ingredientes
            });
        }
        
        res.json(productosConReceta);

    } catch(error) {
        console.error('Error al obtener detalles de receta para cocina:', error);
        res.status(500).json({message: 'Error al cargar los detalles.'});
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));