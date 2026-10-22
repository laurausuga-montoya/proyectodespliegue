/* =========================================================
   VIGA - TEMA GLOBAL
   tema.js
========================================================= */

(function () {

    // Obtener el tema guardado.
    function obtenerTema() {
        return localStorage.getItem("vigaTema") || "oscuro";
    }

    // Aplicar el tema a toda la página.
    function aplicarTema(tema) {

        // Solo permitimos "claro" u "oscuro".
        const temaFinal =
            tema === "claro"
                ? "claro"
                : "oscuro";

        // Aplicar clase al HTML.
        document.documentElement.classList.toggle(
            "tema-claro",
            temaFinal === "claro"
        );

        // Aplicar clase al BODY cuando ya exista.
        if (document.body) {
            document.body.classList.toggle(
                "tema-claro",
                temaFinal === "claro"
            );

            // Algunas páginas de VIGA utilizan "claro".
            document.body.classList.toggle(
                "claro",
                temaFinal === "claro"
            );
        }

        return temaFinal;
    }

    // Aplicar inmediatamente el tema guardado.
    aplicarTema(obtenerTema());

    // Función que podrán utilizar las otras páginas.
    window.vigaAplicarTema = function (tema) {

        const temaFinal = aplicarTema(tema);

        // Guardar el tema en el navegador.
        localStorage.setItem(
            "vigaTema",
            temaFinal
        );

        return temaFinal;
    };

    // Función para consultar el tema actual.
    window.vigaObtenerTema = function () {
        return obtenerTema();
    };

    // Volver a aplicar cuando la página termine de cargar.
    document.addEventListener(
        "DOMContentLoaded",
        function () {

            aplicarTema(
                obtenerTema()
            );

        }
    );

})();