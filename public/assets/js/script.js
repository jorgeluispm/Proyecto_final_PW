// ESTADO GLOBAL DE LA APLICACIÓN
const estadoPOS = {
  turno: {
    activo: false,
    data: null,
    montoInicial: 0,
    ventasBrutas: 0,
    cobrosEfectivo: 0,
    cobrosYappy: 0,
    cobrosTarjeta: 0,
    reembolsos: 0,
    salidasCaja: 0,
  },
  consecutivoOrden: 1,
  carrito: [],
  metodoSeleccionado: "Efectivo",
  cuentasAbiertas: [],
  transacciones: [],
  historialSalidas: [],
  esCuentaCargada: false,
  categoriaActual: "Ceviches",
  productoSeleccionadoTemp: null,
  productos: [
    {
      id: 1,
      nombre: "Ceviche de Pescado",
      categoria: "Ceviches",
      precios: {
        "3.25 oz": { variantId: 1, precio: 1.5, stock: 10 },
        "5 oz": { variantId: 2, precio: 3.5, stock: 8 },
        "16 oz": { variantId: 3, precio: 6.5, stock: 4 },
        "32 oz": { variantId: 10.0, precio: 10.0, stock: 2 },
        "1/2 Galón": { variantId: 5, precio: 15.0, stock: 1 },
        "1 Galón": { variantId: 6, precio: 30.0, stock: 0 },
      },
    },
    {
      id: 2,
      nombre: "Ceviche de Pulpo",
      categoria: "Ceviches",
      precios: {
        "3.25 oz": { variantId: 7, precio: 1.75, stock: 5 },
        "5 oz": { variantId: 8, precio: 3.75, stock: 3 },
        "16 oz": { variantId: 9, precio: 11.5, stock: 2 },
        "32 oz": { variantId: 10, precio: 14.5, stock: 0 },
        "1/2 Galón": { variantId: 11, precio: 25.0, stock: 1 },
        "1 Galón": { variantId: 12, precio: 50.0, stock: 1 },
      },
    },
    {
      id: 3,
      nombre: "Ceviche de Combinación",
      categoria: "Ceviches",
      precios: {
        "3.25 oz": { variantId: 13, precio: 1.75, stock: 12 },
        "5 oz": { variantId: 14, precio: 3.75, stock: 6 },
        "16 oz": { variantId: 15, precio: 11.5, stock: 3 },
        "32 oz": { variantId: 16, precio: 14.5, stock: 2 },
        "1/2 Galón": { variantId: 17, precio: 25.0, stock: 2 },
        "1 Galón": { variantId: 18, precio: 50.0, stock: 0 },
      },
    },
    {
      id: 4,
      nombre: "Agua",
      categoria: "Bebidas",
      variantId: 19,
      precio: 1.0,
      stock: 24,
    },
    {
      id: 5,
      nombre: "Soda",
      categoria: "Bebidas",
      variantId: 20,
      precio: 1.5,
      stock: 18,
    },
    {
      id: 6,
      nombre: "Cerveza",
      categoria: "Bebidas",
      variantId: 21,
      precio: 1.5,
      stock: 12,
    },
  ],
};

// --- SISTEMA DE NOTIFICACIONES TOAST ---
function mostrarToast(mensaje, tipo = "info", duracion = 3500) {
  let $container = $("#toast-container");
  if ($container.length === 0) {
    $("body").append('<div id="toast-container"></div>');
    $container = $("#toast-container");
  }

  const iconos = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  const $toast = $(`
    <div class="toast toast-${tipo}">
      <span>${iconos[tipo] || "ℹ️"}</span>
      <div style="flex:1;">${mensaje}</div>
    </div>
  `);

  $container.append($toast);

  setTimeout(() => $toast.addClass("show"), 10);

  setTimeout(() => {
    $toast.removeClass("show");
    setTimeout(() => $toast.remove(), 300);
  }, duracion);
}

// --- MANEJADOR DE ESTADO DE CARGA EN BOTONES ---
async function ejecutarConCarga($boton, asyncFn) {
  if (!$boton || $boton.length === 0) return await asyncFn();

  const textoOriginal = $boton.html();
  $boton.addClass("btn-loading").prop("disabled", true);
  $boton.html(`<span class="btn-text">${textoOriginal}</span>`);

  try {
    return await asyncFn();
  } finally {
    $boton.removeClass("btn-loading").prop("disabled", false);
    $boton.html(textoOriginal);
  }
}

// --- RENDERIZADO DE CUENTAS ABIERTAS (BORRADORES) ---
function renderizarCuentasAbiertas() {
  const $contenedor = $("#contenedor-cuentas-abiertas");
  if ($contenedor.length === 0) return;

  $contenedor.empty();

  if (estadoPOS.cuentasAbiertas.length === 0) {
    $contenedor.html(
      '<small style="color:#94a3b8;">No hay cuentas abiertas</small>',
    );
    return;
  }

  estadoPOS.cuentasAbiertas.forEach((cuenta, index) => {
    const totalCuenta = cuenta.carrito.reduce(
      (acc, i) => acc + i.precio * i.cantidad,
      0,
    );
    $contenedor.append(`
      <button class="btn-cargar-cuenta" data-index="${index}" 
        style="background:#334155; color:white; border:1px solid #475569; padding:6px 12px; border-radius:6px; margin-right:6px; margin-bottom:6px; cursor:pointer; font-size:0.85rem;">
        📂 <strong>${cuenta.cliente}</strong> ($${totalCuenta.toFixed(2)})
      </button>
    `);
  });
}

