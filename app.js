require('dotenv').config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================================
   MIDDLEWARE Y ARCHIVOS ESTÁTICOS
========================================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve(__dirname)));

/* =========================================
   CONFIGURACIÓN DE SUBIDA DE IMÁGENES
========================================= */
if (!fs.existsSync("./uploads")) {
    fs.mkdirSync("./uploads");
}

app.use("/uploads", express.static(path.resolve(__dirname, "uploads")));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./uploads");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, '-'));
    }
});
const upload = multer({ storage: storage });

/* =========================================
   CONEXIÓN A BASE DE DATOS MYSQL
========================================= */
const conexion = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "basedb",
    port: process.env.DB_PORT || 3306,
    ssl: { rejectUnauthorized: false }
});

conexion.connect(function (error) {
    if (error) {
        console.error("❌ Error conectando con MySQL:", error.message);
        return;
    }
    console.log("✅ Conectado correctamente a MySQL");
});

/* =========================================
   RUTAS DE VISTAS HTML
========================================= */
app.get("/", (req, res) => res.sendFile(path.resolve(__dirname, "index.html")));
app.get("/tienda", (req, res) => res.sendFile(path.resolve(__dirname, "tienda.html")));
app.get("/checkout", (req, res) => res.sendFile(path.resolve(__dirname, "checkout.html")));
app.get("/pago", (req, res) => res.sendFile(path.resolve(__dirname, "pago.html")));
app.get("/informes", (req, res) => res.sendFile(path.resolve(__dirname, "informes.html")));
app.get("/rutinas", (req, res) => res.sendFile(path.resolve(__dirname, "rutinas.html")));
app.get("/rutina-plan", (req, res) => res.sendFile(path.resolve(__dirname, "rutina.plan.html")));
app.get("/configuracion", (req, res) => res.sendFile(path.resolve(__dirname, "configuracion.html")));
app.get("/empresa", (req, res) => res.sendFile(path.resolve(__dirname, "inicio.empresa.html")));
app.get("/login-empresa", (req, res) => res.sendFile(path.resolve(__dirname, "login.empresa.html")));
app.get("/login", (req, res) => res.sendFile(path.resolve(__dirname, "login.html")));
app.get("/registro", (req, res) => res.sendFile(path.resolve(__dirname, "registro.html")));
app.get("/reportes", (req, res) => res.sendFile(path.resolve(__dirname, "reportes.html")));

