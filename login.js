
import { Hub } from "aws-amplify/utils";
import {
  obtenerUsuario,
  iniciarSesion,
  cerrarSesion
} from "./auth.js";

const pantalla = document.getElementById("auth-loading");
const boton = document.getElementById("cerrar-sesion");

let autorizado = false;
let procesando = false;

const parametros = new URLSearchParams(window.location.search);
const retornoOAuth =
  parametros.has("code") || parametros.has("error");

function mensaje(texto) {
  if (pantalla) pantalla.textContent = texto;
}

function limpiarURL() {
  const url = new URL(window.location.href);
  ["code", "state", "error", "error_description"].forEach(
    parametro => url.searchParams.delete(parametro)
  );
  window.history.replaceState(
    {},
    "",
    url.pathname + url.search + url.hash
  );
}

async function mostrarTienda() {
  if (autorizado || procesando) return;

  procesando = true;

  try {
    const usuario = await obtenerUsuario();
    if (!usuario) return;

    autorizado = true;
    limpiarURL();

    document.documentElement.classList.add("autenticado");

    if (boton) {
      boton.hidden = false;

      boton.addEventListener("click", async () => {
        boton.disabled = true;
        try {
          await cerrarSesion();
        } catch (error) {
          console.error("Error al cerrar sesión:", error);
          boton.disabled = false;
        }
      });
    }

    console.log("Sesión de MAJORE confirmada");
  } finally {
    procesando = false;
  }
}

function mostrarError(texto) {
  console.error(texto);

  if (!pantalla) return;

  pantalla.replaceChildren();

  const descripcion = document.createElement("p");
  descripcion.textContent = texto;

  const reintentar = document.createElement("button");
  reintentar.textContent = "Volver a iniciar sesión";

  reintentar.addEventListener("click", async () => {
    limpiarURL();
    reintentar.disabled = true;
    try {
      await iniciarSesion();
    } catch (error) {
      console.error("Error iniciando sesión:", error);
      reintentar.disabled = false;
    }
  });

  pantalla.append(descripcion, reintentar);
}

Hub.listen("auth", async ({ payload }) => {
  if (payload.event === "signInWithRedirect") {
    try {
      await mostrarTienda();
    } catch (error) {
      console.error("Error completando OAuth:", error);
      mostrarError("No se pudo confirmar la sesión de Cognito.");
    }
  }

  if (payload.event === "signInWithRedirect_failure") {
    console.error("Error OAuth:", payload.data);
    mostrarError(
      "Falló el inicio de sesión. Inícialo nuevamente desde MAJORE."
    );
  }
});

async function iniciar() {
  try {
    // Comprobar primero si existe una sesión.
    const usuario = await obtenerUsuario();

    if (usuario) {
      await mostrarTienda();
      return;
    }

    if (retornoOAuth) {
      mensaje("Terminando inicio de sesión con Cognito...");

      // No generar otra redirección mientras vuelve OAuth.
      // Esperar la finalización del intercambio de tokens.
      const inicio = Date.now();

      while (Date.now() - inicio < 15000 && !autorizado) {
        await new Promise(resolve => setTimeout(resolve, 500));

        if (autorizado) return;

        const sesion = await Promise.race([
          obtenerUsuario(),
          new Promise(resolve =>
            setTimeout(() => resolve(null), 1500)
          )
        ]);

        if (sesion) {
          await mostrarTienda();
          return;
        }
      }

      if (!autorizado) {
        mostrarError(
          "No se completó el retorno de Cognito. " +
          "Vuelve a iniciar sesión desde MAJORE."
        );
      }
      return;
    }

    mensaje("Redirigiendo a Cognito...");
    await iniciarSesion();

  } catch (error) {
    console.error("Error de autenticación:", error);
    mostrarError("No se pudo verificar la sesión.");
  }
}

iniciar();
