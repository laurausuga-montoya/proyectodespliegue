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

// Aumentamos el límite a 50mb para permitir recibir imágenes adjuntas (Base64) desde los reportes
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

// ==========================================
// RUTAS DE VISTAS HTML
// ==========================================
app.get("/", (req, res) => res.sendFile(path.resolve(__dirname, "index.html")));
app.get("/login", (req, res) => res.sendFile(path.resolve(__dirname, "login.html")));
app.get("/tienda", (req, res) => res.sendFile(path.resolve(__dirname, "tienda.html")));
app.get("/empresa", (req, res) => res.sendFile(path.resolve(__dirname, "inicio.empresa.html")));
app.get("/login-empresa", (req, res) => res.sendFile(path.resolve(__dirname, "login.empresa.html")));

// ==========================================
// USUARIOS PERSONALES
// ==========================================

// Login de Usuario Personal
app.post("/login", (req, res) => {
    const correo = req.body.correo || req.body.email;
    const password = req.body.password || req.body.contrasena || req.body.clave;

    if (!correo || !password) {
        return res.status(400).json({ error: "Faltan credenciales obligatorias." });
    }

    const sql = "SELECT * FROM usuarios WHERE LOWER(correo) = LOWER(?) AND password = ?";
    conexion.query(sql, [correo, password], (error, resultados) => {
        if (error) {
            console.error("❌ Error en login personal:", error.message);
            return res.status(500).json({ error: "Error en el servidor: " + error.message });
        }
        if (resultados.length === 0) {
            return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
        }

        res.json({ mensaje: "Login exitoso", usuario: resultados[0] });
    });
});

// Obtener datos del perfil de un usuario
app.get("/usuarios/:id", (req, res) => {
    const idUsuario = req.params.id;
    
    const sql = "SELECT * FROM usuarios WHERE identificacion = ?";
    
    conexion.query(sql, [idUsuario], (error, resultados) => {
        if (error) {
            console.error("❌ Error al obtener perfil:", error.message);
            return res.status(500).json({ error: "Error en el servidor." });
        }
        if (resultados.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado." });
        }
        
        res.json(resultados[0]);
    });
});

// ==========================================
// EMPRESAS
// ==========================================

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

// ==========================================
// PRODUCTOS
// ==========================================

// Obtener todos los productos (Tienda general)
app.get("/productos", (req, res) => {
    const sql = "SELECT p.*, p.identificacion_empresa AS nit_empresa FROM productos p ORDER BY p.fecha_creacion DESC";
    conexion.query(sql, (error, resultados) => {
        if (error) return res.status(500).json({ error: "Error cargando productos." });
        res.json(resultados);
    });
});

// Obtener productos de una empresa específica
app.get("/empresa/:nit/productos", (req, res) => {
    const nitEmpresa = req.params.nit;
    const sql = "SELECT * FROM productos WHERE identificacion_empresa = ?";
    conexion.query(sql, [nitEmpresa], (error, resultados) => {
        if (error) {
            console.error("❌ Error al obtener productos:", error.message);
            return res.status(500).json({ error: "Error al consultar los productos." });
        }
        res.json(resultados);
    });
});

