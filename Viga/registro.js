const formulario = document.getElementById("registroForm");

const mensaje = document.getElementById("mensaje");


formulario.addEventListener("submit", async function(event) {

    event.preventDefault();


    // Obtener datos del formulario

    const identificacion =
        document.getElementById("identificacion").value.trim();

    const nombres =
        document.getElementById("nombres").value.trim();

    const apellidos =
        document.getElementById("apellidos").value.trim();

    const fecha_nacimiento =
        document.getElementById("fecha_nacimiento").value;

    const telefono =
        document.getElementById("telefono").value.trim();

    const correo =
        document.getElementById("correo").value.trim();

    const password =
        document.getElementById("password").value;

   


    // Mostrar mensaje

    mensaje.textContent = "Registrando usuario...";
    mensaje.style.color = "#37E359";


    try {

        const respuesta = await fetch(
            "http://localhost:3000/registrar",
            {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    identificacion: identificacion,

                    nombres: nombres,

                    apellidos: apellidos,

                    fecha_nacimiento: fecha_nacimiento,

                    telefono: telefono,

                    correo: correo,

                    password: password,

                    direccion: direccion

                })

            }
        );


        const datos = await respuesta.json();


        // Si el registro fue correcto

        if (respuesta.ok) {

            mensaje.textContent =
                "¡Usuario registrado correctamente!";

            mensaje.style.color = "#37E359";


            /*
             * Guardamos temporalmente el nombre
             * del usuario.
             */

            localStorage.setItem(
                "usuario",
                JSON.stringify({

                    identificacion: identificacion,

                    nombres: nombres,

                    apellidos: apellidos,

                    telefono: telefono,

                    correo: correo

                })
            );


            /*
             * Después de registrarse,
             * enviamos al usuario a iniciar sesión.
             */

            setTimeout(function() {

                window.location.href = "login.html";

            }, 1000);


        } else {

            mensaje.textContent =
                datos.error || "No se pudo registrar el usuario.";

            mensaje.style.color = "#ff5c5c";

        }


    } catch (error) {

        console.error(error);


        mensaje.textContent =
            "No se pudo conectar con el servidor.";

        mensaje.style.color = "#ff5c5c";

    }

});