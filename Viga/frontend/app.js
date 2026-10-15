const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

const PORT = 3000;


/* =========================================
   MIDDLEWARE
========================================= */

app.use(cors());

app.use(express.json());


/* =========================================
   CONEXIÓN MYSQL
========================================= */

const conexion = mysql.createConnection({

    host: "localhost",

    user: "root",

    password: "",

    database: "basedb"

});


conexion.connect(function (error) {

    if (error) {

        console.error(
            "❌ Error conectando con MySQL:",
            error.message
        );

        return;

    }

    console.log(
        "✅ Conectado correctamente a MySQL"
    );

});


/* =========================================
   RUTA PRINCIPAL
========================================= */

app.get("/", function (req, res) {

    res.send(
        "Servidor VIGA funcionando correctamente."
    );

});


/* =========================================
   LOGIN
========================================= */

app.post("/login", function (req, res) {

    const usuario =
        req.body.usuario;

    const password =
        req.body.password;


    if (!usuario || !password) {

        return res.status(400).json({

            mensaje:
                "Completa usuario y contraseña."

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

        [
            usuario,
            usuario,
            usuario,
            password
        ],

        function (error, resultados) {

            if (error) {

                console.error(
                    "❌ Error en login:",
                    error
                );

                return res.status(500).json({

                    mensaje:
                        "Error en la base de datos."

                });

            }


            if (resultados.length === 0) {

                return res.status(401).json({

                    mensaje:
                        "Usuario o contraseña incorrectos."

                });

            }


            const usuarioEncontrado =
                resultados[0];


            res.json({

                mensaje:
                    "Inicio de sesión correcto.",

                usuario:
                    usuarioEncontrado

            });

        }

    );

});


/* =========================================
   OBTENER USUARIO
========================================= */

app.get(
    "/usuario/:identificacion",
    function (req, res) {

        const identificacion =
            req.params.identificacion;


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


        conexion.query(

            sql,

            [identificacion],

            function (error, resultados) {

                if (error) {

                    console.error(
                        "❌ Error obteniendo usuario:",
                        error
                    );

                    return res.status(500).json({

                        mensaje:
                            "Error consultando la base de datos."

                    });

                }


                if (resultados.length === 0) {

                    return res.status(404).json({

                        mensaje:
                            "Usuario no encontrado."

                    });

                }


                res.json(
                    resultados[0]
                );

            }

        );

    }
);


/* =========================================
   ACTUALIZAR PERFIL
   EL ICONO SE CAMBIA DESDE PERFIL
========================================= */

app.put(
    "/usuario/:identificacion",
    function (req, res) {

        const identificacion =
            req.params.identificacion;


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

            [
                nombres,
                apellidos,
                fecha_nacimiento,
                telefono,
                correo,
                direccion,
                icono,
                identificacion
            ],

            function (error, resultado) {

                if (error) {

                    console.error(
                        "❌ Error actualizando perfil:",
                        error
                    );

                    return res.status(500).json({

                        mensaje:
                            "No se pudo actualizar el perfil."

                    });

                }


                if (
                    resultado.affectedRows === 0
                ) {

                    return res.status(404).json({

                        mensaje:
                            "Usuario no encontrado."

                    });

                }


                res.json({

                    mensaje:
                        "Perfil actualizado correctamente."

                });

            }

        );

    }
);


/* =========================================
   GUARDAR CONFIGURACIONES
   AQUÍ YA NO SE MODIFICA EL ICONO
========================================= */

app.put(
    "/configuracion/:identificacion",
    function (req, res) {

        const identificacion =
            req.params.identificacion;


        const {
            tema,
            notificaciones_rutina,
            notificaciones_alimentacion
        } = req.body;


        /* ---------------------------------
           VALIDAR TEMA
        --------------------------------- */

        const temaFinal =
            tema === "claro"
                ? "claro"
                : "oscuro";


        /* ---------------------------------
           VALIDAR NOTIFICACIONES
        --------------------------------- */

        const rutina =
            Number(notificaciones_rutina) === 1
                ? 1
                : 0;


        const alimentacion =
            Number(notificaciones_alimentacion) === 1
                ? 1
                : 0;


        /* ---------------------------------
           ACTUALIZAR SOLAMENTE:
           - tema
           - notificaciones_rutina
           - notificaciones_alimentacion

           NO SE TOCA icono
        --------------------------------- */

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

            [
                temaFinal,
                rutina,
                alimentacion,
                identificacion
            ],

            function (error, resultado) {

                if (error) {

                    console.error(
                        "❌ Error guardando configuraciones:",
                        error
                    );

                    return res.status(500).json({

                        mensaje:
                            "Error guardando las configuraciones."

                    });

                }


                if (
                    resultado.affectedRows === 0
                ) {

                    return res.status(404).json({

                        mensaje:
                            "Usuario no encontrado."

                    });

                }


                res.json({

                    mensaje:
                        "Configuraciones guardadas correctamente."

                });

            }

        );

    }
);


