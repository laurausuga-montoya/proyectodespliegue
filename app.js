const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");

const app = express();

// Puerto dinámico para Render (o 3000 por defecto en local)
const PORT = process.env.PORT || 3000;

/* =========================================
   MIDDLEWARES ESENCIALES
========================================= */
app.use(cors());
app.use(express.json());

// Servir archivos estáticos directamente desde la carpeta raíz
app.use(express.static(path.resolve(__dirname)));


/* =========================================
   CONEXIÓN MYSQL (Soporte local y Aiven/Render)
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
        console.error("❌ Error detallado conectando con MySQL:", {
            mensaje: error.message,
            codigo: error.code,
            errno: error.errno,
            sqlState: error.sqlState
        });
        return;
    }
    console.log("✅ Conectado correctamente a MySQL");
});


/* =========================================
   RUTA PRINCIPAL
========================================= */
app.get("/", function (req, res) {
    res.sendFile(path.resolve(__dirname, "index.html"), function (error) {
        if (error) {
            console.error("Error al cargar index.html:", error);
            res.status(error.statusCode || 500).send("No se pudo cargar la página principal.");
        }
    });
});


/* =========================================
   REGISTRAR USUARIO
========================================= */
app.post("/registrar", function (req, res) {
    const {
        identificacion,
        nombres,
        apellidos,
        fecha_nacimiento,
        telefono,
        correo,
        password,
        direccion
    } = req.body;

    if (
        !identificacion ||
        !nombres ||
        !apellidos ||
        !fecha_nacimiento ||
        !correo ||
        !password
    ) {
        return res.status(400).json({
            error: "Faltan datos obligatorios"
        });
    }

    const sql = `
        INSERT INTO usuarios
        (
            identificacion,
            nombres,
            apellidos,
            fecha_nacimiento,
            telefono,
            correo,
            password,
            direccion
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const valores = [
        identificacion,
        nombres,
        apellidos,
        fecha_nacimiento,
        telefono || null,
        correo,
        password,
        direccion || null
    ];

    conexion.query(sql, valores, function (error, resultado) {
        if (error) {
            console.error("❌ Error registrando usuario:", error);

            if (error.code === "ER_DUP_ENTRY") {
                return res.status(400).json({
                    error: "La identificación o el correo ya están registrados."
                });
            }

            return res.status(500).json({
                error: "No se pudo guardar el usuario en la base de datos."
            });
        }

        console.log("✅ Usuario registrado con identificación:", identificacion);

        res.status(201).json({
            mensaje: "Usuario registrado correctamente",
            id: resultado.insertId
        });
    });
});


/* =========================================
   LOGIN
========================================= */
app.post("/login", function (req, res) {
    const usuario = req.body.usuario || req.body.correo;
    const password = req.body.password;

    if (!usuario || !password) {
        return res.status(400).json({
            mensaje: "Completa usuario y contraseña."
        });
    }

    const sql = `
        SELECT
            identificacion,
            nombres,
            apellidos,
            fecha_nacimiento,
            telefono,
            correo,
            direccion,
            icono,
            tema,
            notificaciones_rutina,
            notificaciones_alimentacion
        FROM usuarios
        WHERE
            (
                correo = ?
                OR telefono = ?
                OR identificacion = ?
            )
            AND password = ?
        LIMIT 1
    `;

    conexion.query(
        sql,
        [usuario, usuario, usuario, password],
        function (error, resultados) {
            if (error) {
                console.error("❌ Error en login:", error);
                return res.status(500).json({
                    mensaje: "Error en la base de datos."
                });
            }

            if (resultados.length === 0) {
                return res.status(401).json({
                    mensaje: "Usuario o contraseña incorrectos."
                });
            }

            const usuarioEncontrado = resultados[0];

            res.json({
                mensaje: "Inicio de sesión correcto.",
                usuario: usuarioEncontrado
            });
        }
    );
});


/* =========================================
   OBTENER USUARIO
========================================= */
app.get("/usuario/:identificacion", function (req, res) {
    const identificacion = req.params.identificacion;

    const sql = `
        SELECT
            identificacion,
            nombres,
            apellidos,
            fecha_nacimiento,
            telefono,
            correo,
            direccion,
            icono,
            tema,
            notificaciones_rutina,
            notificaciones_alimentacion
        FROM usuarios
        WHERE identificacion = ?
        LIMIT 1
    `;

    conexion.query(sql, [identificacion], function (error, resultados) {
        if (error) {
            console.error("❌ Error obteniendo usuario:", error);
            return res.status(500).json({
                mensaje: "Error consultando la base de datos."
            });
        }

        if (resultados.length === 0) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado."
            });
        }

        res.json(resultados[0]);
    });
});


/* =========================================
   ACTUALIZAR PERFIL
========================================= */
app.put("/usuario/:identificacion", function (req, res) {
    const identificacion = req.params.identificacion;
    const {
        nombres,
        apellidos,
        fecha_nacimiento,
        telefono,
        correo,
        direccion,
        icono
    } = req.body;

    const sql = `
        UPDATE usuarios
        SET
            nombres = ?,
            apellidos = ?,
            fecha_nacimiento = ?,
            telefono = ?,
            correo = ?,
            direccion = ?,
            icono = ?
        WHERE identificacion = ?
    `;

    conexion.query(
        sql,
        [nombres, apellidos, fecha_nacimiento, telefono, correo, direccion, icono, identificacion],
        function (error, resultado) {
            if (error) {
                console.error("❌ Error actualizando perfil:", error);
                return res.status(500).json({
                    mensaje: "No se pudo actualizar el perfil."
                });
            }

            if (resultado.affectedRows === 0) {
                return res.status(404).json({
                    mensaje: "Usuario no encontrado."
                });
            }

            res.json({
                mensaje: "Perfil actualizado correctamente."
            });
        }
    );
});


/* =========================================
   GUARDAR CONFIGURACIONES
========================================= */
app.put("/configuracion/:identificacion", function (req, res) {
    const identificacion = req.params.identificacion;
    const {
        tema,
        notificaciones_rutina,
        notificaciones_alimentacion
    } = req.body;

    const temaFinal = tema === "claro" ? "claro" : "oscuro";
    const rutina = Number(notificaciones_rutina) === 1 ? 1 : 0;
    const alimentacion = Number(notificaciones_alimentacion) === 1 ? 1 : 0;

    const sql = `
        UPDATE usuarios
        SET
            tema = ?,
            notificaciones_rutina = ?,
            notificaciones_alimentacion = ?
        WHERE identificacion = ?
    `;

    conexion.query(
        sql,
        [temaFinal, rutina, alimentacion, identificacion],
        function (error, resultado) {
            if (error) {
                console.error("❌ Error guardando configuraciones:", error);
                return res.status(500).json({
                    mensaje: "Error guardando las configuraciones."
                });
            }

            if (resultado.affectedRows === 0) {
                return res.status(404).json({
                    mensaje: "Usuario no encontrado."
                });
            }

            res.json({
                mensaje: "Configuraciones guardadas correctamente."
            });
        }
    );
});


/* =========================================
   CAMBIAR CONTRASEÑA
========================================= */
app.put("/configuracion/:identificacion/password", function (req, res) {
    const identificacion = req.params.identificacion;
    const { passwordActual, passwordNueva } = req.body;

    if (!passwordActual || !passwordNueva) {
        return res.status(400).json({
            mensaje: "Debes completar las contraseñas."
        });
    }

    const buscarSql = `
        SELECT password
        FROM usuarios
        WHERE identificacion = ?
        LIMIT 1
    `;

    conexion.query(buscarSql, [identificacion], function (error, resultados) {
        if (error) {
            console.error("❌ Error consultando contraseña:", error);
            return res.status(500).json({
                mensaje: "Error consultando la cuenta."
            });
        }

        if (resultados.length === 0) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado."
            });
        }

        const passwordGuardada = resultados[0].password;

        if (String(passwordGuardada) !== String(passwordActual)) {
            return res.status(401).json({
                mensaje: "La contraseña actual es incorrecta."
            });
        }

        const actualizarSql = `
            UPDATE usuarios
            SET password = ?
            WHERE identificacion = ?
        `;

        conexion.query(actualizarSql, [passwordNueva, identificacion], function (errorActualizar, resultado) {
            if (errorActualizar) {
                console.error("❌ Error cambiando contraseña:", errorActualizar);
                return res.status(500).json({
                    mensaje: "No se pudo cambiar la contraseña."
                });
            }

            if (resultado.affectedRows === 0) {
                return res.status(404).json({
                    mensaje: "Usuario no encontrado."
                });
            }

            res.json({
                mensaje: "Contraseña cambiada correctamente."
            });
        });
    });
});


/* =========================================
   INICIAR SERVIDOR (ÚNICO)
========================================= */
app.listen(PORT, function () {
    console.log(`🚀 Servidor VIGA funcionando en el puerto ${PORT}`);
});
