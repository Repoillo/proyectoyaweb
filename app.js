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
//gatekeeper
app.post('/api/auth/verify-code', async (req, res) => {
    const { codigo } = req.body;
    try {
        const [rows] = await pool.query(
            "SELECT id_restaurante, nombre_restaurante FROM restaurante WHERE codigo_acceso = ?", 
            [codigo]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Código no válido.' });
        }

        req.session.restauranteContexto = rows[0].id_restaurante;
        req.session.nombreRestauranteContexto = rows[0].nombre_restaurante;

        res.json({ 
            valid: true, 
            nombre: rows[0].nombre_restaurante 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al verificar código.' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    // 1. Desestructurar y Limpiar espacios
    let { nombre_usuario, correo_usuario, contra, rol } = req.body;
    nombre_usuario = nombre_usuario ? nombre_usuario.trim() : '';
    correo_usuario = correo_usuario ? correo_usuario.trim().toLowerCase() : ''; // Correos siempre minúsculas
    
    const id_restaurante = req.session.restauranteContexto;

    if (!id_restaurante) {
        return res.status(403).json({ message: 'Primero debes ingresar el código del restaurante.' });
    }

    if (!nombre_usuario || nombre_usuario.length < 3 || nombre_usuario.length > 50) {
        return res.status(400).json({ message: 'El nombre debe tener entre 3 y 50 caracteres.' });
    }
    const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!nombreRegex.test(nombre_usuario)) {
        return res.status(400).json({ message: 'El nombre solo puede contener letras (sin símbolos raros).' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo_usuario)) {
        return res.status(400).json({ message: 'Ingresa un correo electrónico válido (ej: nombre@dominio.com).' });
    }

    if (contra.length < 8) {
        return res.status(400).json({ message: 'La contraseña es muy corta (mínimo 8 caracteres).' });
    }
    const tieneNumero = /\d/; // Busca al menos un dígito
    if (!tieneNumero.test(contra)) {
        return res.status(400).json({ message: 'La contraseña debe incluir al menos un número para mayor seguridad.' });
    }

    const rolesPermitidos = ['cocinero', 'mesero'];
    
    const rolFinal = rolesPermitidos.includes(rol) ? rol : 'cocinero';

    try {
        const contra_hash = await bcrypt.hash(contra, 10);
        
        await pool.query(
            `INSERT INTO m_usuarios (nombre_usuario, correo_usuario, contra_hash, id_restaurante, rol) 
             VALUES (?, ?, ?, ?, ?)`,
            [nombre_usuario, correo_usuario, contra_hash, id_restaurante, rolFinal]
        );
        
        res.status(201).json({ message: 'Usuario registrado exitosamente.' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
             return res.status(409).json({ message: 'Este correo ya está registrado en el sistema.' });
        }
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ message: 'Error interno al registrar.' });
    }
});
app.post('/api/auth/login', async (req, res) => {
    const { correo_usuario, contra } = req.body;
    
    const id_contexto = req.session.restauranteContexto;

    if (!id_contexto) {
        return res.status(403).json({ message: 'Sesión expirada. Ingresa el código del restaurante nuevamente.' });
    }

    try {
        const [results] = await pool.query(
            "SELECT * FROM m_usuarios WHERE correo_usuario = ? AND id_restaurante = ? AND estado = 'activo'", 
            [correo_usuario, id_contexto]
        );

        if (results.length === 0) {
            return res.status(401).json({ message: 'Usuario no encontrado en este restaurante.' });
        }
        
        const usuario = results[0];
        const esCorrecta = await bcrypt.compare(contra, usuario.contra_hash);
        if (!esCorrecta) return res.status(401).json({ message: 'Credenciales incorrectas.' });

        req.session.userId = usuario.id_usuario;
        req.session.restauranteId = usuario.id_restaurante; 
        req.session.nombreUsuario = usuario.nombre_usuario;
        req.session.rol = usuario.rol; 

        res.json({ message: 'Inicio de sesión exitoso', rol: usuario.rol });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno.' });
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
        if (parseFloat(precio_venta) <= 0 || parseFloat(precio_venta) > 10000) {
        return res.status(400).json({ message: 'Precio inválido (0 - $10,000).' });
    }
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
    const connection = await pool.getConnection();
    try {
        
        const { id } = req.params;
        const { nombre, unidad_medida, costo_compra, cantidad_por_unidad, piezas_compradas, cantidad_disponible } = req.body;
        const stockInput = parseFloat(piezas_compradas);
        const costoInput = parseFloat(costo_compra);

        if (stockInput < 0) return res.status(400).json({ message: 'No puedes tener stock negativo.' });
        if (stockInput > 10000) return res.status(400).json({ message: 'Stock excesivo (Máx 10,000 unidades).' });
        
        if (costoInput < 0) return res.status(400).json({ message: 'El costo no puede ser negativo.' });
        if (costoInput > 100000) return res.status(400).json({ message: 'Costo unitario excesivo (Máx $100,000).' });
        const id_restaurante = req.session.restauranteId;

        await connection.beginTransaction();

        // 1. Obtener datos anteriores para comparar stock
        const [previo] = await connection.query(
            "SELECT stock, costo_unitario FROM ingredientes WHERE id_ingrediente = ?", 
            [id]
        );
        
        let nuevoStock = 0;
        let costoUnitarioCalculado = 0;

        // Lógica de cálculo blindada contra NaNs
        const cantPorUnidad = parseFloat(cantidad_por_unidad) || 1;
        const costoCompra = parseFloat(costo_compra) || 0;

        if (costoCompra > 0 && cantPorUnidad > 0) {
            costoUnitarioCalculado = costoCompra / cantPorUnidad;
        } else if (previo.length > 0) {
            costoUnitarioCalculado = previo[0].costo_unitario; 
        }

        if (piezas_compradas !== undefined && piezas_compradas !== "") {

            nuevoStock = parseFloat(piezas_compradas) * cantPorUnidad;
        } else {

            nuevoStock = parseFloat(cantidad_disponible);
        }

        if (previo.length > 0) {
            const stockAnterior = parseFloat(previo[0].stock);
            const diferencia = nuevoStock - stockAnterior;
            
            if (diferencia > 0 && costoUnitarioCalculado > 0) {
                const montoGasto = diferencia * costoUnitarioCalculado;
                
                await connection.query(
                    `INSERT INTO movimientos_financieros (id_restaurante, tipo, monto, descripcion, fecha)
                     VALUES (?, 'egreso', ?, ?, NOW())`,
                    [id_restaurante, montoGasto, `Compra Stock: ${nombre} (+${(diferencia/cantPorUnidad).toFixed(1)} pzas)`]
                );
            }
        }
        await connection.query(
            `UPDATE ingredientes 
             SET nombre = ?, 
                 unidad_medida = ?, 
                 costo_unitario = ?, 
                 stock = ?, 
                 cantidad_por_unidad = ?
             WHERE id_ingrediente = ? AND id_restaurante = ?`,
            [nombre, unidad_medida, costoUnitarioCalculado, nuevoStock, cantPorUnidad, id, id_restaurante]
        );

        await connection.commit();
        res.json({ message: 'Ingrediente actualizado y gasto registrado (si aplicó).' });

    } catch(error) {
        await connection.rollback();
        console.error('Error al actualizar ingrediente:', error);
        res.status(500).json({message: 'Error al actualizar: ' + error.message});
    } finally {
        connection.release();
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

app.get('/api/pedidos/completados', requireAuth, requireOwner, async (req, res) => {
    try {
        const [pedidos] = await pool.query(
            `SELECT * FROM pedidos 
             WHERE id_restaurante = ? 
             AND estado = 'inactivo' 
             ORDER BY fecha_creacion DESC 
             LIMIT 50`,
            [req.session.restauranteId]
        );
        res.json(pedidos);
    } catch(error) {
        console.error('Error al historial:', error);
        res.status(500).json({message: 'Error al cargar historial.'});
    }
});
app.get('/api/pedidos/completados/:id', requireAuth, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const id_restaurante = req.session.restauranteId;

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
// MODIFICACIÓN: Archivar SOLO lo que ya se cerró (Protección contra dueños rápidos)
app.put('/api/pedidos/archivar-completados', requireAuth, requireOwner, async (req, res) => {
    try {
        const id_restaurante = req.session.restauranteId;
        
        const [result] = await pool.query(
            `UPDATE pedidos 
             SET estado = 'archivado' 
             WHERE id_restaurante = ? AND estado = 'inactivo'`,
            [id_restaurante]
        );

        res.json({ 
            message: 'Historial limpiado (solo mesas cerradas).', 
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

app.get('/api/mesas', requireAuth, async (req, res) => {
    try {
        const [mesas] = await pool.query(
            `SELECT 
                m.*, 
                p.estado AS estado_pedido,
                p.metodo_pago,
                p.total_calculado
             FROM mesas m
             LEFT JOIN pedidos p ON m.numero_mesa = p.mesa 
                 AND p.id_restaurante = m.id_restaurante
                 -- AQUÍ ESTÁ EL TRUCO: Solo unimos si el pedido está "VIVO"
                 AND p.estado NOT IN ('inactivo', 'archivado', 'cancelado')
             WHERE m.id_restaurante = ? 
             ORDER BY m.id_mesa ASC`,
            [req.session.restauranteId]
        );    
        const mesasUnicas = [];
        const mapaMesas = new Map();

        mesas.forEach(fila => {
            if (!mapaMesas.has(fila.id_mesa)) {
                mapaMesas.set(fila.id_mesa, true);
                mesasUnicas.push(fila);
            } else {
                console.warn(`Aviso: Se detectó posible duplicado de pedido activo en mesa ${fila.numero_mesa}`);
            }
        });

        res.json(mesasUnicas);

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

app.post('/api/mesas/:id/liberar', requireAuth, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const id_restaurante = req.session.restauranteId;
        
        await connection.beginTransaction();

        // 1. Obtener el nombre de la mesa antes de liberarla
        const [mesaInfo] = await connection.query(
            "SELECT numero_mesa FROM mesas WHERE id_mesa = ?", 
            [id]
        );

        if (mesaInfo.length > 0) {
            const nombreMesa = mesaInfo[0].numero_mesa;

            // 2. BUSCAR EL PEDIDO ACTIVO (El que vamos a cobrar)
            // Buscamos pedidos que no estén ya cerrados
            const [pedidosActivos] = await connection.query(
                `SELECT id_pedido, total_calculado 
                 FROM pedidos 
                 WHERE mesa = ? AND id_restaurante = ? 
                 AND estado NOT IN ('cancelado', 'archivado', 'inactivo')`,
                [nombreMesa, id_restaurante]
            );

            // SI ENCONTRAMOS UN PEDIDO PENDIENTE, LO COBRAMOS
            if (pedidosActivos.length > 0) {
                const pedido = pedidosActivos[0];
                
                // A. Registrar el Ingreso en Finanzas
                const descripcion = `Ingreso Pedido #${pedido.id_pedido} (${nombreMesa})`;
                await connection.query(
                    `INSERT INTO movimientos_financieros (id_restaurante, tipo, monto, descripcion, fecha)
                     VALUES (?, 'ingreso', ?, ?, NOW())`,
                    [id_restaurante, pedido.total_calculado, descripcion]
                );

                // B. Cerrar el pedido (Pasar a inactivo)
                await connection.query(
                    "UPDATE pedidos SET estado = 'inactivo' WHERE id_pedido = ?",
                    [pedido.id_pedido]
                );
            }
        }

        await connection.query(
            "UPDATE mesas SET estado = 'libre', codigo_sesion = NULL WHERE id_mesa = ? AND id_restaurante = ?",
            [id, id_restaurante]
        );
        
        await connection.commit();
        res.json({ message: 'Mesa liberada, pedido cerrado y venta registrada.' });

    } catch (error) {
        await connection.rollback();
        console.error('Error al liberar mesa:', error);
        res.status(500).json({ message: 'Error al liberar la mesa.' });
    } finally {
        connection.release();
    }
});

// ==========================================
// RUTA: CREAR PEDIDO (Solo con PIN)
// ==========================================
app.post('/api/movil/pedido', async (req, res) => {
    // 1. Recibimos SOLO el PIN y los Items
    let { pin, items } = req.body; 
    const id_restaurante = 1; 

    console.log("--- INTENTO DE PEDIDO ---");
    console.log("PIN recibido:", pin);
    console.log("Items recibidos:", JSON.stringify(items));

    // Validación básica de entrada
    if (!pin) return res.status(400).json({ message: "Falta el PIN de sesión." });
    if (!items || items.length === 0) return res.status(400).json({ message: "El carrito está vacío." });

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        // 2. BUSCAR MESA POR PIN (La única verdad)
        // Verificamos que el PIN exista y esté en una mesa 'ocupada'
        const [mesaCheck] = await connection.query(
            `SELECT numero_mesa, id_restaurante 
             FROM mesas 
             WHERE codigo_sesion = ? AND id_restaurante = ?`,
            [pin, id_restaurante]
        );

        if (mesaCheck.length === 0) {
            console.log("ERROR: PIN no encontrado o mesa no válida.");
            await connection.rollback();
            return res.status(401).json({ message: 'PIN inválido. Escanea el QR nuevamente.' });
        }

        const mesaReal = mesaCheck[0].numero_mesa;
        console.log(`Mesa encontrada: ${mesaReal}`);

        // 3. CALCULAR TOTAL (Seguridad: calcular precios en servidor, no confiar en el app)
        let total_calculado = 0;
        const detallesInsertar = [];

        for (const item of items) {
            const [prod] = await connection.query(
                'SELECT precio_venta FROM productos WHERE id_producto = ?', 
                [item.id_producto]
            );
            
            if (prod.length > 0) {
                const precio = parseFloat(prod[0].precio_venta);
                const cantidad = parseInt(item.cantidad);
                total_calculado += precio * cantidad;
                
                // Preparamos el array para insertar luego [id_pedido, id_producto, cantidad, precio]
                // Ponemos 'null' en id_pedido temporalmente
                detallesInsertar.push([null, item.id_producto, cantidad, precio]);
            }
        }

        // 4. INSERTAR CABECERA DEL PEDIDO
        const [pedidoResult] = await connection.query(
            `INSERT INTO pedidos (id_restaurante, mesa, responsable_pedido, total_calculado, estado, fecha_creacion)
             VALUES (?, ?, 'App Cliente', ?, 'sin ver', NOW())`,
            [id_restaurante, mesaReal, total_calculado]
        );
        
        const id_pedido = pedidoResult.insertId;
        console.log(`Pedido creado con ID: ${id_pedido}`);

        // 5. INSERTAR DETALLES
        if (detallesInsertar.length > 0) {
            // Asignamos el ID real del pedido a las filas
            const filasFinales = detallesInsertar.map(fila => {
                fila[0] = id_pedido; 
                return fila;
            });

            await connection.query(
                `INSERT INTO pedido_detalles (id_pedido, id_producto, cantidad, precio_en_pedido) VALUES ?`,
                [filasFinales]
            );
        }

        await connection.commit();
        console.log("--- PEDIDO CONFIRMADO ---");
        
        // Respondemos con éxito
        res.status(201).json({ 
            message: 'Pedido enviado a cocina.', 
            id_pedido, 
            mesa: mesaReal 
        });

    } catch (error) {
        await connection.rollback();
        console.error("ERROR CRÍTICO EN PEDIDO:", error);
        res.status(500).json({ message: 'Error interno al procesar el pedido.' });
    } finally {
        connection.release();
    }
});

// MODIFICACIÓN: Resumen Financiero con "AUTO-APERTURA DE DÍA"
app.get('/api/finanzas/resumen', requireAuth, requireOwner, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const id_restaurante = req.session.restauranteId;
        
        // --- LÓGICA DE APERTURA AUTOMÁTICA DE DÍA ---
        // 1. Verificamos si ya existe ALGO registrado hoy (cualquier movimiento)
        const [checkHoy] = await connection.query(
            "SELECT id_movimiento FROM movimientos_financieros WHERE id_restaurante = ? AND DATE(fecha) = CURDATE() LIMIT 1",
            [id_restaurante]
        );

        // 2. Si NO hay registros hoy, "Abrimos el día" cobrando lo fijo
        if (checkHoy.length === 0) {
            await connection.beginTransaction();

            console.log(`📅 Iniciando apertura automática de día para restaurante ${id_restaurante}...`);

            // A. Calcular Nómina Diaria (Suma de sueldos activos / 30)
            const [nomina] = await connection.query(
                "SELECT SUM(sueldo) as total FROM empleados WHERE id_restaurante = ? AND estado = 'activo'",
                [id_restaurante]
            );
            const nominaMensual = parseFloat(nomina[0].total) || 0;
            const nominaDiaria = nominaMensual / 30;

            if (nominaDiaria > 0) {
                await connection.query(
                    `INSERT INTO movimientos_financieros (id_restaurante, tipo, monto, descripcion, fecha)
                     VALUES (?, 'egreso', ?, 'Nómina Diaria (Automática)', NOW())`,
                    [id_restaurante, nominaDiaria]
                );
            }

            // B. Cargar Otros Gastos Fijos Configurados (Agua, Renta, etc.)
            const [fijos] = await connection.query(
                "SELECT concepto, monto FROM config_gastos_diarios WHERE id_restaurante = ?",
                [id_restaurante]
            );
            
            for (const gasto of fijos) {
                await connection.query(
                    `INSERT INTO movimientos_financieros (id_restaurante, tipo, monto, descripcion, fecha)
                     VALUES (?, 'egreso', ?, ?, NOW())`,
                    [id_restaurante, gasto.monto, `Gasto Fijo: ${gasto.concepto}`]
                );
            }

            await connection.commit();
            console.log("✅ Día iniciado: Gastos fijos aplicados.");
        }
        
        // --- 3. OBTENER RESUMEN (Ahora sí, la BD tiene la verdad completa) ---
        const [dias] = await connection.query(
            `SELECT 
                DATE(fecha) as fecha, 
                SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) as total_ingresos,
                SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) as total_egresos
             FROM movimientos_financieros 
             WHERE id_restaurante = ?
             GROUP BY DATE(fecha)
             ORDER BY fecha DESC`,
            [id_restaurante]
        );
        
        res.json(dias);

    } catch (error) {
        if(connection) await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Error al cargar finanzas.' });
    } finally {
        if(connection) connection.release();
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

app.post('/api/finanzas/egreso', requireAuth, requireOwner, async (req, res) => {
    try {
        const { descripcion, monto } = req.body;
        const montoFloat = parseFloat(monto);

        // VALIDACIÓN DE SEGURIDAD FINANCIERA
        if (!montoFloat || montoFloat <= 0) {
            return res.status(400).json({ message: 'El monto debe ser mayor a 0.' });
        }
        if (montoFloat > 50000) { // Límite de $50,000 por movimiento
            return res.status(400).json({ message: 'Monto sospechoso. Para gastos mayores a $50,000, regístralos desglosados.' });
        }
        if (!descripcion || descripcion.trim().length < 3) {
            return res.status(400).json({ message: 'Escribe una descripción válida.' });
        }

        await pool.query(
            `INSERT INTO movimientos_financieros (id_restaurante, tipo, monto, descripcion, fecha)
             VALUES (?, 'egreso', ?, ?, NOW())`,
            [req.session.restauranteId, montoFloat, descripcion]
        );
        res.status(201).json({ message: 'Egreso registrado.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar egreso.' });
    }
});
// ==========================================
// RUTA: PEDIR CUENTA (Cierra TODAS las rondas)
// ==========================================
app.post('/api/movil/cuenta', async (req, res) => {
    const { pin, metodo_pago } = req.body; 
    const id_restaurante = 1; 

    if (!['efectivo', 'tarjeta'].includes(metodo_pago)) {
        return res.status(400).json({ message: 'Método de pago inválido.' });
    }

    const connection = await pool.getConnection();

    try {
        // 1. Obtener la mesa a partir del PIN
        const [mesaRow] = await connection.query(
            "SELECT numero_mesa FROM mesas WHERE codigo_sesion = ? AND id_restaurante = ?",
            [pin, id_restaurante]
        );

        if (mesaRow.length === 0) {
            return res.status(404).json({ message: 'Sesión no encontrada.' });
        }
        const nombreMesa = mesaRow[0].numero_mesa;

        // 2. ACTUALIZACIÓN MASIVA
        // Pasamos a 'por_pagar' TODOS los pedidos activos de esa mesa
        const [result] = await connection.query(
            `UPDATE pedidos 
             SET estado = 'por_pagar', 
                 metodo_pago = ? 
             WHERE mesa = ? 
               AND id_restaurante = ?
               AND estado NOT IN ('cancelado', 'archivado', 'inactivo', 'por_pagar')`,
            [metodo_pago, nombreMesa, id_restaurante]
        );

        if (result.affectedRows === 0) {
             // Chequeo de seguridad: ¿Quizás ya la pidieron?
             const [check] = await connection.query(
                `SELECT id_pedido FROM pedidos WHERE mesa = ? AND estado = 'por_pagar'`,
                [nombreMesa]
             );
             if (check.length > 0) return res.json({ message: 'Cuenta ya solicitada anteriormente.' });
             
             return res.json({ message: 'No hay pedidos pendientes por cobrar.' });
        }

        res.json({ message: 'Cuenta solicitada. El mesero traerá el total acumulado.' });

    } catch (error) {
        console.error('Error pidiendo cuenta:', error);
        res.status(500).json({ message: 'Error al procesar solicitud.' });
    } finally {
        connection.release();
    }
});
// ==========================================
// RUTA: SEGUIMIENTO DE "SESIÓN" (Agrupa múltiples pedidos)
// ==========================================
app.get('/api/movil/seguimiento/:pin', async (req, res) => {
    const { pin } = req.params;
    const id_restaurante = 1;

    try {
        // 1. Buscamos TODOS los pedidos activos asociados a este PIN
        const [pedidos] = await pool.query(
            `SELECT 
                p.id_pedido, 
                p.estado, 
                p.total_calculado, 
                p.fecha_creacion,
                p.mesa,
                r.nombre_restaurante
             FROM mesas m 
             JOIN pedidos p ON m.numero_mesa = p.mesa 
             JOIN restaurante r ON m.id_restaurante = r.id_restaurante
             WHERE m.codigo_sesion = ? 
               AND m.id_restaurante = ?
               -- Traemos todo lo que NO esté muerto (cancelado, archivado, inactivo)
               AND p.estado NOT IN ('cancelado', 'archivado', 'inactivo')`,
            [pin, id_restaurante]
        );

        if (pedidos.length === 0) {
            return res.json({ activo: false });
        }

        // 2. CÁLCULO DE TOTALES ACUMULADOS
        // Sumamos el dinero de todas las rondas de pedidos
        const granTotal = pedidos.reduce((sum, p) => sum + parseFloat(p.total_calculado), 0);
        
        // Determinamos el "Estado Global" para la barra de color
        // Si al menos uno está "en proceso", la mesa está "en proceso".
        // Si todos están "completado", la mesa está "completada".
        // Si alguno está "por_pagar", toda la mesa está esperando cuenta.
        let estadoGlobal = 'completado';
        if (pedidos.some(p => p.estado === 'por_pagar')) estadoGlobal = 'por_pagar';
        else if (pedidos.some(p => p.estado === 'en proceso' || p.estado === 'sin ver')) estadoGlobal = 'en_proceso';

        // 3. Extraemos los IDs de los pedidos para buscar sus productos
        const idsPedidos = pedidos.map(p => p.id_pedido);

        // 4. Buscamos TODOS los productos de TODAS las rondas
        // Hacemos JOIN con pedidos para saber el estado de cada platillo individualmente
        const [items] = await pool.query(
            `SELECT 
                prod.nombre, 
                pd.cantidad, 
                pd.precio_en_pedido as precio,
                (pd.cantidad * pd.precio_en_pedido) as subtotal,
                p.estado as estado_producto -- Para saber si este item ya se sirvió o no
             FROM pedido_detalles pd
             JOIN productos prod ON pd.id_producto = prod.id_producto
             JOIN pedidos p ON pd.id_pedido = p.id_pedido
             WHERE pd.id_pedido IN (?)`,
            [idsPedidos]
        );

        // 5. Enviamos el "Super Ticket" fusionado
        res.json({
            activo: true,
            estado: estadoGlobal, 
            ticket: {
                folio: `MESA-${pedidos[0].mesa.replace('Mesa ', '')}`, // Folio genérico de mesa
                fecha: pedidos[0].fecha_creacion, // Fecha del primer pedido
                restaurante: pedidos[0].nombre_restaurante,
                mesa: pedidos[0].mesa,
                total: granTotal, // Total acumulado real
                items: items // Lista con TODO lo que han pedido
            }
        });

    } catch (error) {
        console.error("Error en seguimiento:", error);
        res.status(500).json({ message: 'Error interno' });
    }
});
app.post('/api/finanzas/gastos-fijos', requireAuth, requireOwner, async (req, res) => {
    const { concepto, monto } = req.body;
    const montoFloat = parseFloat(monto);
    const id_restaurante = req.session.restauranteId;

    if (!montoFloat || montoFloat <= 0) {
        return res.status(400).json({ message: 'El monto debe ser un número positivo mayor a 0.' });
    }

    if (montoFloat > 50000) { 
        return res.status(400).json({ message: 'El monto diario parece excesivo (Máx $50,000). Revisa si no pusiste el mensual por error.' });
    }

    // 3. Concepto Obligatorio
    if (!concepto || concepto.trim().length === 0) {
        return res.status(400).json({ message: 'Debes escribir el nombre del gasto (ej. Luz, Renta).' });
    }

    try {
        await pool.query(
            "INSERT INTO config_gastos_diarios (id_restaurante, concepto, monto) VALUES (?, ?, ?)",
            [id_restaurante, concepto, montoFloat]
        );
        res.status(201).json({ message: 'Gasto fijo agregado correctamente.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al guardar la configuración.' });
    }
});

// A. VER la lista de gastos fijos
app.get('/api/finanzas/gastos-fijos', requireAuth, requireOwner, async (req, res) => {
    try {
        const [gastos] = await pool.query("SELECT * FROM config_gastos_diarios WHERE id_restaurante = ?", [req.session.restauranteId]);
        res.json(gastos);
    } catch (error) { res.status(500).json({ message: 'Error.' }); }
});

app.delete('/api/finanzas/gastos-fijos/:id', requireAuth, requireOwner, async (req, res) => {
    try {
        // CORRECCIÓN AQUÍ: Antes decía "id_gasto", debe decir "id_gasto_fijo"
        const [result] = await pool.query(
            "DELETE FROM config_gastos_diarios WHERE id_gasto_fijo = ? AND id_restaurante = ?", 
            [req.params.id, req.session.restauranteId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Gasto no encontrado o no tienes permiso.' });
        }

        res.json({ message: 'Eliminado correctamente.' });

    } catch (error) { 
        console.error("Error al borrar gasto fijo:", error); // Esto te mostrará el error real en la terminal
        res.status(500).json({ message: 'Error interno del servidor al eliminar.' }); 
    }
});
// 2. OBTENER RESUMEN DEL DÍA (Con Sueldos y Gastos Fijos Automáticos)
app.get('/api/finanzas/dia', requireAuth, async (req, res) => {
    const { fecha } = req.query; // Formato YYYY-MM-DD
    const id_rest = req.session.restauranteId;

    try {
        // A. Ingresos Reales (Pedidos pagados ese día)
        const [ingresos] = await pool.query(`
            SELECT COALESCE(SUM(total_calculado), 0) as total 
            FROM pedidos 
            WHERE id_restaurante = ? AND estado = 'pagado' AND DATE(fecha_creacion) = ?`, 
            [id_rest, fecha]
        );

        // B. Gastos Manuales (Los extras que registraste ese día específico)
        const [gastosManuales] = await pool.query(`
            SELECT COALESCE(SUM(monto), 0) as total 
            FROM transacciones 
            WHERE id_restaurante = ? AND tipo = 'egreso' AND DATE(fecha) = ?`,
            [id_rest, fecha]
        );

        // C. Gastos Fijos (Renta, etc. - Se suman SIEMPRE)
        const [fijos] = await pool.query(`SELECT COALESCE(SUM(monto), 0) as total FROM config_gastos_diarios WHERE id_restaurante = ?`, [id_rest]);

        // D. Sueldos (Cálculo diario simple: Suma de salarios activos / 30 días)
        const [nomina] = await pool.query(`SELECT COALESCE(SUM(salario_mensual), 0) as total FROM empleados WHERE id_restaurante = ?`, [id_rest]);
        const sueldosDiarios = nomina[0].total / 30;

        res.json({
            ingresos: parseFloat(ingresos[0].total),
            gastos_extra: parseFloat(gastosManuales[0].total),
            gastos_fijos: parseFloat(fijos[0].total),
            sueldos: sueldosDiarios
        });
    } catch (e) { console.error(e); res.status(500).json({message: 'Error al calcular día'}); }
});

app.get('/api/movil/ticket', async (req, res) => {
    let { numero_mesa } = req.query;
    const id_restaurante = 1; // Hardcodeado por simplicidad de tu proyecto

    // Normalizar nombre (ej. "1" -> "Mesa 1")
    if (numero_mesa && !numero_mesa.toString().toLowerCase().startsWith('mesa')) {
        numero_mesa = `Mesa ${numero_mesa}`;
    }

    try {
        // A. Buscar el pedido ACTIVO de esa mesa
        const [pedidos] = await pool.query(
            `SELECT id_pedido, fecha_creacion, total_calculado 
             FROM pedidos 
             WHERE mesa = ? AND id_restaurante = ? 
             AND estado NOT IN ('cancelado', 'archivado', 'inactivo')`,
            [numero_mesa, id_restaurante]
        );

        if (pedidos.length === 0) {
            return res.status(404).json({ message: 'No hay cuenta pendiente para esta mesa.' });
        }
        
        const pedido = pedidos[0];

        // B. Buscar los productos consumidos
        const [detalles] = await pool.query(
            `SELECT p.nombre, pd.cantidad, pd.precio_en_pedido 
             FROM pedido_detalles pd
             JOIN productos p ON pd.id_producto = p.id_producto
             WHERE pd.id_pedido = ?`,
            [pedido.id_pedido]
        );

        // C. Obtener nombre del restaurante (Opcional, para el encabezado del ticket)
        const [rest] = await pool.query("SELECT nombre_restaurante FROM restaurante WHERE id_restaurante = ?", [id_restaurante]);

        // D. Armar respuesta JSON bonita para la App
        const ticketData = {
            restaurante: rest[0].nombre_restaurante,
            folio: `ORD-${pedido.id_pedido}`,
            fecha: pedido.fecha_creacion,
            items: detalles.map(d => ({
                nombre: d.nombre,
                cantidad: d.cantidad,
                precio: d.precio_en_pedido,
                subtotal: d.cantidad * d.precio_en_pedido
            })),
            total: pedido.total_calculado
        };

        res.json(ticketData);

    } catch (error) {
        console.error('Error generando ticket:', error);
        res.status(500).json({ message: 'Error al generar el ticket.' });
    }
});

app.get('/api/movil/menu', async (req, res) => {
    const { restaurant_id } = req.query; 
    const idRestaurante = restaurant_id || 1;

    try {
        // Buscamos los productos en la base de datos
        const [menu] = await pool.query(
            `SELECT id_producto, nombre, descripcion, precio_venta, imagen, tipo as categoria 
             FROM productos 
             WHERE id_restaurante = ? AND estado = 'activo'`, 
            [idRestaurante]
        );
        res.json(menu);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error del servidor");
    }
});

// ==========================================
// RUTA DE SEGURIDAD: VERIFICAR SI LA SESIÓN SIGUE VIVA
// (Para expulsar al cliente si el mesero cierra la mesa)
// ==========================================
app.get('/api/movil/verificar-sesion/:pin', async (req, res) => {
    const { pin } = req.params;
    try {
        // Buscamos si existe alguna mesa con este código de sesión activo
        const [mesa] = await pool.query(
            "SELECT id_mesa FROM mesas WHERE codigo_sesion = ?", 
            [pin]
        );
        
        // Si encontramos mesa, es true. Si no (porque se liberó), es false.
        res.json({ valida: mesa.length > 0 });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ valida: false });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
