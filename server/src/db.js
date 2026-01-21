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
  getMatchesByIds,
  upsertMatches,
  linkTournamentMatches,
  getTournamentMatchIds
};
