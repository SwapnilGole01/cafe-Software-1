import request from "supertest";
import jwt from "jsonwebtoken";
import { appInstance } from "../../server.ts";
import { db } from "../db/index.ts";
import { tables, menuItems, orders } from "../db/schema.ts";

// Mock the entire Socket.io layer
jest.mock("socket.io", () => {
  const mockEmit = jest.fn();
  const mockTo = jest.fn(() => ({ emit: mockEmit }));
  return {
    Server: jest.fn().mockImplementation(() => {
      return {
        on: jest.fn(),
        emit: mockEmit,
        to: mockTo,
      };
    }),
  };
});

describe("Café Manager Integration Tests", () => {
  let app: any;
  let adminToken: string;
  let testTableId: number;
  let testMenuItemId: number;
  let createdOrderId: number;
  let createdMenuItemId: number;

  beforeAll(async () => {
    // 1. Await appInstance initialization (since server is async)
    for (let i = 0; i < 30; i++) {
      if (appInstance) {
        app = appInstance;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!app) {
      throw new Error("appInstance failed to initialize");
    }

    // 2. Generate a valid owner JWT token
    const JWT_SECRET = process.env.JWT_SECRET || "cafe_manager_secret_key_123456";
    adminToken = jwt.sign(
      { userId: 1, email: "admin@cafe.com", role: "owner" },
      JWT_SECRET
    );

    // 3. Clear/seed test dependencies in the DB
    const [t] = await db
      .insert(tables)
      .values({
        label: "Test Table Order Node",
        capacity: 4,
        status: "available",
      })
      .returning();
    testTableId = t.id;

    const [m] = await db
      .insert(menuItems)
      .values({
        name: "Test Cappuccino Brew",
        description: "Classic espresso with steamed foam",
        price: 4.5,
        category: "Drinks",
        isAvailable: true,
      })
      .returning();
    testMenuItemId = m.id;
  });

  afterAll(async () => {
    // Graceful teardown is handled by database pool limits or jest environment shutdown
  });

  describe("Order Operations", () => {
    it("should place an order successfully", async () => {
      const response = await request(app)
        .post("/api/orders")
        .send({
          tableId: testTableId,
          items: [
            {
              menuItemId: testMenuItemId,
              quantity: 2,
              notes: "No sugar, extra foam",
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("orderId");
      createdOrderId = response.body.orderId;
    });

    it("should update order status with admin permissions", async () => {
      expect(createdOrderId).toBeDefined();

      const response = await request(app)
        .patch(`/api/orders/${createdOrderId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          status: "preparing",
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("preparing");
    });

    it("should reject order status update without authorization", async () => {
      expect(createdOrderId).toBeDefined();

      const response = await request(app)
        .patch(`/api/orders/${createdOrderId}/status`)
        .send({
          status: "completed",
        });

      expect(response.status).toBe(401);
    });
  });

  describe("Menu Catalogue CRUD Operations", () => {
    it("should create a new menu item as admin", async () => {
      const response = await request(app)
        .post("/api/admin/menu")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Test Golden Croissant",
          description: "Freshly baked buttery french pastry",
          price: 3.99,
          category: "Starters",
          imageUrl: "https://example.com/croissant.jpg",
          isAvailable: true,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toBe("Test Golden Croissant");
      createdMenuItemId = response.body.id;
    });

    it("should update a menu item as admin", async () => {
      expect(createdMenuItemId).toBeDefined();

      const response = await request(app)
        .put(`/api/admin/menu/${createdMenuItemId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Test Golden Croissant Deluxe",
          description: "Infused with almond paste",
          price: 4.99,
          category: "Starters",
          imageUrl: "https://example.com/croissant.jpg",
          isAvailable: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Test Golden Croissant Deluxe");
      expect(response.body.price).toBe(4.99);
    });

    it("should soft-delete a menu item as admin", async () => {
      expect(createdMenuItemId).toBeDefined();

      const response = await request(app)
        .delete(`/api/admin/menu/${createdMenuItemId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.isAvailable).toBe(false);
    });
  });
});
