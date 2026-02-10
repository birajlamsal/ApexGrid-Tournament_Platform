const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { nanoid } = require("nanoid");
const { verifyAdmin, createToken, authMiddleware } = require("./auth");
const {
  aggregateMatchPayloads,
  fetchMatchPayloads,
  fetchTournamentMatchIds,
  fetchPlayerMatches,
  fetchMatchSummaries
} = require("./pubg");
const {
  dbEnabled,
  initDb,
  getAllMatches,
  getMatchesByIds,
  upsertMatches,
  normalizeMatches,
  linkTournamentMatches,
  getTournamentMatchIds,
  replaceTournamentMatches,
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
  testDb
} = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

const makeId = (prefix) => {
  const randPart = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}${randPart}`;
};

const ensureBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return value;
};

const normalizeMatchIds = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    const ids = value.map((id) => String(id).trim()).filter(Boolean);
    return Array.from(new Set(ids));
  }
  const ids = String(value)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return Array.from(new Set(ids));
};

const chunkArray = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const sortByField = (items, field, direction = "desc") => {
  const sorted = [...items];
  sorted.sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];
    if (aVal === bVal) {
      return 0;
    }
    if (aVal === null || aVal === undefined) {
      return 1;
    }
    if (bVal === null || bVal === undefined) {
      return -1;
    }
    if (typeof aVal === "string" || typeof bVal === "string") {
      const compare = String(aVal).localeCompare(String(bVal));
      return direction === "asc" ? compare : -compare;
    }
    return direction === "asc" ? aVal - bVal : bVal - aVal;
  });
  return sorted;
};

const isInvalidDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return false;
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return false;
  }
  return end < start;
};

const sanitizeTournament = (tournament) => {
  const { tournament_api_key, ...rest } = tournament;
  return rest;
};

const sanitizeScrim = (scrim) => {
  const { scrim_api_key, ...rest } = scrim;
  return rest;
};

const getTierFromPrize = (prize) => {
  const value = Number(prize || 0);
  if (value >= 1000) {
    return "S";
  }
  if (value >= 500) {
    return "A";
  }
  if (value >= 200) {
    return "B";
  }
  return "C";
};

app.get("/api/pubg/player-matches", async (req, res) => {
  const apiKey = process.env.PUBG_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: "PUBG API key not configured" });
  }
  const name = String(req.query.name || "").trim();
  if (!name) {
    return res.status(400).json({ error: "Player name is required" });
  }
  try {
    const limit = Math.min(Number(req.query.limit || 50), 60);
    const includeMeta = String(req.query.includeMeta || "").toLowerCase() === "true";
    const matchIds = await fetchPlayerMatches({ apiKey, playerName: name, limit });
    if (!includeMeta) {
      return res.json({ player: name, matches: matchIds });
    }
    const metaLimit = Math.min(matchIds.length, 50);
    const onlyCustom = String(req.query.onlyCustom || "").toLowerCase() === "true";
    const summaries = await fetchMatchSummaries({
      apiKey,
      matchIds: matchIds.slice(0, metaLimit)
    });
    if (dbEnabled && summaries.length) {
      try {
        const payloads = await fetchMatchPayloads({
          apiKey,
          matchIds: summaries.map((match) => match.match_id)
        });
        await upsertMatches(payloads);
      } catch (dbError) {
        console.warn(`[player-matches] Failed to store match payloads: ${dbError.message}`);
      }
    }
    const filtered = onlyCustom
      ? summaries.filter((match) => match.is_custom_match === true)
      : summaries;
    return res.json({
      player: name,
      matches: filtered,
      meta: { limited_to: metaLimit, only_custom: onlyCustom }
    });
  } catch (error) {
    res.status(502).json({ error: "PUBG API error", details: error.message });
  }
});

app.get("/api/pubg/matches/:id", async (req, res) => {
  if (!dbEnabled) {
    return res.status(500).json({ error: "Database not configured" });
  }
  const apiKey = process.env.PUBG_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: "PUBG API key not configured" });
  }
  const matchId = String(req.params.id || "").trim();
  if (!matchId) {
    return res.status(400).json({ error: "Match ID is required" });
  }
  try {
    const stored = await getMatchesByIds([matchId]);
    if (stored.has(matchId)) {
      return res.json({ source: "db", match: stored.get(matchId) });
    }
    const payloads = await fetchMatchPayloads({ apiKey, matchIds: [matchId] });
    const match = payloads[0];
    if (!match) {
      return res.status(404).json({ error: "Match not found in API" });
    }
    await upsertMatches([match]);
    return res.json({ source: "api", match });
  } catch (error) {
    return res.status(502).json({ error: "Failed to fetch match", details: error.message });
  }
});

app.get("/api/featured-tournaments", async (req, res) => {
  try {
    const tournaments = await listTournaments({ eventType: "tournament" });
    const featured = tournaments.filter((item) => item.featured === true).map(sanitizeTournament);
    res.json(featured);
  } catch (error) {
    res.status(500).json({ error: "Failed to load tournaments" });
  }
});

app.get("/api/health", async (req, res) => {
  const dbStatus = await testDb();
  res.json({
    status: "ok",
    db: {
      enabled: dbEnabled,
      ...dbStatus
    }
  });
});

app.get("/api/tournaments", async (req, res) => {
  const { status, registration, mode, search, sort } = req.query;
  try {
    const tournaments = await listTournaments({
      eventType: "tournament",
      status,
      registration,
      mode,
      search,
      sort
    });
    res.json(tournaments.map(sanitizeTournament));
  } catch (error) {
    console.error("Failed to load tournaments:", error);
    res.status(500).json({ error: "Failed to load tournaments" });
  }
});

app.get("/api/tournaments/:id", async (req, res) => {
  try {
    const tournament = await getTournamentById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    const participants = await listParticipantsByTournament(req.params.id);
    res.json({
      ...sanitizeTournament(tournament),
      participants
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load tournament" });
  }
});

app.get("/api/tournaments/:id/live", async (req, res) => {
  const tournament = await getTournamentById(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: "Tournament not found" });
  }
  if (!dbEnabled) {
    return res.status(500).json({ error: "Database not configured" });
  }
  try {
    const limit = Number(req.query.limit || 12);
    const fresh = String(req.query.fresh || "").toLowerCase() === "true";
    let matchIds = [];
    if (tournament.custom_match_mode) {
      matchIds = normalizeMatchIds(tournament.custom_match_ids);
      if (!matchIds.length) {
        return res.status(400).json({
          error: "Custom match needs match IDs"
        });
      }
    } else {
      if (!tournament.pubg_tournament_id) {
        return res.status(400).json({ error: "PUBG tournament ID not configured" });
      }
      if (!fresh) {
        matchIds = await getTournamentMatchIds(tournament.tournament_id);
      }
      if (!matchIds.length || fresh) {
        const apiKey = tournament.tournament_api_key || process.env.PUBG_API_KEY;
        if (!apiKey) {
          return res.status(400).json({ error: "PUBG API key not configured" });
        }
        matchIds = await fetchTournamentMatchIds({
          apiKey,
          tournamentId: tournament.pubg_tournament_id
        });
      }
    }
    matchIds = normalizeMatchIds(matchIds);
    if (!matchIds.length) {
      return res.status(400).json({ error: "No match IDs available" });
    }

    const limitedIds = matchIds.slice(0, limit);
    await linkTournamentMatches(tournament.tournament_id, matchIds);
    let storedMatches = await getMatchesByIds(limitedIds);
    const missingIds = limitedIds.filter((id) => !storedMatches.has(id));

    if (missingIds.length) {
      const apiKey = tournament.tournament_api_key || process.env.PUBG_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "PUBG API key not configured" });
      }
      const fetchedPayloads = await fetchMatchPayloads({
        apiKey,
        matchIds: missingIds
      });
      await upsertMatches(fetchedPayloads);
      storedMatches = await getMatchesByIds(limitedIds);
    }

    const orderedPayloads = limitedIds
      .map((id) => storedMatches.get(id))
      .filter(Boolean);
    const allowNonCustom = tournament.allow_non_custom === true;
    const data = aggregateMatchPayloads({
      matchPayloads: orderedPayloads,
      matchCount: matchIds.length,
      cacheId: tournament.tournament_id,
      limit,
      fresh,
      onlyCustom: tournament.custom_match_mode && !allowNonCustom,
      tournamentId: tournament.pubg_tournament_id || tournament.tournament_id
    });
    res.json({
      source: missingIds.length
        ? tournament.custom_match_mode
          ? "db+pubg-custom"
          : "db+pubg"
        : "db",
      tournament_id: tournament.tournament_id,
      pubg_tournament_id: tournament.pubg_tournament_id,
      ...data
    });
  } catch (error) {
    res.status(502).json({ error: "PUBG API error", details: error.message });
  }
});

app.get("/api/scrims", async (req, res) => {
  const { status, registration, mode, search, sort } = req.query;
  try {
    const scrims = await listTournaments({
      eventType: "scrim",
      status,
      registration,
      mode,
      search,
      sort
    });
    res.json(scrims.map(sanitizeScrim));
  } catch (error) {
    res.status(500).json({ error: "Failed to load scrims" });
  }
});

app.get("/api/scrims/:id", async (req, res) => {
  try {
    const scrim = await getTournamentById(req.params.id);
    if (!scrim || scrim.event_type !== "scrim") {
      return res.status(404).json({ error: "Scrim not found" });
    }
    const participants = await listParticipantsByTournament(req.params.id);
    res.json({
      ...sanitizeScrim(scrim),
      participants
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load scrim" });
  }
});

app.get("/api/scrims/:id/live", async (req, res) => {
  const scrim = await getTournamentById(req.params.id);
  if (!scrim) {
    return res.status(404).json({ error: "Scrim not found" });
  }
  if (!dbEnabled) {
    return res.status(500).json({ error: "Database not configured" });
  }
  try {
    const limit = Number(req.query.limit || 12);
    const fresh = String(req.query.fresh || "").toLowerCase() === "true";
    let matchIds = [];
    if (scrim.custom_match_mode) {
      matchIds = normalizeMatchIds(scrim.custom_match_ids);
      if (!matchIds.length) {
        return res.status(400).json({
          error: "Custom match needs match IDs"
        });
      }
    } else {
      if (!scrim.pubg_tournament_id) {
        return res.status(400).json({ error: "PUBG scrim ID not configured" });
      }
      if (!fresh) {
        matchIds = await getTournamentMatchIds(scrim.scrim_id);
      }
      if (!matchIds.length || fresh) {
        const apiKey = scrim.scrim_api_key || process.env.PUBG_API_KEY;
        if (!apiKey) {
          return res.status(400).json({ error: "PUBG API key not configured" });
        }
        matchIds = await fetchTournamentMatchIds({
          apiKey,
          tournamentId: scrim.pubg_tournament_id
        });
      }
    }
    matchIds = normalizeMatchIds(matchIds);
    if (!matchIds.length) {
      return res.status(400).json({ error: "No match IDs available" });
    }

    const limitedIds = matchIds.slice(0, limit);
    await linkTournamentMatches(scrim.scrim_id, matchIds);
    let storedMatches = await getMatchesByIds(limitedIds);
    const missingIds = limitedIds.filter((id) => !storedMatches.has(id));

    if (missingIds.length) {
      const apiKey = scrim.scrim_api_key || process.env.PUBG_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "PUBG API key not configured" });
      }
      const fetchedPayloads = await fetchMatchPayloads({
        apiKey,
        matchIds: missingIds
      });
      await upsertMatches(fetchedPayloads);
      storedMatches = await getMatchesByIds(limitedIds);
    }

    const orderedPayloads = limitedIds
      .map((id) => storedMatches.get(id))
      .filter(Boolean);
    const allowNonCustom = scrim.allow_non_custom === true;
    const data = aggregateMatchPayloads({
      matchPayloads: orderedPayloads,
      matchCount: matchIds.length,
      cacheId: scrim.scrim_id,
      limit,
      fresh,
      onlyCustom: scrim.custom_match_mode && !allowNonCustom,
      tournamentId: scrim.pubg_tournament_id || scrim.scrim_id
    });
    res.json({
      source: missingIds.length
        ? scrim.custom_match_mode
          ? "db+pubg-custom"
          : "db+pubg"
        : "db",
      scrim_id: scrim.scrim_id,
      pubg_tournament_id: scrim.pubg_tournament_id,
      ...data
    });
  } catch (error) {
    res.status(502).json({ error: "PUBG API error", details: error.message });
  }
});

app.get("/api/matches", async (req, res) => {
  try {
    const matches = await getAllMatches();
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: "Failed to load matches" });
  }
});

app.get("/api/team-stats", async (req, res) => {
  res.json([]);
});

app.get("/api/player-stats", async (req, res) => {
  res.json([]);
});

app.get("/api/winners", async (req, res) => {
  try {
    const winners = await listWinners();
    res.json(winners);
  } catch (error) {
    res.status(500).json({ error: "Failed to load winners" });
  }
});

app.get("/api/announcements", async (req, res) => {
  try {
    const announcements = await listAnnouncements();
    res.json(announcements);
  } catch (error) {
    console.error("Failed to load announcements:", error);
    res.status(500).json({ error: "Failed to load announcements" });
  }
});

app.get("/api/players", async (req, res) => {
  try {
    const players = await listPlayers("pubg");
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: "Failed to load players" });
  }
});

app.get("/api/teams", async (req, res) => {
  try {
    const teams = await listTeams("pubg");
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: "Failed to load teams" });
  }
});

app.get("/api/upcoming-matches", async (req, res) => {
  res.json([]);
});

app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;
  const isValid = await verifyAdmin(username, password);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = createToken({ username });
  res.json({ token });
});

app.use("/api/admin", authMiddleware);

app.get("/api/admin/matches/exists/:id", async (req, res) => {
  if (!dbEnabled) {
    return res.status(500).json({ error: "Database not configured" });
  }
  const matchId = String(req.params.id || "").trim();
  if (!matchId) {
    return res.status(400).json({ error: "Match ID is required" });
  }
  try {
    const stored = await getMatchesByIds([matchId]);
    return res.json({ match_id: matchId, exists: stored.has(matchId) });
  } catch (error) {
    return res.status(500).json({ error: "Failed to read match from database" });
  }
});

app.post("/api/admin/matches/normalize", async (req, res) => {
  if (!dbEnabled) {
    return res.status(500).json({ error: "Database not configured" });
  }
  const body = req.body || {};
  const matchIds = Array.isArray(body.match_ids) ? body.match_ids : null;
  const limit = body.limit || req.query.limit;
  try {
    const result = await normalizeMatches({ matchIds, limit });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to normalize matches", details: error.message });
  }
});

app.post("/api/admin/tournaments/:id/ingest-matches", async (req, res) => {
  if (!dbEnabled) {
    return res.status(500).json({ error: "Database not configured" });
  }
  const tournament = await getTournamentById(req.params.id);
  if (!tournament || tournament.event_type !== "tournament") {
    return res.status(404).json({ error: "Tournament not found" });
  }
  const apiKey = tournament.tournament_api_key || process.env.PUBG_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: "PUBG API key not configured" });
  }
  try {
    const limit = Number(req.query.limit || 0);
    let matchIds = [];
    if (tournament.custom_match_mode) {
      matchIds = normalizeMatchIds(tournament.custom_match_ids);
    } else if (tournament.pubg_tournament_id) {
      matchIds = await fetchTournamentMatchIds({
        apiKey,
        tournamentId: tournament.pubg_tournament_id
      });
    } else {
      matchIds = await getTournamentMatchIds(tournament.tournament_id);
    }
    matchIds = normalizeMatchIds(matchIds);
    if (limit > 0) {
      matchIds = matchIds.slice(0, limit);
    }
    if (!matchIds.length) {
      return res.status(400).json({ error: "No match IDs available" });
    }
    await linkTournamentMatches(tournament.tournament_id, matchIds);

    const stored = await getMatchesByIds(matchIds);
    const missingIds = matchIds.filter((id) => !stored.has(id));

    let fetchedCount = 0;
    for (const batch of chunkArray(missingIds, 50)) {
      const payloads = await fetchMatchPayloads({ apiKey, matchIds: batch });
      fetchedCount += payloads.length;
      await upsertMatches(payloads);
    }

    const normalizedResult = await normalizeMatches({ matchIds });

    res.json({
      tournament_id: tournament.tournament_id,
      match_ids: matchIds.length,
      fetched: fetchedCount,
      skipped_existing: matchIds.length - missingIds.length,
      normalized: normalizedResult.normalized
    });
  } catch (error) {
    res.status(502).json({ error: "PUBG API error", details: error.message });
  }
});

app.get("/api/admin/tournaments", async (req, res) => {
  try {
    const tournaments = await listTournaments({ eventType: "tournament" });
    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ error: "Failed to load tournaments" });
  }
});

app.post("/api/admin/tournaments", async (req, res) => {
  const payload = req.body || {};
  if (isInvalidDateRange(payload.start_date, payload.end_date)) {
    return res.status(400).json({ error: "End date cannot be before start date." });
  }
  try {
    const tournament = await insertTournament({
      ...payload,
      tournament_id: payload.tournament_id || makeId("TE"),
      event_type: "tournament",
      tier: payload.tier ? String(payload.tier).toUpperCase() : getTierFromPrize(payload.prize_pool),
      featured: ensureBoolean(payload.featured) === true,
      api_key_required: ensureBoolean(payload.api_key_required) === true,
      custom_match_mode: ensureBoolean(payload.custom_match_mode) === true,
      allow_non_custom: ensureBoolean(payload.allow_non_custom) === true,
      custom_match_ids: normalizeMatchIds(payload.custom_match_ids)
    });
    if (tournament.custom_match_mode) {
      try {
        await replaceTournamentMatches(
          tournament.tournament_id,
          normalizeMatchIds(payload.custom_match_ids)
        );
      } catch (err) {
        return res.status(500).json({
          error: "Failed to sync match IDs",
          details: err.message
        });
      }
    }
    res.status(201).json(tournament);
  } catch (error) {
    res.status(500).json({ error: "Failed to create tournament" });
  }
});

app.put("/api/admin/tournaments/:id", async (req, res) => {
  const id = req.params.id;
  const payload = req.body || {};
  const existing = await getTournamentById(id);
  if (!existing) {
    return res.status(404).json({ error: "Tournament not found" });
  }
  const startDate =
    Object.prototype.hasOwnProperty.call(payload, "start_date")
      ? payload.start_date
      : existing.start_date;
  const endDate =
    Object.prototype.hasOwnProperty.call(payload, "end_date")
      ? payload.end_date
      : existing.end_date;
  if (isInvalidDateRange(startDate, endDate)) {
    return res.status(400).json({ error: "End date cannot be before start date." });
  }
  try {
    const updated = await updateTournamentById(id, {
      ...payload,
      tier: Object.prototype.hasOwnProperty.call(payload, "tier")
        ? payload.tier
          ? String(payload.tier).toUpperCase()
          : ""
        : undefined,
      custom_match_mode: Object.prototype.hasOwnProperty.call(payload, "custom_match_mode")
        ? ensureBoolean(payload.custom_match_mode) === true
        : undefined,
      allow_non_custom: Object.prototype.hasOwnProperty.call(payload, "allow_non_custom")
        ? ensureBoolean(payload.allow_non_custom) === true
        : undefined,
      custom_match_ids: Object.prototype.hasOwnProperty.call(payload, "custom_match_ids")
        ? normalizeMatchIds(payload.custom_match_ids)
        : undefined
    });
    if (!updated) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    if (updated.custom_match_mode) {
      try {
        await replaceTournamentMatches(
          updated.tournament_id,
          normalizeMatchIds(payload.custom_match_ids ?? updated.custom_match_ids)
        );
      } catch (err) {
        return res.status(500).json({
          error: "Failed to sync match IDs",
          details: err.message
        });
      }
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update tournament" });
  }
});

app.delete("/api/admin/tournaments/:id", async (req, res) => {
  try {
    const ok = await deleteTournamentById(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: "Tournament not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete tournament" });
  }
});

app.get("/api/admin/scrims", async (req, res) => {
  try {
    const scrims = await listTournaments({ eventType: "scrim" });
    res.json(scrims);
  } catch (error) {
    res.status(500).json({ error: "Failed to load scrims" });
  }
});

app.post("/api/admin/scrims", async (req, res) => {
  const payload = req.body || {};
  if (isInvalidDateRange(payload.start_date, payload.end_date)) {
    return res.status(400).json({ error: "End date cannot be before start date." });
  }
  try {
    const scrim = await insertTournament({
      ...payload,
      tournament_id: payload.scrim_id || makeId("SE"),
      event_type: "scrim",
      tier: payload.tier ? String(payload.tier).toUpperCase() : getTierFromPrize(payload.prize_pool),
      featured: ensureBoolean(payload.featured) === true,
      api_key_required: ensureBoolean(payload.api_key_required) === true,
      custom_match_mode: ensureBoolean(payload.custom_match_mode) === true,
      allow_non_custom: ensureBoolean(payload.allow_non_custom) === true,
      custom_match_ids: normalizeMatchIds(payload.custom_match_ids)
    });
    if (scrim.custom_match_mode) {
      try {
        await replaceTournamentMatches(
          scrim.tournament_id,
          normalizeMatchIds(payload.custom_match_ids)
        );
      } catch (err) {
        return res.status(500).json({
          error: "Failed to sync match IDs",
          details: err.message
        });
      }
    }
    res.status(201).json(scrim);
  } catch (error) {
    res.status(500).json({ error: "Failed to create scrim" });
  }
});

app.put("/api/admin/scrims/:id", async (req, res) => {
  const id = req.params.id;
  const payload = req.body || {};
  const existing = await getTournamentById(id);
  if (!existing || existing.event_type !== "scrim") {
    return res.status(404).json({ error: "Scrim not found" });
  }
  const startDate =
    Object.prototype.hasOwnProperty.call(payload, "start_date")
      ? payload.start_date
      : existing.start_date;
  const endDate =
    Object.prototype.hasOwnProperty.call(payload, "end_date")
      ? payload.end_date
      : existing.end_date;
  if (isInvalidDateRange(startDate, endDate)) {
    return res.status(400).json({ error: "End date cannot be before start date." });
  }
  try {
    const updated = await updateTournamentById(id, {
      ...payload,
      tier: Object.prototype.hasOwnProperty.call(payload, "tier")
        ? payload.tier
          ? String(payload.tier).toUpperCase()
          : ""
        : undefined,
      custom_match_mode: Object.prototype.hasOwnProperty.call(payload, "custom_match_mode")
        ? ensureBoolean(payload.custom_match_mode) === true
        : undefined,
      allow_non_custom: Object.prototype.hasOwnProperty.call(payload, "allow_non_custom")
        ? ensureBoolean(payload.allow_non_custom) === true
        : undefined,
      custom_match_ids: Object.prototype.hasOwnProperty.call(payload, "custom_match_ids")
        ? normalizeMatchIds(payload.custom_match_ids)
        : undefined
    });
    if (!updated) {
      return res.status(404).json({ error: "Scrim not found" });
    }
    if (updated.custom_match_mode) {
      try {
        await replaceTournamentMatches(
          updated.tournament_id,
          normalizeMatchIds(payload.custom_match_ids ?? updated.custom_match_ids)
        );
      } catch (err) {
        return res.status(500).json({
          error: "Failed to sync match IDs",
          details: err.message
        });
      }
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update scrim" });
  }
});

app.delete("/api/admin/scrims/:id", async (req, res) => {
  try {
    const ok = await deleteTournamentById(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: "Scrim not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete scrim" });
  }
});

app.get("/api/admin/players", async (req, res) => {
  try {
    const players = await listPlayers("pubg");
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: "Failed to load players" });
  }
});

app.post("/api/admin/players", async (req, res) => {
  const payload = req.body || {};
  try {
    const player = await insertPlayer({
      ...payload,
      player_id: payload.player_id || makeId("PE"),
      game_id: "pubg"
    });
    res.status(201).json(player);
  } catch (error) {
    res.status(500).json({ error: "Failed to create player" });
  }
});

app.put("/api/admin/players/:id", async (req, res) => {
  try {
    const updated = await updatePlayerById(req.params.id, req.body || {}, "pubg");
    if (!updated) {
      return res.status(404).json({ error: "Player not found" });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update player" });
  }
});

app.delete("/api/admin/players/:id", async (req, res) => {
  try {
    const ok = await deletePlayerById(req.params.id, "pubg");
    if (!ok) {
      return res.status(404).json({ error: "Player not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete player" });
  }
});

app.get("/api/admin/teams", async (req, res) => {
  try {
    const teams = await listTeams("pubg");
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: "Failed to load teams" });
  }
});

app.post("/api/admin/teams", async (req, res) => {
  const payload = req.body || {};
  try {
    const team = await insertTeam({
      ...payload,
      team_id: payload.team_id || makeId("TE"),
      game_id: "pubg"
    });
    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ error: "Failed to create team" });
  }
});

app.put("/api/admin/teams/:id", async (req, res) => {
  try {
    const updated = await updateTeamById(req.params.id, req.body || {}, "pubg");
    if (!updated) {
      return res.status(404).json({ error: "Team not found" });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update team" });
  }
});

app.delete("/api/admin/teams/:id", async (req, res) => {
  try {
    const ok = await deleteTeamById(req.params.id, "pubg");
    if (!ok) {
      return res.status(404).json({ error: "Team not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete team" });
  }
});

app.get("/api/admin/matches", (req, res) => {
  res.json([]);
});

app.post("/api/admin/matches", (req, res) => {
  res.status(501).json({ error: "Manual match admin is not supported in DB mode." });
});

app.put("/api/admin/matches/:id", (req, res) => {
  res.status(501).json({ error: "Manual match admin is not supported in DB mode." });
});

app.delete("/api/admin/matches/:id", (req, res) => {
  res.status(501).json({ error: "Manual match admin is not supported in DB mode." });
});

app.get("/api/admin/participants", async (req, res) => {
  try {
    const participants = await listParticipants();
    res.json(participants);
  } catch (error) {
    console.error("Failed to load participants:", error);
    res.status(500).json({ error: "Failed to load participants" });
  }
});

app.post("/api/admin/participants", async (req, res) => {
  const payload = req.body || {};
  try {
    if (!payload.tournament_id) {
      return res.status(400).json({ error: "Tournament ID is required." });
    }
    const tournamentParticipants = await listParticipantsByTournament(
      payload.tournament_id
    );
    if (payload.type === "player") {
      const teamId = payload.linked_team_id || null;
      if (!teamId) {
        return res.status(400).json({ error: "Player must be linked to a team." });
      }
      const teamExists = tournamentParticipants.some(
        (participant) =>
          participant.type === "team" && participant.linked_team_id === teamId
      );
      if (!teamExists) {
        return res.status(400).json({
          error: "Team is not registered in this tournament."
        });
      }
      const playerExists = tournamentParticipants.some(
        (participant) =>
          participant.type === "player" &&
          participant.linked_player_id === payload.linked_player_id
      );
      if (playerExists) {
        return res.status(409).json({
          error: "Player is already registered in this tournament."
        });
      }
    } else if (payload.type === "team") {
      const teamExists = tournamentParticipants.some(
        (participant) =>
          participant.type === "team" &&
          participant.linked_team_id === payload.linked_team_id
      );
      if (teamExists) {
        return res.status(409).json({
          error: "Team is already registered in this tournament."
        });
      }
    }
    const participant = await insertParticipant({
      ...payload,
      participant_id: payload.participant_id || nanoid(10)
    });
    res.status(201).json(participant);
  } catch (error) {
    res.status(500).json({ error: "Failed to create participant" });
  }
});

app.put("/api/admin/participants/:id", async (req, res) => {
  try {
    const updated = await updateParticipantById(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: "Participant not found" });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update participant" });
  }
});

app.delete("/api/admin/participants/:id", async (req, res) => {
  try {
    const ok = await deleteParticipantById(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: "Participant not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete participant" });
  }
});

app.get("/api/admin/winners", async (req, res) => {
  try {
    const winners = await listWinners();
    res.json(winners);
  } catch (error) {
    res.status(500).json({ error: "Failed to load winners" });
  }
});

app.post("/api/admin/winners", async (req, res) => {
  const payload = req.body || {};
  try {
    const record = await insertWinner({
      ...payload,
      winner_id: payload.winner_id || nanoid(10)
    });
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: "Failed to create winner" });
  }
});

app.put("/api/admin/winners/:id", async (req, res) => {
  try {
    const updated = await updateWinnerById(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: "Winner record not found" });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update winner" });
  }
});

app.delete("/api/admin/winners/:id", async (req, res) => {
  try {
    const ok = await deleteWinnerById(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: "Winner record not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete winner" });
  }
});

app.get("/api/admin/announcements", async (req, res) => {
  try {
    const announcements = await listAnnouncements();
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: "Failed to load announcements" });
  }
});

app.post("/api/admin/announcements", async (req, res) => {
  const payload = req.body || {};
  try {
    const announcement = await insertAnnouncement({
      ...payload,
      announcement_id: payload.announcement_id || nanoid(10)
    });
    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

app.put("/api/admin/announcements/:id", async (req, res) => {
  try {
    const updated = await updateAnnouncementById(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: "Announcement not found" });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update announcement" });
  }
});

app.delete("/api/admin/announcements/:id", async (req, res) => {
  try {
    const ok = await deleteAnnouncementById(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: "Announcement not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

const startServer = async () => {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
