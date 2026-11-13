
import { obtenerToken, obtenerUsuario } from "./auth.js";
import { Hub } from "aws-amplify/utils";

// ======================================================
// MAJORE - CATÁLOGO ORIGINAL
// ======================================================

let products = [
  {
    id: 1,
    name: "REF. ANDRY",
    cat: "Tote",
    price: 60000,
    badge: "NUEVO",
    img: "img/ANDRY.jpg",
    desc: "Bolso tote amplio y elegante, ideal para acompañarte del trabajo a una salida especial."
  },
  {
    id: 2,
    name: "REF. KAROL",
    cat: "Crossbody",
    price: 65000,
    badge: "BEST SELLER",
    img: "img/KAROL.jpg",
    desc: "Diseño compacto con correa ajustable y un estilo limpio que combina con todo."
  },
  {
    id: 3,
    name: "REF. MAR",
    cat: "Mini",
    price: 60000,
    badge: "NUEVO",
    img: "img/MAR.jpg",
    desc: "Pequeño en tamaño, grande en personalidad. Perfecto para llevar tus esenciales."
  },
  {
    id: 4,
    name: "REF. PERLA",
    cat: "Clásico",
    price: 35000,
    badge: "SIGNATURE",
    img: "img/PERLA.jpg",
    desc: "Una silueta clásica de inspiración sofisticada para looks atemporales."
  },
  {
    id: 5,
    name: "REF. SU",
    cat: "Tote",
    price: 85000,
    badge: "",
    img: "img/SU.jpg",
    desc: "Espacioso, versátil y pensado para el ritmo de todos los días."
  },
  {
    id: 6,
    name: "REF. AMAL",
    cat: "Clásico",
    price: 55000,
    badge: "NUEVO",
    img: "img/AMAL.jpg",
    desc: "Bolso de hombro con líneas suaves y una estética contemporánea."
  },
  {
    id: 7,
    name: "REF. CELINE",
    cat: "Crossbody",
    price: 60000,
    badge: "",
    img: "img/CELINE.jpg",
    desc: "Ligero y funcional, con espacio justo para acompañar tus planes."
  },
  {
    id: 8,
    name: "REF. BIRKIN",
    cat: "Mini",
    price: 60000,
    badge: "OFERTA",
    img: "img/BIRKIN.jpg",
    desc: "Una pieza compacta para darle un acento especial a cualquier outfit."
  }
];

// ======================================================
// ESTADO Y UTILIDADES
// ======================================================

const API_MAJORE =
  "https://3lbgmgbknc.execute-api.us-east-1.amazonaws.com/productos";

const $ = selector => document.querySelector(selector);

const money = value =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(value);

function leerGuardado(clave) {
  try {
    const valor = JSON.parse(localStorage.getItem(clave) || "[]");
    return Array.isArray(valor) ? valor : [];
  } catch {
    return [];
  }
}

let cart = leerGuardado("majoreCart");
let favs = leerGuardado("majoreFavs");
let category = "Todos";
let catalogoAWSCargado = false;
let catalogoAWSCargando = false;

