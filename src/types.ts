export interface Table {
  id: number;
  label: string;
  capacity: number;
  status: "available" | "occupied" | "reserved";
  updatedAt: string;
  token?: string;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string;
  imageUrl: string | null;
  dietType: string;
  isAvailable: boolean;
  createdAt: string;
}

export interface OrderItem {
  id: number;
  menuItemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  notes: string | null;
  imageUrl?: string | null;
}

export interface Order {
  id: number;
  tableId: number;
  tableLabel?: string;
  status: "pending" | "preparing" | "ready" | "completed";
  totalPrice: number;
  billRequested?: boolean;
  paymentMethod?: "cash" | "online";
  tokenNumber?: number | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

export interface Feedback {
  id: number;
  orderId: number;
  rating: number;
  comment: string | null;
  customerName?: string | null;
  createdAt: string;
  tableLabel?: string;
}

export interface OrderHistoryRecord {
  id: number;
  tableId: number | null;
  tableLabel: string;
  orderId: number | null;
  totalCost: number;
  itemDetails: string; // JSON string of snapshot items
  paymentMethod?: "cash" | "online";
  createdAt: string;
}

export interface Owner {
  id: number;
  email: string;
  role: string;
}
