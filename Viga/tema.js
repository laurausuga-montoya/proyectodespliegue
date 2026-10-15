/* =========================================================
   VIGA - TEMA GLOBAL
   tema.js
========================================================= */

(function () {

    const CLAVE_TEMA = "vigaTema";

    /* =====================================================
       OBTENER TEMA
    ===================================================== */

    function obtenerTema() {

        const temaGuardado =
            localStorage.getItem(CLAVE_TEMA);

        if (
            temaGuardado === "claro" ||
            temaGuardado === "oscuro"
        ) {
            return temaGuardado;
        }

        return "oscuro";
    }


    /* =====================================================
       APLICAR TEMA
    ===================================================== */

    function aplicarTema(tema) {

        const temaFinal =
            tema === "claro"
                ? "claro"
                : "oscuro";


        /* HTML */

        document.documentElement.classList.toggle(
            "tema-claro",
            temaFinal === "claro"
        );


        /* BODY */

        if (document.body) {

            document.body.classList.toggle(
                "tema-claro",
                temaFinal === "claro"
            );

            document.body.classList.toggle(
                "claro",
                temaFinal === "claro"
            );

        }


        /* Guardar */

        localStorage.setItem(
            CLAVE_TEMA,
            temaFinal
        );


        return temaFinal;

    }


    /* =====================================================
       APLICAR AL INICIAR
    ===================================================== */

    aplicarTema(
        obtenerTema()
    );


    /* =====================================================
       FUNCIÓN GLOBAL
       CONFIGURACIÓN LA UTILIZA
    ===================================================== */

    window.vigaAplicarTema =
        function (tema) {

            return aplicarTema(
                tema
            );

        };


    /* =====================================================
       CONSULTAR TEMA
    ===================================================== */

    window.vigaObtenerTema =
        function () {

            return obtenerTema();

        };


    /* =====================================================
       CUANDO CARGUE EL BODY
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            aplicarTema(
                obtenerTema()
            );

        }
    );


    /* =====================================================
       SI CAMBIA EL TEMA DESDE OTRA PÁGINA
    ===================================================== */

    window.addEventListener(
        "storage",
        function (event) {

            if (
                event.key === CLAVE_TEMA
            ) {

                aplicarTema(
                    event.newValue
                );

            }

        }
    );

})();