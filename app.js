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
    port: process.env.MYSQL_PORT,        
    connectTimeout: 30000,
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
    const { nombre_usuario, correo_usuario, contra, rol } = req.body; // Recibimos 'rol'
    const id_restaurante_principal = 1; 

    // Validar que el rol sea válido (solo permitimos crear staff operativo)
    const rolesPermitidos = ['cocinero', 'mesero'];
    const rolFinal = rolesPermitidos.includes(rol) ? rol : 'cocinero';

    try {
        const contra_hash = await bcrypt.hash(contra, 10);
        
        await pool.query(
            `INSERT INTO m_usuarios (nombre_usuario, correo_usuario, contra_hash, id_restaurante, rol) 
             VALUES (?, ?, ?, ?, ?)`,
            [nombre_usuario, correo_usuario, contra_hash, id_restaurante_principal, rolFinal]
        );
        
        res.status(201).json({ message: `${rolFinal.charAt(0).toUpperCase() + rolFinal.slice(1)} registrado exitosamente.` });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && error.message.includes('correo_usuario')) {
             return res.status(409).json({ message: 'El correo electrónico ya está en uso.' });
        }
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ message: 'Error interno al registrar.' });
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

// --- PRODUCTOS (CON LÓGICA DE RECICLAJE) ---
app.get('/api/productos', requireAuth, requireOwner, async (req, res) => {
    try {
        const [productos] = await pool.query(
            `SELECT id_producto, nombre, descripcion, precio_venta, tipo 
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
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        const [existente] = await connection.query(
            `SELECT id_producto, estado FROM productos 
             WHERE nombre = ? AND id_restaurante = ?`,
            [nombre.trim(), id_restaurante]
        );

        let id_producto_final;

        if (existente.length > 0) {

            const producto = existente[0];

            if (producto.estado === 'activo') {
                await connection.rollback();
                return res.status(409).json({ message: 'Ya existe un producto con este nombre.' });
            }

            id_producto_final = producto.id_producto;

            await connection.query(
                `UPDATE productos 
                 SET descripcion = ?, precio_venta = ?, tipo = ?, estado = 'activo' 
                 WHERE id_producto = ?`,
                [descripcion, precio_venta, tipo, id_producto_final]
            );
            
            await connection.query('DELETE FROM recetas WHERE id_producto = ?', [id_producto_final]);

        } else {
            const [productoResult] = await connection.query(
                `INSERT INTO productos (id_restaurante, nombre, descripcion, precio_venta, tipo, estado) 
                 VALUES (?, ?, ?, ?, ?, 'activo')`,
                [id_restaurante, nombre.trim(), descripcion, precio_venta, tipo]
            );
            id_producto_final = productoResult.insertId;
        }

        if (receta && receta.length > 0) {
            const valoresReceta = receta.map(item => [id_producto_final, item.id_ingrediente, item.cantidad_usada]);
            await connection.query(
                `INSERT INTO recetas (id_producto, id_ingrediente, cantidad_usada) VALUES ?`,
                [valoresReceta]
            );
        }

        await connection.commit();
        res.status(201).json({ message: 'Producto guardado exitosamente.' });

    } catch(error) {
        await connection.rollback();
        console.error('Error al guardar producto:', error);
        res.status(500).json({message: 'Error al procesar el producto.'});
    } finally {
        connection.release();
    }
});

app.put('/api/productos/:id', requireAuth, requireOwner, async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, precio_venta, tipo, receta } = req.body;
    const id_restaurante = req.session.restauranteId;

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        // Actualizar el producto
        await connection.query(
            `UPDATE productos 
             SET nombre = ?, descripcion = ?, precio_venta = ?, tipo = ? 
             WHERE id_producto = ? AND id_restaurante = ?`,
            [nombre.trim(), descripcion, precio_venta, tipo, id, id_restaurante]
        );

        // Actualizar receta (Borrar y Crear)
        await connection.query(`DELETE FROM recetas WHERE id_producto = ?`, [id]);

        if (receta && receta.length > 0) {
            const valoresReceta = receta.map(item => [id, item.id_ingrediente, item.cantidad_usada]);
            await connection.query(
                `INSERT INTO recetas (id_producto, id_ingrediente, cantidad_usada) VALUES ?`,
                [valoresReceta]
            );
        }

        await connection.commit();
        res.json({ message: 'Producto actualizado exitosamente.' });

    } catch(error) {
        await connection.rollback();
        console.error('Error al actualizar producto:', error);
        // Manejo de duplicados al renombrar
        if (error.code === 'ER_DUP_ENTRY') {
             return res.status(409).json({ message: 'Ya existe otro producto con ese nombre.' });
        }
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
        res.json({ message: 'Producto eliminado exitosamente.' });
    } catch(error) {
        console.error('Error al inactivar producto:', error);
        res.status(500).json({message: 'Error al eliminar el producto.'});
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


app.get('/api/ingredientes', requireAuth, requireOwner, async (req, res) => {
    try {
        const [ingredientes] = await pool.query(
            `SELECT 
                id_ingrediente AS id_ing,
                id_ingrediente, 
                nombre AS nombre_ing,
                nombre, 
                unidad_medida, 
                costo_unitario AS costo_ing, -- Este es el costo por ml/gr
                stock AS cantidad_disponible, -- Este es el stock total en ml/gr
                cantidad_por_unidad -- NUEVO: Para saber de qué tamaño son las piezas
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
        const { nombre, unidad_medida, costo_compra, cantidad_por_unidad, piezas_compradas } = req.body;
        const id_restaurante = req.session.restauranteId;
        
        const costo_unitario_calculado = parseFloat(costo_compra) / parseFloat(cantidad_por_unidad);
        const stock_total = parseFloat(piezas_compradas) * parseFloat(cantidad_por_unidad);

        const [existente] = await pool.query(
            `SELECT id_ingrediente, estado FROM ingredientes 
             WHERE nombre = ? AND id_restaurante = ?`,
            [nombre.trim(), id_restaurante] 
        );

        if (existente.length > 0) {
            const ingrediente = existente[0];

            if (ingrediente.estado === 'activo') {
                return res.status(409).json({ message: 'Ya existe un ingrediente con este nombre.' });
            }

            await pool.query(
                `UPDATE ingredientes 
                 SET unidad_medida = ?, 
                     costo_unitario = ?, 
                     stock = ?, 
                     cantidad_por_unidad = ?,
                     estado = 'activo'  -- ¡Aquí ocurre la magia!
                 WHERE id_ingrediente = ?`,
                [unidad_medida, costo_unitario_calculado, stock_total, cantidad_por_unidad, ingrediente.id_ingrediente]
            );

            return res.status(200).json({ message: 'Ingrediente restaurado y actualizado exitosamente.' });

        } else {
            await pool.query(
                `INSERT INTO ingredientes (id_restaurante, nombre, unidad_medida, costo_unitario, stock, cantidad_por_unidad, estado) 
                 VALUES (?, ?, ?, ?, ?, ?, 'activo')`,
                [id_restaurante, nombre.trim(), unidad_medida, costo_unitario_calculado, stock_total, cantidad_por_unidad]
            );
            return res.status(201).json({ message: 'Ingrediente creado exitosamente.' });
        }

    } catch(error) {
        console.error('Error al crear/restaurar ingrediente:', error);
        res.status(500).json({message: 'Error al procesar el ingrediente.'});
    }
});

app.put('/api/ingredientes/:id', requireAuth, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, unidad_medida, costo_compra, cantidad_por_unidad, piezas_compradas } = req.body;
        const id_restaurante = req.session.restauranteId;

        const costo_unitario_calculado = parseFloat(costo_compra) / parseFloat(cantidad_por_unidad);

        const stock_total = parseFloat(piezas_compradas) * parseFloat(cantidad_por_unidad);
        
        await pool.query(
            `UPDATE ingredientes 
             SET nombre = ?, 
                 unidad_medida = ?, 
                 costo_unitario = ?, 
                 stock = ?, 
                 cantidad_por_unidad = ?
             WHERE id_ingrediente = ? AND id_restaurante = ?`,
            [nombre, unidad_medida, costo_unitario_calculado, stock_total, cantidad_por_unidad, id, id_restaurante]
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

// --- EMPLEADOS (CON LÓGICA DE RECICLAJE) ---
app.get('/api/empleados', requireAuth, requireOwner, async (req, res) => {
    try {
        const [empleados] = await pool.query(
            `SELECT id_empleado, nombre_empleado, rol, sueldo 
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

app.post('/api/empleados', requireAuth, requireOwner, async (req, res) => {
    try {
        const { nombre_empleado, rol, sueldo } = req.body;
        const id_restaurante = req.session.restauranteId;
        
        // 1. VERIFICAR SI YA EXISTE (Inactivo o Activo)
        const [existente] = await pool.query(
            `SELECT id_empleado, estado FROM empleados 
             WHERE nombre_empleado = ? AND id_restaurante = ?`,
            [nombre_empleado.trim(), id_restaurante]
        );

        if (existente.length > 0) {
            // CASO A: YA EXISTE
            const empleado = existente[0];

            if (empleado.estado === 'activo') {
                // Opcional: Si quieres permitir homónimos, quita este if.
                // Pero es mejor avisar.
                return res.status(409).json({ message: 'Ya existe un empleado con este nombre.' });
            }

            // CASO B: EXISTE PERO INACTIVO -> REVIVIR
            await pool.query(
                `UPDATE empleados 
                 SET rol = ?, sueldo = ?, estado = 'activo' 
                 WHERE id_empleado = ?`,
                [rol, sueldo, empleado.id_empleado]
            );
            return res.status(200).json({ message: 'Empleado reactivado y actualizado.' });

        } else {
            // CASO C: NO EXISTE -> CREAR
            await pool.query(
                `INSERT INTO empleados (id_restaurante, nombre_empleado, rol, sueldo, estado) 
                 VALUES (?, ?, ?, ?, 'activo')`,
                [id_restaurante, nombre_empleado.trim(), rol, sueldo]
            );
            return res.status(201).json({ message: 'Empleado creado exitosamente.' });
        }

    } catch(error) {
        console.error('Error al crear empleado:', error);
        res.status(500).json({message: 'Error al crear el empleado.'});
    }
});

app.put('/api/empleados/:id', requireAuth, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_empleado, rol, sueldo } = req.body;
        const id_restaurante = req.session.restauranteId;
        
        await pool.query(
            `UPDATE empleados 
             SET nombre_empleado = ?, rol = ?, sueldo = ? 
             WHERE id_empleado = ? AND id_restaurante = ?`,
            [nombre_empleado.trim(), rol, sueldo, id, id_restaurante]
        );
        res.json({ message: 'Empleado actualizado exitosamente.' });
    } catch(error) {
        console.error('Error al actualizar empleado:', error);
        res.status(500).json({message: 'Error al actualizar el empleado.'});
    }
});

app.delete('/api/empleados/:id', requireAuth, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            `UPDATE empleados SET estado = 'inactivo' 
             WHERE id_empleado = ? AND id_restaurante = ?`,
            [id, req.session.restauranteId]
        );
        res.json({ message: 'Empleado eliminado exitosamente.' });
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

    if (!['en proceso', 'completado', 'cancelado', 'inactivo', 'por_pagar'].includes(nuevoEstado)) {
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
        if (nuevoEstado === 'inactivo') {
            // 1. Obtener el monto del pedido
            const [ped] = await connection.query(
                "SELECT total_calculado, mesa FROM pedidos WHERE id_pedido = ?", 
                [id]
            );
            
            if (ped.length > 0) {
                const monto = ped[0].total_calculado;
                const descripcion = `Ingreso Pedido #${id} (${ped[0].mesa})`;
                
                // 2. Insertar en movimientos_financieros
                await connection.query(
                    `INSERT INTO movimientos_financieros (id_restaurante, tipo, monto, descripcion, fecha)
                     VALUES (?, 'ingreso', ?, ?, NOW())`,
                    [id_restaurante, monto, descripcion]
                );
            }
        }
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
app.get('/api/pedidos/completados/:id', requireAuth, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const id_restaurante = req.session.restauranteId;

        // 1. Obtener información básica del pedido
        // CORRECCIÓN: Permitimos 'completado' O 'inactivo' (pagado)
        const [pedidoInfo] = await pool.query(
            `SELECT * FROM pedidos 
             WHERE id_pedido = ? AND id_restaurante = ? AND (estado = 'completado' OR estado = 'inactivo')`,
            [id, id_restaurante]
        );

        if (pedidoInfo.length === 0) {
            return res.status(404).json({ message: 'Pedido no encontrado.' });
        }

        // 2. Obtener los productos (Igual que antes)
        const [productosDelPedido] = await pool.query(
            `SELECT p.nombre, pd.cantidad, pd.precio_en_pedido 
             FROM pedido_detalles pd
             JOIN productos p ON pd.id_producto = p.id_producto
             WHERE pd.id_pedido = ?`,
            [id]
        );

        // 3. Obtener ingredientes gastados (Igual que antes)
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
        console.error('Error al obtener detalle:', error);
        res.status(500).json({ message: 'Error al cargar detalles.' });
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
// PUT /api/pedidos/archivar-completados (ACTUALIZADA)
app.put('/api/pedidos/archivar-completados', requireAuth, requireOwner, async (req, res) => {
    try {
        const id_restaurante = req.session.restauranteId;
        
        // CAMBIO: Ahora movemos de 'inactivo' (historial visible) a 'archivado' (oculto)
        const [result] = await pool.query(
            `UPDATE pedidos 
             SET estado = 'archivado' 
             WHERE id_restaurante = ? AND estado = 'inactivo'`,
            [id_restaurante]
        );

        res.json({ 
            message: 'Historial limpiado exitosamente.', 
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
// MODIFICACIÓN: GET Mesas enriquecido con estado del pedido
app.get('/api/mesas', requireAuth, async (req, res) => {
    try {
        const [mesas] = await pool.query(
            `SELECT 
                m.*, 
                p.estado AS estado_pedido,
                p.metodo_pago
             FROM mesas m
             LEFT JOIN pedidos p ON m.numero_mesa = p.mesa 
                 AND p.id_restaurante = m.id_restaurante
                 AND p.estado NOT IN ('inactivo', 'archivado', 'cancelado')
             WHERE m.id_restaurante = ? 
             ORDER BY m.id_mesa ASC`,
            [req.session.restauranteId]
        );
        res.json(mesas);
    } catch (error) {
        console.error('Error al obtener mesas:', error);
        res.status(500).json({ message: 'Error al cargar las mesas.' });
    }
});

// 2. POST Crear Mesa (Solo Dueño)
app.post('/api/mesas', requireAuth, requireOwner, async (req, res) => {
    try {
        const { numero_mesa } = req.body;
        await pool.query(
            "INSERT INTO mesas (id_restaurante, numero_mesa, estado) VALUES (?, ?, 'libre')",
            [req.session.restauranteId, numero_mesa]
        );
        res.status(201).json({ message: 'Mesa creada exitosamente.' });
    } catch (error) {
        console.error('Error al crear mesa:', error);
        res.status(500).json({ message: 'Error al crear la mesa.' });
    }
});

// 3. DELETE Eliminar Mesa (Solo Dueño)
app.delete('/api/mesas/:id', requireAuth, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            "DELETE FROM mesas WHERE id_mesa = ? AND id_restaurante = ?",
            [id, req.session.restauranteId]
        );
        res.json({ message: 'Mesa eliminada.' });
    } catch (error) {
        console.error('Error al eliminar mesa:', error);
        res.status(500).json({ message: 'Error al eliminar la mesa.' });
    }
});

// 4. POST Ocupar Mesa (Generar Código) - Para Mesero y Dueño
app.post('/api/mesas/:id/ocupar', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        // Generar código de 3 dígitos al azar (100 - 999)
        const codigo = Math.floor(Math.random() * 900) + 100;
        
        await pool.query(
            "UPDATE mesas SET estado = 'ocupada', codigo_sesion = ? WHERE id_mesa = ? AND id_restaurante = ?",
            [codigo, id, req.session.restauranteId]
        );
        
        res.json({ message: 'Mesa ocupada.', codigo: codigo });
    } catch (error) {
        console.error('Error al ocupar mesa:', error);
        res.status(500).json({ message: 'Error al generar el código.' });
    }
});

// 5. POST Liberar Mesa (Borrar Código) - Para Mesero y Dueño
app.post('/api/mesas/:id/liberar', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Aquí podrías agregar validación: ¿Hay pedidos sin pagar en esta mesa?
        // Por ahora lo haremos directo para mantenerlo simple.
        
        await pool.query(
            "UPDATE mesas SET estado = 'libre', codigo_sesion = NULL WHERE id_mesa = ? AND id_restaurante = ?",
            [id, req.session.restauranteId]
        );
        
        res.json({ message: 'Mesa liberada exitosamente.' });
    } catch (error) {
        console.error('Error al liberar mesa:', error);
        res.status(500).json({ message: 'Error al liberar la mesa.' });
    }
});
// ==========================================
// === API MÓVIL (CLIENTE) - LÓGICA "LATE BINDING" ===
// ==========================================

// 1. VER MENÚ (Totalmente público, no requiere mesa ni PIN aún)
// La App solo necesita saber el ID del restaurante (en tu caso hardcodeado a 1 o enviado por param)
app.get('/api/movil/menu', async (req, res) => {
    try {
        const id_restaurante = 1; // O recibirlo por query param ?id_restaurante=1
        const [menu] = await pool.query(
            `SELECT id_producto, nombre, descripcion, precio_venta, tipo 
             FROM productos 
             WHERE id_restaurante = ? AND estado = 'activo'`,
            [id_restaurante]
        );
        res.json(menu);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al cargar menú.' });
    }
});

// 2. ENVIAR PEDIDO (Corregido: Busca por numero_mesa)
app.post('/api/movil/pedido', async (req, res) => {
    let { numero_mesa, pin, items } = req.body; // Usamos let para poder modificarlo
    const id_restaurante = 1; 

    if (!numero_mesa.toString().toLowerCase().startsWith('mesa')) {
        numero_mesa = `Mesa ${numero_mesa}`;
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        // A. VALIDACIÓN: Usamos 'numero_mesa' en el WHERE en lugar de 'id_mesa'
        const [mesaCheck] = await connection.query(
            `SELECT * FROM mesas 
             WHERE numero_mesa = ? AND id_restaurante = ? AND estado = 'ocupada' AND codigo_sesion = ?`,
            [numero_mesa, id_restaurante, pin]
        );

        if (mesaCheck.length === 0) {
            await connection.rollback();
            return res.status(401).json({ message: 'Mesa o PIN incorrectos.' });
        }

        // B. CÁLCULO TOTAL
        let total_calculado = 0;
        const detallesInsertar = [];

        for (const item of items) {
            const [prod] = await connection.query(
                'SELECT precio_venta FROM productos WHERE id_producto = ?', 
                [item.id_producto]
            );
            if (prod.length > 0) {
                const precio = parseFloat(prod[0].precio_venta);
                total_calculado += precio * item.cantidad;
                detallesInsertar.push([null, item.id_producto, item.cantidad, precio]);
            }
        }

        // C. CREAR PEDIDO
        const [pedidoResult] = await connection.query(
            `INSERT INTO pedidos (id_restaurante, mesa, responsable_pedido, total_calculado, estado, fecha_creacion)
             VALUES (?, ?, 'App Cliente', ?, 'sin ver', NOW())`,
            [id_restaurante, numero_mesa, total_calculado] // Guardamos el número de mesa directo
        );
        
        const id_pedido = pedidoResult.insertId;

        // D. INSERTAR DETALLES
        for (const det of detallesInsertar) {
            det[0] = id_pedido; 
            await connection.query(
                `INSERT INTO pedido_detalles (id_pedido, id_producto, cantidad, precio_en_pedido) VALUES ?`,
                [[det]]
            );
        }

        await connection.commit();
        res.status(201).json({ message: 'Pedido enviado.', id_pedido });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Error al procesar pedido.' });
    } finally {
        connection.release();
    }
});
app.get('/api/finanzas/resumen', requireAuth, requireOwner, async (req, res) => {
    try {
        // Agrupamos movimientos por fecha (solo año-mes-dia)
        const [dias] = await pool.query(
            `SELECT 
                DATE(fecha) as fecha, 
                SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) as total_ingresos,
                SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) as total_egresos,
                COUNT(CASE WHEN tipo = 'ingreso' THEN 1 END) as num_ventas
             FROM movimientos_financieros 
             WHERE id_restaurante = ?
             GROUP BY DATE(fecha)
             ORDER BY fecha DESC`,
            [req.session.restauranteId]
        );
        res.json(dias);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al cargar finanzas.' });
    }
});

// 2. GET Nómina Diaria (Cálculo virtual)
app.get('/api/finanzas/nomina-diaria', requireAuth, requireOwner, async (req, res) => {
    try {
        // Sumamos sueldos de empleados activos y dividimos entre 30
        const [result] = await pool.query(
            `SELECT SUM(sueldo) as nomina_mensual FROM empleados 
             WHERE id_restaurante = ? AND estado = 'activo'`,
            [req.session.restauranteId]
        );
        
        const mensual = result[0].nomina_mensual || 0;
        const diario = parseFloat(mensual) / 30;
        
        res.json({ nomina_diaria: diario });
    } catch (error) {
        res.status(500).json({ message: 'Error al calcular nómina.' });
    }
});

// 3. GET Detalle de un Día
app.get('/api/finanzas/detalle/:fecha', requireAuth, requireOwner, async (req, res) => {
    try {
        const { fecha } = req.params; // Formato YYYY-MM-DD
        const [movimientos] = await pool.query(
            `SELECT * FROM movimientos_financieros 
             WHERE id_restaurante = ? AND DATE(fecha) = ?
             ORDER BY fecha DESC`,
            [req.session.restauranteId, fecha]
        );
        res.json(movimientos);
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar detalle.' });
    }
});

// 4. POST Registrar Egreso Manual
app.post('/api/finanzas/egreso', requireAuth, requireOwner, async (req, res) => {
    try {
        const { descripcion, monto } = req.body;
        // Validación básica
        if (!monto || parseFloat(monto) <= 0) return res.status(400).json({message: 'Monto inválido'});

        await pool.query(
            `INSERT INTO movimientos_financieros (id_restaurante, tipo, monto, descripcion, fecha)
             VALUES (?, 'egreso', ?, ?, NOW())`,
            [req.session.restauranteId, parseFloat(monto), descripcion]
        );
        res.status(201).json({ message: 'Egreso registrado.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar egreso.' });
    }
});
// --- EN app.js ---

// 3. PEDIR CUENTA (Cliente solicita pagar)
app.post('/api/movil/cuenta', async (req, res) => {
    const { numero_mesa, metodo_pago } = req.body; 
    const id_restaurante = 1; // Hardcodeado por ahora

    // Intentamos normalizar el nombre de la mesa (si envían "1", buscamos "Mesa 1")
    // Esto previene el Error #2 que te explico abajo
    const nombreMesa = numero_mesa.toString().toLowerCase().startsWith('mesa') 
        ? numero_mesa 
        : `Mesa ${numero_mesa}`;

    try {
        // Actualizamos el pedido activo de esa mesa a 'por_pagar'
        const [result] = await pool.query(
            `UPDATE pedidos 
             SET estado = 'por_pagar', 
                 metodo_pago = ? 
             WHERE mesa = ? AND id_restaurante = ? AND estado NOT IN ('cancelado', 'archivado', 'inactivo')`,
            [metodo_pago, nombreMesa, id_restaurante]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'No hay pedido activo para esta mesa.' });
        }

        res.json({ message: 'Cuenta solicitada al mesero.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al solicitar cuenta.' });
    }
});
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
