import postgres from "postgres";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT || "5432";
const DB_NAME = process.env.DB_NAME || "postgres";
const DB_USER = process.env.DB_USER || "postgres";
const DB_PASSWORD = process.env.DB_PASSWORD;

if (!DB_HOST || !DB_PASSWORD) {
  console.error("❌ Missing DB_HOST or DB_PASSWORD in .env");
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

const CATEGORIES = [
  { name: "Beauty", slug: "beauty", sort_order: 1 },
  { name: "Sinh nhật", slug: "sinh-nhat", sort_order: 2 },
  { name: "Wedding", slug: "wedding", sort_order: 3 },
  { name: "Lookbook", slug: "lookbook", sort_order: 4 },
];

const ALBUMS = [
  {
    slug: "celestial-heights",
    title: "Celestial Heights",
    description: "A cinematic exploration of high-altitude landscapes and ethereal light.",
    category_slug: "beauty",
    cover_url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80",
    thumbnail_url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80",
  },
  {
    slug: "urban-rhythms",
    title: "Urban Rhythms",
    description: "Street photography capturing the quiet moments in bustling cities.",
    category_slug: "beauty",
    cover_url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&q=80",
    thumbnail_url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&q=80",
  },
  {
    slug: "minimalist-muse",
    title: "The Minimalist Muse",
    description: "Editorial lookbook focusing on clean lines and monochromatic tones.",
    category_slug: "beauty",
    cover_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200&q=80",
    thumbnail_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80",
  },
  {
    slug: "golden-hour-weddings",
    title: "Golden Hour Weddings",
    description: "Warm, candid moments from intimate ceremonies.",
    category_slug: "sinh-nhat",
    cover_url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",
    thumbnail_url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80",
  },
];

const PHOTO_SETS: Record<string, string[]> = {
  beauty: [
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80",
    "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=1200&q=80",
  ],
  "sinh-nhat": [
    "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",
    "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=80",
  ],
};

async function seed() {
  console.log("🌱 Starting seed via Direct Postgres...\n");

  try {
    // Clear existing data
    console.log("🧹 Clearing existing data...");
    await sql`DELETE FROM photos`;
    await sql`DELETE FROM albums`;
    await sql`DELETE FROM categories`;
    console.log("   Done.\n");

    // Insert categories
    const categoryMap: Record<string, string> = {};
    for (const cat of CATEGORIES) {
      const [inserted] = await sql`
        INSERT INTO categories (name, slug, sort_order)
        VALUES (${cat.name}, ${cat.slug}, ${cat.sort_order})
        RETURNING id, slug
      `;
      categoryMap[inserted.slug] = inserted.id;
    }
    console.log("✅ Categories created.\n");

    // Insert albums and photos
    for (const albumData of ALBUMS) {
      console.log(`📸 Creating album: ${albumData.title}`);
      const categoryId = categoryMap[albumData.category_slug];

      const [album] = await sql`
        INSERT INTO albums (slug, title, description, category_id, cover_url, thumbnail_url)
        VALUES (${albumData.slug}, ${albumData.title}, ${albumData.description}, ${categoryId}, ${albumData.cover_url}, ${albumData.thumbnail_url})
        RETURNING id, title
      `;

      const photoUrls = PHOTO_SETS[albumData.category_slug] || [];
      for (let i = 0; i < photoUrls.length; i++) {
        await sql`
          INSERT INTO photos (album_id, url, caption, sort_order)
          VALUES (${album.id}, ${photoUrls[i]}, ${`${album.title} - Shot ${i + 1}`}, ${i})
        `;
      }
    }

    console.log("\n🎉 Seed completed!");
  } catch (err: any) {
    console.error("❌ Seed failed:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

seed();
