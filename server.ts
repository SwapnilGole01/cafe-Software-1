import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, and, desc, gte, lte, ne } from "drizzle-orm";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { z } from "zod";

import { db } from "./src/db/index.ts";
import { fullMenuData } from "./src/db/fullMenu.ts";
import {
  users,
  tables,
  menuItems,
  orders,
  orderItems,
  feedback,
  orderHistory,
} from "./src/db/schema.ts";
import { requireAdminAuth, AuthenticatedRequest, isEmailAllowed } from "./src/middleware/auth.ts";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "cafe_manager_secret_key_123456";

function getTableToken(tableId: number): string {
  return crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`table-token-${tableId}`)
    .digest("hex")
    .slice(0, 16);
}

function verifyTableToken(tableId: number, token: string | undefined): boolean {
  if (!tableId || !token) return false;
  return getTableToken(tableId) === token;
}

async function checkTableVerificationAsync(req: express.Request, tableId: number, options?: { isScan?: boolean }): Promise<boolean> {
  // Allow authenticated admin/staff to bypass this security check
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const adminToken = authHeader.split(" ")[1];
    try {
      jwt.verify(adminToken, JWT_SECRET);
      return true;
    } catch (e) {
      // Ignore and proceed to regular table token check
    }
  }

  const token = (req.headers["x-table-token"] || req.query.token) as string | undefined;
  if (!verifyTableToken(tableId, token)) {
    return false;
  }

  const isScan = options?.isScan ?? (req.query.scan === "true");
  if (!isScan) {
    const sessionToken = (req.headers["x-session-token"] || req.query.sessionToken) as string | undefined;
    if (!sessionToken) return false;

    const [table] = await db.select().from(tables).where(eq(tables.id, tableId)).limit(1);
    if (!table || !table.sessionToken || table.sessionToken !== sessionToken) {
      return false;
    }
  }

  return true;
}

export const app = express();
export let appInstance: any = app;
export let ioInstance: any = null;

