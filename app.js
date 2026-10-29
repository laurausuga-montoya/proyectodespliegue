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
app.use(express.static(path.resolve(__dirname)));

/* =========================================
   RUTA DIRECTA PARA FORZAR CSS
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

app.get("/checkout", function (req, res) {
    res.sendFile(path.resolve(__dirname, "checkout.html"));
});

app.get("/pago", function (req, res) {
    res.sendFile(path.resolve(__dirname, "pago.html"));
});

app.get("/informes", function (req, res) {
    res.sendFile(path.resolve(__dirname, "informes.html"));
});

app.get("/rutinas", function (req, res) {
    res.sendFile(path.resolve(__dirname, "rutinas.html"));
});

app.get("/rutina-plan", function (req, res) {
    res.sendFile(path.resolve(__dirname, "rutina.plan.html"));
});

app.get("/configuracion", function (req, res) {
    res.sendFile(path.resolve(__dirname, "configuracion.html"));
});

app.get("/empresa", function (req, res) {
    res.sendFile(path.resolve(__dirname, "inicio.empresa.html"));
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
   PRODUCTOS: GESTIÓN DE TIENDA Y EMPRESA
========================================= */
app.post("/empresa/:id/productos", upload.single("imagen"), function (req, res) {
    const identificacion_empresa = req.params.id;
    const { nombre, categoria, descripcion, precio, stock } = req.body;
    const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;

    const sql = `
        INSERT INTO productos (identificacion_empresa, nombre, categoria, descripcion, precio, stock, imagen_url) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    conexion.query(
        sql, 
        [identificacion_empresa, nombre, categoria, descripcion, Number(precio), parseInt(stock) || 0, imagen_url], 
        function (error, resultado) {
            if (error) {
                console.error("❌ ERROR MYSQL AL GUARDAR PRODUCTO:", error);
                return res.status(500).json({ error: "Error al guardar el producto: " + error.message });
            }
            res.status(201).json({ mensaje: "Producto guardado con éxito.", id: resultado.insertId });
        }
    );
});

app.get("/empresa/:id/productos", function (req, res) {
    const identificacion_empresa = req.params.id;
    const sql = "SELECT * FROM productos WHERE identificacion_empresa = ? ORDER BY fecha_creacion DESC";

    conexion.query(sql, [identificacion_empresa], function (error, resultados) {
        if (error) return res.status(500).json({ error: "Error al cargar el catálogo: " + error.message });
        res.json(resultados);
    });
});

app.put("/empresa/:id_empresa/productos/:id_producto", upload.single("imagen"), function (req, res) {
    const { id_empresa, id_producto } = req.params;
    const { nombre, categoria, descripcion, precio, stock } = req.body;

    if (req.file) {
        const imagen_url = `/uploads/${req.file.filename}`;
        const sql = `UPDATE productos SET nombre=?, categoria=?, descripcion=?, precio=?, stock=?, imagen_url=? WHERE id=? AND identificacion_empresa=?`;
        conexion.query(sql, [nombre, categoria, descripcion, Number(precio), parseInt(stock) || 0, imagen_url, id_producto, id_empresa], function (error) {
            if (error) return res.status(500).json({ error: "Error al actualizar producto." });
            res.json({ mensaje: "Producto actualizado con éxito." });
        });
    } else {
        const sql = `UPDATE productos SET nombre=?, categoria=?, descripcion=?, precio=?, stock=? WHERE id=? AND identificacion_empresa=?`;
        conexion.query(sql, [nombre, categoria, descripcion, Number(precio), parseInt(stock) || 0, id_producto, id_empresa], function (error) {
            if (error) return res.status(500).json({ error: "Error al actualizar producto." });
            res.json({ mensaje: "Producto actualizado con éxito." });
        });
    }
});

app.delete("/empresa/:id_empresa/productos/:id_producto", function (req, res) {
    const { id_empresa, id_producto } = req.params;
    const sql = "DELETE FROM productos WHERE id = ? AND identificacion_empresa = ?";

    conexion.query(sql, [id_producto, id_empresa], function (error) {
        if (error) return res.status(500).json({ error: "Error al eliminar producto." });
        res.json({ mensaje: "Producto eliminado correctamente." });
    });
});

app.get("/productos", function (req, res) {
    const sql = "SELECT * FROM productos ORDER BY (stock > 0) DESC, fecha_creacion DESC";

    conexion.query(sql, function (error, resultados) {
        if (error) return res.status(500).json({ error: "Error cargando la tienda." });
        res.json(resultados);
    });
});

/* =========================================
   COMPRAS, DESCUENTO DE STOCK Y VENTAS
========================================= */
app.post("/compras/procesar", function (req, res) {
    const { articulos, cliente, metodo_pago } = req.body;

    if (!articulos || articulos.length === 0) {
        return res.status(400).json({ error: "No hay productos en la orden." });
    }

    let procesados = 0;
    const totalArticulos = articulos.length;

    articulos.forEach(item => {
        const sqlStock = "UPDATE productos SET stock = GREATEST(0, stock - ?) WHERE id = ?";
        conexion.query(sqlStock, [parseInt(item.cantidad, 10), item.id], function (err) {
            if (err) console.error("❌ Error al descontar stock:", err);
        });

        const sqlEmpresa = "SELECT identificacion_empresa FROM productos WHERE id = ? LIMIT 1";
        conexion.query(sqlEmpresa, [item.id], function (errEmpresa, filas) {
            if (!errEmpresa && filas.length > 0) {
                const idEmpresa = filas[0].identificacion_empresa;
                const totalItem = Number(item.precio) * Number(item.cantidad);

                const sqlVenta = `
                    INSERT INTO ventas (
                        id_producto, identificacion_empresa, nombre_producto,
                        cantidad, precio_unitario, total,
                        cliente_nombre, cliente_ciudad, cliente_telefono, metodo_pago
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                conexion.query(sqlVenta, [
                    item.id,
                    idEmpresa,
                    item.nombre,
                    item.cantidad,
                    item.precio,
                    totalItem,
                    cliente.nombre || "Cliente VIGA",
                    cliente.ciudad || "Colombia",
                    cliente.telefono || "",
                    metodo_pago || "Directo"
                ], function(errVenta) {
                    if (errVenta) console.error("❌ Error guardando venta:", errVenta);
                    procesados++;
                    if (procesados === totalArticulos) {
                        return res.json({ mensaje: "Ventas registradas y stock actualizado con éxito." });
                    }
                });
            } else {
                procesados++;
                if (procesados === totalArticulos) {
                    return res.json({ mensaje: "Ventas procesadas." });
                }
            }
        });
    });
});