$(document).ready(function () {
  // Exponer variable globalmente para depuración
  window.estadoPOS = estadoPOS;

  // 0. VERIFICACIÓN DE AUTENTICACIÓN Y ESTADO DE TURNO
  checkAuthStatus();

  async function checkAuthStatus() {
    if (typeof API !== "undefined") {
      const user = API.getCurrentUser();
      if (user) {
        $("#user-display").text(
          `Usuario: ${user.name || user.username || user.fullName || "Operador"}`,
        );
        $("#btn-logout").show();
        $("#overlay-login").fadeOut();

        // Extraer rol del usuario en mayúsculas
        const userRole = String(user?.role || "").toUpperCase();

        // CONTROL DE ROLES (RBAC) - BOTONES ADMINISTRATIVOS
        const rolesPermitidos = ["ADMIN", "ROOT", "ADMINISTRADOR"];

        if (rolesPermitidos.includes(userRole)) {
          $("#btn-nuevo-articulo").show();
          $("#btn-logout").show();
        } else {
          $("#btn-nuevo-articulo").hide();
          $("#btn-logout").hide();
        }

        // Validar si el rol requiere apertura de caja obligatoria (CASHIER o WAITER)
        const requiereAperturaObligatoria =
          userRole === "CASHIER" || userRole === "WAITER";

        // Consultar al servidor si ya hay un turno activo para la sucursal
        const branchId = parseInt(user?.branchId || 1, 10);
        try {
          if (API.cashShifts && API.cashShifts.getActiveShift) {
            const activeShift = await API.cashShifts.getActiveShift(branchId);

            // Extraer de forma segura el objeto shift
            const shiftData =
              activeShift?.data?.data || activeShift?.data || activeShift;

            // VALIDACIÓN ESTRICTA: Debe existir y tener ID de turno
            if (shiftData && shiftData.id) {
              estadoPOS.turno.data = shiftData;
              estadoPOS.turno.activo = true;
              estadoPOS.turno.montoInicial = parseFloat(
                shiftData.initialCash || 0,
              );

              localStorage.setItem("pos_shift_id", shiftData.id);

              $("#overlay-apertura").fadeOut();
              $("#indicador-turno")
                .addClass("activo")
                .text(
                  `Turno Abierto | Fondo: $${estadoPOS.turno.montoInicial.toFixed(2)}`,
                );
              $("#btn-cerrar-turno").show();
            } else {
              // --- SIN TURNO ACTIVO ---
              localStorage.removeItem("pos_shift_id");
              estadoPOS.turno.data = null;
              estadoPOS.turno.activo = false;

              $("#btn-cerrar-turno").hide();
              $("#indicador-turno")
                .removeClass("activo")
                .text("Sin Turno Activo");

              if (requiereAperturaObligatoria) {
                // ROL CASHIER / WAITER: Obligatorio abrir caja
                $("#overlay-apertura").fadeIn();
              } else {
                // ROL ADMIN / ROOT / KITCHEN: Permite navegar sin abrir turno
                $("#overlay-apertura").fadeOut();
              }
            }
          } else {
            if (requiereAperturaObligatoria) $("#overlay-apertura").fadeIn();
          }
        } catch (err) {
          console.warn("No se pudo verificar el turno activo:", err);
          if (requiereAperturaObligatoria) $("#overlay-apertura").fadeIn();
        }

        renderizarProductos();
      } else {
        $("#overlay-login").fadeIn();
        $("#btn-nuevo-articulo").hide();
      }
    } else {
      $("#overlay-login").fadeOut();
      $("#btn-nuevo-articulo").hide();
    }
  }

  // =========================================================
  // 🔑 INICIO DE SESIÓN (LOGIN)
  // =========================================================
  $("#form-login").on("submit", function (e) {
    e.preventDefault();
    const $btn = $(this).find('button[type="submit"]');

    const username = $("#login-username").val().trim();
    const password = $("#login-password").val();

    if (!username || !password) {
      return mostrarToast("Ingrese usuario y contraseña", "warning");
    }

    ejecutarConCarga($btn, async () => {
      // 1. Verificamos API.auth y API.auth.login
      if (typeof API !== "undefined" && API.auth && API.auth.login) {
        try {
          // 2. Llamamos a API.auth.login
          await API.auth.login(username, password);
          mostrarToast("Sesión iniciada con éxito", "success");

          // Limpiar formulario y reevaluar estado de la app / roles / turno
          $("#form-login")[0].reset();
          await checkAuthStatus();
        } catch (error) {
          mostrarToast(
            `Error al iniciar sesión: ${error.message || "Credenciales incorrectas"}`,
            "error",
          );
        }
      } else {
        mostrarToast("Módulo de API no disponible", "error");
      }
    });
  });
  // =========================================================
  // 📋 HISTORIAL DE VENTAS Y ↩️ REEMBOLSOS DE ÓRDENES
  // =========================================================

  // Abrir el modal de historial y cargar ventas
  $("#btn-historial-ventas").on("click", async function () {
    $("#modal-historial-ventas").css("display", "flex").hide().fadeIn(200);
    await cargarHistorialVentas();
  });

  // Función para obtener y renderizar las ventas
  async function cargarHistorialVentas() {
    // 1. Usar el ID exacto que tiene el <tbody> en index.html
    const tbody = document.getElementById("tabla-historial-ventas-body");
    const selectShift = document.getElementById("select-historial-turno");

    if (!tbody) {
      console.error(
        "No se encontró el elemento #tabla-historial-ventas-body en el HTML.",
      );
      return;
    }

    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 20px; color: #94a3b8;">
          Cargando historial de ventas...
        </td>
      </tr>`;

    try {
      const shiftId = selectShift
        ? selectShift.value
        : estadoPOS.turno?.id || localStorage.getItem("pos_shift_id");
      const res = await API.sales.getOrders(shiftId);

      // 2. Extraer el arreglo asegurando compatibilidad si viene directo o dentro de res.data
      const ordenes = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : [];

      tbody.innerHTML = "";

      if (ordenes.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 20px; color: #64748b;">
              No se encontraron ventas para este turno.
            </td>
          </tr>`;
        return;
      }

      ordenes.forEach((orden) => {
        const isVoided =
          orden.status === "CANCELLED" ||
          orden.status === "VOIDED" ||
          orden.isVoided;
        const totalOrden = parseFloat(orden.totalAmount || orden.total || 0);

        // Formato Hora/Fecha
        const fechaObj = orden.createdAt
          ? new Date(orden.createdAt)
          : new Date();
        const horaStr = fechaObj.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        // Método de Pago
        let metodoPago = orden.paymentMethod || "EFECTIVO";
        if (metodoPago === "SPLIT" && orden.splitDetails) {
          metodoPago = `Dividido (Ef: $${parseFloat(orden.splitDetails.cashAmount || 0).toFixed(2)})`;
        }

        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #334155";
        if (isVoided) tr.style.opacity = "0.5";

        tr.innerHTML = `
          <td style="padding: 10px; font-weight: bold;">#${orden.orderNumber || (orden.id ? orden.id.substring(0, 8) : "---")}</td>
          <td style="padding: 10px;">${horaStr}</td>
          <td style="padding: 10px;">${metodoPago}</td>
          <td style="padding: 10px; font-weight: bold; color: ${isVoided ? "#f87171" : "#4ade80"};">
            $${totalOrden.toFixed(2)}
          </td>
          <td style="padding: 10px;">
            ${isVoided ? '<span style="color: #f87171;">Anulada</span>' : '<span style="color: #4ade80;">Completada</span>'}
          </td>
          <td style="padding: 10px; text-align: center;">
            ${
              isVoided
                ? "-"
                : `<button type="button" class="btn-secondary btn-anular-orden" data-id="${orden.id}" style="padding: 4px 8px; font-size: 0.8rem; background: #ef4444; color: white;">Anular</button>`
            }
          </td>
        `;

        tbody.appendChild(tr);
      });

      // Vincular eventos a los botones de anulación
      tbody.querySelectorAll(".btn-anular-orden").forEach((btn) => {
        btn.addEventListener("click", function () {
          const orderId = this.getAttribute("data-id");
          if (typeof solicitarAnulacionOrden === "function") {
            solicitarAnulacionOrden(orderId);
          }
        });
      });
    } catch (error) {
      console.error("Error al cargar historial de ventas:", error);
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 20px; color: #ef4444;">
            Error al cargar las ventas: ${error.message}
          </td>
        </tr>`;
    }
  }

  // Función global para abrir el modal de Reembolso desde el Historial
  window.solicitarAnulacionOrden = function (orderId) {
    $("#anular-order-id").val(orderId);
    $("#anular-motivo").val("");
    $("#modal-anular-orden").css("display", "flex").hide().fadeIn(200);
    setTimeout(() => $("#anular-motivo").focus(), 250);
  };

  // Evento para procesar el reembolso
  $("#form-anular-orden").on("submit", function (e) {
    e.preventDefault();

    const orderId = $("#anular-order-id").val();
    const reason = $("#anular-motivo").val().trim();

    if (!reason || reason.length < 5) {
      return mostrarToast(
        "Debe ingresar un motivo válido de al menos 5 caracteres",
        "warning",
      );
    }

    const $btn = $(this).find('button[type="submit"]');

    ejecutarConCarga($btn, async () => {
      try {
        await API.sales.voidOrder(orderId, reason);
        mostrarToast("Reembolso procesado correctamente", "success");
        $("#modal-anular-orden").fadeOut(200);

        // Refrescar automáticamente la lista del historial
        await cargarHistorialVentas();
      } catch (error) {
        mostrarToast(
          `Error al procesar el reembolso: ${error.message || "No se pudo procesar"}`,
          "error",
        );
      }
    });
  });

  // LOGOUT
  $("#btn-logout").on("click", function () {
    if (typeof API !== "undefined" && API.clearToken) {
      API.clearToken();
    }
    localStorage.removeItem("pos_shift_id");
    $("#btn-nuevo-articulo").hide();
    location.reload();
  });

  // 1. APERTURA DE TURNO (OpenShiftDto: branchId, initialCash)
  $("#form-apertura-turno").on("submit", function (e) {
    e.preventDefault();
    const $btn = $(this).find('button[type="submit"]');
    const monto = parseFloat($("#input-monto-inicial").val()) || 0;

    ejecutarConCarga($btn, async () => {
      if (
        typeof API !== "undefined" &&
        API.cashShifts &&
        API.cashShifts.openShift
      ) {
        try {
          const user = API.getCurrentUser();
          const branchId = parseInt(user?.branchId || 1, 10);
          const openedById = user?.id;

          if (!openedById) {
            mostrarToast(
              "Error: No se pudo obtener la identificación del usuario actual.",
              "error",
            );
            return;
          }

          const payload = {
            branchId: branchId,
            openedById: openedById,
            initialCash: monto,
          };

          const res = await API.cashShifts.openShift(payload);
          const shiftData = res?.data?.data || res?.data || res;

          estadoPOS.turno.data = shiftData;
          estadoPOS.turno.activo = true;
          estadoPOS.turno.montoInicial = monto;

          if (shiftData?.id) {
            localStorage.setItem("pos_shift_id", shiftData.id);
          }

          mostrarToast("Turno de caja abierto exitosamente", "success");

          $("#overlay-apertura").fadeOut();
          $("#indicador-turno")
            .addClass("activo")
            .text(`Turno Abierto | Fondo: $${monto.toFixed(2)}`);
          $("#btn-cerrar-turno").show();

          renderizarProductos();
        } catch (error) {
          mostrarToast(
            `Error al abrir turno: ${error.message || "Credenciales o datos inválidos."}`,
            "error",
          );
        }
      } else {
        estadoPOS.turno.activo = true;
        estadoPOS.turno.montoInicial = monto;

        $("#overlay-apertura").fadeOut();
        $("#indicador-turno")
          .addClass("activo")
          .text(`Turno Abierto | Fondo: $${monto.toFixed(2)}`);
        $("#btn-cerrar-turno").show();

        renderizarProductos();
      }
    });
  });

  // 1.A REGISTRO DE PAGOS / SALIDAS DE CAJA CHICA
  $("#btn-pagos").on("click", function () {
    $("#modal-pagos").css("display", "flex").hide().fadeIn(200);
    setTimeout(function () {
      $("#monto-pago").focus();
    }, 250);
  });

  $("#btn-cancelar-pago").on("click", function () {
    $("#modal-pagos").fadeOut(200);
    $("#form-salida-caja")[0].reset();
  });

  $("#form-salida-caja").on("submit", function (e) {
    e.preventDefault();
    const $btn = $(this).find('button[type="submit"]');

    const monto = parseFloat($("#monto-pago").val());
    const motivo = $("#concepto-pago").val().trim();

    if (isNaN(monto) || monto <= 0) {
      return mostrarToast("Ingrese un monto válido mayor a $0.00", "warning");
    }

    if (motivo.length < 3) {
      return mostrarToast(
        "El motivo debe ser descriptivo (min. 3 caracteres)",
        "warning",
      );
    }

    ejecutarConCarga($btn, async () => {
      if (
        typeof API !== "undefined" &&
        API.cashShifts &&
        API.cashShifts.registerTransaction
      ) {
        const rawShiftId =
          estadoPOS.turno?.data?.data?.id ||
          estadoPOS.turno?.data?.id ||
          estadoPOS.turno?.id ||
          localStorage.getItem("pos_shift_id");

        if (
          !rawShiftId ||
          rawShiftId === "undefined" ||
          rawShiftId === "null"
        ) {
          mostrarToast(
            "No hay un turno de caja activo identificado en el cliente.",
            "error",
          );
          return;
        }

        try {
          await API.cashShifts.registerTransaction(rawShiftId, monto, motivo);
        } catch (error) {
          mostrarToast(`Error al guardar egreso: ${error.message}`, "error");
          return;
        }
      }

      if (!estadoPOS.turno) estadoPOS.turno = {};
      estadoPOS.turno.salidasCaja = (estadoPOS.turno.salidasCaja || 0) + monto;

      if (!estadoPOS.historialSalidas) {
        estadoPOS.historialSalidas = [];
      }

      estadoPOS.historialSalidas.push({
        monto: monto,
        concepto: motivo,
        hora: new Date().toLocaleTimeString(),
      });

      mostrarToast(`Salida registrada: -$${monto.toFixed(2)}`, "success");

      $("#modal-pagos").fadeOut(200);
      $("#form-salida-caja")[0].reset();
    });
  });

  // 1.B NUEVO ARTÍCULO (ADMIN)
  const PIN_ADMIN = "9216";

  $(document).on(
    "click",
    "#btn-nuevo-articulo, .btn-nuevo-articulo",
    function () {
      const claveIngresada = prompt(
        "🔒 Acción restringida para Administrador.\nIngrese la clave de autorización:",
      );
      if (claveIngresada === null) return;

      if (claveIngresada.trim() === PIN_ADMIN) {
        $("#modal-nuevo-articulo").css("display", "flex").hide().fadeIn(200);
        setTimeout(function () {
          $("#nuevo-nombre-prod").focus();
        }, 250);
      } else {
        mostrarToast(
          "Clave incorrecta. No tiene permisos de administrador",
          "error",
        );
      }
    },
  );

  $("#btn-cancelar-nuevo-articulo").on("click", function () {
    $("#modal-nuevo-articulo").fadeOut(200);
    $("#form-nuevo-articulo")[0].reset();
  });

  $("#form-nuevo-articulo").on("submit", function (e) {
    e.preventDefault();

    const nombre = $("#nuevo-nombre-prod").val().trim();
    const categoria = $("#nueva-cat-prod").val();
    const precio = parseFloat($("#nuevo-precio-prod").val());
    const stock = parseInt($("#nuevo-stock-prod").val(), 10);

    if (!nombre || isNaN(precio) || isNaN(stock)) {
      return mostrarToast("Complete todos los campos correctamente", "warning");
    }

    const nuevoId = Date.now();

    if (categoria === "Ceviches") {
      estadoPOS.productos.push({
        id: nuevoId,
        nombre: nombre,
        categoria: "Ceviches",
        precios: {
          "Porción General": {
            variantId: nuevoId,
            precio: precio,
            stock: stock,
          },
        },
      });
    } else {
      estadoPOS.productos.push({
        id: nuevoId,
        variantId: nuevoId,
        nombre: nombre,
        categoria: categoria,
        precio: precio,
        stock: stock,
      });
    }

    mostrarToast(`Producto "${nombre}" agregado al catálogo`, "success");
    $("#modal-nuevo-articulo").fadeOut(200);
    $("#form-nuevo-articulo")[0].reset();
    renderizarProductos();
  });

  // 2. SELECCIÓN DE MÉTODO DE PAGO
  $(".btn-metodo").on("click", function () {
    $(".btn-metodo").removeClass("active");
    $(this).addClass("active");

    estadoPOS.metodoSeleccionado = $(this).data("metodo");

    if (estadoPOS.metodoSeleccionado === "Split") {
      $("#box-pago-dividido").slideDown();
      calcularSplit();
    } else {
      $("#box-pago-dividido").slideUp();
      $("#btn-registrar-venta").prop("disabled", false).css("opacity", "1");
    }
  });

  // 3. CONTROL DE PAGO DIVIDIDO
  $(".input-split").on("input", calcularSplit);

  function calcularSplit() {
    if (estadoPOS.metodoSeleccionado !== "Split") return;

    const totalPagar = estadoPOS.carrito.reduce(
      (acc, i) => acc + i.precio * i.cantidad,
      0,
    );
    const efec = parseFloat($("#split-efectivo").val()) || 0;
    const yap = parseFloat($("#split-yappy").val()) || 0;
    const tarj = parseFloat($("#split-tarjeta").val()) || 0;

    const sumaIngresada = efec + yap + tarj;
    const diferencia = totalPagar - sumaIngresada;

    const $tag = $("#monto-restante-split");
    const $btnCobrar = $("#btn-registrar-venta");

    if (Math.abs(diferencia) < 0.01) {
      $tag.text("Restante: $0.00").css("color", "#16a34a");
      $btnCobrar.prop("disabled", false).css("opacity", "1");
    } else if (diferencia > 0) {
      $tag.text(`Falta: $${diferencia.toFixed(2)}`).css("color", "#dc2626");
      $btnCobrar.prop("disabled", true).css("opacity", "0.5");
    } else {
      $tag
        .text(`Exceso: $${Math.abs(diferencia).toFixed(2)}`)
        .css("color", "#dc2626");
      $btnCobrar.prop("disabled", true).css("opacity", "0.5");
    }
  }

  // 4. CAMBIO MANUAL DE CATEGORÍAS
  $(document).on("click", ".btn-cat", function () {
    actualizarPestanaCategoria($(this).data("cat"));
    renderizarProductos();
  });

  function actualizarPestanaCategoria(catNombre) {
    estadoPOS.categoriaActual = catNombre;
    $(".btn-cat").removeClass("active").css({ "background-color": "#1e293b" });
    $(`.btn-cat[data-cat="${catNombre}"]`)
      .addClass("active")
      .css({ "background-color": "#f97316" });
  }

  // 5. RENDERIZADO DE PRODUCTOS
  function renderizarProductos() {
    const $grid = $("#grid-productos-contenedor").empty();
    const texto = $("#input-busqueda").val()
      ? $("#input-busqueda").val().toLowerCase().trim()
      : "";

    if (texto !== "") {
      const coincideEnCategoriaActual = estadoPOS.productos.some(
        (p) =>
          p.categoria === estadoPOS.categoriaActual &&
          p.nombre.toLowerCase().includes(texto),
      );

      if (!coincideEnCategoriaActual) {
        const otraCoincidencia = estadoPOS.productos.find((p) =>
          p.nombre.toLowerCase().includes(texto),
        );
        if (otraCoincidencia) {
          actualizarPestanaCategoria(otraCoincidencia.categoria);
        }
      }
    }

    const productosFiltrados = estadoPOS.productos.filter(
      (p) =>
        p.categoria === estadoPOS.categoriaActual &&
        p.nombre.toLowerCase().includes(texto),
    );

    if (productosFiltrados.length === 0) {
      $grid.html(`
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8; font-size: 1rem;">
          🔍 No hay artículos disponibles en ${estadoPOS.categoriaActual} ${texto ? `que coincidan con "${texto}"` : ""}
        </div>
      `);
      return;
    }

    if (estadoPOS.categoriaActual === "Ceviches") {
      productosFiltrados.forEach((p) => {
        let estaAgotado = false;
        let primerPrecio = 0;

        if (p.precios) {
          const stockTotal = Object.values(p.precios).reduce(
            (acc, item) => acc + item.stock,
            0,
          );
          estaAgotado = stockTotal === 0;
          primerPrecio = Object.values(p.precios)[0]?.precio || 0;
        } else {
          estaAgotado = p.stock === 0;
          primerPrecio = p.precio;
        }

        $grid.append(` 
          <div class="tarjeta-producto card-ceviche" data-id="${p.id}" 
            style="background:#1e293b; padding:15px; border-radius:8px; text-align:center; border:1px solid #334155; opacity:${estaAgotado ? "0.5" : "1"}; position:relative;">
            
            ${
              estaAgotado
                ? `<span style="position:absolute; top:8px; right:8px; background:#ef4444; color:white; font-size:0.7rem; font-weight:bold; padding:2px 6px; border-radius:4px;">⛔ AGOTADO</span>`
                : ""
            }

            <h4 style="color:white; margin:0 0 8px 0;">${p.nombre}</h4>
            <div class="price-tag" style="color:#f97316; font-weight:bold; margin-bottom:10px;">Desde $${primerPrecio.toFixed(2)}</div>
            
            <button class="btn-abrir-presentaciones" ${estaAgotado ? "disabled" : ""} 
              style="background:${estaAgotado ? "#64748b" : "#f97316"}; color:white; border:none; padding:8px 12px; border-radius:5px; width:100%; font-weight:bold; cursor:${estaAgotado ? "not-allowed" : "pointer"};">
              ${estaAgotado ? "Sin Stock" : "+ Seleccionar"}
            </button>
          </div>
        `);
      });
    } else {
      productosFiltrados.forEach((prod) => {
        const estaAgotado = prod.stock === 0;
        $grid.append(`
          <div class="tarjeta-producto" style="background:#1e293b; padding:15px; border-radius:8px; text-align:center; border:1px solid #334155; opacity:${estaAgotado ? "0.5" : "1"}; position:relative;">
            
            ${
              estaAgotado
                ? `<span style="position:absolute; top:8px; right:8px; background:#ef4444; color:white; font-size:0.7rem; font-weight:bold; padding:2px 6px; border-radius:4px;">⛔ AGOTADO</span>`
                : ""
            }

            <h4 style="color:white; margin:0 0 8px 0;">${prod.nombre}</h4>
            <div class="price-tag" style="color:#f97316; font-weight:bold; margin-bottom:4px;">$${prod.precio.toFixed(2)}</div>
            <div style="color:#94a3b8; font-size:0.8rem; margin-bottom:10px;">Stock: ${prod.stock} ud(s)</div>
            
            <button class="btn-add-bebida" data-id="${prod.id}" ${estaAgotado ? "disabled" : ""} 
              style="background:${estaAgotado ? "#64748b" : "#3b82f6"}; color:white; border:none; padding:8px 12px; border-radius:5px; width:100%; font-weight:bold; cursor:${estaAgotado ? "not-allowed" : "pointer"};">
              ${estaAgotado ? "Agotado" : "+ Agregar"}
            </button>
          </div>
        `);
      });
    }
  }

  $("#input-busqueda").on("input", renderizarProductos);

  // 6. POP-UP DE PRESENTACIONES
  $(document).on(
    "click",
    ".card-ceviche, .btn-abrir-presentaciones",
    function (e) {
      if (e.target.tagName === "BUTTON") e.stopPropagation();

      const id = $(this).closest(".card-ceviche").data("id");
      estadoPOS.productoSeleccionadoTemp = estadoPOS.productos.find(
        (p) => p.id == id,
      );

      if (!estadoPOS.productoSeleccionadoTemp) return;

      $("#modal-titulo-sabor").text(estadoPOS.productoSeleccionadoTemp.nombre);
      const $gridOps = $("#grid-presentaciones-opciones").empty();

      Object.entries(estadoPOS.productoSeleccionadoTemp.precios).forEach(
        ([tamano, datos]) => {
          const sinStock = datos.stock === 0;
          $gridOps.append(` 
          <button type="button" class="btn-opcion-tamano" data-tamano="${tamano}" data-precio="${datos.precio}" data-variantid="${datos.variantId || 1}" data-stock="${datos.stock}" ${sinStock ? "disabled" : ""}
            style="background:${sinStock ? "#0f172a" : "#0f172a"}; border:2px solid ${sinStock ? "#64748b" : "#3b82f6"}; color:white; padding:12px 5px; border-radius:8px; cursor:${sinStock ? "not-allowed" : "pointer"}; opacity:${sinStock ? "0.5" : "1"};">
            <div style="font-weight:bold; font-size:0.95rem;">${tamano}</div>
            <div style="color:${sinStock ? "#ef4444" : "#38bdf8"}; font-size:0.85rem; margin-top:2px;">
              $${datos.precio.toFixed(2)} ${sinStock ? "(Agotado)" : `<br><small style="color:#94a3b8;">${datos.stock} disponible(s)</small>`}
            </div>
          </button>
        `);
        },
      );

      $("#modal-presentaciones").fadeIn();
    },
  );

  $(document).on("click", ".btn-opcion-tamano", function () {
    if ($(this).is(":disabled")) return;

    const tamano = $(this).data("tamano");
    const precio = parseFloat($(this).data("precio"));
    const variantId = parseInt($(this).data("variantid"), 10) || 1;
    const stockDisponible = parseInt($(this).data("stock"), 10);
    const prod = estadoPOS.productoSeleccionadoTemp;

    const itemID = `${prod.id}-${tamano.replace(/\s+/g, "")}`;
    const itemNombre = `${prod.nombre} (${tamano})`;

    const itemExistente = estadoPOS.carrito.find((i) => i.id === itemID);
    const cantActualEnCarrito = itemExistente ? itemExistente.cantidad : 0;

    if (cantActualEnCarrito + 1 > stockDisponible) {
      return mostrarToast(
        `Stock máximo alcanzado para ${itemNombre}`,
        "warning",
      );
    }

    if (itemExistente) {
      itemExistente.cantidad++;
    } else {
      estadoPOS.carrito.push({
        id: itemID,
        prodId: prod.id,
        productVariantId: variantId,
        tamano: tamano,
        nombre: itemNombre,
        precio: precio,
        cantidad: 1,
        tipo: "ceviche",
      });
    }

    $("#modal-presentaciones").fadeOut();
    actualizarTicket();
  });

  $("#btn-cerrar-modal-presentaciones").on("click", function () {
    $("#modal-presentaciones").fadeOut();
  });

  // AGREGAR BEBIDA DIRECTA
  $(document).on("click", ".btn-add-bebida", function () {
    const id = $(this).data("id");
    const bebida = estadoPOS.productos.find((p) => p.id == id);

    if (bebida) {
      const itemExistente = estadoPOS.carrito.find((i) => i.id === bebida.id);
      const cantActual = itemExistente ? itemExistente.cantidad : 0;

      if (cantActual + 1 > bebida.stock) {
        return mostrarToast(`Stock agotado para ${bebida.nombre}`, "warning");
      }

      if (itemExistente) {
        itemExistente.cantidad++;
      } else {
        estadoPOS.carrito.push({
          id: bebida.id,
          prodId: bebida.id,
          productVariantId: bebida.variantId || 1,
          nombre: bebida.nombre,
          precio: bebida.precio,
          cantidad: 1,
          tipo: "bebida",
        });
      }
      actualizarTicket();
    }
  });

  // 7. GESTIÓN DEL CARRITO
  $(document).on("click", ".btn-qty-plus", function () {
    const id = $(this).data("id");
    const item = estadoPOS.carrito.find((i) => i.id === id);

    if (item) {
      let maxStock = 0;
      if (item.tipo === "ceviche") {
        const prod = estadoPOS.productos.find((p) => p.id == item.prodId);
        maxStock = prod.precios[item.tamano].stock;
      } else {
        const bebida = estadoPOS.productos.find((p) => p.id == item.id);
        maxStock = bebida.stock;
      }

      if (item.cantidad + 1 > maxStock) {
        return mostrarToast(`Stock máximo alcanzado (${maxStock})`, "warning");
      }

      item.cantidad++;
      actualizarTicket();
    }
  });

  $(document).on("click", ".btn-qty-minus", function () {
    const id = $(this).data("id");
    const item = estadoPOS.carrito.find((i) => i.id === id);
    if (item) {
      item.cantidad--;
      if (item.cantidad <= 0) {
        estadoPOS.carrito = estadoPOS.carrito.filter((i) => i.id !== id);
      }
      actualizarTicket();
    }
  });

  $(document).on("click", ".btn-eliminar-item", function () {
    const id = $(this).data("id");
    estadoPOS.carrito = estadoPOS.carrito.filter((i) => i.id !== id);
    actualizarTicket();
  });

  function actualizarTicket() {
    const $body = $("#lista-items-carrito").empty();
    let subtotal = 0;

    if (estadoPOS.carrito.length === 0) {
      $body.html(
        '<p class="empty-msg" style="text-align:center; color:#94a3b8; margin-top:20px;">El carrito está vacío</p>',
      );
    } else {
      estadoPOS.carrito.forEach((i) => {
        const totalItem = i.precio * i.cantidad;
        subtotal += totalItem;
        $body.append(` 
          <div class="item-carrito" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #e2e8f0;">
            <div style="flex:1;">
              <strong style="font-size:0.9rem; color:#0f172a;">${i.nombre}</strong><br>
              <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
                <button type="button" class="btn-qty-minus btn-small" data-id="${i.id}" style="padding:0px 6px; cursor:pointer;">-</button>
                <span style="font-weight:bold; font-size:0.85rem; color:#1e293b;">${i.cantidad}</span>
                <button type="button" class="btn-qty-plus btn-small" data-id="${i.id}" style="padding:0px 6px; cursor:pointer;">+</button>
                <small style="color:#64748b; margin-left:4px;">@ $${i.precio.toFixed(2)}</small>
              </div> 
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-weight:bold; font-size:0.95rem; color:#0f172a;">$${totalItem.toFixed(2)}</span>
              <button type="button" class="btn-eliminar-item" data-id="${i.id}" title="Eliminar artículo" style="background:none; border:none; color:#ef4444; font-size:1.1rem; cursor:pointer; padding:2px 4px;">🗑️</button>
            </div>
          </div>
        `);
      });
    }

    $("#monto-subtotal").text(`$${subtotal.toFixed(2)}`);
    $("#monto-total-pagar").text(`$${subtotal.toFixed(2)}`);

    if (estadoPOS.metodoSeleccionado === "Split") calcularSplit();
  }

  // CARGAR CUENTA DESDE BORRADOR
  $(document).on("click", ".btn-cargar-cuenta", function () {
    const index = $(this).data("index");
    const cuenta = estadoPOS.cuentasAbiertas[index];

    if (cuenta) {
      estadoPOS.carrito = [...cuenta.carrito];
      $("#input-nombre-cliente").val(cuenta.cliente);
      estadoPOS.cuentasAbiertas.splice(index, 1);
      renderizarCuentasAbiertas();
      actualizarTicket();
      mostrarToast(`Cuenta de "${cuenta.cliente}" cargada al carrito`, "info");
    }
  });

  // 8. GUARDAR BORRADOR
  $("#btn-guardar-orden").on("click", function () {
    if (estadoPOS.carrito.length === 0) {
      return mostrarToast("El carrito está vacío", "warning");
    }

    const nombreCuenta = prompt(
      "Ingrese el nombre del cliente o mesa para la orden:",
    );
    if (!nombreCuenta) return;

    const $btn = $(this);

    ejecutarConCarga($btn, async () => {
      if (typeof API !== "undefined" && API.sales && API.sales.saveDraftOrder) {
        const user = API.getCurrentUser();

        const itemsFormatted = estadoPOS.carrito.map((item) => {
          const variantId = parseInt(
            item.productVariantId || item.prodId || item.id,
            10,
          );
          return {
            productVariantId: isNaN(variantId) ? 1 : variantId,
            quantity: parseInt(item.cantidad, 10),
            unitPrice: parseFloat(item.precio),
          };
        });

        const draftPayload = {
          branchId: parseInt(user?.branchId || 1, 10),
          customerName: nombreCuenta,
          items: itemsFormatted,
          payments: [],
        };

        try {
          await API.sales.saveDraftOrder(draftPayload);
          mostrarToast(`Borrador guardado para: ${nombreCuenta}`, "success");
        } catch (error) {
          mostrarToast(`Error al guardar borrador: ${error.message}`, "error");
        }
      }

      estadoPOS.cuentasAbiertas.push({
        id: Date.now(),
        cliente: nombreCuenta,
        carrito: [...estadoPOS.carrito],
      });

      estadoPOS.carrito = [];
      actualizarTicket();
      renderizarCuentasAbiertas();
    });
  });

  // 9. REGISTRO DE VENTA (COBRO)
  $("#form-cobro").on("submit", function (e) {
    e.preventDefault();
    if (estadoPOS.carrito.length === 0) {
      return mostrarToast("El carrito está vacío", "warning");
    }

    const $btn = $("#btn-registrar-venta");

    ejecutarConCarga($btn, async () => {
      const totalVenta = estadoPOS.carrito.reduce(
        (acc, i) => acc + parseFloat(i.precio) * parseInt(i.cantidad, 10),
        0,
      );

      let efec = 0,
        yap = 0,
        tarj = 0;

      if (estadoPOS.metodoSeleccionado === "Split") {
        efec = parseFloat($("#split-efectivo").val()) || 0;
        yap = parseFloat($("#split-yappy").val()) || 0;
        tarj = parseFloat($("#split-tarjeta").val()) || 0;
      } else if (estadoPOS.metodoSeleccionado === "Efectivo") {
        efec = totalVenta;
      } else if (estadoPOS.metodoSeleccionado === "Yappy") {
        yap = totalVenta;
      } else if (estadoPOS.metodoSeleccionado === "Tarjeta") {
        tarj = totalVenta;
      }

      if (
        typeof API !== "undefined" &&
        API.sales &&
        (API.sales.processOrder || API.sales.processSale)
      ) {
        const user = API.getCurrentUser();

        const itemsFormatted = estadoPOS.carrito.map((i) => {
          const variantId = parseInt(
            i.productVariantId || i.prodId || i.id,
            10,
          );
          return {
            productVariantId: isNaN(variantId) ? 1 : variantId,
            quantity: parseInt(i.cantidad, 10),
            unitPrice: parseFloat(i.precio),
          };
        });

        const paymentsFormatted = [];
        if (efec > 0)
          paymentsFormatted.push({ paymentMethod: "CASH", amount: efec });
        if (yap > 0)
          paymentsFormatted.push({ paymentMethod: "YAPPY", amount: yap });
        if (tarj > 0)
          paymentsFormatted.push({ paymentMethod: "CARD", amount: tarj });

        const orderPayload = {
          branchId: parseInt(user?.branchId || 1, 10),
          customerName: $("#input-nombre-cliente").val() || "Cliente General",
          items: itemsFormatted,
          payments: paymentsFormatted,
        };

        try {
          await API.sales.processSale(orderPayload);
          mostrarToast(
            `Venta #${estadoPOS.consecutivoOrden} registrada con éxito`,
            "success",
          );
        } catch (error) {
          mostrarToast(`Error al procesar venta: ${error.message}`, "error");
          return;
        }
      }

      // Actualización local de inventario
      estadoPOS.carrito.forEach((item) => {
        if (item.tipo === "ceviche") {
          const prod = estadoPOS.productos.find((p) => p.id == item.prodId);
          if (prod && prod.precios[item.tamano]) {
            prod.precios[item.tamano].stock -= item.cantidad;
          }
        } else {
          const bebida = estadoPOS.productos.find((p) => p.id == item.id);
          if (bebida) {
            bebida.stock -= item.cantidad;
          }
        }
      });

      estadoPOS.esCuentaCargada = false;
      estadoPOS.turno.ventasBrutas += totalVenta;
      estadoPOS.turno.cobrosEfectivo += efec;
      estadoPOS.turno.cobrosYappy += yap;
      estadoPOS.turno.cobrosTarjeta += tarj;

      const recibo = {
        id: `#ORD-00${estadoPOS.consecutivoOrden}`,
        total: totalVenta,
        metodo: estadoPOS.metodoSeleccionado,
        items: [...estadoPOS.carrito],
      };

      estadoPOS.transacciones.push(recibo);

      $("#split-efectivo, #split-yappy, #split-tarjeta").val(0);
      $("#input-nombre-cliente").val("");
      estadoPOS.consecutivoOrden++;
      estadoPOS.carrito = [];
      $("#num-orden-consecutivo").text(`#ORD-00${estadoPOS.consecutivoOrden}`);
      actualizarTicket();
      renderizarProductos();
    });
  });

  // 10. FLUJO DE CIERRE DE TURNO
  $("#btn-cerrar-turno").on("click", async function () {
    const ahora = new Date().toLocaleTimeString();

    let datosResumen = {
      apertura: "Hoy",
      cierre: ahora,
      fondoInicial: estadoPOS.turno.montoInicial,
      ventasBrutas: estadoPOS.turno.ventasBrutas,
      reembolsos: estadoPOS.turno.reembolsos,
      ventasNetas: estadoPOS.turno.ventasBrutas - estadoPOS.turno.reembolsos,
      cobrosEfectivo: estadoPOS.turno.cobrosEfectivo,
      cobrosYappy: estadoPOS.turno.cobrosYappy,
      cobrosTarjeta: estadoPOS.turno.cobrosTarjeta,
      salidasCaja: estadoPOS.turno.salidasCaja,
      efectivoTeorico:
        estadoPOS.turno.montoInicial +
        estadoPOS.turno.cobrosEfectivo -
        estadoPOS.turno.salidasCaja,
    };

    if (
      typeof API !== "undefined" &&
      API.cashShifts &&
      API.cashShifts.getSummary
    ) {
      const shiftId =
        estadoPOS.turno?.data?.data?.id ||
        estadoPOS.turno?.data?.id ||
        estadoPOS.turno?.id ||
        localStorage.getItem("pos_shift_id");

      if (shiftId) {
        try {
          const summary = await API.cashShifts.getSummary(shiftId);
          datosResumen.fondoInicial =
            summary.initialCash || datosResumen.fondoInicial;
          datosResumen.cobrosEfectivo =
            summary.cashSales || datosResumen.cobrosEfectivo;
          datosResumen.salidasCaja =
            summary.totalExpenses || datosResumen.salidasCaja;
          datosResumen.efectivoTeorico =
            summary.expectedCash || datosResumen.efectivoTeorico;

          // 🔹 NUEVO: Actualiza también las ventas brutas y recalcula las ventas netas del servidor
          if (summary.totalSales !== undefined) {
            datosResumen.ventasBrutas = Number(summary.totalSales);
            datosResumen.ventasNetas =
              datosResumen.ventasBrutas - datosResumen.reembolsos;
          }
        } catch (error) {
          console.warn("Fallback a cálculo local de resumen:", error);
        }
      }
    }

    $("#cierre-fecha-apertura").text(datosResumen.apertura);
    $("#cierre-fecha-cierre").text(datosResumen.cierre);
    $("#cierre-fondo-inicial").text(`$${datosResumen.fondoInicial.toFixed(2)}`);
    $("#cierre-ventas-brutas").text(`$${datosResumen.ventasBrutas.toFixed(2)}`);
    $("#cierre-reembolsos").text(`-$${datosResumen.reembolsos.toFixed(2)}`);
    $("#cierre-ventas-netas").text(`$${datosResumen.ventasNetas.toFixed(2)}`);
    $("#cierre-cobros-efectivo").text(
      `$${datosResumen.cobrosEfectivo.toFixed(2)}`,
    );
    $("#cierre-pagos-salidas").text(`-$${datosResumen.salidasCaja.toFixed(2)}`);
    $("#cierre-cobros-yappy").text(`$${datosResumen.cobrosYappy.toFixed(2)}`);
    $("#cierre-cobros-tarjeta").text(
      `$${datosResumen.cobrosTarjeta.toFixed(2)}`,
    );
    $("#cierre-efectivo-teorico").text(
      `$${datosResumen.efectivoTeorico.toFixed(2)}`,
    );

    $("#modal-cierre-turno").fadeIn();
  });

  $("#btn-cancelar-cierre").on("click", function () {
    $("#modal-cierre-turno").fadeOut();
  });

  $("#btn-confirmar-cierre").on("click", function () {
    if (estadoPOS.cuentasAbiertas.length > 0) {
      const cant = estadoPOS.cuentasAbiertas.length;
      mostrarToast(
        `No puede cerrar turno: tiene ${cant} cuenta(s) abierta(s)`,
        "warning",
      );
      $("#modal-cierre-turno").fadeOut();
      return;
    }

    const $btn = $(this);
    const efectivoReal = parseFloat($("#input-efectivo-real").val()) || 0;

    ejecutarConCarga($btn, async () => {
      if (
        typeof API !== "undefined" &&
        API.cashShifts &&
        API.cashShifts.closeShift
      ) {
        const shiftId =
          estadoPOS.turno?.data?.data?.id ||
          estadoPOS.turno?.data?.id ||
          estadoPOS.turno?.id ||
          localStorage.getItem("pos_shift_id");

        if (!shiftId) {
          mostrarToast(
            "Error: No se encontró el ID del turno activo para cerrar en el servidor.",
            "error",
          );
          return;
        }

        try {
          await API.cashShifts.closeShift(shiftId, efectivoReal);
          localStorage.removeItem("pos_shift_id");
          mostrarToast("Turno finalizado con éxito", "success");

          $("#modal-cierre-turno").fadeOut();

          const currentUser = API.getCurrentUser();
          const userRole = String(currentUser?.role || "").toUpperCase();
          const esCajero = userRole === "CASHIER" || userRole === "WAITER";

          if (esCajero) {
            setTimeout(() => {
              API.clearToken();
              location.reload();
            }, 1000);
          } else {
            estadoPOS.turno.activo = false;
            estadoPOS.turno.data = null;
            $("#indicador-turno")
              .removeClass("activo")
              .text("Sin Turno Activo");
            $("#btn-cerrar-turno").hide();
          }
        } catch (error) {
          mostrarToast(
            `Error al notificar cierre al servidor: ${error.message}`,
            "error",
          );
        }
      }
    });
  });
});