// Crear producto (POST)
app.post(["/productos", "/empresa/:nit/productos"], upload.single("imagen"), (req, res) => {
    const empresaNit = req.params.nit || req.body.identificacion_empresa || req.body.nit_empresa || req.body.nit;
    const nombreProd = req.body.nombre || req.body.nombre_producto || req.body.titulo;
    const categoriaProd = req.body.categoria || "Otros";
    const descripcionProd = req.body.descripcion || "";
    const precioProd = req.body.precio || 0;
    const stockProd = req.body.stock || 0;
    const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (!empresaNit || !nombreProd || !precioProd) {
        return res.status(400).json({ error: "Faltan campos obligatorios (NIT, nombre o precio)." });
    }

    const sql = `
        INSERT INTO productos (identificacion_empresa, nombre, categoria, descripcion, precio, stock, imagen_url, fecha_creacion)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    conexion.query(sql, [empresaNit, nombreProd, categoriaProd, descripcionProd, precioProd, stockProd, imagen_url], (error, resultado) => {
        if (error) {
            console.error("❌ Error al guardar producto en MySQL:", error.message);
            return res.status(500).json({ error: "No se pudo guardar: " + error.message });
        }
        res.status(201).json({ mensaje: "Producto registrado con éxito.", id: resultado.insertId });
    });
});

// Actualizar producto (PUT)
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
        if (error) {
            console.error("❌ Error al actualizar producto en MySQL:", error.message);
            return res.status(500).json({ error: "No se pudo actualizar." });
        }
        res.json({ mensaje: "Actualizado con éxito." });
    });
});

// Eliminar producto (DELETE)
app.delete(["/productos/:id", "/empresa/:nit/productos/:id"], (req, res) => {
    const sql = "DELETE FROM productos WHERE id = ?";
    conexion.query(sql, [req.params.id], (error) => {
        if (error) {
            console.error("❌ Error al eliminar producto en MySQL:", error.message);
            return res.status(500).json({ error: "No se pudo eliminar." });
        }
        res.json({ mensaje: "Eliminado con éxito." });
    });
});

// ==========================================
// COMPRAS Y REPORTES
// ==========================================

// Procesar compra, descontar del inventario y responder éxito
app.post("/compras/procesar", (req, res) => {
    const { articulos, cliente, metodo_pago } = req.body;

    if (!articulos || !cliente || articulos.length === 0) {
        return res.status(400).json({ error: "Faltan datos de la orden." });
    }

    const total = articulos.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    let productosActualizados = 0;
    let errores = false;

    // Iterar sobre cada artículo para actualizar su stock
    articulos.forEach(item => {
        conexion.query("SELECT stock FROM productos WHERE id = ?", [item.id], (err, resultados) => {
            // Si hay un error con este artículo, lo saltamos pero sumamos a la cuenta para que no se quede colgado
            if (err || resultados.length === 0) {
                productosActualizados++;
                if (productosActualizados === articulos.length && !errores) {
                    return res.json({ mensaje: "Compra procesada con éxito", total, metodo: metodo_pago });
                }
                return;
            }

            const stockActual = resultados[0].stock;
            const nuevoStock = stockActual - item.cantidad;
            const stockFinal = nuevoStock < 0 ? 0 : nuevoStock; // Evita stock negativo

            conexion.query("UPDATE productos SET stock = ? WHERE id = ?", [stockFinal, item.id], (updateErr) => {
                if (updateErr) {
                    console.error("Error descontando stock:", updateErr.message);
                    errores = true;
                }
                
                productosActualizados++;
                
                // Si ya procesamos todos los artículos, terminamos
                if (productosActualizados === articulos.length) {
                    if (errores) {
                        return res.status(500).json({ error: "Hubo un error descontando el stock parcial." });
                    }
                    return res.json({ mensaje: "Compra procesada con éxito", total, metodo: metodo_pago });
                }
            });
        });
    });
});

// Guardar un reporte enviado hacia la base de datos MySQL
app.post("/soporte/reporte", (req, res) => {
    const { identificacion_usuario, categoria, asunto, descripcion, imagen_url } = req.body;
    
    // Si usas la tabla 'reportes_soporte' se inserta así. Si no existe aún la tabla, la respuesta no rompe el flujo
    const sql = `INSERT INTO reportes_soporte (identificacion_usuario, categoria, asunto, descripcion, imagen_url, estado, fecha) VALUES (?, ?, ?, ?, ?, 'pendiente', NOW())`;
    
    conexion.query(sql, [identificacion_usuario, categoria, asunto, descripcion, imagen_url || null], (err) => {
        if (err) {
            console.error("No se pudo insertar reporte, pero el frontend continúa:", err.message);
        }
        res.json({ mensaje: "Reporte procesado exitosamente." });
    });
});

// Obtener reportes de soporte de la empresa
app.get("/empresa/:nit/reportes", (req, res) => {
    const nit = req.params.nit;
    const sql = `
        SELECT id, identificacion_usuario, asunto, descripcion, producto, orden_compra, imagen_url, estado, solucion, DATE_FORMAT(fecha, '%d/%m/%Y %H:%i') AS fecha 
        FROM reportes_soporte 
        WHERE nit_empresa = ? 
        ORDER BY fecha DESC
    `;
    conexion.query(sql, [nit], (error, resultados) => {
        if (error) return res.status(500).json({ error: "Error al obtener reportes." });
        res.json(resultados);
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor VIGA funcionando en http://0.0.0.0:${PORT}`);
});