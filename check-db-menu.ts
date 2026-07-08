import { db } from "./src/db/index.ts";
import { menuItems } from "./src/db/schema.ts";

async function checkDbMenu() {
  const items = await db.select().from(menuItems);
  console.log(`Database has ${items.length} menu items total:`);
  for (const item of items) {
    console.log(`- [${item.id}] "${item.name}" (Category: "${item.category}"): Available=${item.isAvailable}, Image="${item.imageUrl}"`);
  }
  process.exit(0);
}

checkDbMenu();
