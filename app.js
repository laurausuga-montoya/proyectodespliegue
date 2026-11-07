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
   CONFIGURACIÓN DE SUBIDA DE IMÁGENES (RUTA ABSOLUTA)
========================================= */
const uploadDir = path.resolve(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
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
app.get("/inicio", (req, res) => res.sendFile(path.resolve(__dirname, "inicio.html")));
app.get("/perfil", (req, res) => res.sendFile(path.resolve(__dirname, "perfil.html")));

/* =========================================
   AUTENTICACIÓN DE USUARIOS (LOGIN)
========================================= */
app.post("/login", function (req, res) {
    const keys = Object.keys(req.body || {});
    const correoIngresado = req.body.correo || req.body.email || req.body.username || req.body.user || (keys.length > 0 ? req.body[keys[0]] : null);
    const passwordIngresado = req.body.password || req.body.contrasena || req.body.clave || req.body.pass || (keys.length > 1 ? req.body[keys[1]] : null);

    if (!correoIngresado || !passwordIngresado) {
        return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    const sql = "SELECT * FROM usuarios WHERE correo = ? AND password = ?";
    
    conexion.query(sql, [correoIngresado, passwordIngresado], function (error, resultados) {
        if (error) {
            console.error("❌ Error en login:", error.message);
            return res.status(500).json({ error: "Error en el servidor: " + error.message });
        }
        if (resultados.length === 0) {
            return res.status(401).json({ error: "Correo o contraseña incorrectos." });
        }
        
        const usuarioEncontrado = {
            ...resultados[0],
            nombre: resultados[0].nombres || resultados[0].nombre || "Usuario",
            nombres: resultados[0].nombres || resultados[0].nombre || "Usuario"
        };

        res.json({ mensaje: "Login exitoso", usuario: usuarioEncontrado });
    });
});

/* =========================================
   AUTENTICACIÓN DE EMPRESAS
========================================= */
app.post("/login-empresa", function (req, res) {
    const correoIngresado = req.body.correo_empresarial || req.body.correo || req.body.email;
    const passwordIngresado = req.body.contrasena_empresarial || req.body.password || req.body.contrasena || req.body.clave;

    if (!correoIngresado || !passwordIngresado) {
        return res.status(400).json({ error: "Faltan el correo o la contraseña obligatorios." });
    }

    const sql = "SELECT * FROM usuarios WHERE (LOWER(correo_empresarial) = LOWER(?) OR LOWER(correo) = LOWER(?)) AND password = ?";
    
    conexion.query(sql, [correoIngresado, correoIngresado, passwordIngresado], function (error, resultados) {
        if (error) {
            console.error("❌ Error en login empresa:", error.message);
            return res.status(500).json({ error: "Error en el servidor: " + error.message });
        }
        
        if (resultados.length === 0) {
            return res.status(401).json({ error: "Correo o contraseña empresarial incorrectos." });
        }
        
        const empresaEncontrada = {
            ...resultados[0],
            id: resultados[0].id || resultados[0].identificacion || resultados[0].nit || "EMP-01",
            nit: resultados[0].nit || resultados[0].identificacion || resultados[0].id || "EMP-01",
            nombre: resultados[0].nombre_comercial || resultados[0].nombres || "Empresa"
        };

        res.json({ mensaje: "Login empresarial exitoso", empresa: empresaEncontrada });
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
   PERFIL DE USUARIO
========================================= */
function consultarPerfil(req, res) {
    const identificacion = req.params.identificacion;
    const sql = "SELECT * FROM usuarios WHERE identificacion = ?";
    
    conexion.query(sql, [identificacion], function (error, resultados) {
        if (error) {
            console.error("❌ Error al obtener perfil:", error.message);
            return res.status(500).json({ error: "Error al obtener el perfil." });
        }
        if (resultados.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado." });
        }

        const usuarioData = {
            ...resultados[0],
            nombre: resultados[0].nombres || resultados[0].nombre || "Usuario",
            nombres: resultados[0].nombres || resultados[0].nombre || "Usuario"
        };

        res.json(usuarioData);
    });
}

app.get("/usuarios/:identificacion", consultarPerfil);
app.get("/usuario/:identificacion", consultarPerfil);

/* =========================================
   PRODUCTOS Y TIENDA (GET GENERAL)
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
   OBTENER PRODUCTOS DE UNA EMPRESA
========================================= */
app.get("/empresa/:nit/productos", function (req, res) {
    const nitEmpresa = req.params.nit;
    const sql = "SELECT * FROM productos WHERE identificacion_empresa = ?";
    
    conexion.query(sql, [nitEmpresa], function (error, resultados) {
        if (error) {
            console.error("❌ Error al obtener productos de la empresa:", error.message);
            return res.status(500).json({ error: "Error al consultar los productos." });
        }
        res.json(resultados);
    });
});

/* =========================================
   CREAR PRODUCTO (POST)
========================================= */
app.post("/productos", upload.single("imagen"), function (req, res) {
    const empresaNit = req.body.identificacion_empresa || req.body.nit_empresa || req.body.nit;
    const nombreProd = req.body.nombre || req.body.nombre_producto || req.body.titulo || req.body.producto;
    const categoriaProd = req.body.categoria || req.body.cat || "Otros";
    const descripcionProd = req.body.descripcion || req.body.desc || "";
    const precioProd = req.body.precio || req.body.precio_unitario || req.body.valor || 0;
    const stockProd = req.body.stock || req.body.cantidad || req.body.existencias || 0;
    const imagen_url = req.file ? `/uploads/${req.file.filename}` : (req.body.imagen_url || null);

    if (!empresaNit || !nombreProd || !precioProd) {
        return res.status(400).json({ error: "Faltan campos obligatorios (NIT, nombre, precio)." });
    }

    const sql = `
        INSERT INTO productos (identificacion_empresa, nombre, categoria, descripcion, precio, stock, imagen_url, fecha_creacion)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    conexion.query(sql, [empresaNit, nombreProd, categoriaProd, descripcionProd, precioProd, stockProd, imagen_url], function (error, resultado) {
        if (error) {
            console.error("❌ Error al guardar producto:", error.message);
            return res.status(500).json({ error: "No se pudo guardar: " + error.message });
        }
        res.status(201).json({ mensaje: "Producto registrado con éxito.", id: resultado.insertId });
    });
});

/* =========================================
   ACTUALIZAR PRODUCTO (PUT)
========================================= */
app.put("/productos/:id", upload.single("imagen"), function (req, res) {
    const productoId = req.params.id;
    const nombreProd = req.body.nombre || req.body.nombre_producto;
    const categoriaProd = req.body.categoria || "Otros";
    const descripcionProd = req.body.descripcion || "";
    const precioProd = req.body.precio || 0;
    const stockProd = req.body.stock || 0;

    let sql = `UPDATE productos SET nombre = ?, categoria = ?, descripcion = ?, precio = ?, stock = ?`;
    let params = [nombreProd, categoriaProd, descripcionProd, precioProd, stockProd];

    if (req.file) {
        const imagen_url = `/uploads/${req.file.filename}`;
        sql += `, imagen_url = ?`;
        params.push(imagen_url);
    }

    sql += ` WHERE id = ?`;
    params.push(productoId);

    conexion.query(sql, params, function (error, resultado) {
        if (error) {
            console.error("❌ Error al actualizar producto:", error.message);
            return res.status(500).json({ error: "No se pudo actualizar: " + error.message });
        }
        res.json({ mensaje: "Producto actualizado con éxito." });
    });
});

/* =========================================
   ELIMINAR PRODUCTO (DELETE)
========================================= */
app.delete("/productos/:id", function (req, res) {
    const productoId = req.params.id;
    const sql = "DELETE FROM productos WHERE id = ?";
    conexion.query(sql, [productoId], function (error, resultado) {
        if (error) {
            console.error("❌ Error al eliminar producto:", error.message);
            return res.status(500).json({ error: "No se pudo eliminar: " + error.message });
        }
        res.json({ mensaje: "Producto eliminado con éxito." });
    });
});

/* =========================================
   SOPORTE Y REPORTES
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

/* =========================================
   INICIAR SERVIDOR
========================================= */
app.listen(PORT, "0.0.0.0", function () {
    console.log(`🚀 Servidor VIGA funcionando en http://0.0.0.0:${PORT}`);
});