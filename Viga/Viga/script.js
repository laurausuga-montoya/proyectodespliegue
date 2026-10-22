const formulario = document.getElementById("registroForm");

formulario.addEventListener("submit", function (e) {

    e.preventDefault();

    const usuario = {

        identificacion:
            document.getElementById("identificacion").value.trim(),

        nombres:
            document.getElementById("nombres").value.trim(),

        apellidos:
            document.getElementById("apellidos").value.trim(),

        fecha_nacimiento:
            document.getElementById("fecha_nacimiento").value,

        telefono:
            document.getElementById("telefono").value.trim(),

        correo:
            document.getElementById("correo").value.trim(),

        password:
            document.getElementById("password").value
    };

    fetch("https://viga-c607.onrender.com", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(usuario)

    })

    .then(async response => {

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "No se pudo registrar el usuario"
            );
        }

        return data;

    })

    .then(data => {

        document.getElementById("mensaje").textContent =
            data.mensaje || "Usuario registrado correctamente.";

        formulario.reset();

    })

    .catch(error => {

        console.error("Error:", error);

        document.getElementById("mensaje").textContent =
            error.message || "Error al conectar con el servidor.";

    });

});