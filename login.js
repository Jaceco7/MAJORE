import { Hub } from "aws-amplify/utils";
import { obtenerUsuario, iniciarSesion, cerrarSesion } from "./auth.js";

const pantalla = document.getElementById("auth-loading");
const boton = document.getElementById("cerrar-sesion");
let autorizado = false;

function mensaje(texto) {
  if (pantalla) pantalla.textContent = texto;
}

async function mostrarTienda() {
  if (autorizado) return;
  const usuario = await obtenerUsuario();
  if (!usuario) throw new Error("No se pudo confirmar la sesión.");
  autorizado = true;
  document.documentElement.classList.add("autenticado");
  if (boton) {
    boton.hidden = false;
    boton.addEventListener("click", async () => {
      boton.disabled = true;
      try {
        await cerrarSesion();
      } catch (error) {
        console.error("Error cerrando sesión:", error);
        boton.disabled = false;
        alert("No se pudo cerrar sesión. Inténtalo nuevamente.");
      }
    }, { once: false });
  }
  // La URL de retorno puede contener un código OAuth de un solo uso.
  const url = new URL(window.location.href);
  if (url.searchParams.has("code") || url.searchParams.has("state")) {
    url.searchParams.delete("code");
    url.searchParams.delete("state");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }
}

const tieneRespuestaOAuth = new URLSearchParams(window.location.search).has("code");

// Escuchar la finalización del intercambio de código por tokens.
Hub.listen("auth", async ({ payload }) => {
  if (payload.event === "signInWithRedirect") {
    try {
      await mostrarTienda();
    } catch (error) {
      console.error("No se pudo establecer sesión:", error);
      mensaje("No se pudo completar el inicio de sesión. Actualiza la página.");
    }
  }
  if (payload.event === "signInWithRedirect_failure") {
    console.error("Error de retorno OAuth:", payload.data);
    mensaje("Falló el inicio de sesión. Vuelve a intentarlo.");
  }
});

async function iniciar() {
  try {
    const usuario = await obtenerUsuario();
    if (usuario) {
      await mostrarTienda();
    } else if (tieneRespuestaOAuth) {
      // Evita iniciar otro login mientras Amplify procesa ?code=...
      mensaje("Terminando inicio de sesión con Cognito...");
    } else {
      mensaje("Redirigiendo a Cognito...");
      await iniciarSesion();
    }
  } catch (error) {
    console.error("Error autenticando:", error);
    mensaje("No se pudo verificar la sesión. Revisa la consola del navegador.");
  }
}

iniciar();
