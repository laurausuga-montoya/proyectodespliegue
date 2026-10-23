require('dotenv').config(); // 👈 Vital para leer el archivo .env
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const multer = require("multer"); // 👈 Nuevo para subir imágenes
const fs = require("fs");         // 👈 Nuevo para manejar carpetas

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================================
   MIDDLEWARE
========================================= */
app.use(cors());
app.use(express.json());

// Archivos estáticos
app.use(express.static(path.resolve(__dirname, "..")));

/* =========================================
   CONFIGURACIÓN DE IMÁGENES (MULTER)
========================================= */
// Crea la carpeta "uploads" si no existe
if (!fs.existsSync("./uploads")) {
    fs.mkdirSync("./uploads");
}

// Hacer pública la carpeta de imágenes
app.use("/uploads", express.static(path.resolve(__dirname, "uploads")));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./uploads");
    },
    filename: function (req, file, cb) {
        // Renombra el archivo para evitar duplicados
        cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, '-'));
    }
});
const upload = multer({ storage: storage });

/* =========================================
   CONEXIÓN MYSQL
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
        console.error("❌ Error detallado conectando con MySQL:", error.message);
        return;
    }
    console.log("✅ Conectado correctamente a MySQL");
});

/* =========================================
   VISTAS HTML (FRONTEND LOCAL)
========================================= */
app.get("/", function (req, res) {
    res.sendFile(path.resolve(__dirname, "index.html"));
});

app.get("/empresa", function (req, res) {
    res.sendFile(path.resolve(__dirname, "index.empresa.html"));
});

app.get("/login-empresa", function (req, res) {
    res.sendFile(path.resolve(__dirname, "login.empresa.html"));
});

