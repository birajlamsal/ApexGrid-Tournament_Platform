const fs = require("fs");
const path = require("path");
const { getCollection, setCollection, updateById } = require("./storage");

const matchDataDir = path.join(__dirname, "..", "..", "PUBG", "match_data_raw");

const dbEnabled = true;

const initDb = async () => {};

const testDb = async () => ({ connected: true, mode: "json" });

const listTournaments = async ({ eventType, status, registration, mode, search, sort } = {}) => {
  const key = eventType === "scrim" ? "scrims" : "tournaments";
  let items = getCollection(key);
  if (status) {
    items = items.filter((item) => item.status === status);
  }
  if (registration) {
    items = items.filter((item) => item.registration_status === registration);
  }
  if (mode) {
    items = items.filter((item) => item.mode === mode);
  }
  if (search) {
    const needle = String(search).toLowerCase();
    items = items.filter((item) => {
      return (
        String(item.name || "").toLowerCase().includes(needle) ||
        String(item.description || "").toLowerCase().includes(needle)
      );
    });
  }
  if (sort) {
    const dir = sort.startsWith("-") ? -1 : 1;
    const keyName = sort.replace(/^-/, "");
    items = [...items].sort((a, b) => {
      const aVal = a[keyName];
      const bVal = b[keyName];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "string" || typeof bVal === "string") {
        return String(aVal).localeCompare(String(bVal)) * dir;
      }
      return (aVal - bVal) * dir;
    });
  }
  return items;
};

const getTournamentById = async (id) => {
  const tournaments = getCollection("tournaments");
  let found = tournaments.find((t) => t.tournament_id === id);
  if (found) return found;
  const scrims = getCollection("scrims");
  found = scrims.find((s) => s.scrim_id === id || s.tournament_id === id);
  return found || null;
};

const insertTournament = async (payload) => {
  const key = payload.event_type === "scrim" ? "scrims" : "tournaments";
  const items = getCollection(key);
  items.push(payload);
  setCollection(key, items);
  return payload;
};

const updateTournamentById = async (id, payload) => {
  let items = getCollection("tournaments");
  let updated = updateById(items, "tournament_id", id, (current) => ({
    ...current,
    ...payload
  }));
  if (updated) {
    setCollection("tournaments", items);
    return updated;
  }
  items = getCollection("scrims");
  updated = updateById(items, "scrim_id", id, (current) => ({
    ...current,
    ...payload
  }));
  if (updated) {
    setCollection("scrims", items);
    return updated;
  }
  return null;
};

const deleteTournamentById = async (id) => {
  let items = getCollection("tournaments");
  const before = items.length;
  items = items.filter((item) => item.tournament_id !== id);
  if (items.length !== before) {
    setCollection("tournaments", items);
    return true;
  }
  items = getCollection("scrims");
  const beforeScrims = items.length;
  items = items.filter((item) => item.scrim_id !== id);
  if (items.length !== beforeScrims) {
    setCollection("scrims", items);
    return true;
  }
  return false;
};

const listAnnouncements = async () => getCollection("announcements");
const insertAnnouncement = async (payload) => {
  const items = getCollection("announcements");
  items.push(payload);
  setCollection("announcements", items);
  return payload;
};
const updateAnnouncementById = async (id, payload) => {
  const items = getCollection("announcements");
  const updated = updateById(items, "announcement_id", id, (current) => ({
    ...current,
    ...payload
  }));
  if (updated) {
    setCollection("announcements", items);
  }
  return updated;
};
const deleteAnnouncementById = async (id) => {
  const items = getCollection("announcements");
  const filtered = items.filter((item) => item.announcement_id !== id);
  if (filtered.length === items.length) return false;
  setCollection("announcements", filtered);
  return true;
};

const listTeams = async () => getCollection("teams");
const insertTeam = async (payload) => {
  const items = getCollection("teams");
  items.push(payload);
  setCollection("teams", items);
  return payload;
};
const updateTeamById = async (id, payload) => {
  const items = getCollection("teams");
  const updated = updateById(items, "team_id", id, (current) => ({
    ...current,
    ...payload
  }));
  if (updated) setCollection("teams", items);
  return updated;
};
const deleteTeamById = async (id) => {
  const items = getCollection("teams");
  const filtered = items.filter((item) => item.team_id !== id);
  if (filtered.length === items.length) return false;
  setCollection("teams", filtered);
  return true;
};

