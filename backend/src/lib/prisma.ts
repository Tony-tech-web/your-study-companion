import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!;
  const isSupabasePooler = connectionString.includes("supabase.com");
  const poolConnectionString = isSupabasePooler
    ? connectionString.replace(/[?&]sslmode=[^&]+/, "")
    : connectionString;
  // Prisma 7 adapter-pg requires a pg.Pool instance
  const pool = new pg.Pool({
    connectionString: poolConnectionString,
    ssl: isSupabasePooler ? { rejectUnauthorized: false } : undefined,
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
