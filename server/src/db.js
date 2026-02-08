const { Pool } = require("pg");

const dbEnabled = Boolean(process.env.DATABASE_URL || process.env.PGHOST);

const pool = dbEnabled
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.PGSSL === "true"
          ? {
              rejectUnauthorized: false
            }
          : undefined
    })
  : null;

const runQuery = async (text, params = []) => {
  if (!pool) {
    throw new Error("Database not configured");
  }
  const result = await pool.query(text, params);
  return result.rows;
};

const initDb = async () => {
  if (!dbEnabled || !pool) {
    throw new Error("DATABASE_URL is not configured for Postgres");
  }
  if (process.env.DB_AUTO_MIGRATE !== "true") {
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS matches (
      match_id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tournament_matches (
      tournament_id TEXT NOT NULL,
      match_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (tournament_id, match_id)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS match_details (
      match_id TEXT PRIMARY KEY REFERENCES matches(match_id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ,
      duration INTEGER,
      game_mode TEXT,
      is_custom_match BOOLEAN,
      map_name TEXT,
      match_type TEXT,
      season_state TEXT,
      shard_id TEXT,
      title_id TEXT,
      stats JSONB,
      tags JSONB
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS match_assets (
      asset_id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
      url TEXT,
      created_at TIMESTAMPTZ,
      description TEXT,
      name TEXT
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS match_rosters (
      roster_id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
      team_id TEXT,
      rank INTEGER,
      won BOOLEAN,
      shard_id TEXT
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS match_participants (
      participant_id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
      roster_id TEXT REFERENCES match_rosters(roster_id) ON DELETE SET NULL,
      player_id TEXT,
      player_name TEXT,
      shard_id TEXT,
      dbnos INTEGER,
      assists INTEGER,
      boosts INTEGER,
      damage_dealt DOUBLE PRECISION,
      death_type TEXT,
      headshot_kills INTEGER,
      heals INTEGER,
      kill_place INTEGER,
      kill_streaks INTEGER,
      kills INTEGER,
      longest_kill DOUBLE PRECISION,
      revives INTEGER,
      ride_distance DOUBLE PRECISION,
      road_kills INTEGER,
      swim_distance DOUBLE PRECISION,
      team_kills INTEGER,
      time_survived DOUBLE PRECISION,
      vehicle_destroys INTEGER,
      walk_distance DOUBLE PRECISION,
      weapons_acquired INTEGER,
      win_place INTEGER,
      raw_stats JSONB
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS match_roster_participants (
      roster_id TEXT NOT NULL REFERENCES match_rosters(roster_id) ON DELETE CASCADE,
      participant_id TEXT NOT NULL REFERENCES match_participants(participant_id) ON DELETE CASCADE,
      PRIMARY KEY (roster_id, participant_id)
    );
  `);
};

const gameNameForId = (gameId) => {
  if (!gameId) {
    return "PUBG";
  }
  if (gameId.toLowerCase() === "pubg") {
    return "PUBG";
  }
  return String(gameId)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
};

const ensureGame = async (gameId = "pubg") => {
  if (!pool) {
    return;
  }
  await pool.query(
    `
      INSERT INTO games (game_id, name)
      VALUES ($1, $2)
      ON CONFLICT (game_id) DO NOTHING;
    `,
    [gameId, gameNameForId(gameId)]
  );
};

const gameExists = async (gameId = "pubg") => {
  if (!pool) {
    return false;
  }
  const rows = await runQuery(`SELECT 1 FROM games WHERE game_id = $1`, [gameId]);
  return rows.length > 0;
};

const getMatchesByIds = async (matchIds) => {
  if (!pool || !matchIds || matchIds.length === 0) {
    return new Map();
  }
  const result = await pool.query(
    "SELECT match_id, payload FROM matches WHERE match_id = ANY($1)",
    [matchIds]
  );
  const map = new Map();
  result.rows.forEach((row) => {
    map.set(row.match_id, row.payload);
  });
  return map;
};

const getNormalizedMatchIds = async (matchIds) => {
  if (!pool || !matchIds || matchIds.length === 0) {
    return new Set();
  }
  const result = await pool.query(
    "SELECT match_id FROM match_information WHERE match_id = ANY($1)",
    [matchIds]
  );
  return new Set(result.rows.map((row) => row.match_id));
};

const getAllMatches = async () => {
  if (!pool) {
    return [];
  }
  const result = await pool.query("SELECT payload FROM matches");
  return result.rows.map((row) => row.payload);
};

const normalizeMatches = async ({ matchIds, limit } = {}) => {
  if (!pool) {
    return { normalized: 0 };
  }
  let rows = [];
  if (Array.isArray(matchIds) && matchIds.length) {
    const ids = matchIds.map((id) => String(id).trim()).filter(Boolean);
    if (!ids.length) {
      return { normalized: 0 };
    }
    const result = await pool.query(
      "SELECT payload FROM matches WHERE match_id = ANY($1)",
      [ids]
    );
    rows = result.rows;
  } else {
    const limitClause = Number(limit) > 0 ? " LIMIT $1" : "";
    const result = await pool.query(
      `SELECT payload FROM matches ORDER BY updated_at DESC${limitClause}`,
      Number(limit) > 0 ? [Number(limit)] : []
    );
    rows = result.rows;
  }
  let count = 0;
  for (const row of rows) {
    if (!row?.payload) {
      continue;
    }
    await upsertNormalizedMatch(row.payload);
    count += 1;
  }
  return { normalized: count };
};

const upsertMatches = async (matchPayloads) => {
  if (!pool || !matchPayloads || matchPayloads.length === 0) {
    return;
  }
  for (const payload of matchPayloads) {
    const matchId = payload?.data?.id;
    if (!matchId) {
      continue;
    }
    await pool.query(
      `
        INSERT INTO matches (match_id, payload)
        VALUES ($1, $2::jsonb)
        ON CONFLICT (match_id)
        DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW();
      `,
      [matchId, JSON.stringify(payload)]
    );
    await upsertNormalizedMatch(payload);
  }
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const upsertNormalizedMatch = async (payload) => {
  if (!pool || !payload || !payload.data) {
    return;
  }
  const matchId = payload.data.id;
  if (!matchId) {
    return;
  }
  const attributes = payload.data.attributes || {};
  await pool.query(
    `
      INSERT INTO match_details (
        match_id,
        created_at,
        duration,
        game_mode,
        is_custom_match,
        map_name,
        match_type,
        season_state,
        shard_id,
        title_id,
        stats,
        tags
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb
      )
      ON CONFLICT (match_id)
      DO UPDATE SET
        created_at = EXCLUDED.created_at,
        duration = EXCLUDED.duration,
        game_mode = EXCLUDED.game_mode,
        is_custom_match = EXCLUDED.is_custom_match,
        map_name = EXCLUDED.map_name,
        match_type = EXCLUDED.match_type,
        season_state = EXCLUDED.season_state,
        shard_id = EXCLUDED.shard_id,
        title_id = EXCLUDED.title_id,
        stats = EXCLUDED.stats,
        tags = EXCLUDED.tags;
    `,
    [
      matchId,
      attributes.createdAt || null,
      toNumber(attributes.duration),
      attributes.gameMode || null,
      attributes.isCustomMatch === true,
      attributes.mapName || null,
      attributes.matchType || null,
      attributes.seasonState || null,
      attributes.shardId || null,
      attributes.titleId || null,
      JSON.stringify(attributes.stats || {}),
      JSON.stringify(attributes.tags || {})
    ]
  );

  const included = Array.isArray(payload.included) ? payload.included : [];
  const participantRosterMap = new Map();
  const rosterParticipantPairs = [];

  for (const item of included) {
    if (item?.type !== "roster") {
      continue;
    }
    const rosterId = item.id;
    const rosterStats = item.attributes?.stats || {};
    await pool.query(
      `
        INSERT INTO match_rosters (
          roster_id, match_id, team_id, rank, won, shard_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (roster_id)
        DO UPDATE SET
          match_id = EXCLUDED.match_id,
          team_id = EXCLUDED.team_id,
          rank = EXCLUDED.rank,
          won = EXCLUDED.won,
          shard_id = EXCLUDED.shard_id;
      `,
      [
        rosterId,
        matchId,
        rosterStats.teamId ? String(rosterStats.teamId) : null,
        toNumber(rosterStats.rank),
        item.attributes?.won === "true" || item.attributes?.won === true,
        item.attributes?.shardId || null
      ]
    );
    const participants = item.relationships?.participants?.data || [];
    for (const participant of participants) {
      if (participant?.id) {
        participantRosterMap.set(participant.id, rosterId);
        rosterParticipantPairs.push([rosterId, participant.id]);
      }
    }
  }

  for (const item of included) {
    if (item?.type === "participant") {
      const stats = item.attributes?.stats || {};
      await pool.query(
        `
          INSERT INTO match_participants (
            participant_id,
            match_id,
            roster_id,
            player_id,
            player_name,
            shard_id,
            dbnos,
            assists,
            boosts,
            damage_dealt,
            death_type,
            headshot_kills,
            heals,
            kill_place,
            kill_streaks,
            kills,
            longest_kill,
            revives,
            ride_distance,
            road_kills,
            swim_distance,
            team_kills,
            time_survived,
            vehicle_destroys,
            walk_distance,
            weapons_acquired,
            win_place,
            raw_stats
          )
          VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
            $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28::jsonb
          )
          ON CONFLICT (participant_id)
          DO UPDATE SET
            match_id = EXCLUDED.match_id,
            roster_id = EXCLUDED.roster_id,
            player_id = EXCLUDED.player_id,
            player_name = EXCLUDED.player_name,
            shard_id = EXCLUDED.shard_id,
            dbnos = EXCLUDED.dbnos,
            assists = EXCLUDED.assists,
            boosts = EXCLUDED.boosts,
            damage_dealt = EXCLUDED.damage_dealt,
            death_type = EXCLUDED.death_type,
            headshot_kills = EXCLUDED.headshot_kills,
            heals = EXCLUDED.heals,
            kill_place = EXCLUDED.kill_place,
            kill_streaks = EXCLUDED.kill_streaks,
            kills = EXCLUDED.kills,
            longest_kill = EXCLUDED.longest_kill,
            revives = EXCLUDED.revives,
            ride_distance = EXCLUDED.ride_distance,
            road_kills = EXCLUDED.road_kills,
            swim_distance = EXCLUDED.swim_distance,
            team_kills = EXCLUDED.team_kills,
            time_survived = EXCLUDED.time_survived,
            vehicle_destroys = EXCLUDED.vehicle_destroys,
            walk_distance = EXCLUDED.walk_distance,
            weapons_acquired = EXCLUDED.weapons_acquired,
            win_place = EXCLUDED.win_place,
            raw_stats = EXCLUDED.raw_stats;
        `,
        [
          item.id,
          matchId,
          participantRosterMap.get(item.id) || null,
          stats.playerId || null,
          stats.name || null,
          item.attributes?.shardId || null,
          toNumber(stats.DBNOs),
          toNumber(stats.assists),
          toNumber(stats.boosts),
          toNumber(stats.damageDealt),
          stats.deathType || null,
          toNumber(stats.headshotKills),
          toNumber(stats.heals),
          toNumber(stats.killPlace),
          toNumber(stats.killStreaks),
          toNumber(stats.kills),
          toNumber(stats.longestKill),
          toNumber(stats.revives),
          toNumber(stats.rideDistance),
          toNumber(stats.roadKills),
          toNumber(stats.swimDistance),
          toNumber(stats.teamKills),
          toNumber(stats.timeSurvived),
          toNumber(stats.vehicleDestroys),
          toNumber(stats.walkDistance),
          toNumber(stats.weaponsAcquired),
          toNumber(stats.winPlace),
          JSON.stringify(stats || {})
        ]
      );
    }

    if (item?.type === "asset") {
      const assetAttrs = item.attributes || {};
      await pool.query(
        `
          INSERT INTO match_assets (
            asset_id, match_id, game_id, url, name, description, created_at_api, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (asset_id)
          DO UPDATE SET
            match_id = EXCLUDED.match_id,
            game_id = EXCLUDED.game_id,
            url = EXCLUDED.url,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            created_at_api = EXCLUDED.created_at_api,
            created_at = EXCLUDED.created_at;
        `,
        [
          item.id,
          matchId,
          "pubg",
          assetAttrs.URL || null,
          assetAttrs.name || null,
          assetAttrs.createdAt || null,
          assetAttrs.description || null,
          assetAttrs.createdAt || null
        ]
      );
    }
  }

  for (const [rosterId, participantId] of rosterParticipantPairs) {
    await pool.query(
      `
        INSERT INTO match_roster_participants (roster_id, participant_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING;
      `,
      [rosterId, participantId]
    );
  }
};

const linkTournamentMatches = async (tournamentId, matchIds) => {
  if (!pool || !tournamentId || !matchIds || matchIds.length === 0) {
    return;
  }
  for (const matchId of matchIds) {
    if (!matchId) {
      continue;
    }
    await pool.query(
      `
        INSERT INTO tournament_matches (tournament_id, match_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING;
      `,
      [tournamentId, matchId]
    );
  }
};

const getTournamentMatchIds = async (tournamentId) => {
  if (!pool || !tournamentId) {
    return [];
  }
  const result = await pool.query(
    "SELECT match_id FROM tournament_matches WHERE tournament_id = $1 ORDER BY created_at ASC",
    [tournamentId]
  );
  return result.rows.map((row) => row.match_id).filter(Boolean);
};

const replaceTournamentMatches = async (tournamentId, matchIds) => {
  if (!pool || !tournamentId) {
    return;
  }
  const ids = (matchIds || []).map((id) => String(id).trim()).filter(Boolean);
  await pool.query("DELETE FROM tournament_matches WHERE tournament_id = $1", [
    tournamentId
  ]);
  if (!ids.length) {
    return;
  }
  for (const matchId of ids) {
    await pool.query(
      `
        INSERT INTO tournament_matches (tournament_id, match_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING;
      `,
      [tournamentId, matchId]
    );
  }
};

const listTournaments = async ({ eventType = "tournament", status, registration, mode, search, sort } = {}) => {
  if (!pool) {
    return [];
  }
  const filters = ["event_type = $1"];
  const params = [eventType];
  let idx = 2;

  if (status) {
    filters.push(`status = $${idx++}`);
    params.push(status);
  }
  if (registration) {
    filters.push(`registration_status = $${idx++}`);
    params.push(registration);
  }
  if (mode) {
    filters.push(`mode = $${idx++}`);
    params.push(mode);
  }
  if (search) {
    filters.push(`LOWER(name) LIKE $${idx++}`);
    params.push(`%${String(search).toLowerCase()}%`);
  }

  let order = "";
  if (sort === "start_date") order = "ORDER BY start_date ASC";
  if (sort === "prize_pool") order = "ORDER BY prize_pool DESC";
  if (sort === "registration_charge") order = "ORDER BY registration_charge DESC";

  const rows = await runQuery(
    `
      SELECT *
      FROM tournaments
      WHERE ${filters.join(" AND ")}
      ${order}
    `,
    params
  );
  return rows;
};

const getTournamentById = async (tournamentId) => {
  const rows = await runQuery(
    `SELECT * FROM tournaments WHERE tournament_id = $1`,
    [tournamentId]
  );
  return rows[0] || null;
};

const insertTournament = async (payload) => {
  await ensureGame(payload.game_id || "pubg");
  const rows = await runQuery(
    `
      INSERT INTO tournaments (
        tournament_id, game_id, event_type, name, description, banner_url, start_date, end_date,
        status, registration_status, mode, match_type, perspective, tier, prize_pool,
        registration_charge, featured, max_slots, region, rules, contact_discord,
        api_key_required, api_provider, pubg_tournament_id, custom_match_mode,
        allow_non_custom, custom_match_ids
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,$21,
        $22,$23,$24,$25,
        $26,$27
      )
      RETURNING *;
    `,
    [
      payload.tournament_id,
      payload.game_id || "pubg",
      payload.event_type || "tournament",
      payload.name,
      payload.description || "",
      payload.banner_url || "",
      payload.start_date || null,
      payload.end_date || null,
      payload.status || "upcoming",
      payload.registration_status || "closed",
      payload.mode || "squad",
      payload.match_type || "classic",
      payload.perspective || "TPP",
      payload.tier || null,
      Number(payload.prize_pool || 0),
      Number(payload.registration_charge || 0),
      payload.featured === true,
      payload.max_slots || null,
      payload.region || "",
      payload.rules || "",
      payload.contact_discord || "",
      payload.api_key_required === true,
      payload.api_provider || "PUBG",
      payload.pubg_tournament_id || "",
      payload.custom_match_mode === true,
      payload.allow_non_custom === true,
      payload.custom_match_ids ? JSON.stringify(payload.custom_match_ids) : null
    ]
  );
  return rows[0];
};

const updateTournamentById = async (tournamentId, payload) => {
  const existing = await getTournamentById(tournamentId);
  if (!existing) {
    return null;
  }
  const next = {
    ...existing,
    ...payload,
    tournament_id: existing.tournament_id,
    custom_match_ids:
      payload.custom_match_ids !== undefined
        ? payload.custom_match_ids
        : existing.custom_match_ids
  };

  const rows = await runQuery(
    `
      UPDATE tournaments
      SET
        name = $2,
        description = $3,
        banner_url = $4,
        start_date = $5,
        end_date = $6,
        status = $7,
        registration_status = $8,
        mode = $9,
        match_type = $10,
        perspective = $11,
        tier = $12,
        prize_pool = $13,
        registration_charge = $14,
        featured = $15,
        max_slots = $16,
        region = $17,
        rules = $18,
        contact_discord = $19,
        api_key_required = $20,
        api_provider = $21,
        pubg_tournament_id = $22,
        custom_match_mode = $23,
        allow_non_custom = $24,
        custom_match_ids = $25
      WHERE tournament_id = $1
      RETURNING *;
    `,
    [
      tournamentId,
      next.name,
      next.description || "",
      next.banner_url || "",
      next.start_date || null,
      next.end_date || null,
      next.status || "upcoming",
      next.registration_status || "closed",
      next.mode || "squad",
      next.match_type || "classic",
      next.perspective || "TPP",
      next.tier || null,
      Number(next.prize_pool || 0),
      Number(next.registration_charge || 0),
      next.featured === true,
      next.max_slots || null,
      next.region || "",
      next.rules || "",
      next.contact_discord || "",
      next.api_key_required === true,
      next.api_provider || "PUBG",
      next.pubg_tournament_id || "",
      next.custom_match_mode === true,
      next.allow_non_custom === true,
      next.custom_match_ids ? JSON.stringify(next.custom_match_ids) : null
    ]
  );
  return rows[0] || null;
};

const deleteTournamentById = async (tournamentId) => {
  const rows = await runQuery(
    `DELETE FROM tournaments WHERE tournament_id = $1 RETURNING tournament_id`,
    [tournamentId]
  );
  return rows.length > 0;
};

const listAnnouncements = async () => runQuery(`SELECT * FROM announcements ORDER BY created_at DESC`);
const insertAnnouncement = async (payload) => {
  const rows = await runQuery(
    `
      INSERT INTO announcements (announcement_id, title, body, type, importance, created_at)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *;
    `,
    [
      payload.announcement_id,
      payload.title,
      payload.body,
      payload.type || "notice",
      payload.importance || "medium",
      payload.created_at || new Date().toISOString()
    ]
  );
  return rows[0];
};
const updateAnnouncementById = async (id, payload) => {
  const rows = await runQuery(
    `
      UPDATE announcements
      SET title = $2, body = $3, type = $4, importance = $5, created_at = $6
      WHERE announcement_id = $1
      RETURNING *;
    `,
    [
      id,
      payload.title,
      payload.body,
      payload.type || "notice",
      payload.importance || "medium",
      payload.created_at || new Date().toISOString()
    ]
  );
  return rows[0] || null;
};
const deleteAnnouncementById = async (id) => {
  const rows = await runQuery(
    `DELETE FROM announcements WHERE announcement_id = $1 RETURNING announcement_id`,
    [id]
  );
  return rows.length > 0;
};

const listTeams = async (gameId = "pubg") =>
  runQuery(`SELECT * FROM teams WHERE game_id = $1`, [gameId]);
const insertTeam = async (payload) => {
  await ensureGame(payload.game_id || "pubg");
  const rows = await runQuery(
    `
      INSERT INTO teams (
        game_id, team_id, team_name, region, team_logo_url, captain_player_id,
        discord_contact, notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *;
    `,
    [
      payload.game_id || "pubg",
      payload.team_id,
      payload.team_name,
      payload.region || "",
      payload.team_logo_url || "",
      payload.captain_player_id || "",
      payload.discord_contact || "",
      payload.notes || ""
    ]
  );
  return rows[0];
};
const updateTeamById = async (teamId, payload, gameId = "pubg") => {
  const rows = await runQuery(
    `
      UPDATE teams
      SET team_name = $3,
          region = $4,
          team_logo_url = $5,
          captain_player_id = $6,
          discord_contact = $7,
          notes = $8
      WHERE game_id = $1 AND team_id = $2
      RETURNING *;
    `,
    [
      gameId,
      teamId,
      payload.team_name,
      payload.region || "",
      payload.team_logo_url || "",
      payload.captain_player_id || "",
      payload.discord_contact || "",
      payload.notes || ""
    ]
  );
  return rows[0] || null;
};
const deleteTeamById = async (teamId, gameId = "pubg") => {
  const rows = await runQuery(
    `DELETE FROM teams WHERE game_id = $1 AND team_id = $2 RETURNING team_id`,
    [gameId, teamId]
  );
  return rows.length > 0;
};

const listPlayers = async (gameId = "pubg") =>
  runQuery(`SELECT * FROM players WHERE game_id = $1`, [gameId]);
const insertPlayer = async (payload) => {
  await ensureGame(payload.game_id || "pubg");
  const rows = await runQuery(
    `
      INSERT INTO players (
        game_id, player_id, player_name, discord_id, pubg_ingame_name,
        profile_pic_url, email, region, notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *;
    `,
    [
      payload.game_id || "pubg",
      payload.player_id,
      payload.player_name,
      payload.discord_id || "",
      payload.pubg_ingame_name || "",
      payload.profile_pic_url || "",
      payload.email || "",
      payload.region || "",
      payload.notes || ""
    ]
  );
  return rows[0];
};
const updatePlayerById = async (playerId, payload, gameId = "pubg") => {
  const rows = await runQuery(
    `
      UPDATE players
      SET player_name = $3,
          discord_id = $4,
          pubg_ingame_name = $5,
          profile_pic_url = $6,
          email = $7,
          region = $8,
          notes = $9
      WHERE game_id = $1 AND player_id = $2
      RETURNING *;
    `,
    [
      gameId,
      playerId,
      payload.player_name,
      payload.discord_id || "",
      payload.pubg_ingame_name || "",
      payload.profile_pic_url || "",
      payload.email || "",
      payload.region || "",
      payload.notes || ""
    ]
  );
  return rows[0] || null;
};
const deletePlayerById = async (playerId, gameId = "pubg") => {
  const rows = await runQuery(
    `DELETE FROM players WHERE game_id = $1 AND player_id = $2 RETURNING player_id`,
    [gameId, playerId]
  );
  return rows.length > 0;
};

const listParticipants = async () =>
  runQuery(`SELECT * FROM participants ORDER BY created_at DESC`);
const listParticipantsByTournament = async (tournamentId) =>
  runQuery(
    `SELECT * FROM participants WHERE tournament_id = $1 ORDER BY created_at DESC`,
    [tournamentId]
  );
const insertParticipant = async (payload) => {
  const rows = await runQuery(
    `
      INSERT INTO participants (
        participant_id, tournament_id, type, linked_team_id, linked_player_id,
        status, payment_status, slot_number, notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *;
    `,
    [
      payload.participant_id,
      payload.tournament_id,
      payload.type || "team",
      payload.linked_team_id || null,
      payload.linked_player_id || null,
      payload.status || "pending",
      payload.payment_status || "unpaid",
      payload.slot_number || null,
      payload.notes || ""
    ]
  );
  return rows[0];
};
const updateParticipantById = async (id, payload) => {
  const rows = await runQuery(
    `
      UPDATE participants
      SET
        tournament_id = $2,
        type = $3,
        linked_team_id = $4,
        linked_player_id = $5,
        status = $6,
        payment_status = $7,
        slot_number = $8,
        notes = $9
      WHERE participant_id = $1
      RETURNING *;
    `,
    [
      id,
      payload.tournament_id,
      payload.type || "team",
      payload.linked_team_id || null,
      payload.linked_player_id || null,
      payload.status || "pending",
      payload.payment_status || "unpaid",
      payload.slot_number || null,
      payload.notes || ""
    ]
  );
  return rows[0] || null;
};
const deleteParticipantById = async (id) => {
  const rows = await runQuery(
    `DELETE FROM participants WHERE participant_id = $1 RETURNING participant_id`,
    [id]
  );
  return rows.length > 0;
};

const listWinners = async () =>
  runQuery(`SELECT * FROM winners ORDER BY place ASC`);
const insertWinner = async (payload) => {
  const rows = await runQuery(
    `
      INSERT INTO winners (winner_id, tournament_id, place, team_id, team_name, points, kills)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *;
    `,
    [
      payload.winner_id,
      payload.tournament_id,
      payload.place || null,
      payload.team_id || null,
      payload.team_name || null,
      payload.points || null,
      payload.kills || null
    ]
  );
  return rows[0];
};
const updateWinnerById = async (id, payload) => {
  const rows = await runQuery(
    `
      UPDATE winners
      SET tournament_id = $2, place = $3, team_id = $4, team_name = $5, points = $6, kills = $7
      WHERE winner_id = $1
      RETURNING *;
    `,
    [
      id,
      payload.tournament_id,
      payload.place || null,
      payload.team_id || null,
      payload.team_name || null,
      payload.points || null,
      payload.kills || null
    ]
  );
  return rows[0] || null;
};
const deleteWinnerById = async (id) => {
  const rows = await runQuery(
    `DELETE FROM winners WHERE winner_id = $1 RETURNING winner_id`,
    [id]
  );
  return rows.length > 0;
};

const testDb = async () => {
  if (!pool) {
    return { connected: false };
  }
  try {
    await pool.query("SELECT 1");
    return { connected: true };
  } catch (error) {
    return { connected: false, error: error.message };
  }
};

module.exports = {
  dbEnabled,
  initDb,
  getAllMatches,
  getMatchesByIds,
  upsertMatches,
  upsertNormalizedMatch,
  normalizeMatches,
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
  testDb
};
