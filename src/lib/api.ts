import { Table, MenuItem, Order, Feedback, OrderHistoryRecord, Owner } from "../types.ts";

let authToken: string | null = localStorage.getItem("cafe_admin_token");

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem("cafe_admin_token", token);
  } else {
    localStorage.removeItem("cafe_admin_token");
  }
};

export const getAuthToken = () => authToken;

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }
  const tableToken = localStorage.getItem("cafe_table_token");
  if (tableToken) {
    headers.set("X-Table-Token", tableToken);
  }
  const sessionToken = localStorage.getItem("cafe_session_token");
  if (sessionToken) {
    headers.set("X-Session-Token", sessionToken);
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...options, headers });
  
  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("text/html")) {
    throw new Error(`Expected JSON but received HTML from the server for route: ${url}. The server or endpoint may be temporarily starting up or unavailable.`);
  }

  if (!response.ok) {
    let errMsg = `HTTP error ${response.status}`;
    try {
      const errData = await response.json();
      if (errData && errData.error) {
        errMsg = errData.error;
      }
    } catch (e) {
      // Not a JSON error body
    }
    throw new Error(errMsg);
  }

  try {
    return await response.json() as T;
  } catch (err) {
    throw new Error(`Failed to parse JSON response from ${url}: ${(err as Error).message}`);
  }
}

export const api = {
  // Owner Authentication
  async login(email: string, password: string): Promise<{ owner: Owner; token: string }> {
    const data = await apiFetch<{ owner: Owner; token: string }>("/api/auth/login-owner", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    return data;
  },

  async register(email: string, password: string): Promise<{ owner: Owner; token: string }> {
    const data = await apiFetch<{ owner: Owner; token: string }>("/api/auth/register-owner", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    return data;
  },

  async logout(): Promise<void> {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(console.error);
    setAuthToken(null);
  },

  async checkMe(): Promise<{ user: Owner }> {
    return apiFetch<{ user: Owner }>("/api/auth/me");
  },

  // Public Customer Operations
  async getPublicMenu(): Promise<MenuItem[]> {
    const data = await apiFetch<any>("/api/menu");
    if (Array.isArray(data)) {
      return data;
    }
    return Object.values(data).flat() as MenuItem[];
  },

  async getTableStatus(tableId: number, scan: boolean = false): Promise<{ table: Table; activeOrder: Order | null; sessionToken?: string }> {
    const url = `/api/table/${tableId}${scan ? "?scan=true" : ""}`;
    return apiFetch<{ table: Table; activeOrder: Order | null; sessionToken?: string }>(url);
  },

  async placeOrder(tableId: number, items: { menuItemId: number; quantity: number; notes: string }[]): Promise<{ orderId: number; totalPrice: number }> {
    return apiFetch<{ orderId: number; totalPrice: number }>(`/api/table/${tableId}/order`, {
      method: "POST",
      body: JSON.stringify({ items }),
    });
  },

  async postOrder(tableId: number, items: { menuItemId: number; quantity: number; notes: string }[]): Promise<Order> {
    return apiFetch<Order>("/api/orders", {
      method: "POST",
      body: JSON.stringify({ tableId, items }),
    });
  },

  async submitFeedback(orderId: number, rating: number, comment: string, customerName?: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/api/feedback", {
      method: "POST",
      body: JSON.stringify({ orderId, rating, comment, customerName }),
    });
  },

  // Secure Admin Operations
  async getAdminTables(): Promise<Table[]> {
    return apiFetch<Table[]>("/api/admin/tables");
  },

  async createTable(label: string, capacity: number): Promise<Table> {
    return apiFetch<Table>("/api/admin/tables", {
      method: "POST",
      body: JSON.stringify({ label, capacity }),
    });
  },

  async updateTable(id: number, updates: Partial<Table>): Promise<Table> {
    return apiFetch<Table>(`/api/admin/tables/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  async getAdminMenu(): Promise<MenuItem[]> {
    return apiFetch<MenuItem[]>("/api/admin/menu");
  },

  async addMenuItem(item: Omit<MenuItem, "id" | "createdAt">): Promise<MenuItem> {
    return apiFetch<MenuItem>("/api/admin/menu", {
      method: "POST",
      body: JSON.stringify(item),
    });
  },

  async updateMenuItem(id: number, updates: Partial<MenuItem>): Promise<MenuItem> {
    return apiFetch<MenuItem>(`/api/admin/menu/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  async putMenuItem(id: number, updates: Partial<MenuItem>): Promise<MenuItem> {
    return apiFetch<MenuItem>(`/api/admin/menu/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  async deleteMenuItem(id: number): Promise<{ message: string; item: MenuItem }> {
    return apiFetch<{ message: string; item: MenuItem }>(`/api/admin/menu/${id}`, {
      method: "DELETE",
    });
  },

  async getAdminOrders(): Promise<Order[]> {
    return apiFetch<Order[]>("/api/admin/orders");
  },

  async updateOrderStatus(id: number, status: Order["status"], paymentMethod?: "cash" | "online"): Promise<Order> {
    return apiFetch<Order>(`/api/admin/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, paymentMethod }),
    });
  },

  async patchOrderStatus(id: number, status: Order["status"], paymentMethod?: "cash" | "online"): Promise<Order> {
    return apiFetch<Order>(`/api/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, paymentMethod }),
    });
  },

  async patchOrderItems(id: number, items: { menuItemId: number; quantity: number; notes: string }[]): Promise<Order> {
    return apiFetch<Order>(`/api/orders/${id}/items`, {
      method: "PATCH",
      body: JSON.stringify({ items }),
    });
  },

  async requestBill(id: number): Promise<Order> {
    return apiFetch<Order>(`/api/orders/${id}/request-bill`, {
      method: "PATCH",
    });
  },

  async getReports(from: string, to: string): Promise<any> {
    return apiFetch<any>(`/api/admin/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  },

  async getAdminFeedback(): Promise<Feedback[]> {
    return apiFetch<Feedback[]>("/api/admin/feedback");
  },

  async getAdminHistory(): Promise<OrderHistoryRecord[]> {
    return apiFetch<OrderHistoryRecord[]>("/api/admin/history");
  },

  async getStaffList(): Promise<{ id: number; email: string; role: string; createdAt: string }[]> {
    const data = await apiFetch<{ staff: any[] }>("/api/auth/staff");
    return data.staff;
  },

  async createStaffUser(email: string, password: string): Promise<{ staff: any }> {
    return apiFetch<{ staff: any }>("/api/auth/register-staff", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async deleteStaffUser(id: number): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/api/auth/staff/${id}`, {
      method: "DELETE",
    });
  },
};
