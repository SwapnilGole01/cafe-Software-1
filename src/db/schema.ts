import { integer, pgTable, serial, text, timestamp, boolean, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Users table (for owner auth / Google sign-in)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // Nullable for Google-only users
  uid: text("uid").unique(), // Firebase Auth UID (optional fallback)
  role: text("role").default("owner").notNull(), // 'owner' or 'staff'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. Tables table
export const tables = pgTable("tables", {
  id: serial("id").primaryKey(),
  label: text("label").notNull().unique(), // e.g., "Table 1", "Window Booth"
  capacity: integer("capacity").notNull(),
  status: text("status").default("available").notNull(), // 'available', 'occupied', 'reserved'
  sessionToken: text("session_token"), // dynamic token generated on fresh scan
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 3. Menu Items table
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: doublePrecision("price").notNull(),
  category: text("category").notNull(), // e.g., "Drinks", "Desserts", "Main Course"
  imageUrl: text("image_url"),
  dietType: text("diet_type").default("veg").notNull(), // 'veg' or 'non-veg'
  isAvailable: boolean("is_available").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  tableId: integer("table_id").references(() => tables.id, { onDelete: "cascade" }).notNull(),
  status: text("status").default("pending").notNull(), // 'pending', 'preparing', 'ready', 'completed'
  totalPrice: doublePrecision("total_price").default(0).notNull(),
  billRequested: boolean("bill_requested").default(false).notNull(),
  paymentMethod: text("payment_method").default("cash").notNull(), // 'cash', 'online'
  tokenNumber: integer("token_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 5. Order Items table
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  menuItemId: integer("menu_item_id").references(() => menuItems.id, { onDelete: "restrict" }).notNull(),
  quantity: integer("quantity").notNull(),
  notes: text("notes"),
  unitPrice: doublePrecision("unit_price").notNull(),
});

// 6. Feedback table
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  rating: integer("rating").notNull(), // 1 to 5 stars
  comment: text("comment"),
  customerName: text("customer_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 7. Order History table (for tracking transaction snapshot history per table ID)
export const orderHistory = pgTable("order_history", {
  id: serial("id").primaryKey(),
  tableId: integer("table_id").references(() => tables.id, { onDelete: "set null" }),
  tableLabel: text("table_label").notNull(),
  orderId: integer("order_id"), // Nullable in case order is hard deleted but history stays
  totalCost: doublePrecision("total_cost").notNull(),
  itemDetails: text("item_details").notNull(), // JSON string representing snapshot of ordered items
  paymentMethod: text("payment_method").default("cash").notNull(), // 'cash', 'online'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relationships
export const tablesRelations = relations(tables, ({ many }) => ({
  orders: many(orders),
  orderHistories: many(orderHistory),
}));

export const menuItemsRelations = relations(menuItems, ({ many }) => ({
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  table: one(tables, {
    fields: [orders.tableId],
    references: [tables.id],
  }),
  items: many(orderItems),
  feedbacks: many(feedback),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  order: one(orders, {
    fields: [feedback.orderId],
    references: [orders.id],
  }),
}));

export const orderHistoryRelations = relations(orderHistory, ({ one }) => ({
  table: one(tables, {
    fields: [orderHistory.tableId],
    references: [tables.id],
  }),
}));
