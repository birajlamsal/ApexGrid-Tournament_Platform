const { initDb, getAllMatches, upsertNormalizedMatch } = require("../src/db");

const run = async () => {
  await initDb();
  const payloads = await getAllMatches();
  console.log(`Normalizing ${payloads.length} match payloads...`);
  for (const payload of payloads) {
    await upsertNormalizedMatch(payload);
  }
  console.log("Backfill complete.");
};

run().catch((error) => {
  console.error("Backfill failed:", error.message);
  process.exit(1);
});