/* =========================================
   REGISTRO Y LOGIN DE USUARIOS NORMALES
========================================= */
app.post("/registrar", function (req, res) {
    const { identificacion, nombres, apellidos, fecha_nacimiento, telefono, correo, password, direccion } = req.body;

    if (!identificacion || !nombres || !apellidos || !fecha_nacimiento || !correo || !password) {
        return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    const sql = `
        INSERT INTO usuarios (identificacion, nombres, apellidos, fecha_nacimiento, telefono, correo, password, direccion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const valores = [identificacion, nombres, apellidos, fecha_nacimiento, telefono || null, correo, password, direccion || null];

    conexion.query(sql, valores, function (error, resultado) {
        if (error) {
            if (error.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "La identificación o el correo ya están registrados." });
            return res.status(500).json({ error: "No se pudo guardar el usuario." });
        }
        res.status(201).json({ mensaje: "Usuario registrado correctamente", id: resultado.insertId });
    });
});

app.post("/login", function (req, res) {
    const usuario = req.body.usuario || req.body.correo;
    const password = req.body.password;

    if (!usuario || !password) return res.status(400).json({ mensaje: "Completa usuario y contraseña." });

    const sql = `
        SELECT identificacion, nombres, apellidos, fecha_nacimiento, telefono, correo, direccion, icono, tema, notificaciones_rutina, notificaciones_alimentacion
        FROM usuarios 
        WHERE (correo = ? OR telefono = ? OR identificacion = ?) AND password = ? LIMIT 1
    `;

    conexion.query(sql, [usuario, usuario, usuario, password], function (error, resultados) {
        if (error) return res.status(500).json({ mensaje: "Error en la base de datos." });
        if (resultados.length === 0) return res.status(401).json({ mensaje: "Usuario o contraseña incorrectos." });
        res.json({ mensaje: "Inicio de sesión correcto.", usuario: resultados[0] });
    });
});

/* =========================================
   REGISTRO Y LOGIN DE EMPRESAS
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
            if (error.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "El NIT o el correo ya están registrados." });
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
        WHERE correo_empresarial = ? AND contrasena_empresarial = ? LIMIT 1
    `;

    conexion.query(sql, [correo_empresarial, contrasena_empresarial], function (error, resultados) {
        if (error) return res.status(500).json({ error: "Error en el servidor." });
        if (resultados.length === 0) return res.status(401).json({ error: "Correo o contraseña empresarial incorrectos." });
        
        res.json({ mensaje: "Inicio de sesión exitoso.", empresa: resultados[0] });
    });
});

/* =========================================
   GESTIÓN DE PRODUCTOS (PANEL EMPRESARIAL)
========================================= */
// Obtener productos de una empresa
app.get("/empresa/:id/productos", function (req, res) {
    const identificacion_empresa = req.params.id;
    const sql = "SELECT * FROM productos WHERE identificacion_empresa = ? ORDER BY fecha_creacion DESC";
    
    conexion.query(sql, [identificacion_empresa], function (error, resultados) {
        if (error) return res.status(500).json({ error: "Error al cargar el catálogo." });
        res.json(resultados);
    });
});

// Crear un producto
app.post("/empresa/:id/productos", upload.single("imagen"), function (req, res) {
    const identificacion_empresa = req.params.id;
    const { nombre, categoria, descripcion, precio, stock } = req.body;
    const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;

    const sql = `
        INSERT INTO productos (identificacion_empresa, nombre, categoria, descripcion, precio, stock, imagen_url) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    conexion.query(sql, [identificacion_empresa, nombre, categoria, descripcion, precio, stock, imagen_url], function (error, resultado) {
        if (error) return res.status(500).json({ error: "Error al guardar el producto." });
        res.status(201).json({ mensaje: "Producto guardado", id: resultado.insertId });
    });
});

// Editar un producto
app.put("/empresa/:id_empresa/productos/:id_producto", upload.single("imagen"), function (req, res) {
    const { id_empresa, id_producto } = req.params;
    const { nombre, categoria, descripcion, precio, stock } = req.body;
    
    if (req.file) {
        const imagen_url = `/uploads/${req.file.filename}`;
        const sql = `UPDATE productos SET nombre=?, categoria=?, descripcion=?, precio=?, stock=?, imagen_url=? WHERE id=? AND identificacion_empresa=?`;
        conexion.query(sql, [nombre, categoria, descripcion, precio, stock, imagen_url, id_producto, id_empresa], function (error) {
            if (error) return res.status(500).json({ error: "Error al actualizar." });
            res.json({ mensaje: "Producto actualizado." });
        });
    } else {
        const sql = `UPDATE productos SET nombre=?, categoria=?, descripcion=?, precio=?, stock=? WHERE id=? AND identificacion_empresa=?`;
        conexion.query(sql, [nombre, categoria, descripcion, precio, stock, id_producto, id_empresa], function (error) {
            if (error) return res.status(500).json({ error: "Error al actualizar." });
            res.json({ mensaje: "Producto actualizado." });
        });
    }
});

// Eliminar un producto
app.delete("/empresa/:id_empresa/productos/:id_producto", function (req, res) {
    const { id_empresa, id_producto } = req.params;
    const sql = "DELETE FROM productos WHERE id = ? AND identificacion_empresa = ?";
    
    conexion.query(sql, [id_producto, id_empresa], function (error) {
        if (error) return res.status(500).json({ error: "Error al eliminar." });
        res.json({ mensaje: "Producto eliminado." });
    });
});

/* =========================================
   TIENDA PÚBLICA (CLIENTES)
========================================= */
app.get("/productos", function (req, res) {
    // Retorna todos los productos con stock > 0
    const sql = "SELECT * FROM productos WHERE stock > 0 ORDER BY fecha_creacion DESC";
    
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
        conexion.query(actualizarSql, [passwordNueva, identificacion], function (errorActualizar, resultado) {
            if (errorActualizar) return res.status(500).json({ mensaje: "No se pudo cambiar la contraseña." });
            res.json({ mensaje: "Contraseña cambiada correctamente." });
        });
    });
});

/* =========================================
   INICIAR SERVIDOR
========================================= */
app.listen(PORT, function () {
    console.log(`🚀 Servidor VIGA funcionando en http://localhost:${PORT}`);
});