const listPlayers = async () => getCollection("players");
const insertPlayer = async (payload) => {
  const items = getCollection("players");
  items.push(payload);
  setCollection("players", items);
  return payload;
};
const updatePlayerById = async (id, payload) => {
  const items = getCollection("players");
  const updated = updateById(items, "player_id", id, (current) => ({
    ...current,
    ...payload
  }));
  if (updated) setCollection("players", items);
  return updated;
};
const deletePlayerById = async (id) => {
  const items = getCollection("players");
  const filtered = items.filter((item) => item.player_id !== id);
  if (filtered.length === items.length) return false;
  setCollection("players", filtered);
  return true;
};

const listParticipants = async () => getCollection("participants");
const listParticipantsByTournament = async (tournamentId) =>
  getCollection("participants").filter((p) => p.tournament_id === tournamentId);
const insertParticipant = async (payload) => {
  const items = getCollection("participants");
  items.push(payload);
  setCollection("participants", items);
  return payload;
};
const updateParticipantById = async (id, payload) => {
  const items = getCollection("participants");
  const updated = updateById(items, "participant_id", id, (current) => ({
    ...current,
    ...payload
  }));
  if (updated) setCollection("participants", items);
  return updated;
};
const deleteParticipantById = async (id) => {
  const items = getCollection("participants");
  const filtered = items.filter((item) => item.participant_id !== id);
  if (filtered.length === items.length) return false;
  setCollection("participants", filtered);
  return true;
};

const listWinners = async () => getCollection("winners");
const insertWinner = async (payload) => {
  const items = getCollection("winners");
  items.push(payload);
  setCollection("winners", items);
  return payload;
};
const updateWinnerById = async (id, payload) => {
  const items = getCollection("winners");
  const updated = updateById(items, "winner_id", id, (current) => ({
    ...current,
    ...payload
  }));
  if (updated) setCollection("winners", items);
  return updated;
};
const deleteWinnerById = async (id) => {
  const items = getCollection("winners");
  const filtered = items.filter((item) => item.winner_id !== id);
  if (filtered.length === items.length) return false;
  setCollection("winners", filtered);
  return true;
};

const getMatchesByIds = async (matchIds) => {
  const items = getCollection("matches");
  const map = new Map();
  matchIds.forEach((id) => {
    const found = items.find((m) => m.match_id === id);
    if (found) map.set(id, found);
  });
  return map;
};

const getAllMatches = async () => getCollection("matches");

const listTeamStats = async () => getCollection("teamStats");

const listPlayerStats = async () => getCollection("playerStats");

const listUpcomingMatches = async () => getCollection("upcomingMatches");

const upsertMatches = async () => {};

const upsertNormalizedMatch = async () => {};

const getTournamentMatchIds = async (tournamentId) => {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) return [];
  return tournament.custom_match_ids || [];
};

const replaceTournamentMatches = async (tournamentId, matchIds) => {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) return;
  await updateTournamentById(tournamentId, { custom_match_ids: matchIds });
};

const linkTournamentMatches = async () => {};

const runQuery = async () => [];

const gameExists = async () => false;

const getNormalizedMatchIds = async () => new Set();

const getRawMatchPayload = (matchId) => {
  const filePath = path.join(matchDataDir, `${matchId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

module.exports = {
  dbEnabled,
  initDb,
  getAllMatches,
  getMatchesByIds,
  upsertMatches,
  upsertNormalizedMatch,
  linkTournamentMatches,
  getTournamentMatchIds,
  replaceTournamentMatches,
  runQuery,
  gameExists,
  listTournaments,
  getTournamentById,
  insertTournament,
  updateTournamentById,
  deleteTournamentById,
  listAnnouncements,
  insertAnnouncement,
  updateAnnouncementById,
  deleteAnnouncementById,
  listTeams,
  insertTeam,
  updateTeamById,
  deleteTeamById,
  listPlayers,
  insertPlayer,
  updatePlayerById,
  deletePlayerById,
  listParticipants,
  listParticipantsByTournament,
  insertParticipant,
  updateParticipantById,
  deleteParticipantById,
  listWinners,
  insertWinner,
  updateWinnerById,
  deleteWinnerById,
  getNormalizedMatchIds,
  testDb,
  getRawMatchPayload,
  listTeamStats,
  listPlayerStats,
  listUpcomingMatches
};
