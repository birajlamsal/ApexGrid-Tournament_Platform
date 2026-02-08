require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const path = require("path");
const { importMatchJsonDir } = require("../src/matchImport");

const gameId = process.env.IMPORT_GAME_ID || "pubg";
const dir =
  process.env.MATCH_JSON_DIR ||
  path.join(__dirname, "..", "..", "PUBG", "match_data_raw");

importMatchJsonDir({ gameId, dir })
  .then(() => {
    console.log("Match JSON import complete.");
  })
  .catch((err) => {
    console.error("Match JSON import failed:", err);
    process.exit(1);
  });
