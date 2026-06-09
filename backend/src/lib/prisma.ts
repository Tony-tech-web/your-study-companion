import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function withoutSslMode(connectionString: string) {
  return connectionString.replace(/[?&]sslmode=[^&]+/, "");
}

function normalizeDatabaseUrl(connectionString: string) {
  try {
    const url = new URL(connectionString);
    const directSupabaseMatch = url.hostname.match(
      /^db\.([a-z0-9]+)\.supabase\.co$/i
    );

    if (!directSupabaseMatch) return withoutSslMode(connectionString);

    const projectRef = directSupabaseMatch[1];
    const poolerHost =
      process.env.SUPABASE_POOLER_HOST ||
      (projectRef === "phxvizvqkueddelnseam"
        ? "aws-1-eu-central-1.pooler.supabase.com"
        : undefined);

    if (!poolerHost) return withoutSslMode(connectionString);

    url.hostname = poolerHost;
    url.port = process.env.SUPABASE_POOLER_PORT || "6543";
    url.username = `postgres.${projectRef}`;
    url.searchParams.delete("sslmode");

    return url.toString();
  } catch {
    return withoutSslMode(connectionString);
  }
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!;
  const normalizedConnectionString = normalizeDatabaseUrl(connectionString);
  const isSupabaseConnection = /supabase\.(com|co)/.test(normalizedConnectionString);
  const poolConnectionString = isSupabaseConnection
    ? withoutSslMode(normalizedConnectionString)
    : normalizedConnectionString;
  // Prisma 7 adapter-pg requires a pg.Pool instance
  const pool = new pg.Pool({
    connectionString: poolConnectionString,
    ssl: isSupabaseConnection ? { rejectUnauthorized: false } : undefined,
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
