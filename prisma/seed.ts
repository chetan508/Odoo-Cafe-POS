import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not defined");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const filePath = path.join(process.cwd(), "data", "database.json");
  if (!fs.existsSync(filePath)) {
    console.log("No database backup file found to seed.");
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log("Found backup file. Seeding data into PostgreSQL database...");

  // Seed Users
  if (data.users && Array.isArray(data.users)) {
    for (const u of data.users) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          id: u.id || "u-" + Math.floor(Math.random() * 100000),
          name: u.name || "User",
          email: u.email,
          password: u.password || "749f09bade8aca755660eeb17792da880218d4fbdc4e25fbec279d7fe9f65d70", // Fallback to default hash
          role: u.role || "employee",
          status: u.status || "active",
          createdAt: u.createdAt || new Date().toISOString(),
        },
      });
    }
    console.log(`Synced ${data.users.length} users.`);
  }

  // Seed Categories
  if (data.categories && Array.isArray(data.categories)) {
    for (const c of data.categories) {
      await prisma.category.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id: c.id,
          name: c.name || "Category",
          color: c.color || "#8B5CF6",
          createdAt: c.createdAt || new Date().toISOString(),
        },
      });
    }
    console.log(`Synced ${data.categories.length} categories.`);
  }

  // Seed Products
  if (data.products && Array.isArray(data.products)) {
    for (const p of data.products) {
      await prisma.product.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          name: p.name || "Product",
          categoryId: p.categoryId,
          price: Number(p.price) || 0,
          unit: p.unit || "portion",
          tax: Number(p.tax) || 5,
          description: p.description || "",
          image: p.image || "",
          isKitchenItem: p.isKitchenItem !== undefined ? Boolean(p.isKitchenItem) : true,
          createdAt: p.createdAt || new Date().toISOString(),
        },
      });
    }
    console.log(`Synced ${data.products.length} products.`);
  }

  // Seed Floors
  if (data.floors && Array.isArray(data.floors)) {
    for (const f of data.floors) {
      await prisma.floor.upsert({
        where: { id: f.id },
        update: {},
        create: {
          id: f.id,
          name: f.name || "Floor",
        },
      });
    }
    console.log(`Synced ${data.floors.length} floors.`);
  }

  // Seed Tables
  if (data.tables && Array.isArray(data.tables)) {
    for (const t of data.tables) {
      await prisma.table.upsert({
        where: { id: t.id },
        update: {},
        create: {
          id: t.id,
          tableNumber: t.tableNumber || "T-0",
          seats: Number(t.seats) || 2,
          floorId: t.floorId,
          active: t.active !== undefined ? Boolean(t.active) : true,
          status: t.status || "available",
        },
      });
    }
    console.log(`Synced ${data.tables.length} tables.`);
  }

  // Seed Customers
  if (data.customers && Array.isArray(data.customers)) {
    for (const cust of data.customers) {
      await prisma.customer.upsert({
        where: { email: cust.email || `guest-${cust.id}@cafeflow.com` },
        update: {},
        create: {
          id: cust.id || "cust-" + Math.floor(Math.random() * 100000),
          name: cust.name || "Guest Customer",
          email: cust.email || `guest-${cust.id || Math.floor(Math.random() * 100000)}@cafeflow.com`,
          phone: cust.phone || "",
        },
      });
    }
    console.log(`Synced ${data.customers.length} customers.`);
  }

  // Seed Coupons
  if (data.coupons && Array.isArray(data.coupons)) {
    for (const cp of data.coupons) {
      await prisma.coupon.upsert({
        where: { code: cp.code },
        update: {},
        create: {
          id: cp.id || "cp-" + Math.floor(Math.random() * 100000),
          code: cp.code,
          discountType: cp.discountType || "fixed",
          discountValue: Number(cp.discountValue) || 0,
          active: cp.active !== undefined ? Boolean(cp.active) : true,
        },
      });
    }
    console.log(`Synced ${data.coupons.length} coupons.`);
  }

  // Seed Promotions
  if (data.promotions && Array.isArray(data.promotions)) {
    for (const pm of data.promotions) {
      await prisma.promotion.upsert({
        where: { id: pm.id },
        update: {},
        create: {
          id: pm.id,
          promotionType: pm.promotionType || "order_discount",
          minimumQuantity: pm.minimumQuantity ? Number(pm.minimumQuantity) : null,
          minimumOrderAmount: pm.minimumOrderAmount ? Number(pm.minimumOrderAmount) : null,
          discountType: pm.discountType || "fixed",
          discountValue: Number(pm.discountValue) || 0,
          active: pm.active !== undefined ? Boolean(pm.active) : true,
          description: pm.description || "",
        },
      });
    }
    console.log(`Synced ${data.promotions.length} promotions.`);
  }

  // Seed Orders & OrderItems
  if (data.orders && Array.isArray(data.orders)) {
    for (const o of data.orders) {
      await prisma.order.upsert({
        where: { id: o.id },
        update: {},
        create: {
          id: o.id,
          orderNumber: o.orderNumber || "CF-0000",
          tableId: o.tableId || null,
          customerId: o.customerId || null,
          employeeId: o.employeeId || null,
          subtotal: Number(o.subtotal) || 0,
          tax: Number(o.tax) || 0,
          discount: Number(o.discount) || 0,
          total: Number(o.total) || 0,
          paymentMethod: o.paymentMethod || null,
          status: o.status || "draft",
          createdAt: o.createdAt || new Date().toISOString(),
          notes: o.notes || null,
        },
      });

      if (o.items && Array.isArray(o.items)) {
        for (const itm of o.items) {
          const existingItem = await prisma.orderItem.findFirst({
            where: {
              orderId: o.id,
              productId: itm.productId,
            },
          });

          if (!existingItem) {
            await prisma.orderItem.create({
              data: {
                orderId: o.id,
                productId: itm.productId,
                productName: itm.productName || "Item",
                quantity: Number(itm.quantity) || 1,
                price: Number(itm.price) || 0,
                tax: Number(itm.tax) || 0,
                discount: Number(itm.discount) || 0,
                lineTotal: Number(itm.lineTotal) || 0,
                isKitchenItem: itm.isKitchenItem !== undefined ? Boolean(itm.isKitchenItem) : true,
                completed: itm.completed !== undefined ? Boolean(itm.completed) : false,
                notes: itm.notes || null,
              },
            });
          }
        }
      }
    }
    console.log(`Synced ${data.orders.length} orders and order items.`);
  }

  // Seed Sessions
  if (data.sessions && Array.isArray(data.sessions)) {
    for (const s of data.sessions) {
      await prisma.session.upsert({
        where: { id: s.id },
        update: {},
        create: {
          id: s.id,
          openedAt: s.openedAt || new Date().toISOString(),
          closedAt: s.closedAt || null,
          openingBalance: Number(s.openingBalance) || 0,
          closingAmount: s.closingAmount ? Number(s.closingAmount) : null,
          status: s.status || "open",
          employeeId: s.employeeId || "u-1",
        },
      });
    }
    console.log(`Synced ${data.sessions.length} sessions.`);
  }

  // Seed PaymentSettings
  if (data.paymentSettings) {
    const id = "payment-settings-id";
    await prisma.paymentSettings.upsert({
      where: { id },
      update: {},
      create: {
        id,
        cashEnabled: data.paymentSettings.cashEnabled !== undefined ? Boolean(data.paymentSettings.cashEnabled) : true,
        cardEnabled: data.paymentSettings.cardEnabled !== undefined ? Boolean(data.paymentSettings.cardEnabled) : true,
        upiEnabled: data.paymentSettings.upiEnabled !== undefined ? Boolean(data.paymentSettings.upiEnabled) : true,
        upiVpa: data.paymentSettings.upiVpa || "cafeflow@ybl",
      },
    });
    console.log("Synced paymentSettings.");
  }
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });
