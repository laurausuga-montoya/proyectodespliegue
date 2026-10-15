const formulario = document.getElementById("loginForm");

const mensaje = document.getElementById("mensaje");


formulario.addEventListener("submit", async function(event) {

    event.preventDefault();


    const correo = document
        .getElementById("correo")
        .value
        .trim();

    const password = document
        .getElementById("password")
        .value;


    mensaje.textContent = "Verificando datos...";
    mensaje.style.color = "#37E359";


    try {

        const respuesta = await fetch(
            "http://localhost:3000/login",
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    correo: correo,

                    password: password

                })

            }
        );


        const datos = await respuesta.json();


        if (respuesta.ok) {

            /*
             * Guardamos algunos datos del usuario
             * para utilizarlos posteriormente.
             */

            localStorage.setItem(
                "usuario",
                JSON.stringify(datos.usuario)
            );


            mensaje.textContent =
                "Inicio de sesión correcto.";

            mensaje.style.color = "#37E359";


            /*
             * Después de iniciar sesión,
             * enviamos al usuario a inicio.html.
             */

            setTimeout(function() {

                window.location.href = "inicio.html";

            }, 500);


        } else {

            mensaje.textContent =
                datos.mensaje;

            mensaje.style.color = "#ff5c5c";

        }


    } catch (error) {

        console.error(error);

        mensaje.textContent =
            "No se pudo conectar con el servidor.";

        mensaje.style.color = "#ff5c5c";

    }

});