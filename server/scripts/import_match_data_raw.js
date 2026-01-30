const fs = require("fs");
const path = require("path");
const { initDb, upsertMatches } = require("../src/db");

const rawDir = path.join(__dirname, "..", "..", "match_data_raw");

const readJson = (filePath) => {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
};

const normalizePayloads = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === "object") {
    return [value];
  }
  return [];
};

const run = async () => {
  if (!fs.existsSync(rawDir)) {
    console.error(`match_data_raw not found: ${rawDir}`);
    process.exit(1);
  }

  await initDb();

  const files = fs.readdirSync(rawDir).filter((name) => name.endsWith(".json"));
  if (!files.length) {
    console.log("No JSON files found in match_data_raw.");
    return;
  }

  let imported = 0;
  for (const file of files) {
    const filePath = path.join(rawDir, file);
    const payload = readJson(filePath);
    const items = normalizePayloads(payload);
    if (!items.length) {
      continue;
    }
    await upsertMatches(items);
    imported += items.length;
  }

  console.log(`Imported ${imported} match payload(s) from match_data_raw.`);
};

run().catch((error) => {
  console.error("Import failed:", error.message);
  process.exit(1);
});
