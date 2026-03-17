import postgres from "postgres";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build connection from individual parts to avoid URL-encoding issues
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT || "5432";
const DB_NAME = process.env.DB_NAME || "postgres";
const DB_USER = process.env.DB_USER || "postgres";
const DB_PASSWORD = process.env.DB_PASSWORD;

if (!DB_HOST || !DB_PASSWORD) {
  console.error("❌ Missing DB_HOST or DB_PASSWORD in .env");
  console.error("Add these to your .env file:");
  console.error('  DB_HOST=db.ynstkqixsbvlfyhwtugp.supabase.co');
  console.error('  DB_PASSWORD=your-database-password');
  process.exit(1);
}

const sql = postgres({
  host: DB_HOST,
  port: Number(DB_PORT),
  database: DB_NAME,
  username: DB_USER,
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function sync() {
  console.log("🚀 Starting database synchronization...");

  try {
    // Test connection first
    const result = await sql`SELECT current_database(), current_user`;
    console.log(`✅ Connected to database: ${result[0].current_database} as ${result[0].current_user}`);

    const schemaPath = path.join(__dirname, "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    console.log("📖 Read schema.sql successfully.");

    console.log("⏳ Applying schema...");
    await sql.unsafe(schemaSql);
    console.log("✅ Schema applied successfully!");

    // Verify tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    console.log("\n📋 Tables in public schema:");
    tables.forEach((t) => console.log(`   - ${t.table_name}`));

    // Send NOTIFY to trigger PostgREST schema reload
    await sql`NOTIFY pgrst, 'reload schema'`;
    console.log("\n🔄 Sent schema reload signal to PostgREST.");
    console.log("💡 The Supabase API should pick up the new tables within a few seconds.");

  } catch (err: any) {
    console.error("❌ Sync failed:");
    console.error(err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

sync();
