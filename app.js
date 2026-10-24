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

// Servir archivos estáticos del proyecto
app.use(express.static(path.resolve(__dirname)));

/* =========================================
   RUTA DIRECTA PARA FORZAR EL CSS
========================================= */
app.get("/index.css", function (req, res) {
    res.setHeader("Content-Type", "text/css");
    res.sendFile(path.resolve(__dirname, "index.css"), function (err) {
        if (err) {
            console.error("❌ Error al enviar index.css:", err);
            res.status(404).send("Archivo index.css no encontrado.");
        }
    });
});

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
    ssl: { 
        rejectUnauthorized: false 
    }
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
app.get("/", function (req, res) {
    res.sendFile(path.resolve(__dirname, "index.html"));
});

app.get("/tienda", function (req, res) {
    res.sendFile(path.resolve(__dirname, "tienda.html"));
});

app.get("/empresa", function (req, res) {
    res.sendFile(path.resolve(__dirname, "index.empresa.html"));
});

app.get("/login-empresa", function (req, res) {
    res.sendFile(path.resolve(__dirname, "login.empresa.html"));
});

/* =========================================
   USUARIOS: REGISTRO Y LOGIN
========================================= */
app.post("/registrar", function (req, res) {
    const { identificacion, nombres, apellidos, fecha_nacimiento, telefono, correo, password, direccion } = req.body;

    if (!identificacion || !nombres || !apellidos || !fecha_nacimiento || !correo || !password) {
        return res.status(400).json({ error: "Faltan datos obligatorios." });
    }

    const sql = `
        INSERT INTO usuarios (identificacion, nombres, apellidos, fecha_nacimiento, telefono, correo, password, direccion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const valores = [identificacion, nombres, apellidos, fecha_nacimiento, telefono || null, correo, password, direccion || null];

    conexion.query(sql, valores, function (error, resultado) {
        if (error) {
            if (error.code === "ER_DUP_ENTRY") {
                return res.status(400).json({ error: "La identificación o el correo ya están registrados." });
            }
            return res.status(500).json({ error: "No se pudo guardar el usuario." });
        }
        res.status(201).json({ mensaje: "Usuario registrado correctamente.", id: resultado.insertId });
    });
});

app.post("/login", function (req, res) {
    const usuario = req.body.usuario || req.body.correo;
    const password = req.body.password;

    if (!usuario || !password) {
        return res.status(400).json({ mensaje: "Completa usuario y contraseña." });
    }

    const sql = `
        SELECT identificacion, nombres, apellidos, fecha_nacimiento, telefono, correo, direccion, icono, tema, notificaciones_rutina, notificaciones_alimentacion
        FROM usuarios 
        WHERE (correo = ? OR telefono = ? OR identificacion = ?) AND password = ? 
        LIMIT 1
    `;

    conexion.query(sql, [usuario, usuario, usuario, password], function (error, resultados) {
        if (error) return res.status(500).json({ mensaje: "Error en la base de datos." });
        if (resultados.length === 0) return res.status(401).json({ mensaje: "Usuario o contraseña incorrectos." });
        res.json({ mensaje: "Inicio de sesión correcto.", usuario: resultados[0] });
    });
});

/* =========================================
   EMPRESAS: REGISTRO Y LOGIN
========================================= */
app.post("/registrar-empresa", function (req, res) {
    const { nombre_comercial, nit, telefono, correo, direccion, password } = req.body;

    if (!nit || !nombre_comercial || !correo || !password) {
        return res.status(400).json({ error: "Faltan datos obligatorios." });
    }

    const sql = `
        INSERT INTO usuarios 
        (identificacion, nit, nombre_comercial, correo_empresarial, telefono_empresarial, direccion_comercial, contrasena_empresarial) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const valores = [nit, nit, nombre_comercial, correo, telefono || null, direccion || null, password];

    conexion.query(sql, valores, function (error) {
        if (error) {
            if (error.code === "ER_DUP_ENTRY") {
                return res.status(400).json({ error: "El NIT o el correo ya están registrados." });
            }
            return res.status(500).json({ error: "No se pudo registrar la empresa." });
        }
        res.status(201).json({ mensaje: "Empresa registrada correctamente." });
    });
});

app.post("/login-empresa", function (req, res) {
    const { correo_empresarial, contrasena_empresarial } = req.body;

    if (!correo_empresarial || !contrasena_empresarial) {
        return res.status(400).json({ error: "Completa el correo y la contraseña." });
    }

    const sql = `
        SELECT identificacion as id, nit, nombre_comercial as nombre, correo_empresarial as correo 
        FROM usuarios 
        WHERE correo_empresarial = ? AND contrasena_empresarial = ? 
        LIMIT 1
    `;

    conexion.query(sql, [correo_empresarial, contrasena_empresarial], function (error, resultados) {
        if (error) return res.status(500).json({ error: "Error en el servidor." });
        if (resultados.length === 0) return res.status(401).json({ error: "Correo o contraseña empresarial incorrectos." });
        
        res.json({ mensaje: "Inicio de sesión exitoso.", empresa: resultados[0] });
    });
});

