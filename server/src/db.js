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

const initDb = async () => {
  if (!dbEnabled || !pool) {
    throw new Error("DATABASE_URL is not configured for Postgres");
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

const getAllMatches = async () => {
  if (!pool) {
    return [];
  }
  const result = await pool.query("SELECT payload FROM matches");
  return result.rows.map((row) => row.payload);
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
          INSERT INTO match_assets (asset_id, match_id, url, created_at, description, name)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (asset_id)
          DO UPDATE SET
            match_id = EXCLUDED.match_id,
            url = EXCLUDED.url,
            created_at = EXCLUDED.created_at,
            description = EXCLUDED.description,
            name = EXCLUDED.name;
        `,
        [
          item.id,
          matchId,
          assetAttrs.URL || null,
          assetAttrs.createdAt || null,
          assetAttrs.description || null,
          assetAttrs.name || null
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

module.exports = {
  dbEnabled,
  initDb,
  getAllMatches,
  getMatchesByIds,
  upsertMatches,
  upsertNormalizedMatch,
  linkTournamentMatches,
  getTournamentMatchIds
};
