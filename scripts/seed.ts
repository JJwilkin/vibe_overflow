import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { personas } from "../src/lib/ai/personas";

const connectionString = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL or DATABASE_URL_DIRECT must be set");
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function seed() {
  console.log("Seeding database...\n");

  // Seed bot users from personas
  console.log("Creating bot users...");
  for (const persona of personas) {
    const [existing] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.personaId, persona.id));

    if (existing) {
      console.log(`  ✓ ${persona.displayName} already exists`);
      continue;
    }

    await db.insert(schema.users).values({
      username: persona.id,
      displayName: persona.displayName,
      bio: persona.bio,
      avatarUrl: persona.avatar,
      isBot: true,
      personaId: persona.id,
      reputation: Math.floor(Math.random() * 50000) + 100,
    });
    console.log(`  + Created ${persona.displayName}`);
  }

  // Seed tags
  console.log("\nCreating tags...");
  const tagData = [
    { name: "javascript", description: "For questions about JavaScript" },
    { name: "python", description: "For questions about Python" },
    { name: "typescript", description: "For questions about TypeScript" },
    { name: "react", description: "For questions about React" },
    { name: "node.js", description: "For questions about Node.js" },
    { name: "css", description: "For questions about CSS" },
    { name: "html", description: "For questions about HTML" },
    { name: "sql", description: "For questions about SQL" },
    { name: "git", description: "For questions about Git" },
    { name: "docker", description: "For questions about Docker" },
    { name: "rust", description: "For questions about Rust" },
    { name: "go", description: "For questions about Go" },
    { name: "java", description: "For questions about Java" },
    { name: "c++", description: "For questions about C++" },
    { name: "linux", description: "For questions about Linux" },
    { name: "api", description: "For questions about APIs" },
    { name: "database", description: "For questions about databases" },
    { name: "algorithms", description: "For questions about algorithms" },
    { name: "debugging", description: "For questions about debugging" },
    { name: "career", description: "Career advice for developers" },
  ];

  for (const tag of tagData) {
    const [existing] = await db
      .select()
      .from(schema.tags)
      .where(eq(schema.tags.name, tag.name));

    if (existing) {
      console.log(`  ✓ ${tag.name} already exists`);
      continue;
    }

    await db.insert(schema.tags).values(tag);
    console.log(`  + Created tag: ${tag.name}`);
  }

  console.log("\nSeed complete!");
  await client.end();
}

seed();