/* =========================================
   PRODUCTOS EN LA TABLA USUARIOS
========================================= */
// Guardar un producto dentro de la tabla usuarios
app.post("/empresa/:id/productos", upload.single("imagen"), function (req, res) {
    const nit_empresa = req.params.id;
    const { nombre, categoria, descripcion, precio, stock } = req.body;
    const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;

    console.log("👉 Guardando producto en tabla usuarios para empresa:", nit_empresa);

    const sql = `
        INSERT INTO usuarios (
            identificacion, nit, nombre_producto, categoria_producto, 
            descripcion_producto, precio_producto, stock_producto, imagen_producto
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    conexion.query(
        sql,
        [
            nit_empresa,
            nit_empresa,
            nombre,
            categoria,
            descripcion,
            Number(precio),
            parseInt(stock) || 0,
            imagen_url
        ],
        function (error, resultado) {
            if (error) {
                console.error("❌ Error guardando producto en usuarios:", error);
                return res.status(500).json({ error: "Error al guardar el producto: " + error.message });
            }
            res.status(201).json({ mensaje: "Producto guardado con éxito.", id: resultado.insertId });
        }
    );
});

// Listar productos de la empresa
app.get("/empresa/:id/productos", function (req, res) {
    const nit_empresa = req.params.id;
    const sql = `
        SELECT 
            id,
            nombre_producto AS nombre,
            categoria_producto AS categoria,
            descripcion_producto AS descripcion,
            precio_producto AS precio,
            stock_producto AS stock,
            imagen_producto AS imagen_url
        FROM usuarios 
        WHERE (identificacion = ? OR nit = ?) AND nombre_producto IS NOT NULL
        ORDER BY fecha_producto DESC
    `;

    conexion.query(sql, [nit_empresa, nit_empresa], function (error, resultados) {
        if (error) return res.status(500).json({ error: "Error al cargar los productos." });
        res.json(resultados);
    });
});

// Eliminar producto
app.delete("/empresa/:id_empresa/productos/:id_producto", function (req, res) {
    const { id_producto } = req.params;
    const sql = "DELETE FROM usuarios WHERE id = ? AND nombre_producto IS NOT NULL";

    conexion.query(sql, [id_producto], function (error) {
        if (error) return res.status(500).json({ error: "Error al eliminar el producto." });
        res.json({ mensaje: "Producto eliminado correctamente." });
    });
});

// Tienda pública de clientes (productos disponibles)
app.get("/productos", function (req, res) {
    const sql = `
        SELECT 
            id,
            nombre_producto AS nombre,
            categoria_producto AS categoria,
            descripcion_producto AS descripcion,
            precio_producto AS precio,
            stock_producto AS stock,
            imagen_producto AS imagen_url
        FROM usuarios 
        WHERE nombre_producto IS NOT NULL AND stock_producto > 0
        ORDER BY fecha_producto DESC
    `;

    conexion.query(sql, function (error, resultados) {
        if (error) return res.status(500).json({ error: "Error cargando la tienda." });
        res.json(resultados);
    });
});

/* =========================================
   PERFIL Y CONFIGURACIONES (USUARIOS)
========================================= */
app.get("/usuario/:identificacion", function (req, res) {
    const identificacion = req.params.identificacion;
    const sql = `SELECT identificacion, nombres, apellidos, fecha_nacimiento, telefono, correo, direccion, icono, tema, notificaciones_rutina, notificaciones_alimentacion FROM usuarios WHERE identificacion = ? LIMIT 1`;

    conexion.query(sql, [identificacion], function (error, resultados) {
        if (error) return res.status(500).json({ mensaje: "Error consultando la base de datos." });
        if (resultados.length === 0) return res.status(404).json({ mensaje: "Usuario no encontrado." });
        res.json(resultados[0]);
    });
});

app.put("/usuario/:identificacion", function (req, res) {
    const identificacion = req.params.identificacion;
    const { nombres, apellidos, fecha_nacimiento, telefono, correo, direccion, icono } = req.body;
    const sql = `UPDATE usuarios SET nombres=?, apellidos=?, fecha_nacimiento=?, telefono=?, correo=?, direccion=?, icono=? WHERE identificacion=?`;

    conexion.query(sql, [nombres, apellidos, fecha_nacimiento, telefono, correo, direccion, icono, identificacion], function (error, resultado) {
        if (error) return res.status(500).json({ mensaje: "No se pudo actualizar el perfil." });
        if (resultado.affectedRows === 0) return res.status(404).json({ mensaje: "Usuario no encontrado." });
        res.json({ mensaje: "Perfil actualizado correctamente." });
    });
});

app.put("/configuracion/:identificacion", function (req, res) {
    const identificacion = req.params.identificacion;
    const { tema, notificaciones_rutina, notificaciones_alimentacion } = req.body;
    const temaFinal = tema === "claro" ? "claro" : "oscuro";
    const rutina = Number(notificaciones_rutina) === 1 ? 1 : 0;
    const alimentacion = Number(notificaciones_alimentacion) === 1 ? 1 : 0;

    const sql = `UPDATE usuarios SET tema=?, notificaciones_rutina=?, notificaciones_alimentacion=? WHERE identificacion=?`;

    conexion.query(sql, [temaFinal, rutina, alimentacion, identificacion], function (error, resultado) {
        if (error) return res.status(500).json({ mensaje: "Error guardando las configuraciones." });
        if (resultado.affectedRows === 0) return res.status(404).json({ mensaje: "Usuario no encontrado." });
        res.json({ mensaje: "Configuraciones guardadas correctamente." });
    });
});

app.put("/configuracion/:identificacion/password", function (req, res) {
    const identificacion = req.params.identificacion;
    const { passwordActual, passwordNueva } = req.body;

    if (!passwordActual || !passwordNueva) return res.status(400).json({ mensaje: "Debes completar las contraseñas." });

    const buscarSql = `SELECT password FROM usuarios WHERE identificacion = ? LIMIT 1`;
    conexion.query(buscarSql, [identificacion], function (error, resultados) {
        if (error) return res.status(500).json({ mensaje: "Error consultando la cuenta." });
        if (resultados.length === 0) return res.status(404).json({ mensaje: "Usuario no encontrado." });

        if (String(resultados[0].password) !== String(passwordActual)) {
            return res.status(401).json({ mensaje: "La contraseña actual es incorrecta." });
        }

        const actualizarSql = `UPDATE usuarios SET password = ? WHERE identificacion = ?`;
        conexion.query(actualizarSql, [passwordNueva, identificacion], function (errorActualizar) {
            if (errorActualizar) return res.status(500).json({ mensaje: "No se pudo cambiar la contraseña." });
            res.json({ mensaje: "Contraseña cambiada correctamente." });
        });
    });
});

/* =========================================
   PERFIL FÍSICO / RUTINA DEL USUARIO
========================================= */
// Consultar datos físicos, objetivo y días
app.get("/usuario/:identificacion/datos-fisicos", function (req, res) {
    const { identificacion } = req.params;
    const sql = `
        SELECT peso, altura, lesion, objetivo, lugar_entrenamiento, intensidad, dias_entreno 
        FROM usuarios 
        WHERE identificacion = ? 
        LIMIT 1
    `;

    conexion.query(sql, [identificacion], function (error, resultados) {
        if (error) {
            return res.status(500).json({ error: "Error consultando los datos físicos." });
        }
        if (resultados.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado." });
        }
        res.json(resultados[0]);
    });
});

// Guardar o actualizar datos físicos, objetivo y días
app.put("/usuario/:identificacion/datos-fisicos", function (req, res) {
    const { identificacion } = req.params;
    const { peso, altura, lesion, objetivo, lugar_entrenamiento, intensidad, dias_entreno } = req.body;

    const sql = `
        UPDATE usuarios 
        SET peso = ?, altura = ?, lesion = ?, objetivo = ?, lugar_entrenamiento = ?, intensidad = ?, dias_entreno = ?
        WHERE identificacion = ?
    `;

    conexion.query(
        sql, 
        [
            peso, 
            altura, 
            lesion || 'ninguna', 
            objetivo, 
            lugar_entrenamiento, 
            intensidad, 
            dias_entreno ? parseInt(dias_entreno) : 5, 
            identificacion
        ], 
        function (error, resultado) {
            if (error) {
                console.error("Error guardando datos físicos:", error);
                return res.status(500).json({ error: "No se pudieron guardar los datos." });
            }
            res.json({ mensaje: "Datos físicos guardados correctamente." });
        }
    );
});

/* =========================================
   INICIAR SERVIDOR (0.0.0.0)
========================================= */
app.listen(PORT, "0.0.0.0", function () {
    console.log(`🚀 Servidor VIGA funcionando en http://0.0.0.0:${PORT}`);
});