const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();


// =====================================================
// CONFIGURACIÓN
// =====================================================

app.use(cors());

app.use(express.json());


// =====================================================
// CONEXIÓN CON MYSQL - XAMPP
// =====================================================

const db = mysql.createConnection({

    host: "localhost",

    user: "root",

    password: "",

    database: "basedb"

});


db.connect((error) => {

    if (error) {

        console.error(
            "❌ ERROR CONECTANDO CON MYSQL:"
        );

        console.error(error.message);

        return;
    }

    console.log(
        "✅ MySQL conectado correctamente"
    );

});


// =====================================================
// RUTA PRINCIPAL
// =====================================================

app.get("/", (req, res) => {

    res.send(
        "Servidor VIGA funcionando correctamente"
    );

});


// =====================================================
// REGISTRAR USUARIO
// =====================================================

app.post("/registrar", (req, res) => {

    console.log("");
    console.log("====================================");
    console.log("📥 NUEVO REGISTRO");
    console.log("====================================");

    console.log(req.body);


    const {

        identificacion,
        nombres,
        apellidos,
        fecha_nacimiento,
        telefono,
        correo,
        password

    } = req.body;


    // -------------------------------------------------
    // VALIDAR CAMPOS
    // -------------------------------------------------

    if (
        !identificacion ||
        !nombres ||
        !apellidos ||
        !fecha_nacimiento ||
        !correo ||
        !password
    ) {

        return res.status(400).json({

            error:
                "Faltan datos obligatorios."

        });

    }


    // -------------------------------------------------
    // INSERTAR USUARIO
    // -------------------------------------------------

    const sql = `

        INSERT INTO usuarios

        (
            identificacion,
            nombres,
            apellidos,
            fecha_nacimiento,
            telefono,
            correo,
            password
        )

        VALUES (?, ?, ?, ?, ?, ?, ?)

    `;


    const valores = [

        identificacion,

        nombres,

        apellidos,

        fecha_nacimiento,

        telefono || null,

        correo,

        password

    ];


    db.query(

        sql,

        valores,

        (error, resultado) => {


            // -----------------------------------------
            // ERROR MYSQL
            // -----------------------------------------

            if (error) {

                console.error("");
                console.error(
                    "❌ ERROR MYSQL AL REGISTRAR:"
                );

                console.error(error);


                // -------------------------------
                // DUPLICADO
                // -------------------------------

                if (
                    error.code ===
                    "ER_DUP_ENTRY"
                ) {

                    return res.status(400).json({

                        error:
                            "La identificación o el correo ya están registrados."

                    });

                }


                return res.status(500).json({

                    error:
                        "Error de MySQL: " +
                        error.message

                });

            }


            // -----------------------------------------
            // REGISTRO CORRECTO
            // -----------------------------------------

            console.log(
                "✅ Usuario registrado correctamente"
            );

            console.log(
                "ID:",
                resultado.insertId
            );


            res.status(201).json({

                mensaje:
                    "Usuario registrado correctamente",

                id:
                    resultado.insertId

            });

        }

    );

});


// =====================================================
// INICIAR SESIÓN
// CORREO O TELÉFONO + CONTRASEÑA
// =====================================================

app.post("/login", (req, res) => {

    console.log("");
    console.log("====================================");
    console.log("🔐 INTENTO DE LOGIN");
    console.log("====================================");


    const {

        usuario,
        password

    } = req.body;


    // -------------------------------------------------
    // VALIDAR
    // -------------------------------------------------

    if (!usuario || !password) {

        return res.status(400).json({

            error:
                "Debes ingresar el correo/teléfono y la contraseña."

        });

    }


    // -------------------------------------------------
    // BUSCAR USUARIO
    // -------------------------------------------------

    const sql = `

        SELECT

            identificacion,
            nombres,
            apellidos,
            fecha_nacimiento,
            telefono,
            correo,
            password

        FROM usuarios

        WHERE

            correo = ?

            OR

            telefono = ?

        LIMIT 1

    `;


    db.query(

        sql,

        [usuario, usuario],

        (error, resultados) => {


            // -----------------------------------------
            // ERROR MYSQL
            // -----------------------------------------

            if (error) {

                console.error(
                    "❌ ERROR EN LOGIN:"
                );

                console.error(error);


                return res.status(500).json({

                    error:
                        "Error consultando la base de datos."

                });

            }


            // -----------------------------------------
            // USUARIO NO ENCONTRADO
            // -----------------------------------------

            if (
                resultados.length === 0
            ) {

                return res.status(401).json({

                    error:
                        "El correo o teléfono no están registrados."

                });

            }


            const usuarioBD =
                resultados[0];


            // -----------------------------------------
            // COMPROBAR CONTRASEÑA
            // -----------------------------------------

            if (
                usuarioBD.password !==
                password
            ) {

                return res.status(401).json({

                    error:
                        "La contraseña es incorrecta."

                });

            }


            // -----------------------------------------
            // LOGIN CORRECTO
            // -----------------------------------------

            console.log(
                "✅ Inicio de sesión correcto:"
            );

            console.log(
                usuarioBD.nombres
            );


            // No enviamos la contraseña
            // al navegador

            delete usuarioBD.password;


            res.status(200).json({

                mensaje:
                    "Inicio de sesión correcto",

                usuario:
                    usuarioBD

            });

        }

    );

});


// =====================================================
// OBTENER INFORMACIÓN DEL USUARIO
// =====================================================