function escapar(valor) {
  return String(valor).replace(/[&<>"']/g, caracter => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[caracter]);
}

function normalizarCategoria(valor) {
  const categoria = String(valor || "").trim();

  if (categoria.toLowerCase() === "clasico" ||
      categoria.toLowerCase() === "clásico") {
    return "Clásico";
  }

  return categoria;
}

function buscarProducto(id) {
  return products.find(p => p.id === Number(id));
}

function stockDisponible(producto) {
  if (!producto) return 0;

  if (producto.stock === undefined) {
    return Infinity;
  }

  return Math.max(0, Number(producto.stock) || 0);
}

function cantidadEnCarrito(id) {
  return cart.find(item => item.id === id)?.qty || 0;
}

function sincronizarCarrito() {
  cart = cart.filter(item => {
    const producto = buscarProducto(item.id);

    return producto &&
      Number.isInteger(item.qty) &&
      item.qty > 0;
  }).map(item => {
    const producto = buscarProducto(item.id);

    return {
      id: item.id,
      qty: Math.min(item.qty, stockDisponible(producto))
    };
  }).filter(item => item.qty > 0);

  favs = favs.filter(id => Boolean(buscarProducto(id)));
}

function save() {
  localStorage.setItem("majoreCart", JSON.stringify(cart));
  localStorage.setItem("majoreFavs", JSON.stringify(favs));

  if ($("#cartCount")) {
    $("#cartCount").textContent = cart.reduce(
      (total, item) => total + item.qty, 0
    );
  }

  if ($("#favCount")) {
    $("#favCount").textContent = favs.length;
  }
}

function toast(mensaje) {
  const elemento = $("#toast");
  if (!elemento) return;

  elemento.textContent = mensaje;
  elemento.classList.add("show");

  setTimeout(() => {
    elemento.classList.remove("show");
  }, 1800);
}

// ======================================================
// CATÁLOGO VISUAL
// ======================================================

function render(lista = products) {
  const grid = $("#productGrid");
  if (!grid) return;

  grid.innerHTML = lista.map(producto => {
    const agotado = stockDisponible(producto) <= 0;

    return `
      <article class="card">
        <div class="photo" onclick="detail(${producto.id})">
          <img
            src="${escapar(producto.img)}"
            alt="${escapar(producto.name)}"
            loading="lazy"
          >

          ${producto.badge
            ? `<span class="badge">${escapar(producto.badge)}</span>`
            : ""}

          <button
            class="heart"
            type="button"
            aria-label="Agregar o quitar favorito"
            onclick="event.stopPropagation();favorite(${producto.id})"
          >
            ${favs.includes(producto.id) ? "♥" : "♡"}
          </button>
        </div>

        <div class="info">
          <h3>${escapar(producto.name)}</h3>

          <div class="meta">
            <span>${escapar(producto.cat)}</span>
            <b>${money(producto.price)}</b>
          </div>

          <button
            class="add"
            type="button"
            onclick="add(${producto.id})"
            ${agotado ? "disabled" : ""}
          >
            ${agotado ? "AGOTADO" : "AGREGAR A LA BOLSA"}
          </button>
        </div>
      </article>
    `;
  }).join("") || "<p>No encontramos productos.</p>";
}

function applyFilter() {
  let lista = category === "Todos"
    ? [...products]
    : products.filter(p => p.cat === category);

  const orden = $("#sort")?.value;

  if (orden === "low") {
    lista.sort((a, b) => a.price - b.price);
  }

  if (orden === "high") {
    lista.sort((a, b) => b.price - a.price);
  }

  render(lista);
}

// ======================================================
// CARRITO
// ======================================================

function add(id) {
  const producto = buscarProducto(id);

  if (!producto) {
    return toast("Producto no encontrado");
  }

  if (cantidadEnCarrito(producto.id) >= stockDisponible(producto)) {
    return toast("No hay más unidades disponibles");
  }

  const existente = cart.find(item => item.id === producto.id);

  if (existente) {
    existente.qty += 1;
  } else {
    cart.push({ id: producto.id, qty: 1 });
  }

  save();
  renderCart();
  toast("Agregado a tu bolsa");
}

function renderCart() {
  const contenedor = $("#cartItems");
  if (!contenedor) return;

  sincronizarCarrito();

  if (!cart.length) {
    contenedor.innerHTML =
      '<p style="padding:30px 0;color:#777">Tu bolsa está vacía.</p>';
  } else {
    contenedor.innerHTML = cart.map(item => {
      const producto = buscarProducto(item.id);

      return `
        <div class="cartRow">
          <img
            src="${escapar(producto.img)}"
            alt="${escapar(producto.name)}"
          >

          <div>
            <h4>${escapar(producto.name)}</h4>
            <small>${money(producto.price)}</small>

            <div class="qty">
              <button onclick="qty(${producto.id},-1)">−</button>
              ${item.qty}
              <button onclick="qty(${producto.id},1)">+</button>
            </div>
          </div>

          <button
            class="remove"
            onclick="removeItem(${producto.id})"
          >×</button>
        </div>
      `;
    }).join("");
  }

  const total = cart.reduce((suma, item) => {
    const producto = buscarProducto(item.id);
    return suma + (producto?.price || 0) * item.qty;
  }, 0);

  if ($("#cartTotal")) {
    $("#cartTotal").textContent = money(total);
  }

  save();
}

function qty(id, diferencia) {
  const item = cart.find(p => p.id === Number(id));
  const producto = buscarProducto(id);

  if (!item || !producto) return;

  const nuevaCantidad = item.qty + diferencia;

  if (nuevaCantidad <= 0) {
    cart = cart.filter(p => p.id !== Number(id));
  } else if (nuevaCantidad > stockDisponible(producto)) {
    return toast("Cantidad superior al stock disponible");
  } else {
    item.qty = nuevaCantidad;
  }

  save();
  renderCart();
}

function removeItem(id) {
  cart = cart.filter(item => item.id !== Number(id));
  save();
  renderCart();
}

// ======================================================
// FAVORITOS
// ======================================================

function favorite(id) {
  id = Number(id);

  favs = favs.includes(id)
    ? favs.filter(item => item !== id)
    : [...favs, id];

  save();
  applyFilter();

  toast(
    favs.includes(id)
      ? "Guardado en favoritos"
      : "Eliminado de favoritos"
  );
}

// ======================================================
// VENTANAS Y DETALLE
// ======================================================

function openLayer(selector) {
  $("#overlay")?.classList.add("show");
  $(selector)?.classList.add("show");
}

function closeAll() {
  $("#overlay")?.classList.remove("show");

  document.querySelectorAll(
    ".drawer,.searchPanel,.modal"
  ).forEach(elemento => elemento.classList.remove("show"));
}

function detail(id) {
  const producto = buscarProducto(id);
  if (!producto) return;

  const contenedor = $("#modalContent");
  if (!contenedor) return;

  const agotado = stockDisponible(producto) <= 0;

  contenedor.innerHTML = `
    <div class="modalGrid">
      <img
        src="${escapar(producto.img)}"
        alt="${escapar(producto.name)}"
      >

      <div class="modalText">
        <p class="eyebrow">
          ${escapar(producto.cat.toUpperCase())} · MAJORE
        </p>

        <h2>${escapar(producto.name)}</h2>
        <p class="price">${money(producto.price)}</p>
        <p>${escapar(producto.desc)}</p>

        <p>
          Diseño versátil · Acabados seleccionados ·
          Envíos a toda Colombia.
        </p>

        <button
          onclick="add(${producto.id});closeAll()"
          ${agotado ? "disabled" : ""}
        >
          ${agotado ? "AGOTADO" : "AGREGAR A LA BOLSA →"}
        </button>
      </div>
    </div>
  `;

  openLayer("#productModal");
}

// ======================================================
// EVENTOS DE LA TIENDA
// ======================================================

document.querySelectorAll(".chip").forEach(boton => {
  boton.onclick = () => {
    document.querySelectorAll(".chip").forEach(item => {
      item.classList.remove("active");
    });

    boton.classList.add("active");
    category = boton.dataset.category;
    applyFilter();
  };
});

if ($("#sort")) {
  $("#sort").onchange = applyFilter;
}

if ($("#cartBtn")) {
  $("#cartBtn").onclick = () => {
    renderCart();
    openLayer("#cartDrawer");
  };
}

if ($("#searchBtn")) {
  $("#searchBtn").onclick = () => openLayer("#searchPanel");
}

if ($("#favBtn")) {
  $("#favBtn").onclick = () => {
    render(products.filter(p => favs.includes(p.id)));
    $("#catalogo")?.scrollIntoView();
    toast("Mostrando tus favoritos");
  };
}

if ($("#overlay")) {
  $("#overlay").onclick = closeAll;
}

document.querySelectorAll(".close").forEach(boton => {
  boton.onclick = closeAll;
});

// ======================================================
// BUSCADOR
// ======================================================

if ($("#searchInput")) {
  $("#searchInput").oninput = evento => {
    const consulta = evento.target.value.toLowerCase().trim();
    const resultados = $("#searchResults");

    if (!resultados) return;

    resultados.innerHTML = consulta
      ? products.filter(producto =>
          (producto.name + producto.cat)
            .toLowerCase()
            .includes(consulta)
        ).map(producto => `
          <div
            class="searchResult"
            onclick="closeAll();detail(${producto.id})"
          >
            <img
              src="${escapar(producto.img)}"
              alt="${escapar(producto.name)}"
            >

            <div>
              <b>${escapar(producto.name)}</b>
              <small>${money(producto.price)}</small>
            </div>
          </div>
        `).join("")
      : "";
  };
}

// ======================================================
// PEDIDOS WHATSAPP
// ======================================================

if ($("#checkout")) {
  $("#checkout").onclick = () => {
    sincronizarCarrito();

    if (!cart.length) {
      return toast("Tu bolsa está vacía");
    }

    const lineas = cart.map(item => {
      const producto = buscarProducto(item.id);

      return `• ${producto.name} x${item.qty} - ${
        money(producto.price * item.qty)
      }`;
    }).join("\n");

    const total = cart.reduce((suma, item) => {
      const producto = buscarProducto(item.id);
      return suma + producto.price * item.qty;
    }, 0);

    const mensaje =
      `Hola MAJORE, quiero realizar este pedido:\n\n` +
      `${lineas}\n\nTotal: ${money(total)}`;

    window.open(
      `https://wa.me/573053758779?text=${encodeURIComponent(mensaje)}`,
      "_blank"
    );
  };
}

// ======================================================
// NEWSLETTER
// ======================================================

if ($("#newsletter")) {
  $("#newsletter").onsubmit = evento => {
    evento.preventDefault();
    evento.target.reset();
    toast("¡Bienvenida a MAJORE!");
  };
}

// ======================================================
// INTEGRACIÓN AWS - COGNITO + API GATEWAY + DYNAMODB
// ======================================================

const imagenesAWS = {
  B001: "img/ANDRY.jpg",
  B002: "img/KAROL.jpg",
  B003: "img/MAR.jpg",
  B004: "img/PERLA.jpg"
};

async function consultarProductosAWS() {
  const token = await obtenerToken();

  if (!token) {
    throw new Error("No hay una sesión válida de Cognito");
  }

  const respuesta = await fetch(API_MAJORE, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!respuesta.ok) {
    throw new Error(`API Gateway devolvió ${respuesta.status}`);
  }

  const datos = await respuesta.json();

  if (!Array.isArray(datos)) {
    throw new Error("El catálogo de DynamoDB no es válido");
  }

  return datos;
}

function transformarProductoAWS(item) {
  const codigo = String(item.productoId || "");
  const id = Number(codigo.slice(1));
  const precio = Number(item.precio);
  const stock = Number(item.stock);
  const categoria = normalizarCategoria(item.categoria);

  const categorias = [
    "Tote",
    "Crossbody",
    "Mini",
    "Clásico"
  ];

  if (
    !/^B\d+$/.test(codigo) ||
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !Number.isFinite(precio) ||
    precio < 0 ||
    !Number.isInteger(stock) ||
    stock < 0 ||
    !categorias.includes(categoria) ||
    !String(item.nombre || "").trim()
  ) {
    throw new Error(`Producto inválido: ${codigo}`);
  }

  return {
    id,
    name: String(item.nombre).trim(),
    cat: categoria,
    price: precio,
    stock,
    img: imagenesAWS[codigo] || "img/ANDRY.jpg",
    badge: "MAJORE",
    desc: "Producto registrado en Amazon DynamoDB."
  };
}

async function cargarProductosDynamoDB() {
  if (catalogoAWSCargando || catalogoAWSCargado) {
    return;
  }

  catalogoAWSCargando = true;

  try {
    const registros = await consultarProductosAWS();

    if (!registros.length) {
      throw new Error("DynamoDB no tiene productos disponibles");
    }

    const nuevosProductos = registros.map(transformarProductoAWS);

    products = nuevosProductos;
    catalogoAWSCargado = true;

    sincronizarCarrito();
    save();
    applyFilter();
    renderCart();

    if ($("#searchInput")) {
      $("#searchInput").dispatchEvent(new Event("input"));
    }

    console.log(
      "Catálogo MAJORE cargado desde DynamoDB:",
      products.length,
      "productos"
    );

    toast("Catálogo actualizado desde AWS");

  } catch (error) {
    console.error("Error al cargar DynamoDB:", error);
    toast("No se pudo actualizar el catálogo desde AWS");
  } finally {
    catalogoAWSCargando = false;
  }
}

// Mantener disponible la prueba en F12.
async function probarConexionDynamoDB() {
  try {
    const productos = await consultarProductosAWS();

    console.log("Productos de DynamoDB:", productos);
    console.log("Total de productos:", productos.length);

    return productos;
  } catch (error) {
    console.error("Error de conexión:", error);
    return null;
  }
}

window.probarConexionDynamoDB = probarConexionDynamoDB;
window.cargarProductosDynamoDB = cargarProductosDynamoDB;

// ======================================================
// FUNCIONES GLOBALES PARA BOTONES HTML
// ======================================================

Object.assign(window, {
  add,
  detail,
  favorite,
  qty,
  removeItem,
  closeAll
});

// ======================================================
// INICIALIZACIÓN
// ======================================================

sincronizarCarrito();
save();
render();
renderCart();

// Detectar el regreso desde Cognito.
Hub.listen("auth", ({ payload }) => {
  if (
    payload.event === "signInWithRedirect" ||
    payload.event === "signedIn"
  ) {
    cargarProductosDynamoDB();
  }
});

// Cargar automáticamente si ya hay sesión.
obtenerUsuario()
  .then(usuario => {
    if (usuario) {
      cargarProductosDynamoDB();
    }
  })
  .catch(error => {
    console.info(
      "Sesión de Cognito todavía no disponible:",
      error
    );
  });
