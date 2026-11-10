require('dotenv').config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Límite de 50MB para fotos de evidencias en base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.resolve(__dirname)));

const uploadDir = path.resolve(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, '-'))
});
const upload = multer({ storage: storage });

const conexion = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "basedb",
    port: process.env.DB_PORT || 3306,
    ssl: { rejectUnauthorized: false }
});

conexion.connect(error => {
    if (error) {
        console.error("❌ Error conectando con MySQL:", error.message);
        return;
    }
    console.log("✅ Conectado correctamente a MySQL");
});

// Vistas HTML
app.get("/", (req, res) => res.sendFile(path.resolve(__dirname, "index.html")));
app.get("/login", (req, res) => res.sendFile(path.resolve(__dirname, "login.html")));
app.get("/tienda", (req, res) => res.sendFile(path.resolve(__dirname, "tienda.html")));
app.get("/empresa", (req, res) => res.sendFile(path.resolve(__dirname, "inicio.empresa.html")));
app.get("/login-empresa", (req, res) => res.sendFile(path.resolve(__dirname, "login.empresa.html")));

// RUTA DINÁMICA DE RESOLUCIÓN (Soporta plural, singular, con y sin .html)
app.get(["/resolver-reportes", "/resolver-reportes.html", "/resolver-reporte", "/resolver-reporte.html"], (req, res) => {
    const rutaPlural = path.resolve(__dirname, "resolver-reportes.html");
    const rutaSingular = path.resolve(__dirname, "resolver-reporte.html");
    const rutaEnCarpeta = path.resolve(__dirname, "Viga", "resolver-reportes.html");

    if (fs.existsSync(rutaPlural)) {
        return res.sendFile(rutaPlural);
    } else if (fs.existsSync(rutaSingular)) {
        return res.sendFile(rutaSingular);
    } else if (fs.existsSync(rutaEnCarpeta)) {
        return res.sendFile(rutaEnCarpeta);
    }
    res.status(404).send("El archivo de resolución no se encuentra en el servidor.");
});

// Autenticación de Usuario Personal
app.post("/login", (req, res) => {
    const correo = req.body.correo || req.body.email;
    const password = req.body.password || req.body.contrasena || req.body.clave;

    if (!correo || !password) {
        return res.status(400).json({ error: "Faltan credenciales obligatorias." });
    }

    const sql = "SELECT * FROM usuarios WHERE LOWER(correo) = LOWER(?) AND password = ?";
    conexion.query(sql, [correo, password], (error, resultados) => {
        if (error) return res.status(500).json({ error: "Error en el servidor: " + error.message });
        if (resultados.length === 0) return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
        res.json({ mensaje: "Login exitoso", usuario: resultados[0] });
    });
});

// Perfil de Usuario Personal
app.get("/usuarios/:id", (req, res) => {
    const idUsuario = req.params.id;
    const sql = "SELECT * FROM usuarios WHERE identificacion = ?";
    conexion.query(sql, [idUsuario], (error, resultados) => {
        if (error) return res.status(500).json({ error: "Error en el servidor." });
        if (resultados.length === 0) return res.status(404).json({ error: "Usuario no encontrado." });
        res.json(resultados[0]);
    });
});

// Login de Empresa
app.post("/login-empresa", (req, res) => {
    const correo = req.body.correo_empresarial || req.body.correo || req.body.email;
    const password = req.body.contrasena_empresarial || req.body.password || req.body.clave;

    if (!correo || !password) {
        return res.status(400).json({ error: "Faltan credenciales obligatorias." });
    }

    const sql = "SELECT * FROM usuarios WHERE (LOWER(correo_empresarial) = LOWER(?) OR LOWER(correo) = LOWER(?)) AND password = ?";
    conexion.query(sql, [correo, correo, password], (error, resultados) => {
        if (error) return res.status(500).json({ error: "Error en el servidor: " + error.message });
        if (resultados.length === 0) return res.status(401).json({ error: "Credenciales incorrectas." });

        const empresaEncontrada = {
            ...resultados[0],
            id: resultados[0].id || resultados[0].identificacion || resultados[0].nit || "EMP-01",
            nit: resultados[0].nit || resultados[0].identificacion || resultados[0].id || "EMP-01",
            nombre: resultados[0].nombre_comercial || resultados[0].nombres || "Empresa"
        };
        res.json({ mensaje: "Login exitoso", empresa: empresaEncontrada });
    });
});

