import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not defined");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

export async function connectDB() {
  try {
    await prisma.$connect();
    console.log("Successfully connected to PostgreSQL via Prisma!");
  } catch (err) {
    console.error("PostgreSQL connection failure:", err);
    process.exit(1);
  }
}
export { pool };
