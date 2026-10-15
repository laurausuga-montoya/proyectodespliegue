const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());


// ======================================
// CONEXIÓN CON MYSQL
// ======================================

const db = mysql.createConnection({

    host: "localhost",
    user: "root",
    password: "",
    database: "basedb"

});


db.connect((error) => {

    if (error) {

        console.error(
            "Error conectando con MySQL:",
            error.message
        );

        return;
    }

    console.log(
        "MySQL conectado correctamente"
    );

});


// ======================================
// REGISTRAR USUARIO
// ======================================

app.post("/registrar", (req, res) => {

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

            error:
                "Faltan datos obligatorios"

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
        telefono,
        correo,
        password,
        direccion

    ];


    db.query(
        sql,
        valores,
        (error, resultado) => {

            if (error) {

                console.error(
                    "Error registrando usuario:",
                    error
                );


                if (error.code === "ER_DUP_ENTRY") {

                    return res.status(400).json({

                        error:
                            "La identificación ya está registrada."

                    });

                }


                return res.status(500).json({

                    error:
                        "No se pudo guardar el usuario."

                });

            }


            console.log(
                "Usuario registrado:",
                identificacion
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


// ======================================
// INICIAR SESIÓN
// ======================================

app.post("/login", (req, res) => {

    const {

        correo,
        password

    } = req.body;


    if (!correo || !password) {

        return res.status(400).json({

            mensaje:
                "Ingresa tu correo/teléfono y contraseña."

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
            direccion

        FROM usuarios

        WHERE

            (correo = ? OR telefono = ?)

            AND password = ?

        LIMIT 1

    `;


    db.query(

        sql,

        [
            correo,
            correo,
            password
        ],

        (error, resultado) => {


            if (error) {

                console.error(
                    "Error en login:",
                    error
                );

                return res.status(500).json({

                    mensaje:
                        "Error consultando la base de datos."

                });

            }


            if (resultado.length === 0) {

                return res.status(401).json({

                    mensaje:
                        "Correo/teléfono o contraseña incorrectos."

                });

            }


            const usuario = resultado[0];


            console.log(
                "Inicio de sesión:",
                usuario.correo
            );


            res.json({

                mensaje:
                    "Inicio de sesión correcto",

                usuario:
                    usuario

            });

        }

    );

});


// ======================================
// REPORTE TOTAL USUARIOS
// ======================================

app.get("/reportes/usuarios", (req, res) => {

    const sql = `

        SELECT COUNT(*) AS total

        FROM usuarios

    `;


    db.query(
        sql,
        (error, resultado) => {

            if (error) {

                console.error(error);

                return res.status(500).json({

                    error:
                        "Error obteniendo usuarios"

                });

            }


            res.json({

                total:
                    resultado[0].total

            });

        }
    );

});


// ======================================
// SERVIDOR
// ======================================

app.listen(3000, () => {

    console.log(
        "Servidor VIGA funcionando"
    );

    console.log(
        "http://localhost:3000"
    );

});