/* =========================================
   AUTENTICACIÓN DE USUARIOS (LOGIN SEGURO)
========================================= */
app.post("/login", function (req, res) {
    const correoIngresado = req.body.correo || req.body.email || req.body.username;
    const passwordIngresado = req.body.password || req.body.contrasena || req.body.pass;

    if (!correoIngresado || !passwordIngresado) {
        return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    // Consulta SQL usando estrictamente la columna 'password' de tu base de datos
    const sql = "SELECT * FROM usuarios WHERE correo = ? AND password = ?";
    
    conexion.query(sql, [correoIngresado, passwordIngresado], function (error, resultados) {
        if (error) {
            console.error("❌ Error en login:", error.message);
            return res.status(500).json({ error: "Error en el servidor: " + error.message });
        }
        if (resultados.length === 0) {
            return res.status(401).json({ error: "Correo o contraseña incorrectos." });
        }
        res.json({ mensaje: "Login exitoso", usuario: resultados[0] });
    });
});

app.post("/registro", function (req, res) {
    const { identificacion, correo, email, password, nombre, nombres } = req.body;
    const corr = correo || email;
    const clav = password;
    const nom = nombres || nombre || "Usuario";
    const id = identificacion || ("CLI-" + Date.now());

    const sql = "INSERT INTO usuarios (identificacion, correo, password, nombres) VALUES (?, ?, ?, ?)";
    
    conexion.query(sql, [id, corr, clav, nom], function (error, resultado) {
        if (error) {
            console.error("❌ Error en registro:", error.message);
            return res.status(500).json({ error: "No se pudo registrar el usuario: " + error.message });
        }
        res.status(201).json({ mensaje: "Usuario registrado con éxito." });
    });
});

/* =========================================
   PRODUCTOS Y TIENDA
========================================= */
app.get("/productos", function (req, res) {
    const sql = `
        SELECT 
            p.*, 
            p.identificacion_empresa AS nit_empresa,
            COALESCE(p.correo_empresa, 'smarfit@gmail.com') AS correo_empresa
        FROM productos p
        ORDER BY (p.stock > 0) DESC, p.fecha_creacion DESC
    `;
    conexion.query(sql, function (error, resultados) {
        if (error) return res.status(500).json({ error: "Error cargando la tienda." });
        res.json(resultados);
    });
});

/* =========================================
   SOPORTE Y REPORTES CON FOTO (CLIENTE)
========================================= */
app.post("/soporte/reportar-empresa", upload.single("imagen"), function (req, res) {
    const { cliente_id, nit_empresa, correo_empresa, producto, orden, asunto, descripcion } = req.body;
    const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (!nit_empresa || !producto || !asunto || !descripcion) {
        return res.status(400).json({ error: "Faltan datos obligatorios para el reporte." });
    }

    const sql = `
        INSERT INTO reportes_soporte (identificacion_usuario, categoria, asunto, descripcion, nit_empresa, correo_empresa, producto, orden_compra, imagen_url, estado) 
        VALUES (?, 'Producto', ?, ?, ?, ?, ?, ?, ?, 'Pendiente')
    `;

    conexion.query(sql, [cliente_id || null, asunto, descripcion, nit_empresa, correo_empresa, producto, orden || null, imagen_url], function (error, resultado) {
        if (error) {
            console.error("❌ Error al guardar reporte:", error.message);
            return res.status(500).json({ error: "No se pudo registrar el reporte." });
        }
        res.status(201).json({ mensaje: "Reporte enviado con éxito.", id: resultado.insertId });
    });
});

// Ver reportes de un usuario
app.get("/soporte/mis-reportes/:identificacion", function (req, res) {
    const identificacion = req.params.identificacion;
    const sql = `
        SELECT id, categoria, asunto, descripcion, producto, nit_empresa, correo_empresa, imagen_url, estado, solucion, DATE_FORMAT(fecha, '%d/%m/%Y %H:%i') AS fecha 
        FROM reportes_soporte 
        WHERE identificacion_usuario = ? 
        ORDER BY fecha DESC
    `;
    conexion.query(sql, [identificacion], function (error, resultados) {
        if (error) return res.status(500).json({ error: "Error al consultar los reportes." });
        res.json(resultados);
    });
});

/* =========================================
   PANEL EMPRESARIAL: RESOLVER REPORTE
========================================= */
app.get("/empresa/:nit/reportes", function (req, res) {
    const nit = req.params.nit;
    const sql = `
        SELECT id, identificacion_usuario, asunto, descripcion, producto, orden_compra, imagen_url, estado, solucion, DATE_FORMAT(fecha, '%d/%m/%Y %H:%i') AS fecha 
        FROM reportes_soporte 
        WHERE nit_empresa = ? 
        ORDER BY fecha DESC
    `;
    conexion.query(sql, [nit], function (error, resultados) {
        if (error) return res.status(500).json({ error: "Error al obtener reportes de la empresa." });
        res.json(resultados);
    });
});

// Resolver reporte: Reembolso (rebajando 15%) o Reenvío (en 30 días hábiles)
app.post("/empresa/resolver-reporte/:id", function (req, res) {
    const reporteId = req.params.id;
    const { tipo_resolucion, precio_producto } = req.body; 

    if (!tipo_resolucion) {
        return res.status(400).json({ error: "Debe especificar el tipo de resolución." });
    }

    let mensajeSolucion = "";

    if (tipo_resolucion === "reembolso") {
        const precioOriginal = Number(precio_producto) || 0;
        const montoReembolso = precioOriginal * 0.85; 
        mensajeSolucion = `Reembolso aprobado por $${montoReembolso.toLocaleString('es-CO')} (aplicada deducción del 15%).`;
    } else if (tipo_resolucion === "reenvio") {
        mensajeSolucion = `Nuevo producto en proceso de reenvío. Llegará en un plazo de 30 días hábiles.`;
    } else {
        return res.status(400).json({ error: "Tipo de resolución no válido." });
    }

    const sql = `UPDATE reportes_soporte SET estado = 'Resuelto', solucion = ? WHERE id = ?`;
    conexion.query(sql, [mensajeSolucion, reporteId], function (error, resultado) {
        if (error) {
            console.error("❌ Error al resolver reporte:", error);
            return res.status(500).json({ error: "Error al procesar la solución." });
        }
        res.json({ mensaje: "Reporte resuelto y notificado al usuario con éxito.", solucion: mensajeSolucion });
    });
});

/* =========================================
   INICIAR SERVIDOR
========================================= */
app.listen(PORT, "0.0.0.0", function () {
    console.log(`🚀 Servidor VIGA funcionando en http://0.0.0.0:${PORT}`);
});