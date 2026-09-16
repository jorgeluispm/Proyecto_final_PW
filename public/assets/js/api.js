/**
 * api.js - Módulo de integración API REST para Brother's Fish POS
 */

//const API_BASE_URL = "http://localhost:3000"; // Ajustado sin /api/v1
const API_BASE_URL = window.location.origin; // Ahora (dinámico y relativo al mismo origen)

const API = {
  // 1. GESTIÓN DE TOKENS Y CABECERAS
  getToken() {
    return localStorage.getItem("pos_token");
  },

  setToken(token) {
    localStorage.setItem("pos_token", token);
  },

  clearToken() {
    localStorage.removeItem("pos_token");
    localStorage.removeItem("pos_user");
  },

  getHeaders() {
    const headers = {
      "Content-Type": "application/json",
    };
    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  },

  // Helper para obtener datos del usuario logueado
  getCurrentUser() {
    const userStr = localStorage.getItem("pos_user");
    return userStr ? JSON.parse(userStr) : null;
  },

  // 2. CLIENTE HTTP CENTRALIZADO
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);

      // Si da 401 Y NO ES la petición de login, se considera token expirado
      if (response.status === 401 && !endpoint.includes("/auth/login")) {
        this.clearToken();
        alert(
          "🔒 La sesión ha expirado o es inválida. Inicie sesión nuevamente.",
        );
        window.location.reload();
        return null;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error HTTP: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`[API Error] en ${endpoint}:`, error.message);
      throw error;
    }
  },

  // 3. ENDPOINTS DE AUTENTICACIÓN
  auth: {
    async login(username, password) {
      const res = await API.request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      if (res && res.accessToken) {
        API.setToken(res.accessToken);
        if (res.user) {
          localStorage.setItem("pos_user", JSON.stringify(res.user));
          if (res.user.id) {
            localStorage.setItem("pos_user_id", res.user.id);
          }
        }
      }
      return res;
    },
  },

  // 4. ENDPOINTS DE TURNOS Y CAJA CHICA (CASH SHIFTS)
  cashShifts: {
    async getActiveShift(branchId) {
      const user = API.getCurrentUser();
      // Prioridad: branchId argumento -> branchId de usuario -> 1 por defecto
      const validBranchId = Number(branchId || user?.branchId || 1);
      return await API.request(`/cash-shifts/active?branchId=${validBranchId}`);
    },

    async openShift(data, initialCash) {
      const user = API.getCurrentUser();

      // Si nos pasan un objeto payload directo desde script.js
      if (typeof data === "object" && data !== null) {
        return await API.request("/cash-shifts/open", {
          method: "POST",
          body: JSON.stringify({
            branchId: Number(data.branchId || user?.branchId || 1),
            openedById: String(data.openedById || user?.id),
            initialCash: Number(data.initialCash || 0),
          }),
        });
      }

      // Soporte retrocompatible si se llama con parámetros individuales: openShift(branchId, initialCash)
      const rawBranchId = data || user?.branchId || 1;
      const parsedBranchId = parseInt(rawBranchId, 10);

      return await API.request("/cash-shifts/open", {
        method: "POST",
        body: JSON.stringify({
          branchId: isNaN(parsedBranchId) ? 1 : parsedBranchId,
          openedById: user?.id,
          initialCash: Number(initialCash || 0),
        }),
      });
    },
    // Mapea a POST /cash-shifts/transaction (CreateCashTransactionDto)
    async registerTransaction(shiftId, amount, concept) {
      // 1. Obtener usuario de múltiples fuentes de respaldo
      const user = API.getCurrentUser();
      let userId = user?.id || user?.userId;

      if (!userId) {
        try {
          const storedUser = JSON.parse(
            localStorage.getItem("pos_user") || "{}",
          );
          userId = storedUser?.id || storedUser?.userId;
        } catch (e) {
          console.warn("No se pudo parsear pos_user desde localStorage", e);
        }
      }

      if (!userId) {
        userId = localStorage.getItem("pos_user_id");
      }

      if (!userId) {
        throw new Error(
          "No se encontró un ID de usuario válido en la sesión actual.",
        );
      }

      // 2. Extraer el UUID del turno
      let actualShiftId = typeof shiftId === "object" ? shiftId?.id : shiftId;
      if (!actualShiftId) {
        actualShiftId = localStorage.getItem("pos_shift_id");
      }

      if (!actualShiftId) {
        throw new Error("No se especificó un turno de caja válido.");
      }

      // 3. Estructura exacta requerida por CreateCashTransactionDto
      const payload = {
        cashShiftId: String(actualShiftId),
        amount: Number(amount),
        reason: String(concept),
        registeredById: String(userId),
      };

      return await API.request("/cash-shifts/transaction", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async getSummary(shiftId) {
      return await API.request(`/cash-shifts/${shiftId}/summary`);
    },

    // Mapea a CloseShiftDto (closedById, finalCashReal)
    async closeShift(shiftId, finalCashReal) {
      const user = API.getCurrentUser();
      return await API.request(`/cash-shifts/${shiftId}/close`, {
        method: "POST",
        body: JSON.stringify({
          closedById: user?.id, // UUID del usuario que cierra la caja
          finalCashReal: Number(finalCashReal),
        }),
      });
    },
  },

  // 5. ENDPOINTS DE PRODUCTOS Y CATÁLOGO
  products: {
    async getAll() {
      return await API.request("/products");
    },

    async getByCategory(categoryId) {
      return await API.request(`/products/category/${categoryId}`);
    },

    async createProduct(productData) {
      return await API.request("/products", {
        method: "POST",
        body: JSON.stringify(productData),
      });
    },
  },

  // 6. ENDPOINTS DE VENTAS Y CUENTAS ABIERTAS
  sales: {
    async getOrders(shiftId = null) {
      const query = shiftId ? `?shiftId=${shiftId}` : "";
      return await API.request(`/sales/orders${query}`); // <-- Se agrega '/sales'
    },

    async voidOrder(orderId, reason) {
      return await API.request(`/sales/orders/${orderId}/void`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
    },

    async processSale(salePayload) {
      const user = API.getCurrentUser();

      const payload = {
        branchId: Number(salePayload.branchId || user?.branchId || 1),
        userId: user?.id, // UUID del usuario
        customerName: salePayload.customerName || "Cliente General",
        paymentMethod: salePayload.paymentMethod || "CASH",
        amountPaid: Number(salePayload.amountPaid || 0),
        isDraft: Boolean(salePayload.isDraft),
        items: (salePayload.items || []).map((item) => ({
          productVariantId: Number(item.productVariantId || item.id), // Garantiza que sea INTEGER para Postgres y @IsNumber()
          unitPrice: Number(item.unitPrice || item.precio),
          quantity: Number(item.quantity || item.cantidad),
        })),
        payments: salePayload.payments || [],
      };

      return await API.request("/sales/process", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async saveDraftOrder(draftPayload) {
      const user = API.getCurrentUser();
      const payload = {
        userId: user?.id,
        isDraft: true,
        ...draftPayload,
      };

      return await API.request("/sales/process", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },
};