app.get("/empresa/:id/ventas", function (req, res) {
    const idEmpresa = req.params.id;
    const sql = `
        SELECT 
            id,
            nombre_producto,
            cantidad,
            precio_unitario,
            total,
            cliente_nombre,
            cliente_ciudad,
            cliente_telefono,
            metodo_pago,
            DATE_FORMAT(fecha_venta, '%d/%m/%Y %H:%i') AS fecha
        FROM ventas 
        WHERE identificacion_empresa = ? 
        ORDER BY fecha_venta DESC
    `;

    conexion.query(sql, [idEmpresa], function (error, resultados) {
        if (error) {
            console.error("❌ Error al obtener ventas:", error);
            return res.status(500).json({ error: "Error al consultar las ventas." });
        }
        res.json(resultados);
    });
});

/* =========================================
   BORRAR HISTORIAL DE VENTAS DE LA EMPRESA
========================================= */
app.delete("/empresa/:id/ventas", function (req, res) {
    const idEmpresa = req.params.id;

    if (!idEmpresa) {
        return res.status(400).json({ error: "Identificación de empresa requerida." });
    }

    const sql = "DELETE FROM ventas WHERE identificacion_empresa = ?";
    conexion.query(sql, [idEmpresa], function (error, resultado) {
        if (error) {
            console.error("❌ Error al borrar historial de ventas:", error);
            return res.status(500).json({ error: "Error al borrar el historial de ventas." });
        }
        res.json({ mensaje: "Historial de ventas eliminado correctamente.", eliminados: resultado.affectedRows });
    });
});

/* =========================================
   SOPORTE Y REPORTES DE USUARIOS (QUEJAS)
========================================= */
app.post("/soporte/reporte", function (req, res) {
    const { identificacion, categoria, asunto, descripcion } = req.body;

    if (!categoria || !asunto || !descripcion) {
        return res.status(400).json({ error: "Completa la categoría, asunto y detalle del reporte." });
    }

    const sql = `
        INSERT INTO reportes_soporte (identificacion_usuario, categoria, asunto, descripcion) 
        VALUES (?, ?, ?, ?)
    `;

    conexion.query(sql, [identificacion || null, categoria, asunto, descripcion], function (error, resultado) {
        if (error) {
            console.error("❌ Error al guardar reporte de soporte:", error);
            return res.status(500).json({ error: "No se pudo enviar el reporte." });
        }
        res.status(201).json({ mensaje: "Reporte enviado con éxito al equipo de soporte.", id: resultado.insertId });
    });
});

