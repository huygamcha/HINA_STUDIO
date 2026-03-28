import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
const { Pool } = pkg;

const connectionString = `${process.env.DATABASE_URL}`;

declare global {
  var __db__: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool as any);
  prisma = new PrismaClient({ adapter });
} else {
  if (!global.__db__) {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool as any);
    global.__db__ = new PrismaClient({ adapter });
  }
  prisma = global.__db__;
}

export { prisma };