/* =========================================
   CAMBIAR CONTRASEÑA
========================================= */

app.put(
    "/configuracion/:identificacion/password",
    function (req, res) {

        const identificacion =
            req.params.identificacion;


        const {
            passwordActual,
            passwordNueva
        } = req.body;


        /* ---------------------------------
           VALIDAR DATOS
        --------------------------------- */

        if (
            !passwordActual ||
            !passwordNueva
        ) {

            return res.status(400).json({

                mensaje:
                    "Debes completar las contraseñas."

            });

        }


        /* ---------------------------------
           BUSCAR CONTRASEÑA ACTUAL
        --------------------------------- */

        const buscarSql = `

            SELECT
                password

            FROM usuarios

            WHERE identificacion = ?

            LIMIT 1

        `;


        conexion.query(

            buscarSql,

            [identificacion],

            function (error, resultados) {

                if (error) {

                    console.error(
                        "❌ Error consultando contraseña:",
                        error
                    );

                    return res.status(500).json({

                        mensaje:
                            "Error consultando la cuenta."

                    });

                }


                if (resultados.length === 0) {

                    return res.status(404).json({

                        mensaje:
                            "Usuario no encontrado."

                    });

                }


                const passwordGuardada =
                    resultados[0].password;


                /* ---------------------------------
                   COMPROBAR CONTRASEÑA
                --------------------------------- */

                if (
                    String(passwordGuardada) !==
                    String(passwordActual)
                ) {

                    return res.status(401).json({

                        mensaje:
                            "La contraseña actual es incorrecta."

                    });

                }


                /* ---------------------------------
                   ACTUALIZAR CONTRASEÑA
                --------------------------------- */

                const actualizarSql = `

                    UPDATE usuarios

                    SET
                        password = ?

                    WHERE identificacion = ?

                `;


                conexion.query(

                    actualizarSql,

                    [
                        passwordNueva,
                        identificacion
                    ],

                    function (
                        errorActualizar,
                        resultado
                    ) {

                        if (errorActualizar) {

                            console.error(
                                "❌ Error cambiando contraseña:",
                                errorActualizar
                            );

                            return res.status(500).json({

                                mensaje:
                                    "No se pudo cambiar la contraseña."

                            });

                        }


                        if (
                            resultado.affectedRows === 0
                        ) {

                            return res.status(404).json({

                                mensaje:
                                    "Usuario no encontrado."

                            });

                        }


                        res.json({

                            mensaje:
                                "Contraseña cambiada correctamente."

                        });

                    }

                );

            }

        );

    }
);


/* =========================================
   INICIAR SERVIDOR
========================================= */

app.listen(
    PORT,
    function () {

        console.log(
            `🚀 Servidor VIGA funcionando en http://localhost:${PORT}`
        );

    }
);