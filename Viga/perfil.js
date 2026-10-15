const API = "http://localhost:3000";

let identificacionUsuario = null;

let iconoSeleccionado = "👤";


/* ==========================================
   OBTENER IDENTIFICACIÓN
========================================== */

function obtenerIdentificacion() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );


    let identificacion =
        parametros.get("id");


    /* Si no está en la URL,
       buscamos el usuario guardado */

    if (!identificacion) {

        const usuarioGuardado =
            localStorage.getItem("usuario");


        if (usuarioGuardado) {

            try {

                const usuario =
                    JSON.parse(
                        usuarioGuardado
                    );


                identificacion =
                    usuario.identificacion;

            } catch(error) {

                console.error(
                    "Error leyendo usuario:",
                    error
                );

            }

        }

    }


    return identificacion;
}


/* ==========================================
   CARGAR PERFIL
========================================== */

async function cargarPerfil() {

    identificacionUsuario =
        obtenerIdentificacion();


    if (!identificacionUsuario) {

        mostrarMensaje(
            "No se encontró la identificación del usuario.",
            true
        );

        return;
    }


    try {

        const respuesta =
            await fetch(

                API +
                "/usuario/" +
                encodeURIComponent(
                    identificacionUsuario
                )

            );


        const usuario =
            await respuesta.json();


        if (!respuesta.ok) {

            throw new Error(
                usuario.error ||
                "No se pudo cargar el usuario."
            );

        }


        /* ==================================
           MOSTRAR DATOS
        ================================== */

        document.getElementById(
            "identificacion"
        ).value =
            usuario.identificacion || "";


        document.getElementById(
            "nombres"
        ).value =
            usuario.nombres || "";


        document.getElementById(
            "apellidos"
        ).value =
            usuario.apellidos || "";


        document.getElementById(
            "fecha_nacimiento"
        ).value =
            usuario.fecha_nacimiento || "";


        document.getElementById(
            "telefono"
        ).value =
            usuario.telefono || "";


        document.getElementById(
            "correo"
        ).value =
            usuario.correo || "";


        document.getElementById(
            "direccion"
        ).value =
            usuario.direccion || "";


        /* ==================================
           NOMBRE
        ================================== */

        const nombreCompleto =
            (
                usuario.nombres || ""
            ) +
            " " +
            (
                usuario.apellidos || ""
            );


        document.getElementById(
            "nombrePerfil"
        ).textContent =
            nombreCompleto.trim() ||
            "Usuario";


        /* ==================================
           ICONO
        ================================== */

        if (usuario.icono) {

            iconoSeleccionado =
                usuario.icono;

        } else {

            iconoSeleccionado =
                "👤";

        }


        document.getElementById(
            "avatarGrande"
        ).textContent =
            iconoSeleccionado;


        marcarIcono(
            iconoSeleccionado
        );


        /* ==================================
           GUARDAR SESIÓN ACTUALIZADA
        ================================== */

        localStorage.setItem(
            "usuario",
            JSON.stringify(usuario)
        );


    } catch(error) {

        console.error(
            "❌ Error cargando perfil:",
            error
        );


        mostrarMensaje(

            "No se pudo conectar con el servidor. " +
            "Verifica que app.js esté funcionando.",

            true

        );

    }

}


/* ==========================================
   SELECCIONAR ICONO
========================================== */

function seleccionarIcono(icono) {

    iconoSeleccionado =
        icono;


    document.getElementById(
        "avatarGrande"
    ).textContent =
        icono;


    marcarIcono(icono);
}


/* ==========================================
   MARCAR ICONO
========================================== */

function marcarIcono(icono) {

    const botones =
        document.querySelectorAll(
            ".icono-opcion"
        );


    botones.forEach(
        function(boton) {

            if (
                boton.textContent.trim() ===
                icono
            ) {

                boton.classList.add(
                    "seleccionado"
                );

            } else {

                boton.classList.remove(
                    "seleccionado"
                );

            }

        }
    );

}


/* ==========================================
   MODIFICAR DATOS
========================================== */

