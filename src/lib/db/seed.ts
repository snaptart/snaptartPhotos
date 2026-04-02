import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import bcrypt from "bcryptjs";
import { adminUsers, siteSettings } from "./schema";
import siteConfig from "../site.config";

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const email = siteConfig.defaultAdminEmail;
  const password = process.env.ADMIN_PASSWORD || "changeme";

  const passwordHash = await bcrypt.hash(password, 12);

  // Upsert admin user
  await db
    .insert(adminUsers)
    .values({ email, passwordHash })
    .onConflictDoUpdate({
      target: adminUsers.email,
      set: { passwordHash },
    });

  console.log(`Admin user seeded: ${email}`);

  // Seed default site settings
  const existing = await db.select().from(siteSettings).limit(1);
  if (existing.length === 0) {
    await db.insert(siteSettings).values({
      siteTitle: siteConfig.siteName,
      contactEmail: siteConfig.defaultAdminEmail,
      footerText: siteConfig.siteDescription,
    });
    console.log("Default site settings seeded");
  }

  console.log("Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
