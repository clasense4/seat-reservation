import postgres from "postgres";
import { config } from "../src/config";

const sql = postgres(config.databaseUrl);

const destinations = [
  { name: "Jakarta", seats: ["A1", "A2", "A3"] },
  { name: "Semarang", seats: ["A1", "A2", "A3"] },
  { name: "Yogyakarta", seats: ["A1", "A2", "A3"] },
  { name: "Cilegon", seats: ["A1", "A2", "A3"] },
];

async function seed() {
  console.log("Seeding database...");

  for (const dest of destinations) {
    const existing = await sql`SELECT id FROM destinations WHERE name = ${dest.name}`;
    if (existing.length > 0) {
      console.log(`  Destination "${dest.name}" already exists, skipping.`);
      continue;
    }

    const [inserted] = await sql`
      INSERT INTO destinations (name)
      VALUES (${dest.name})
      RETURNING id
    `;

    for (const label of dest.seats) {
      await sql`
        INSERT INTO seats (destination_id, label)
        VALUES (${inserted.id}, ${label})
      `;
    }

    console.log(`  Created destination "${dest.name}" with ${dest.seats.length} seats`);
  }

  console.log("Seeding complete.");
  await sql.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