function habilitarEdicion() {

    const campos = [

        "nombres",
        "apellidos",
        "fecha_nacimiento",
        "telefono",
        "correo",
        "direccion"

    ];


    campos.forEach(
        function(id) {

            document.getElementById(
                id
            ).disabled = false;

        }
    );


    /* También permitimos cambiar
       el icono */

    document
        .querySelectorAll(
            ".icono-opcion"
        )
        .forEach(
            function(boton) {

                boton.disabled = false;

            }
        );


    document.getElementById(
        "btnGuardar"
    ).disabled = false;


    document.getElementById(
        "btnModificar"
    ).disabled = true;


    mostrarMensaje(
        "Ahora puedes modificar tus datos."
    );

}


/* ==========================================
   GUARDAR CAMBIOS
========================================== */

document.getElementById(
    "perfilForm"
).addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        if (!identificacionUsuario) {

            mostrarMensaje(
                "No se encontró el usuario.",
                true
            );

            return;
        }


        const datos = {

            nombres:
                document.getElementById(
                    "nombres"
                ).value.trim(),


            apellidos:
                document.getElementById(
                    "apellidos"
                ).value.trim(),


            fecha_nacimiento:
                document.getElementById(
                    "fecha_nacimiento"
                ).value,


            telefono:
                document.getElementById(
                    "telefono"
                ).value.trim(),


            correo:
                document.getElementById(
                    "correo"
                ).value.trim(),


            direccion:
                document.getElementById(
                    "direccion"
                ).value.trim(),


            icono:
                iconoSeleccionado

        };


        try {

            mostrarMensaje(
                "Guardando cambios..."
            );


            const respuesta =
                await fetch(

                    API +
                    "/usuario/" +
                    encodeURIComponent(
                        identificacionUsuario
                    ),

                    {

                        method: "PUT",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify(
                                datos
                            )

                    }

                );


            const resultado =
                await respuesta.json();


            if (!respuesta.ok) {

                throw new Error(
                    resultado.error ||
                    "No se pudieron guardar los cambios."
                );

            }


            /* ==================================
               ACTUALIZAR NOMBRE
            ================================== */

            document.getElementById(
                "nombrePerfil"
            ).textContent =

                datos.nombres +
                " " +
                datos.apellidos;


            /* ==================================
               DESACTIVAR CAMPOS
            ================================== */

            const campos = [

                "nombres",
                "apellidos",
                "fecha_nacimiento",
                "telefono",
                "correo",
                "direccion"

            ];


            campos.forEach(
                function(id) {

                    document.getElementById(
                        id
                    ).disabled = true;

                }
            );


            document.getElementById(
                "btnGuardar"
            ).disabled = true;


            document.getElementById(
                "btnModificar"
            ).disabled = false;


            /* ==================================
               ACTUALIZAR LOCALSTORAGE
            ================================== */

            const usuarioActual =
                JSON.parse(

                    localStorage.getItem(
                        "usuario"
                    ) || "{}"

                );


            const usuarioActualizado = {

                ...usuarioActual,

                identificacion:
                    identificacionUsuario,

                nombres:
                    datos.nombres,

                apellidos:
                    datos.apellidos,

                fecha_nacimiento:
                    datos.fecha_nacimiento,

                telefono:
                    datos.telefono,

                correo:
                    datos.correo,

                direccion:
                    datos.direccion,

                icono:
                    datos.icono

            };


            localStorage.setItem(

                "usuario",

                JSON.stringify(
                    usuarioActualizado
                )

            );


            mostrarMensaje(
                "✓ Datos guardados correctamente."
            );


        } catch(error) {

            console.error(
                "❌ Error guardando:",
                error
            );


            mostrarMensaje(
                error.message,
                true
            );

        }

    }
);


/* ==========================================
   MOSTRAR MENSAJE
========================================== */

function mostrarMensaje(
    texto,
    error = false
) {

    const mensaje =
        document.getElementById(
            "mensaje"
        );


    mensaje.textContent =
        texto;


    mensaje.style.color =
        error
            ? "#ff5c5c"
            : "#37E359";

}


/* ==========================================
   VOLVER A INICIO
========================================== */

function volverInicio() {

    if (!identificacionUsuario) {

        identificacionUsuario =
            obtenerIdentificacion();

    }


    if (identificacionUsuario) {

        window.location.href =

            "inicio.html?id=" +
            encodeURIComponent(
                identificacionUsuario
            );

    } else {

        window.location.href =
            "inicio.html";

    }

}


/* ==========================================
   INICIAR
========================================== */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        cargarPerfil();

    }
);