app.get("/soporte/mis-reportes/:identificacion", function (req, res) {
    const identificacion = req.params.identificacion;
    const sql = `
        SELECT id, categoria, asunto, descripcion, DATE_FORMAT(fecha, '%d/%m/%Y %H:%i') AS fecha 
        FROM reportes_soporte 
        WHERE identificacion_usuario = ? 
        ORDER BY fecha DESC
    `;

    conexion.query(sql, [identificacion], function (error, resultados) {
        if (error) return res.status(500).json({ error: "Error al consultar los reportes." });
        res.json(resultados);
    });
});

app.delete("/soporte/mis-reportes/:identificacion", function (req, res) {
    const identificacion = req.params.identificacion;
    const sql = "DELETE FROM reportes_soporte WHERE identificacion_usuario = ?";

    conexion.query(sql, [identificacion], function (error) {
        if (error) return res.status(500).json({ error: "Error al limpiar los reportes." });
        res.json({ mensaje: "Historial de reportes limpiado." });
    });
});

/* =========================================
   PERFIL FÍSICO / RUTINA AISLADA POR USUARIO
========================================= */
app.get("/usuario/:identificacion/datos-fisicos", function (req, res) {
    const identificacion = String(req.params.identificacion || "").trim();

    if (!identificacion || identificacion === "undefined" || identificacion === "null") {
        return res.status(400).json({ error: "Identificación de usuario inválida." });
    }

    const sql = `
        SELECT genero, peso, altura, lesion, objetivo, lugar_entrenamiento, intensidad, dias_entreno,
               tipo_discapacidad, nivel_amputacion, usa_protesis, detalle_movilidad
        FROM usuarios 
        WHERE identificacion = ? 
        LIMIT 1
    `;

    conexion.query(sql, [identificacion], function (error, resultados) {
        if (error || resultados.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado." });
        }
        res.json(resultados[0]);
    });
});

app.put("/usuario/:identificacion/datos-fisicos", function (req, res) {
    const identificacion = String(req.params.identificacion || "").trim();

    if (!identificacion || identificacion === "undefined" || identificacion === "null" || identificacion === "") {
        return res.status(400).json({ error: "Identificación de usuario requerida." });
    }

    let { 
        genero, peso, altura, lesion, objetivo, lugar_entrenamiento, intensidad, dias_entreno,
        tipo_discapacidad, nivel_amputacion, usa_protesis, detalle_movilidad 
    } = req.body;

    const generoFinal = genero ? String(genero).trim() : 'No especificado';
    const lesionFinal = lesion ? String(lesion).trim() : 'ninguna';
    const diasFinal = (dias_entreno !== null && dias_entreno !== undefined) ? parseInt(dias_entreno, 10) : 5;
    const lugarFinal = lugar_entrenamiento ? String(lugar_entrenamiento).trim() : 'casa_sin_implementos';

    const tipoDiscapacidadFinal = tipo_discapacidad ? String(tipo_discapacidad).trim() : 'ninguna';
    const nivelAmputacionFinal = nivel_amputacion ? String(nivel_amputacion).trim() : 'ninguno';
    const usaProtesisFinal = usa_protesis ? String(usa_protesis).trim() : 'no';
    const detalleMovilidadFinal = detalle_movilidad ? String(detalle_movilidad).trim() : 'normal';

    let alturaFinal = altura ? Number(altura) : null;
    if (alturaFinal && alturaFinal > 3) {
        alturaFinal = Number((alturaFinal / 100).toFixed(2));
    }

    const sql = `
        UPDATE usuarios 
        SET genero = ?, peso = ?, altura = ?, lesion = ?, objetivo = ?, lugar_entrenamiento = ?, intensidad = ?, dias_entreno = ?,
            tipo_discapacidad = ?, nivel_amputacion = ?, usa_protesis = ?, detalle_movilidad = ?
        WHERE identificacion = ?
        LIMIT 1
    `;

    conexion.query(
        sql, 
        [
            generoFinal,
            peso || null, 
            alturaFinal, 
            lesionFinal, 
            objetivo || null, 
            lugarFinal, 
            intensidad || null, 
            diasFinal,
            tipoDiscapacidadFinal,
            nivelAmputacionFinal,
            usaProtesisFinal,
            detalleMovilidadFinal,
            identificacion
        ], 
        function (error, resultado) {
            if (error) {
                console.error("❌ Error en MySQL al guardar rutina:", error);
                return res.status(500).json({ error: error.message });
            }

            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: "No se encontró el usuario en el sistema." });
            }

            res.json({ mensaje: "Datos físicos guardados correctamente.", dias_entreno: diasFinal, lugar_entrenamiento: lugarFinal });
        }
    );
});

/* =========================================
   PERFIL Y CONFIGURACIONES (USUARIO)
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
   INICIAR SERVIDOR (0.0.0.0)
========================================= */
app.listen(PORT, "0.0.0.0", function () {
    console.log(`🚀 Servidor VIGA funcionando en http://0.0.0.0:${PORT}`);
});