app.get(
    "/usuario/:identificacion",
    (req, res) => {


        const identificacion =
            req.params.identificacion;


        const sql = `

            SELECT

                identificacion,
                nombres,
                apellidos,
                fecha_nacimiento,
                telefono,
                correo

            FROM usuarios

            WHERE identificacion = ?

            LIMIT 1

        `;


        db.query(

            sql,

            [identificacion],

            (error, resultados) => {


                if (error) {

                    console.error(
                        "❌ Error consultando usuario:"
                    );

                    console.error(error);


                    return res.status(500).json({

                        error:
                            "Error consultando usuario."

                    });

                }


                if (
                    resultados.length === 0
                ) {

                    return res.status(404).json({

                        error:
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


// =====================================================
// REPORTE - TOTAL DE USUARIOS
// =====================================================

app.get(
    "/reportes/usuarios",
    (req, res) => {


        const sql = `

            SELECT

                COUNT(*) AS total

            FROM usuarios

        `;


        db.query(

            sql,

            (error, resultado) => {


                if (error) {

                    console.error(
                        "❌ Error en reporte:"
                    );

                    console.error(error);


                    return res.status(500).json({

                        error:
                            "No se pudo obtener el reporte."

                    });

                }


                res.json({

                    total:
                        resultado[0].total

                });

            }

        );

    }

);


// =====================================================
// REPORTE - USUARIOS POR MES
// =====================================================
//
// IMPORTANTE:
// Tu tabla de la captura NO tiene fecha_registro.
//
// Por eso primero comprobamos si existe.
// Si no existe, devolvemos un mensaje.
// =====================================================

app.get(
    "/reportes/usuarios-mes",
    (req, res) => {


        // ---------------------------------------------
        // COMPROBAR SI EXISTE fecha_registro
        // ---------------------------------------------

        const comprobar = `

            SELECT COUNT(*) AS existe

            FROM INFORMATION_SCHEMA.COLUMNS

            WHERE

                TABLE_SCHEMA = 'basedb'

                AND TABLE_NAME = 'usuarios'

                AND COLUMN_NAME = 'fecha_registro'

        `;


        db.query(

            comprobar,

            (error, resultado) => {


                if (error) {

                    console.error(error);

                    return res.status(500).json({

                        error:
                            "No se pudo comprobar la tabla."

                    });

                }


                // -------------------------------------
                // NO EXISTE
                // -------------------------------------

                if (
                    resultado[0].existe === 0
                ) {

                    return res.json({

                        disponible: false,

                        mensaje:
                            "El reporte mensual necesita la columna fecha_registro."

                    });

                }


                // -------------------------------------
                // EXISTE
                // -------------------------------------

                const sql = `

                    SELECT

                        YEAR(fecha_registro)
                        AS anio,

                        MONTH(fecha_registro)
                        AS mes,

                        COUNT(*) AS total

                    FROM usuarios

                    GROUP BY

                        YEAR(fecha_registro),

                        MONTH(fecha_registro)

                    ORDER BY

                        anio ASC,

                        mes ASC

                `;


                db.query(

                    sql,

                    (error, resultados) => {


                        if (error) {

                            console.error(error);

                            return res.status(500).json({

                                error:
                                    "Error obteniendo usuarios por mes."

                            });

                        }


                        res.json({

                            disponible: true,

                            datos:
                                resultados

                        });

                    }

                );

            }

        );

    }

);


// =====================================================
// REPORTE - USUARIOS POR OBJETIVO
// =====================================================
//
// Se podrá utilizar cuando agreguemos el campo
// objetivo a la tabla usuarios.
// =====================================================

app.get(
    "/reportes/objetivos",
    (req, res) => {


        const comprobar = `

            SELECT COUNT(*) AS existe

            FROM INFORMATION_SCHEMA.COLUMNS

            WHERE

                TABLE_SCHEMA = 'basedb'

                AND TABLE_NAME = 'usuarios'

                AND COLUMN_NAME = 'objetivo'

        `;


        db.query(

            comprobar,

            (error, resultado) => {


                if (error) {

                    return res.status(500).json({

                        error:
                            "Error comprobando objetivo."

                    });

                }


                if (
                    resultado[0].existe === 0
                ) {

                    return res.json({

                        disponible: false,

                        mensaje:
                            "El campo objetivo todavía no existe en usuarios."

                    });

                }


                const sql = `

                    SELECT

                        objetivo,

                        COUNT(*) AS total

                    FROM usuarios

                    GROUP BY objetivo

                    ORDER BY total DESC

                `;


                db.query(

                    sql,

                    (error, resultados) => {


                        if (error) {

                            return res.status(500).json({

                                error:
                                    "Error obteniendo objetivos."

                            });

                        }


                        res.json({

                            disponible: true,

                            datos:
                                resultados

                        });

                    }

                );

            }

        );

    }

);


// =====================================================
// SERVIDOR
// =====================================================

app.listen(

    3000,

    () => {

        console.log("");
        console.log(
            "======================================"
        );
        console.log(
            "       VIGA - SERVIDOR"
        );
        console.log(
            "======================================"
        );

        console.log(
            "Servidor funcionando en:"
        );

        console.log(
            "http://localhost:3000"
        );

        console.log(
            "Base de datos: basedb"
        );

        console.log(
            "Tabla: usuarios"
        );

        console.log(
            "======================================"
        );

    }

);