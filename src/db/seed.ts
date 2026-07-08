import { db } from "./index.ts";
import { fullMenuData } from "./fullMenu.ts";
import { tables, menuItems } from "./schema.ts";
import { sql } from "drizzle-orm";

async function main() {
  console.log("🌱 Starting database seeding process...");

  try {
    // 1. Seed 10 tables
    console.log("Inserting 10 tables...");
    const tableData = [
      { label: "Table 1 (Window)", capacity: 2 },
      { label: "Table 2", capacity: 2 },
      { label: "Table 3 (Booth)", capacity: 4 },
      { label: "Table 4", capacity: 4 },
      { label: "Table 5 (Patio)", capacity: 4 },
      { label: "Table 6 (Large Group)", capacity: 6 },
      { label: "Table 7", capacity: 6 },
      { label: "Table 8 (Bar)", capacity: 2 },
      { label: "Table 9", capacity: 4 },
      { label: "Table 10 (Cozy Corner)", capacity: 4 },
    ];

    for (const t of tableData) {
      await db.insert(tables).values({
        label: t.label,
        capacity: t.capacity,
        status: "available",
      }).onConflictDoUpdate({
        target: tables.label,
        set: { capacity: t.capacity },
      });
    }
    console.log("✅ Successfully seeded 10 tables.");

    // 2. Seed all menu items from fullMenuData
    console.log(`Inserting ${fullMenuData.length} menu items...`);
    for (const m of fullMenuData) {
      // Check if menu item exists by name to avoid duplicate seeding
      const [existing] = await db
        .select()
        .from(menuItems)
        .where(sql`LOWER(${menuItems.name}) = LOWER(${m.name})`)
        .limit(1);

      if (!existing) {
        await db.insert(menuItems).values(m);
      } else {
        await db.update(menuItems).set({
          price: m.price,
          description: m.description,
          category: m.category,
          imageUrl: m.imageUrl,
          isAvailable: m.isAvailable,
          dietType: m.dietType,
        }).where(sql`LOWER(${menuItems.name}) = LOWER(${m.name})`);
      }
    }
    console.log(`✅ Successfully seeded/updated ${fullMenuData.length} menu items.`);
    console.log("🎉 Seeding completed perfectly.");
  } catch (error) {
    console.error("❌ Seeding encountered an error:", error);
  } finally {
    process.exit(0);
  }
}

main();
