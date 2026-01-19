const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");

const files = {
  tournaments: "tournaments.json",
  players: "players.json",
  teams: "teams.json",
  matches: "matches.json",
  participants: "participants.json",
  winners: "winners.json",
  teamStats: "team-stats.json",
  playerStats: "player-stats.json",
  announcements: "announcements.json",
  upcomingMatches: "upcoming-matches.json"
};

const ensureDataDir = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

const readJson = (filename) => {
  ensureDataDir();
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.trim()) {
    return [];
  }
  return JSON.parse(raw);
};

const writeJson = (filename, data) => {
  ensureDataDir();
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const getCollection = (key) => readJson(files[key]);
const setCollection = (key, data) => writeJson(files[key], data);

const updateById = (collection, idKey, id, updater) => {
  const index = collection.findIndex((item) => item[idKey] === id);
  if (index === -1) {
    return null;
  }
  const current = collection[index];
  const updated = updater(current);
  collection[index] = updated;
  return updated;
};

module.exports = {
  files,
  getCollection,
  setCollection,
  updateById
};