async function startServer() {
  const PORT = 3000;

  app.use(express.json());

  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    },
  });
  ioInstance = io;

  io.on("connection", (socket) => {
    socket.on("join-table", (tableId) => {
      const parsedId = Number(tableId);
      if (!isNaN(parsedId)) {
        socket.join(`table:${parsedId}`);
      }
    });
  });

  const emitOrderNew = (order: any) => {
    io.emit("order:new", order);
  };

  const emitOrderUpdated = (order: any) => {
    io.emit("order:updated", order);
    io.to(`table:${order.tableId}`).emit("order:updated", order);
  };

  const emitTableStatusChanged = (tableId: number, status: string) => {
    io.emit("table:status_changed", { tableId, status });
    io.to(`table:${tableId}`).emit("table:status_changed", { tableId, status });
  };

  // ZOD SCHEMAS FOR VALIDATION
  const idParamSchema = z.object({
    id: z.string().regex(/^\d+$/, "ID must be a numeric string").transform(Number),
  });

  const menuCreateSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional().nullable(),
    price: z.preprocess((val) => Number(val), z.number().positive("Price must be positive")),
    category: z.string().min(1, "Category is required"),
    imageUrl: z.string().optional().nullable(),
    dietType: z.enum(["veg", "non-veg"]).default("veg").optional(),
    isAvailable: z.preprocess((val) => val === undefined ? true : (val === "true" || val === true), z.boolean()).optional(),
  });

  const menuUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    price: z.preprocess((val) => val !== undefined ? Number(val) : undefined, z.number().positive().optional()),
    category: z.string().min(1).optional(),
    imageUrl: z.string().optional().nullable(),
    dietType: z.enum(["veg", "non-veg"]).optional(),
    isAvailable: z.preprocess((val) => val !== undefined ? (val === "true" || val === true) : undefined, z.boolean().optional()),
  });

  const orderCreateSchema = z.object({
    table_id: z.preprocess((val) => val !== undefined ? Number(val) : undefined, z.number().int().positive()).optional(),
    tableId: z.preprocess((val) => val !== undefined ? Number(val) : undefined, z.number().int().positive()).optional(),
    items: z.array(
      z.object({
        menu_item_id: z.preprocess((val) => val !== undefined ? Number(val) : undefined, z.number().int().positive()).optional(),
        menuItemId: z.preprocess((val) => val !== undefined ? Number(val) : undefined, z.number().int().positive()).optional(),
        quantity: z.number().int().positive("Quantity must be a positive integer"),
        notes: z.string().optional().nullable(),
      })
    ).min(1, "At least one item is required in the order"),
  }).refine((data) => data.table_id !== undefined || data.tableId !== undefined, {
    message: "Either table_id or tableId is required",
    path: ["tableId"],
  });

  const orderStatusUpdateSchema = z.object({
    status: z.enum(["pending", "preparing", "ready", "completed"]),
    paymentMethod: z.enum(["cash", "online"]).optional(),
  });

  const orderItemsUpdateSchema = z.object({
    items: z.array(
      z.object({
        menu_item_id: z.preprocess((val) => val !== undefined ? Number(val) : undefined, z.number().int().positive()).optional(),
        menuItemId: z.preprocess((val) => val !== undefined ? Number(val) : undefined, z.number().int().positive()).optional(),
        quantity: z.number().int().nonnegative("Quantity must be non-negative"),
        notes: z.string().optional().nullable(),
      })
    ).min(1, "At least one item is required"),
  });

  // Helper function to sanitize database errors and log them
  const handleDbError = (res: express.Response, error: any, message: string) => {
    console.error(message, error);
    res.status(500).json({ error: `${message}. Please try again later.` });
  };

  // ---------------------------------------------------------------------------
  // Auto-Seeding Database on Startup (Asynchronously in the background)
  // ---------------------------------------------------------------------------
  (async () => {
    try {
    // Check if users exist, if not seed default admin
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length === 0) {
      const hashedPassword = bcrypt.hashSync("adminpassword", 10);
      await db.insert(users).values({
        email: "admin@cafe.com",
        passwordHash: hashedPassword,
        role: "owner",
      });
      console.log("Seeded default admin user: admin@cafe.com / adminpassword");
    }

    // Check if tables exist, if not seed default tables
    const existingTables = await db.select().from(tables).limit(1);
    if (existingTables.length === 0) {
      await db.insert(tables).values([
        { label: "Bar Counter A", capacity: 1, status: "available" },
        { label: "Bar Counter B", capacity: 1, status: "available" },
        { label: "Window Booth 1", capacity: 4, status: "available" },
        { label: "Window Booth 2", capacity: 4, status: "available" },
        { label: "Patio Garden Table", capacity: 2, status: "available" },
        { label: "Family Table 6", capacity: 6, status: "available" },
      ]);
      console.log("Seeded default café tables");
    }

    // Sync menu items with fullMenuData on startup
    try {
      const existingMenu = await db.select().from(menuItems);
      const existingNames = new Set(existingMenu.map(item => item.name));

      const itemsToInsert = fullMenuData.filter(item => !existingNames.has(item.name));
      if (itemsToInsert.length > 0) {
        console.log(`Inserting ${itemsToInsert.length} new menu items...`);
        await db.insert(menuItems).values(itemsToInsert);
      }

      console.log("Updating menu items with correct photos, categories, descriptions, and prices...");
      for (const item of fullMenuData) {
        await db.update(menuItems)
          .set({
            imageUrl: item.imageUrl,
            price: item.price,
            category: item.category,
            dietType: item.dietType,
            description: item.description
          })
          .where(eq(menuItems.name, item.name));
      }
      console.log("Menu sync complete!");
    } catch (error) {
      console.error("Failed to seed or sync database menu items:", error);
    }

    // Check if menu items exist, if not seed menu (bypassed since synced above)
    const existingMenu = await db.select().from(menuItems).limit(1);
    if (false && (existingMenu.length === 0 || existingMenu[0].name === "Espresso Classico")) {
      // Clear old seed if any
      if (existingMenu.length > 0) {
        try {
          await db.delete(menuItems);
        } catch (e) {
          console.log("Could not clear old menu items due to foreign keys, proceeding to upsert instead.");
        }
      }

      await db.insert(menuItems).values([
        {
          name: "Veg Cheese Momo (Steam)",
          description: "Served with rich house dip. Succulent steamed momos stuffed with seasonal vegetables and melted mozzarella cheese.",
          price: 150.00,
          category: "Winter Special",
          imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Paneer Momo (Steam)",
          description: "Served with rich house dip. Soft steamed dumpling parcels stuffed with seasoned grated paneer and herbs.",
          price: 170.00,
          category: "Winter Special",
          imageUrl: "https://images.unsplash.com/photo-1625220194771-7ebedd0b4a1b?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Paneer Momo (Fried)",
          description: "Crispy, deep-fried savory golden momos filled with spiced cottage cheese and fine herbs, served with dynamic dips.",
          price: 190.00,
          category: "Winter Special",
          imageUrl: "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Hot Chocolate",
          description: "Thick, luxurious premium hot cocoa brewed with organic whole milk and topped with fluffy marshmallows.",
          price: 170.00,
          category: "Winter Special",
          imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Cinnamon Hot Chocolate",
          description: "Cozy warm Belgian dark hot chocolate spiced with a touch of freshly grated sweet cinnamon bark.",
          price: 190.00,
          category: "Winter Special",
          imageUrl: "https://images.unsplash.com/photo-1577003833619-76bbd39a2760?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Penne Alfredo",
          description: "Al dente penne pasta tossed in our ultra-creamy rich butter and parmesan white cream sauce, topped with wild herbs.",
          price: 210.00,
          category: "Pasta",
          imageUrl: "https://images.unsplash.com/photo-1555949258-ebc762fe463f?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Penne Arabiata",
          description: "Tender penne pasta simmered in a spicy, robust red tomato gravy infused with garlic, chilli flakes, and fresh basil.",
          price: 210.00,
          category: "Pasta",
          imageUrl: "https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Pesto Pasta",
          description: "Classic Italian style penne coated in fresh homemade basil pesto, extra virgin olive oil, and toasted pine nuts.",
          price: 230.00,
          category: "Pasta",
          imageUrl: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Spaghetti Aglio e Olio",
          description: "Classic Neapolitan pasta gently tossed in extra virgin olive oil, golden toasted garlic slivers, and dry red chilli flakes.",
          price: 220.00,
          category: "Pasta",
          imageUrl: "https://images.unsplash.com/photo-1621996346565-e3bb64d0be5e?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Veg Thai Curry with Rice",
          description: "Aromatic sweet-spicy coconut milk green Thai curry loaded with exotic veggies, served with steamed jasmine rice.",
          price: 250.00,
          category: "Rice Meals",
          imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Hub Makhani with Rice",
          description: "Soft and buttery tandoor-roasted cottage cheese cubes cooked in a rich, sweet-spicy tomato gravy, served over hub makhani rice.",
          price: 270.00,
          category: "Rice Meals",
          imageUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Chilli Paneer",
          description: "Spicy stir-fried crispy paneer cubes tossed in a sweet-sour, dark soy-garlic-chilli glaze with spring onions and capsicum.",
          price: 190.00,
          category: "Appetizer",
          imageUrl: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Chilli Chicken",
          description: "Crispy battered chicken bits stir-fried with diced onions, fresh bell peppers, and sharp green chillies in a soy-chilli sauce.",
          price: 210.00,
          category: "Appetizer",
          imageUrl: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=600&q=80",
          dietType: "non-veg",
          isAvailable: true,
        },
        {
          name: "Veggie Burger",
          description: "Served with house dip. Crispy mixed vegetable patty, fresh lettuce, juicy heirloom tomato, and our custom mayo in toasted sesame buns.",
          price: 150.00,
          category: "Burgers",
          imageUrl: "https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Chicken Burger",
          description: "Served with house dip. Golden crispy crusted chicken breast, melted cheddar cheese, fresh onions, and rich spicy house sauce.",
          price: 170.00,
          category: "Burgers",
          imageUrl: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80",
          dietType: "non-veg",
          isAvailable: true,
        },
        {
          name: "Paneer Wrap",
          description: "Warm flatbread rolled with marinated paneer tikka cubes, crisp red onions, lettuce, and tangy herb dressing.",
          price: 170.00,
          category: "Wraps",
          imageUrl: "https://images.unsplash.com/photo-1626700051175-6518c4793f4f?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "3 Cheese Pizza",
          description: "Stone-baked artisan pizza loaded with an incredible, rich blend of premium mozzarella, sharp cheddar, and dynamic cheeses.",
          price: 210.00,
          category: "Pizza",
          imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Paneer Tikka Pizza",
          description: "Smoky, clay-oven roasted paneer tikka pieces, crisp red onions, bell peppers, mozzarella cheese, and rich makhani pizza sauce.",
          price: 250.00,
          category: "Pizza",
          imageUrl: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Cheese Garlic Bread",
          description: "Toasted sliced baguettes topped with whipped garlic butter, fresh green parsley, and an abundant layer of baked gooey cheese.",
          price: 150.00,
          category: "Pizza",
          imageUrl: "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Kit-Kat Shake",
          description: "Indulgent thick chocolate shake blended with premium milk, Hershey's cocoa, and loaded with crunchy crushed Kit-Kat wafer bar crumbs.",
          price: 150.00,
          category: "Shakes",
          imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Oreo Shake",
          description: "Decadent cream-rich milkshake blended with classic vanilla bean ice cream and plenty of crushed Oreo chocolate cookies.",
          price: 150.00,
          category: "Shakes",
          imageUrl: "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Sizzling Brownie",
          description: "A signature hot iron platter featuring a fresh warm fudge chocolate brownie topped with cool vanilla bean gelato and bubbling hot fudge sauce.",
          price: 200.00,
          category: "Desserts",
          imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Mint-to-be-Mojito",
          description: "An incredibly refreshing citrus cooling drink muddled with fresh mint leaves, squeezed lime wedges, simple cane syrup, and club soda.",
          price: 150.00,
          category: "Mocktails",
          imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Blue Virgin Mojito",
          description: "Eye-catching vibrant Blue Curaçao orange citrus extract mixed with fresh lime wedges, sparkling soda, and mint leaves on crushed ice.",
          price: 150.00,
          category: "Mocktails",
          imageUrl: "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
        {
          name: "Red Mojito",
          description: "Our signature high-energy mocktail featuring ice cold Red Bull energy infusion over fresh sweet wildberries, lime, and crushed mint.",
          price: 170.00,
          category: "Mocktails",
          imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
          isAvailable: true,
        },
      ]);
      console.log("Seeded default cafe Software menu items in Rupees");
    }

    // Deduplicate menu items by name automatically on startup
    const allMenu = await db.select().from(menuItems);
    const seenNames = new Set<string>();
    const duplicateIds: number[] = [];
    for (const item of allMenu) {
      if (seenNames.has(item.name)) {
        duplicateIds.push(item.id);
      } else {
        seenNames.add(item.name);
      }
    }
    if (duplicateIds.length > 0) {
      console.log(`Found ${duplicateIds.length} duplicate menu items in database. Deleting...`);
      for (const dupId of duplicateIds) {
        try {
          await db.delete(menuItems).where(eq(menuItems.id, dupId));
        } catch (e) {
          console.error(`Could not delete duplicate menu item ID ${dupId}:`, e);
        }
      }
      console.log("Successfully cleaned up duplicate menu items.");
    }

    // Force update existing default menu item photos to attractive, high-quality, professional food photos
    const defaultImagesMap: Record<string, string> = {
      "Veg Cheese Momo (Steam)": "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80",
      "Paneer Momo (Steam)": "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80",
      "Paneer Momo (Fried)": "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=600&q=80",
      "Hot Chocolate": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
      "Cinnamon Hot Chocolate": "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80",
      "Penne Alfredo": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80",
      "Penne Arabiata": "https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=600&q=80",
      "Pesto Pasta": "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=600&q=80",
      "Spaghetti Aglio e Olio": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80",
      "Veg Thai Curry with Rice": "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=600&q=80",
      "Hub Makhani with Rice": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80",
      "Chilli Paneer": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80",
      "Chilli Chicken": "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=600&q=80",
      "Veggie Burger": "https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?auto=format&fit=crop&w=600&q=80",
      "Chicken Burger": "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80",
      "Paneer Wrap": "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80",
      "3 Cheese Pizza": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
      "Paneer Tikka Pizza": "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=600&q=80",
      "Cheese Garlic Bread": "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=600&q=80",
      "Kit-Kat Shake": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
      "Oreo Shake": "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80",
      "Sizzling Brownie": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80",
      "Mint-to-be-Mojito": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
      "Blue Virgin Mojito": "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=600&q=80",
      "Red Mojito": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80"
    };

    console.log("Updating default menu item photos with highly attractive ones...");
    for (const [name, url] of Object.entries(defaultImagesMap)) {
      try {
        const dType = (name === "Chilli Chicken" || name === "Chicken Burger") ? "non-veg" : "veg";
        await db.update(menuItems)
          .set({ imageUrl: url, dietType: dType })
          .where(eq(menuItems.name, name));
      } catch (e) {
        console.error(`Could not update photo/dietType for ${name}:`, e);
      }
    }
    console.log("Successfully updated all default menu item photos and diet types.");
    } catch (error) {
      console.error("Failed to seed or deduplicate initial database:", error);
    }
  })();

  // ---------------------------------------------------------------------------
  // AUTH ROUTE ENDPOINTS
  // ---------------------------------------------------------------------------

  // POST /api/auth/register-owner
  app.post("/api/auth/register-owner", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      if (!isEmailAllowed(email)) {
        return res.status(403).json({ error: "Forbidden: Registration is restricted to authorized owners only." });
      }

      const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing.length > 0) {
        return res.status(400).json({ error: "User already exists with this email" });
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      const [newOwner] = await db
        .insert(users)
        .values({
          email,
          passwordHash: hashedPassword,
          role: "owner",
        })
        .returning();

      // Automatically sign in and return token
      const token = jwt.sign(
        { userId: newOwner.id, email: newOwner.email, role: newOwner.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.cookie("admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      res.status(201).json({
        message: "Owner registered successfully",
        owner: { id: newOwner.id, email: newOwner.email, role: newOwner.role },
        token,
      });
    } catch (error) {
      handleDbError(res, error, "Failed to register owner");
    }
  });

  // POST /api/auth/login-owner
  app.post("/api/auth/login-owner", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Whitelist only applies to owners
      if (user.role === "owner" && !isEmailAllowed(email)) {
        return res.status(403).json({ error: "Forbidden: Your email is not authorized as an owner." });
      }

      const passwordMatches = bcrypt.compareSync(password, user.passwordHash);
      if (!passwordMatches) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.cookie("admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.json({
        message: "Login successful",
        owner: { id: user.id, email: user.email, role: user.role },
        token,
      });
    } catch (error) {
      handleDbError(res, error, "Failed to log in");
    }
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("admin_token");
    res.json({ message: "Logged out successfully" });
  });

  // GET /api/auth/me
  app.get("/api/auth/me", requireAdminAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  // GET /api/auth/staff (Owner only)
  app.get("/api/auth/staff", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.role !== "owner") {
        return res.status(403).json({ error: "Forbidden: Only owners can manage staff accounts" });
      }
      const allUsers = await db.select().from(users);
      // Filter out owner or self (to be safe), returning receptionist/staff users
      const staffList = allUsers
        .filter((u) => u.role !== "owner")
        .map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt,
        }));
      res.json({ staff: staffList });
    } catch (error) {
      handleDbError(res, error, "Failed to retrieve staff list");
    }
  });

  // POST /api/auth/register-staff (Owner only)
  app.post("/api/auth/register-staff", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.role !== "owner") {
        return res.status(403).json({ error: "Forbidden: Only owners can register staff accounts" });
      }
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing.length > 0) {
        return res.status(400).json({ error: "User already exists with this email" });
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      const [newStaff] = await db
        .insert(users)
        .values({
          email,
          passwordHash: hashedPassword,
          role: "reception",
        })
        .returning();

      res.status(201).json({
        message: "Receptionist staff registered successfully",
        staff: { id: newStaff.id, email: newStaff.email, role: newStaff.role },
      });
    } catch (error) {
      handleDbError(res, error, "Failed to register staff user");
    }
  });

  // DELETE /api/auth/staff/:id (Owner only)
  app.delete("/api/auth/staff/:id", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.role !== "owner") {
        return res.status(403).json({ error: "Forbidden: Only owners can delete staff accounts" });
      }
      const staffId = parseInt(req.params.id);
      if (isNaN(staffId)) {
        return res.status(400).json({ error: "Invalid staff ID" });
      }

      // Check if user exists and is not an owner
      const [existing] = await db.select().from(users).where(eq(users.id, staffId)).limit(1);
      if (!existing) {
        return res.status(404).json({ error: "Staff user not found" });
      }
      if (existing.role === "owner") {
        return res.status(400).json({ error: "Cannot delete owner accounts" });
      }

      await db.delete(users).where(eq(users.id, staffId));
      res.json({ message: "Staff user deleted successfully" });
    } catch (error) {
      handleDbError(res, error, "Failed to delete staff user");
    }
  });

  // ---------------------------------------------------------------------------
  // PUBLIC CUSTOMER CHANNELS
  // ---------------------------------------------------------------------------

  // GET /api/menu
  app.get("/api/menu", async (req, res) => {
    try {
      const menu = await db.select().from(menuItems).where(eq(menuItems.isAvailable, true));
      
      const grouped: Record<string, typeof menu> = {};
      for (const item of menu) {
        if (!grouped[item.category]) {
          grouped[item.category] = [];
        }
        grouped[item.category].push(item);
      }
      
      res.json(grouped);
    } catch (error) {
      handleDbError(res, error, "Failed to fetch menu");
    }
  });

  // GET /api/table/:id
  app.get("/api/table/:id", async (req, res) => {
    try {
      const tableId = parseInt(req.params.id);
      if (isNaN(tableId)) {
        return res.status(400).json({ error: "Invalid table ID" });
      }

      const isScan = req.query.scan === "true";

      if (!(await checkTableVerificationAsync(req, tableId, { isScan }))) {
        return res.status(403).json({ error: "Security verification failed: Invalid table session. Please scan the QR code at your table." });
      }

      const [table] = await db.select().from(tables).where(eq(tables.id, tableId)).limit(1);
      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }

      let sessionTokenToReturn = table.sessionToken;

      if (isScan) {
        sessionTokenToReturn = crypto.randomUUID();
        await db
          .update(tables)
          .set({ 
            sessionToken: sessionTokenToReturn,
            updatedAt: new Date()
          })
          .where(eq(tables.id, tableId));
      }

      // Find the active order (pending, preparing, or ready) for this table
      const activeOrdersList = await db
        .select()
        .from(orders)
        .where(eq(orders.tableId, tableId))
        .orderBy(desc(orders.createdAt));

      let activeOrder = null;
      let incompleteOrder = activeOrdersList.find(
        (o) => o.status !== "completed"
      );

      if (incompleteOrder && isScan && incompleteOrder.billRequested) {
        // Automatically complete the previous bill-requested order and archive it to history
        const orderId = incompleteOrder.id;
        await db
          .update(orders)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(orders.id, orderId));

        // Fetch order items to write to history
        const itemsList = await db
          .select({
            quantity: orderItems.quantity,
            unitPrice: orderItems.unitPrice,
            name: menuItems.name,
          })
          .from(orderItems)
          .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
          .where(eq(orderItems.orderId, orderId));

        await db.insert(orderHistory).values({
          tableId: tableId,
          tableLabel: table.label,
          orderId: orderId,
          totalCost: incompleteOrder.totalPrice,
          itemDetails: JSON.stringify(itemsList),
          paymentMethod: incompleteOrder.paymentMethod || "cash",
        });

        // Set table back to available
        await db
          .update(tables)
          .set({ status: "available", sessionToken: sessionTokenToReturn, updatedAt: new Date() })
          .where(eq(tables.id, tableId));

        // Emit socket events so admin and others are updated live
        emitOrderUpdated({ ...incompleteOrder, status: "completed" });
        emitTableStatusChanged(tableId, "available");

        // Clear incompleteOrder so activeOrder becomes null and starts a fresh session
        incompleteOrder = undefined;
      }

      if (incompleteOrder) {
        // Fetch items for this active order
        const items = await db
          .select({
            id: orderItems.id,
            quantity: orderItems.quantity,
            notes: orderItems.notes,
            unitPrice: orderItems.unitPrice,
            menuItemId: orderItems.menuItemId,
            name: menuItems.name,
            imageUrl: menuItems.imageUrl,
          })
          .from(orderItems)
          .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
          .where(eq(orderItems.orderId, incompleteOrder.id));

        activeOrder = {
          ...incompleteOrder,
          items,
        };
      }

      const [updatedTable] = await db.select().from(tables).where(eq(tables.id, tableId)).limit(1);

      res.json({
        table: updatedTable || table,
        activeOrder,
        sessionToken: sessionTokenToReturn,
      });
    } catch (error) {
      handleDbError(res, error, "Failed to fetch table details");
    }
  });

  // POST /api/table/:id/order
  app.post("/api/table/:id/order", async (req, res) => {
    try {
      const tableId = parseInt(req.params.id);
      const { items } = req.body; // Array of { menuItemId, quantity, notes }

      if (isNaN(tableId)) {
        return res.status(400).json({ error: "Invalid table ID" });
      }

      if (!(await checkTableVerificationAsync(req, tableId))) {
        return res.status(403).json({ error: "Security verification failed: Invalid table session. Please scan the QR code at your table." });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Order items are required" });
      }

      const [table] = await db.select().from(tables).where(eq(tables.id, tableId)).limit(1);
      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }

      // Check if there is an active order with billRequested true for this table
      const activeOrders = await db
        .select()
        .from(orders)
        .where(and(eq(orders.tableId, tableId), ne(orders.status, "completed")));
      
      const billRequestedOrder = activeOrders.find(o => o.billRequested);
      if (billRequestedOrder) {
        return res.status(403).json({ error: "Ordering is locked because a bill has already been requested for this table. If you want to order again, please scan the QR code to start a new session." });
      }

      // 1. Calculate prices and verify availability of menu items
      let totalPrice = 0;
      const verifiedItems = [];

      for (const item of items) {
        const [menuItem] = await db
          .select()
          .from(menuItems)
          .where(eq(menuItems.id, item.menuItemId))
          .limit(1);

        if (!menuItem) {
          return res.status(400).json({ error: `Menu item with ID ${item.menuItemId} does not exist` });
        }
        if (!menuItem.isAvailable) {
          return res.status(400).json({ error: `"${menuItem.name}" is currently sold out` });
        }

        const cost = menuItem.price * item.quantity;
        totalPrice += cost;

        verifiedItems.push({
          menuItemId: menuItem.id,
          name: menuItem.name,
          quantity: item.quantity,
          unitPrice: menuItem.price,
          notes: item.notes || "",
        });
      }

      // 2. Calculate sequential token number for today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayOrders = await db
        .select()
        .from(orders)
        .where(gte(orders.createdAt, todayStart));
      const tokenNumber = todayOrders.length + 1;

      // 2.5 Insert new order
      const [newOrder] = await db
        .insert(orders)
        .values({
          tableId,
          status: "pending",
          totalPrice,
          tokenNumber,
        })
        .returning();

      // 3. Insert order items
      for (const vItem of verifiedItems) {
        await db.insert(orderItems).values({
          orderId: newOrder.id,
          menuItemId: vItem.menuItemId,
          quantity: vItem.quantity,
          notes: vItem.notes,
          unitPrice: vItem.unitPrice,
        });
      }

      // 4. Update table status to occupied
      await db
        .update(tables)
        .set({ status: "occupied", updatedAt: new Date() })
        .where(eq(tables.id, tableId));

      // Fetch full order for WS broadcast
      const fullItems = await db
        .select({
          id: orderItems.id,
          quantity: orderItems.quantity,
          notes: orderItems.notes,
          unitPrice: orderItems.unitPrice,
          menuItemId: orderItems.menuItemId,
          name: menuItems.name,
          imageUrl: menuItems.imageUrl,
        })
        .from(orderItems)
        .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(eq(orderItems.orderId, newOrder.id));

      const fullOrder = {
        ...newOrder,
        tableLabel: table.label,
        items: fullItems,
      };

      emitOrderNew(fullOrder);
      emitTableStatusChanged(tableId, "occupied");

      res.status(201).json({
        message: "Order placed successfully!",
        orderId: newOrder.id,
        totalPrice,
      });
    } catch (error) {
      handleDbError(res, error, "Failed to place order");
    }
  });

  // POST /api/feedback
  app.post("/api/feedback", async (req, res) => {
    try {
      const { orderId, rating, comment, customerName } = req.body;
      if (!orderId || !rating) {
        return res.status(400).json({ error: "Order ID and star rating are required" });
      }

      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (!(await checkTableVerificationAsync(req, order.tableId))) {
        return res.status(403).json({ error: "Security verification failed: Invalid table session. Please scan the QR code at your table." });
      }

      const [newFeedback] = await db
        .insert(feedback)
        .values({
          orderId,
          rating,
          comment,
          customerName,
        })
        .returning();

      res.status(201).json({
        message: "Thank you for your valuable feedback!",
        feedbackId: newFeedback.id,
      });
    } catch (error) {
      handleDbError(res, error, "Failed to submit feedback");
    }
  });

  // ---------------------------------------------------------------------------
  // NEW CORE ORDER FLOW ENDPOINTS (PROMPT 6)
  // ---------------------------------------------------------------------------

  // POST /api/orders
  app.post("/api/orders", async (req, res) => {
    try {
      const parsed = orderCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const { table_id, tableId: tId, items } = parsed.data;
      const tableId = (tId ?? table_id) as number;

      if (!(await checkTableVerificationAsync(req, tableId))) {
        return res.status(403).json({ error: "Security verification failed: Invalid table session. Please scan the QR code at your table." });
      }

      // Check if table exists
      const [table] = await db.select().from(tables).where(eq(tables.id, tableId)).limit(1);
      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }

      // Check if there is an active order with billRequested true for this table
      const activeOrders = await db
        .select()
        .from(orders)
        .where(and(eq(orders.tableId, tableId), ne(orders.status, "completed")));
      
      const billRequestedOrder = activeOrders.find(o => o.billRequested);
      if (billRequestedOrder) {
        return res.status(403).json({ error: "Ordering is locked because a bill has already been requested for this table. If you want to order again, please scan the QR code to start a new session." });
      }

      // Calculate prices and verify availability of menu items
      let totalPrice = 0;
      const verifiedItems = [];

      for (const item of items) {
        const mId = item.menuItemId ?? item.menu_item_id;
        if (!mId) {
          return res.status(400).json({ error: "Each item must have a menuItemId or menu_item_id" });
        }

        const [menuItem] = await db
          .select()
          .from(menuItems)
          .where(eq(menuItems.id, mId))
          .limit(1);

        if (!menuItem) {
          return res.status(400).json({ error: `Menu item with ID ${mId} does not exist` });
        }
        if (!menuItem.isAvailable) {
          return res.status(400).json({ error: `"${menuItem.name}" is currently sold out` });
        }

        const cost = menuItem.price * item.quantity;
        totalPrice += cost;

        verifiedItems.push({
          menuItemId: menuItem.id,
          name: menuItem.name,
          quantity: item.quantity,
          unitPrice: menuItem.price,
          notes: item.notes || "",
        });
      }

      // Calculate sequential token number for today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayOrders = await db
        .select()
        .from(orders)
        .where(gte(orders.createdAt, todayStart));
      const tokenNumber = todayOrders.length + 1;

      // Insert new order
      const [newOrder] = await db
        .insert(orders)
        .values({
          tableId,
          status: "pending",
          totalPrice,
          tokenNumber,
        })
        .returning();

      // Insert order items
      for (const vItem of verifiedItems) {
        await db.insert(orderItems).values({
          orderId: newOrder.id,
          menuItemId: vItem.menuItemId,
          quantity: vItem.quantity,
          notes: vItem.notes,
          unitPrice: vItem.unitPrice,
        });
      }

      // Update table status to occupied
      await db
        .update(tables)
        .set({ status: "occupied", updatedAt: new Date() })
        .where(eq(tables.id, tableId));

      // Fetch the full order details including items to return and to emit in WebSocket
      const fullItems = await db
        .select({
          id: orderItems.id,
          quantity: orderItems.quantity,
          notes: orderItems.notes,
          unitPrice: orderItems.unitPrice,
          menuItemId: orderItems.menuItemId,
          name: menuItems.name,
          imageUrl: menuItems.imageUrl,
        })
        .from(orderItems)
        .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(eq(orderItems.orderId, newOrder.id));

      const fullOrder = {
        ...newOrder,
        tableLabel: table.label,
        items: fullItems,
      };

      // Emit real-time WebSocket events
      emitOrderNew(fullOrder);
      emitTableStatusChanged(tableId, "occupied");

      res.status(201).json(fullOrder);
    } catch (error) {
      handleDbError(res, error, "Failed to place order");
    }
  });

  // PATCH /api/orders/:id/status
  app.patch("/api/orders/:id/status", requireAdminAuth, async (req, res) => {
    try {
      const parsedParams = idParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        return res.status(400).json({ error: parsedParams.error.message });
      }
      const orderId = parsedParams.data.id;

      const parsedBody = orderStatusUpdateSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ error: parsedBody.error.message });
      }
      const { status, paymentMethod } = parsedBody.data;

      // Fetch current order with table details
      const [order] = await db
        .select({
          id: orders.id,
          tableId: orders.tableId,
          tableLabel: tables.label,
          status: orders.status,
          totalPrice: orders.totalPrice,
          paymentMethod: orders.paymentMethod,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .innerJoin(tables, eq(orders.tableId, tables.id))
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Update order status and payment method
      const updateData: any = { status, updatedAt: new Date() };
      if (paymentMethod) {
        updateData.paymentMethod = paymentMethod;
      }

      const [updatedOrder] = await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, orderId))
        .returning();

      // If status changed to completed, set table status to 'available' and write to history
      if (status === "completed" && order.status !== "completed") {
        const items = await db
          .select({
            quantity: orderItems.quantity,
            unitPrice: orderItems.unitPrice,
            name: menuItems.name,
          })
          .from(orderItems)
          .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
          .where(eq(orderItems.orderId, orderId));

        await db.insert(orderHistory).values({
          tableId: order.tableId,
          tableLabel: order.tableLabel,
          orderId: orderId,
          totalCost: order.totalPrice,
          itemDetails: JSON.stringify(items),
          paymentMethod: paymentMethod || order.paymentMethod || "cash",
        });

        await db
          .update(tables)
          .set({ status: "available", sessionToken: null, updatedAt: new Date() })
          .where(eq(tables.id, order.tableId));

        emitTableStatusChanged(order.tableId, "available");
      }

      // Fetch items to send full order in websocket/response
      const fullItems = await db
        .select({
          id: orderItems.id,
          quantity: orderItems.quantity,
          notes: orderItems.notes,
          unitPrice: orderItems.unitPrice,
          menuItemId: orderItems.menuItemId,
          name: menuItems.name,
          imageUrl: menuItems.imageUrl,
        })
        .from(orderItems)
        .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(eq(orderItems.orderId, orderId));

      const fullOrder = {
        ...updatedOrder,
        tableLabel: order.tableLabel,
        items: fullItems,
      };

      // Emit real-time WebSocket events
      emitOrderUpdated(fullOrder);

      res.json(fullOrder);
    } catch (error) {
      handleDbError(res, error, "Failed to update order status");
    }
  });

  // PATCH /api/orders/:id/items
  app.patch("/api/orders/:id/items", async (req, res) => {
    try {
      const parsedParams = idParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        return res.status(400).json({ error: parsedParams.error.message });
      }
      const orderId = parsedParams.data.id;

      const parsedBody = orderItemsUpdateSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ error: parsedBody.error.message });
      }
      const { items } = parsedBody.data;

      // Get current order
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (!(await checkTableVerificationAsync(req, order.tableId))) {
        return res.status(403).json({ error: "Security verification failed: Invalid table session. Please scan the QR code at your table." });
      }

      if (order.billRequested) {
        return res.status(400).json({ error: "Cannot modify items because the bill has already been requested for this order. If you want to order again, please scan the QR code to start a new session." });
      }

      if (order.status === "ready" || order.status === "completed") {
        return res.status(400).json({ error: "Cannot modify items of an order that is ready or completed" });
      }

      // Verify and fetch prices for items
      let totalPrice = 0;
      const verifiedItems = [];

      for (const item of items) {
        const mId = item.menuItemId ?? item.menu_item_id;
        if (!mId) {
          return res.status(400).json({ error: "Each item must have a menuItemId or menu_item_id" });
        }

        if (item.quantity === 0) continue; // skip deleted/zero items

        const [menuItem] = await db.select().from(menuItems).where(eq(menuItems.id, mId)).limit(1);
        if (!menuItem) {
          return res.status(400).json({ error: `Menu item with ID ${mId} does not exist` });
        }

        const cost = menuItem.price * item.quantity;
        totalPrice += cost;

        verifiedItems.push({
          menuItemId: menuItem.id,
          quantity: item.quantity,
          notes: item.notes || "",
          unitPrice: menuItem.price,
        });
      }

      // Update items in DB
      // Delete old items
      await db.delete(orderItems).where(eq(orderItems.orderId, orderId));

      // Insert new items
      if (verifiedItems.length > 0) {
        for (const vItem of verifiedItems) {
          await db.insert(orderItems).values({
            orderId,
            menuItemId: vItem.menuItemId,
            quantity: vItem.quantity,
            notes: vItem.notes,
            unitPrice: vItem.unitPrice,
          });
        }
      }

      // Update order total price
      const [updatedOrder] = await db
        .update(orders)
        .set({ totalPrice, updatedAt: new Date() })
        .where(eq(orders.id, orderId))
        .returning();

      // Fetch full order with items
      const fullItems = await db
        .select({
          id: orderItems.id,
          quantity: orderItems.quantity,
          notes: orderItems.notes,
          unitPrice: orderItems.unitPrice,
          menuItemId: orderItems.menuItemId,
          name: menuItems.name,
          imageUrl: menuItems.imageUrl,
        })
        .from(orderItems)
        .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(eq(orderItems.orderId, orderId));

      // Get table details for table label
      const [table] = await db.select().from(tables).where(eq(tables.id, order.tableId)).limit(1);

      const fullOrder = {
        ...updatedOrder,
        tableLabel: table?.label || "Unknown Table",
        items: fullItems,
      };

      // Emit real-time WebSocket events
      emitOrderUpdated(fullOrder);

      res.json(fullOrder);
    } catch (error) {
      handleDbError(res, error, "Failed to update order items");
    }
  });

  // PATCH /api/orders/:id/request-bill
  app.patch("/api/orders/:id/request-bill", async (req, res) => {
    try {
      const parsedParams = idParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        return res.status(400).json({ error: parsedParams.error.message });
      }
      const orderId = parsedParams.data.id;

      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (!(await checkTableVerificationAsync(req, order.tableId))) {
        return res.status(403).json({ error: "Security verification failed: Invalid table session. Please scan the QR code at your table." });
      }

      // Update billRequested flag
      const [updatedOrder] = await db
        .update(orders)
        .set({ billRequested: true, updatedAt: new Date() })
        .where(eq(orders.id, orderId))
        .returning();

      // Get table details for table label
      const [table] = await db.select().from(tables).where(eq(tables.id, order.tableId)).limit(1);

      // Fetch items for full order payload
      const fullItems = await db
        .select({
          id: orderItems.id,
          quantity: orderItems.quantity,
          notes: orderItems.notes,
          unitPrice: orderItems.unitPrice,
          menuItemId: orderItems.menuItemId,
          name: menuItems.name,
          imageUrl: menuItems.imageUrl,
        })
        .from(orderItems)
        .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(eq(orderItems.orderId, orderId));

      const fullOrder = {
        ...updatedOrder,
        tableLabel: table?.label || "Unknown Table",
        items: fullItems,
      };

      // Emit bill:requested to socket.io
      io.emit("bill:requested", {
        orderId: order.id,
        tableId: order.tableId,
        tableLabel: table?.label || `Table ${order.tableId}`,
        totalPrice: order.totalPrice,
      });

      // Emit real-time updated order
      emitOrderUpdated(fullOrder);

      res.json(fullOrder);
    } catch (error) {
      handleDbError(res, error, "Failed to request bill");
    }
  });

  // ---------------------------------------------------------------------------
  // ADMIN CONTROL PLANE & PANEL ENDPOINTS
  // ---------------------------------------------------------------------------

  // GET /api/admin/reports
  app.get("/api/admin/reports", requireAdminAuth, async (req, res) => {
    try {
      const { from, to } = req.query;

      let fromDate = new Date();
      fromDate.setHours(0, 0, 0, 0); // default to today

      let toDate = new Date();
      toDate.setHours(23, 59, 59, 999);

      if (from) {
        fromDate = new Date(from as string);
      }
      if (to) {
        toDate = new Date(to as string);
      }

      // Fetch all orders in this period
      const periodOrders = await db
        .select({
          id: orders.id,
          totalPrice: orders.totalPrice,
          status: orders.status,
          paymentMethod: orders.paymentMethod,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, fromDate),
            lte(orders.createdAt, toDate)
          )
        );

      const totalOrders = periodOrders.length;
      const totalRevenue = periodOrders.reduce((sum, o) => sum + o.totalPrice, 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate Cash vs Online payment metrics for completed transactions
      const completedOrders = periodOrders.filter(o => o.status === "completed");
      const cashRevenue = completedOrders
        .filter(o => o.paymentMethod === "cash")
        .reduce((sum, o) => sum + o.totalPrice, 0);
      const onlineRevenue = completedOrders
        .filter(o => o.paymentMethod === "online")
        .reduce((sum, o) => sum + o.totalPrice, 0);
      const cashOrdersCount = completedOrders.filter(o => o.paymentMethod === "cash").length;
      const onlineOrdersCount = completedOrders.filter(o => o.paymentMethod === "online").length;

      // Table count for turnover rate
      const allTablesList = await db.select().from(tables);
      const numTables = allTablesList.length || 1;

      // Calculate days in period
      const msDiff = toDate.getTime() - fromDate.getTime();
      const numDays = Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));

      // Table turnover rate = (total orders) / (number of tables * number of days)
      const tableTurnoverRate = totalOrders / (numTables * numDays);

      // Top 5 best-selling items
      const topItemsQuery = await db
        .select({
          menuItemId: orderItems.menuItemId,
          name: menuItems.name,
          quantitySold: orderItems.quantity,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(
          and(
            gte(orders.createdAt, fromDate),
            lte(orders.createdAt, toDate)
          )
        );

      // Aggregate top items in JS
      const itemMap: Record<number, { name: string; quantity: number }> = {};
      for (const row of topItemsQuery) {
        if (!itemMap[row.menuItemId]) {
          itemMap[row.menuItemId] = { name: row.name, quantity: 0 };
        }
        itemMap[row.menuItemId].quantity += row.quantitySold;
      }

      const topSellingItems = Object.entries(itemMap)
        .map(([id, data]) => ({
          id: Number(id),
          name: data.name,
          quantitySold: data.quantity,
        }))
        .sort((a, b) => b.quantitySold - a.quantitySold)
        .slice(0, 5);

      // Hourly revenue grouping (0 to 23)
      const hourlyMap: Record<number, number> = {};
      for (let i = 0; i < 24; i++) {
        hourlyMap[i] = 0;
      }

      for (const order of periodOrders) {
        const date = new Date(order.createdAt);
        const hour = date.getHours(); // Local hour
        hourlyMap[hour] = (hourlyMap[hour] || 0) + order.totalPrice;
      }

      const revenueByHour = Object.entries(hourlyMap).map(([hourStr, revenue]) => {
        const hourNum = Number(hourStr);
        const label = `${hourNum.toString().padStart(2, "0")}:00`;
        return {
          hour: label,
          revenue: Number(revenue.toFixed(2)),
        };
      });

      res.json({
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalOrders,
        averageOrderValue: Number(averageOrderValue.toFixed(2)),
        cashRevenue: Number(cashRevenue.toFixed(2)),
        onlineRevenue: Number(onlineRevenue.toFixed(2)),
        cashOrdersCount,
        onlineOrdersCount,
        topSellingItems,
        tableTurnoverRate: Number(tableTurnoverRate.toFixed(2)),
        revenueByHour,
      });
    } catch (error) {
      handleDbError(res, error, "Failed to generate sales report");
    }
  });

  // GET /api/admin/tables
  app.get("/api/admin/tables", requireAdminAuth, async (req, res) => {
    try {
      const allTables = await db.select().from(tables).orderBy(tables.id);
      const tablesWithTokens = allTables.map((t) => ({
        ...t,
        token: getTableToken(t.id),
      }));
      res.json(tablesWithTokens);
    } catch (error) {
      handleDbError(res, error, "Failed to fetch tables");
    }
  });

  // POST /api/admin/tables
  app.post("/api/admin/tables", requireAdminAuth, async (req, res) => {
    try {
      const { label, capacity } = req.body;
      if (!label || !capacity) {
        return res.status(400).json({ error: "Table label and capacity are required" });
      }

      const [newTable] = await db
        .insert(tables)
        .values({
          label,
          capacity: parseInt(capacity),
          status: "available",
        })
        .returning();

      res.status(201).json({
        ...newTable,
        token: getTableToken(newTable.id),
      });
    } catch (error) {
      handleDbError(res, error, "Failed to create table");
    }
  });

  // PATCH /api/admin/tables/:id
  app.patch("/api/admin/tables/:id", requireAdminAuth, async (req, res) => {
    try {
      const tableId = parseInt(req.params.id);
      const { label, capacity, status } = req.body;

      if (isNaN(tableId)) {
        return res.status(400).json({ error: "Invalid table ID" });
      }

      const [updatedTable] = await db
        .update(tables)
        .set({
          ...(label !== undefined && { label }),
          ...(capacity !== undefined && { capacity: parseInt(capacity) }),
          ...(status !== undefined && { status }),
          updatedAt: new Date(),
        })
        .where(eq(tables.id, tableId))
        .returning();

      res.json({
        ...updatedTable,
        token: getTableToken(updatedTable.id),
      });
    } catch (error) {
      handleDbError(res, error, "Failed to update table");
    }
  });

  // GET /api/admin/menu
  app.get("/api/admin/menu", requireAdminAuth, async (req, res) => {
    try {
      const menu = await db.select().from(menuItems).orderBy(menuItems.category);
      res.json(menu);
    } catch (error) {
      handleDbError(res, error, "Failed to fetch admin menu");
    }
  });

  // POST /api/admin/menu
  app.post("/api/admin/menu", requireAdminAuth, async (req, res) => {
    try {
      const parsed = menuCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const { name, description, price, category, imageUrl, dietType, isAvailable } = parsed.data;

      const [newItem] = await db
        .insert(menuItems)
        .values({
          name,
          description,
          price,
          category,
          imageUrl: imageUrl || "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=400&auto=format&fit=crop",
          dietType: dietType || "veg",
          isAvailable: isAvailable !== undefined ? isAvailable : true,
        })
        .returning();

      io.emit("menu:updated");

      res.status(201).json(newItem);
    } catch (error) {
      handleDbError(res, error, "Failed to add menu item");
    }
  });

  // PUT /api/admin/menu/:id
  app.put("/api/admin/menu/:id", requireAdminAuth, async (req, res) => {
    try {
      const parsedParams = idParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        return res.status(400).json({ error: parsedParams.error.message });
      }
      const itemId = parsedParams.data.id;

      const parsedBody = menuUpdateSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ error: parsedBody.error.message });
      }

      const { name, description, price, category, imageUrl, dietType, isAvailable } = parsedBody.data;

      const [updatedItem] = await db
        .update(menuItems)
        .set({
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(price !== undefined && { price }),
          ...(category !== undefined && { category }),
          ...(imageUrl !== undefined && { imageUrl }),
          ...(dietType !== undefined && { dietType }),
          ...(isAvailable !== undefined && { isAvailable }),
        })
        .where(eq(menuItems.id, itemId))
        .returning();

      if (!updatedItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }

      io.emit("menu:updated");

      res.json(updatedItem);
    } catch (error) {
      handleDbError(res, error, "Failed to update menu item via PUT");
    }
  });

  // DELETE /api/admin/menu/:id
  app.delete("/api/admin/menu/:id", requireAdminAuth, async (req, res) => {
    try {
      const parsedParams = idParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        return res.status(400).json({ error: parsedParams.error.message });
      }
      const itemId = parsedParams.data.id;

      const [updatedItem] = await db
        .update(menuItems)
        .set({ isAvailable: false })
        .where(eq(menuItems.id, itemId))
        .returning();

      if (!updatedItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }

      io.emit("menu:updated");

      res.json({ message: "Menu item soft deleted successfully", item: updatedItem });
    } catch (error) {
      handleDbError(res, error, "Failed to delete menu item");
    }
  });

  // PATCH /api/admin/menu/:id
  app.patch("/api/admin/menu/:id", requireAdminAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const { name, description, price, category, imageUrl, isAvailable } = req.body;

      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const [updatedItem] = await db
        .update(menuItems)
        .set({
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(price !== undefined && { price: parseFloat(price) }),
          ...(category !== undefined && { category }),
          ...(imageUrl !== undefined && { imageUrl }),
          ...(isAvailable !== undefined && { isAvailable }),
        })
        .where(eq(menuItems.id, itemId))
        .returning();

      io.emit("menu:updated");

      res.json(updatedItem);
    } catch (error) {
      handleDbError(res, error, "Failed to update menu item");
    }
  });

  // GET /api/admin/orders
  app.get("/api/admin/orders", requireAdminAuth, async (req, res) => {
    try {
      // Fetch all orders with table labels
      const allOrders = await db
        .select({
          id: orders.id,
          tableId: orders.tableId,
          tableLabel: tables.label,
          status: orders.status,
          totalPrice: orders.totalPrice,
          paymentMethod: orders.paymentMethod,
          billRequested: orders.billRequested,
          tokenNumber: orders.tokenNumber,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
        })
        .from(orders)
        .innerJoin(tables, eq(orders.tableId, tables.id))
        .orderBy(desc(orders.createdAt));

      // Append order items for each order
      const ordersWithItems = [];
      for (const order of allOrders) {
        const items = await db
          .select({
            id: orderItems.id,
            quantity: orderItems.quantity,
            notes: orderItems.notes,
            unitPrice: orderItems.unitPrice,
            menuItemId: orderItems.menuItemId,
            name: menuItems.name,
          })
          .from(orderItems)
          .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
          .where(eq(orderItems.orderId, order.id));

        ordersWithItems.push({
          ...order,
          items,
        });
      }

      res.json(ordersWithItems);
    } catch (error) {
      handleDbError(res, error, "Failed to fetch orders");
    }
  });

  // PATCH /api/admin/orders/:id
  app.patch("/api/admin/orders/:id", requireAdminAuth, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status, paymentMethod } = req.body; // 'pending' | 'preparing' | 'ready' | 'completed', 'cash' | 'online'

      if (isNaN(orderId)) {
        return res.status(400).json({ error: "Invalid order ID" });
      }
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      // Fetch the current order details with its table info
      const [order] = await db
        .select({
          id: orders.id,
          tableId: orders.tableId,
          tableLabel: tables.label,
          status: orders.status,
          totalPrice: orders.totalPrice,
          paymentMethod: orders.paymentMethod,
          tokenNumber: orders.tokenNumber,
        })
        .from(orders)
        .innerJoin(tables, eq(orders.tableId, tables.id))
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Update order status and payment method
      const updateData: any = { status, updatedAt: new Date() };
      if (paymentMethod) {
        updateData.paymentMethod = paymentMethod;
      }

      const [updatedOrder] = await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, orderId))
        .returning();

      // If status shifted to 'completed', we log to order history and set table to available
      if (status === "completed" && order.status !== "completed") {
        // Get all items in this order
        const items = await db
          .select({
            quantity: orderItems.quantity,
            unitPrice: orderItems.unitPrice,
            name: menuItems.name,
          })
          .from(orderItems)
          .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
          .where(eq(orderItems.orderId, orderId));

        const itemDetailsJson = JSON.stringify(items);

        // 1. Insert into history tracking
        await db.insert(orderHistory).values({
          tableId: order.tableId,
          tableLabel: order.tableLabel,
          orderId: orderId,
          totalCost: order.totalPrice,
          itemDetails: itemDetailsJson,
          paymentMethod: paymentMethod || order.paymentMethod || "cash",
        });

        // 2. Set table back to 'available'
        await db
          .update(tables)
          .set({ status: "available", sessionToken: null, updatedAt: new Date() })
          .where(eq(tables.id, order.tableId));

        emitTableStatusChanged(order.tableId, "available");
        console.log(`Archived transaction details & freed up ${order.tableLabel}`);
      }

      // Fetch items to send full order in websocket/response
      const fullItems = await db
        .select({
          id: orderItems.id,
          quantity: orderItems.quantity,
          notes: orderItems.notes,
          unitPrice: orderItems.unitPrice,
          menuItemId: orderItems.menuItemId,
          name: menuItems.name,
          imageUrl: menuItems.imageUrl,
        })
        .from(orderItems)
        .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(eq(orderItems.orderId, orderId));

      const fullOrder = {
        ...updatedOrder,
        tableLabel: order.tableLabel,
        items: fullItems,
      };

      // Emit real-time WebSocket events
      emitOrderUpdated(fullOrder);

      res.json(updatedOrder);
    } catch (error) {
      handleDbError(res, error, "Failed to update order status");
    }
  });

  // GET /api/admin/feedback
  app.get("/api/admin/feedback", requireAdminAuth, async (req, res) => {
    try {
      const feedbacks = await db
        .select({
          id: feedback.id,
          orderId: feedback.orderId,
          rating: feedback.rating,
          comment: feedback.comment,
          customerName: feedback.customerName,
          createdAt: feedback.createdAt,
          tableLabel: tables.label,
        })
        .from(feedback)
        .innerJoin(orders, eq(feedback.orderId, orders.id))
        .innerJoin(tables, eq(orders.tableId, tables.id))
        .orderBy(desc(feedback.createdAt));

      res.json(feedbacks);
    } catch (error) {
      handleDbError(res, error, "Failed to fetch feedback logs");
    }
  });

  // GET /api/admin/history
  app.get("/api/admin/history", requireAdminAuth, async (req, res) => {
    try {
      const list = await db.select().from(orderHistory).orderBy(desc(orderHistory.createdAt));
      res.json(list);
    } catch (error) {
      handleDbError(res, error, "Failed to fetch transaction logs history");
    }
  });

  // ---------------------------------------------------------------------------
  // VITE DEV / PRODUCTION MIDDLEWARE
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();