// Catálogo de Productos General
app.get("/productos", (req, res) => {
    const sql = "SELECT p.*, p.identificacion_empresa AS nit_empresa FROM productos p ORDER BY p.fecha_creacion DESC";
    conexion.query(sql, (error, resultados) => {
        if (error) return res.status(500).json({ error: "Error cargando productos." });
        res.json(resultados);
    });
});

// Productos de una Empresa Específica
app.get("/empresa/:nit/productos", (req, res) => {
    const nitEmpresa = req.params.nit;
    const sql = "SELECT * FROM productos WHERE identificacion_empresa = ?";
    conexion.query(sql, [nitEmpresa], (error, resultados) => {
        if (error) return res.status(500).json({ error: "Error al consultar los productos." });
        res.json(resultados);
    });
});

// Crear Producto
app.post(["/productos", "/empresa/:nit/productos"], upload.single("imagen"), (req, res) => {
    const empresaNit = req.params.nit || req.body.identificacion_empresa || req.body.nit_empresa || req.body.nit;
    const nombreProd = req.body.nombre || req.body.nombre_producto || req.body.titulo;
    const categoriaProd = req.body.categoria || "Otros";
    const descripcionProd = req.body.descripcion || "";
    const precioProd = req.body.precio || 0;
    const stockProd = req.body.stock || 0;
    const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (!empresaNit || !nombreProd || !precioProd) {
        return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    const sql = `
        INSERT INTO productos (identificacion_empresa, nombre, categoria, descripcion, precio, stock, imagen_url, fecha_creacion)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    conexion.query(sql, [empresaNit, nombreProd, categoriaProd, descripcionProd, precioProd, stockProd, imagen_url], (error, resultado) => {
        if (error) return res.status(500).json({ error: "No se pudo guardar: " + error.message });
        res.status(201).json({ mensaje: "Producto registrado con éxito.", id: resultado.insertId });
    });
});

// Actualizar Producto
app.put(["/productos/:id", "/empresa/:nit/productos/:id"], upload.single("imagen"), (req, res) => {
    const productoId = req.params.id;
    const nombreProd = req.body.nombre || req.body.nombre_producto;
    const categoriaProd = req.body.categoria || "Otros";
    const descripcionProd = req.body.descripcion || "";
    const precioProd = req.body.precio || 0;
    const stockProd = req.body.stock || 0;

    let sql = `UPDATE productos SET nombre = ?, categoria = ?, descripcion = ?, precio = ?, stock = ?`;
    let params = [nombreProd, categoriaProd, descripcionProd, precioProd, stockProd];

    if (req.file) {
        sql += `, imagen_url = ?`;
        params.push(`/uploads/${req.file.filename}`);
    }

    sql += ` WHERE id = ?`;
    params.push(productoId);

    conexion.query(sql, params, (error) => {
        if (error) return res.status(500).json({ error: "No se pudo actualizar." });
        res.json({ mensaje: "Actualizado con éxito." });
    });
});

// Eliminar Producto
app.delete(["/productos/:id", "/empresa/:nit/productos/:id"], (req, res) => {
    const sql = "DELETE FROM productos WHERE id = ?";
    conexion.query(sql, [req.params.id], (error) => {
        if (error) return res.status(500).json({ error: "No se pudo eliminar." });
        res.json({ mensaje: "Eliminado con éxito." });
    });
});

// Procesar Pago y Descontar Stock
app.post("/compras/procesar", (req, res) => {
    const { articulos, cliente, metodo_pago } = req.body;

    if (!articulos || !cliente || articulos.length === 0) {
        return res.status(400).json({ error: "Faltan datos de la orden." });
    }

    const total = articulos.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    let productosActualizados = 0;
    let errores = false;

    articulos.forEach(item => {
        conexion.query("SELECT stock FROM productos WHERE id = ?", [item.id], (err, resultados) => {
            if (err || resultados.length === 0) {
                productosActualizados++;
                if (productosActualizados === articulos.length && !errores) {
                    return res.json({ mensaje: "Compra procesada con éxito", total, metodo: metodo_pago });
                }
                return;
            }

            const stockActual = resultados[0].stock;
            const nuevoStock = Math.max(0, stockActual - item.cantidad);

            conexion.query("UPDATE productos SET stock = ? WHERE id = ?", [nuevoStock, item.id], (updateErr) => {
                if (updateErr) errores = true;
                productosActualizados++;

                if (productosActualizados === articulos.length) {
                    if (errores) return res.status(500).json({ error: "Error parcial al descontar stock." });
                    return res.json({ mensaje: "Compra procesada con éxito", total, metodo: metodo_pago });
                }
            });
        });
    });
});

// Crear Reporte de Soporte
app.post("/soporte/reporte", (req, res) => {
    const { identificacion_usuario, categoria, asunto, descripcion, imagen_url } = req.body;
    
    // 1. Verificar si el usuario ya reportó este mismo producto/asunto
    const sqlVerificar = "SELECT id FROM reportes_soporte WHERE identificacion_usuario = ? AND asunto = ?";
    
    conexion.query(sqlVerificar, [identificacion_usuario, asunto], (err, resultados) => {
        if (err) return res.status(500).json({ error: "Error en el servidor al verificar reportes." });

        if (resultados.length > 0) {
            // Si ya hay un resultado, bloqueamos la creación y enviamos un error
            return res.status(400).json({ error: "Ya has reportado este producto anteriormente." });
        }

        // 2. Si no existe, procedemos a guardarlo
        const sql = `INSERT INTO reportes_soporte (identificacion_usuario, categoria, asunto, descripcion, imagen_url, estado, fecha) VALUES (?, ?, ?, ?, ?, 'pendiente', NOW())`;
        
        conexion.query(sql, [identificacion_usuario, categoria, asunto, descripcion, imagen_url || null], (err) => {
            if (err) console.error("Aviso al guardar en BD:", err.message);
            res.json({ mensaje: "Reporte procesado exitosamente." });
        });
    });
});

// Listar Reportes de una Empresa
app.get("/empresa/:nit/reportes", (req, res) => {
    const nit = req.params.nit;
    const sql = `
        SELECT id, identificacion_usuario, asunto, descripcion, producto, imagen_url, estado, solucion, DATE_FORMAT(fecha, '%d/%m/%Y %H:%i') AS fecha 
        FROM reportes_soporte 
        WHERE nit_empresa = ? 
        ORDER BY fecha DESC
    `;
    conexion.query(sql, [nit], (error, resultados) => {
        if (error) return res.status(500).json({ error: "Error al obtener reportes." });
        res.json(resultados);
    });
});

// Resolver Reporte por parte de la Empresa
app.put("/reportes/:id/resolver", (req, res) => {
    const idReporte = req.params.id;
    const { tipo_solucion, detalle_solucion } = req.body;

    if (!tipo_solucion || !detalle_solucion) {
        return res.status(400).json({ error: "Faltan datos de resolución." });
    }

    const solucionFinal = `${tipo_solucion}: ${detalle_solucion}`;
    const sql = "UPDATE reportes_soporte SET estado = 'resuelto', solucion = ? WHERE id = ?";

    conexion.query(sql, [solucionFinal, idReporte], (error) => {
        if (error) {
            console.error("❌ Error resolviendo reporte:", error.message);
            return res.status(500).json({ error: "No se pudo actualizar en la base de datos." });
        }
        res.json({ mensaje: "Reporte resuelto con éxito.", solucion: solucionFinal });
    });
});
// Actualizar Perfil de Usuario y Foto
app.put("/usuario/:id", (req, res) => {
    const idUsuario = req.params.id;
    let { nombres, apellidos, fecha_nacimiento, telefono, correo, direccion, icono } = req.body;

    // Si la fecha viene vacía, la convertimos a null para que MySQL no dé error
    if (!fecha_nacimiento || fecha_nacimiento.trim() === "") {
        fecha_nacimiento = null;
    }

    const sql = `UPDATE usuarios SET nombres = ?, apellidos = ?, fecha_nacimiento = ?, telefono = ?, correo = ?, direccion = ?, icono = ? WHERE identificacion = ?`;
    
    conexion.query(sql, [nombres, apellidos, fecha_nacimiento, telefono, correo, direccion, icono, idUsuario], (error, resultados) => {
        if (error) {
            // Imprimimos el error real en Render para saber exactamente qué falló
            console.error("Error guardando perfil en BD:", error.message);
            return res.status(500).json({ error: "Error en la base de datos al guardar." });
        }
        res.json({ mensaje: "Perfil actualizado con éxito." });
    });
});
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor VIGA funcionando en http://0.0.0.0:${PORT}`);
});