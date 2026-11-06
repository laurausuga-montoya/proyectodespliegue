/* =========================================
   AUTENTICACIÓN DE USUARIOS (LOGIN Y REGISTRO)
========================================= */
app.post("/login", function (req, res) {
    console.log("Datos recibidos en login:", req.body); // Para ver qué manda el navegador en la consola de Render
    const { correo, email, contrasena, password } = req.body;
    
    // Captura cualquier variable que mande el frontend
    const identificador = correo || email || req.body.username;
    const clave = password || contrasena || req.body.clave;

    const sql = "SELECT * FROM usuarios WHERE (correo = ? OR email = ?) AND (password = ? OR contrasena = ?)";
    
    conexion.query(sql, [identificador, identificador, clave, clave], function (error, resultados) {
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