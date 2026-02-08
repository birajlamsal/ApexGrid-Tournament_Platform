const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const poolFromEnv = () =>
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.PGSSL === "true"
        ? {
            rejectUnauthorized: false
          }
        : undefined
  });

const snake = (value) =>
  String(value)
    .replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)
    .replace(/^_+/, "");

const getColumns = async (client, table) => {
  const rows = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `,
    [table]
  );
  return new Set(rows.rows.map((r) => r.column_name));
};

const filterData = (columns, data) => {
  const filtered = {};
  Object.entries(data).forEach(([key, value]) => {
    if (columns.has(key) && value !== undefined) {
      filtered[key] = value;
    }
  });
  return filtered;
};

const insertRow = async (client, table, data, conflictKey) => {
  const columns = Object.keys(data);
  if (!columns.length) {
    return;
  }
  const values = columns.map((_, idx) => `$${idx + 1}`);
  const updates = columns
    .filter((col) => col !== conflictKey)
    .map((col) => `${col} = EXCLUDED.${col}`)
    .join(", ");
  const conflictSql = conflictKey
    ? `ON CONFLICT (${conflictKey}) DO UPDATE SET ${updates}`
    : "ON CONFLICT DO NOTHING";
  await client.query(
    `
      INSERT INTO ${table} (${columns.join(", ")})
      VALUES (${values.join(", ")})
      ${conflictSql};
    `,
    columns.map((c) => data[c])
  );
};

const insertRowComposite = async (client, table, data, conflictCols) => {
  const columns = Object.keys(data);
  if (!columns.length) {
    return;
  }
  const values = columns.map((_, idx) => `$${idx + 1}`);
  const updates = columns
    .filter((col) => !conflictCols.includes(col))
    .map((col) => `${col} = EXCLUDED.${col}`)
    .join(", ");
  const conflictSql =
    conflictCols && conflictCols.length
      ? `ON CONFLICT (${conflictCols.join(", ")}) DO UPDATE SET ${updates}`
      : "ON CONFLICT DO NOTHING";
  await client.query(
    `
      INSERT INTO ${table} (${columns.join(", ")})
      VALUES (${values.join(", ")})
      ${conflictSql};
    `,
    columns.map((c) => data[c])
  );
};

const loadColumns = async (client) => ({
  colsMatchInfo: await getColumns(client, "match_information"),
  colsMatchAssets: await getColumns(client, "match_assets"),
  colsMatchRosters: await getColumns(client, "match_rosters"),
  colsMatchPlayers: await getColumns(client, "match_player_stats"),
  colsTeams: await getColumns(client, "teams"),
  colsPlayers: await getColumns(client, "players"),
  colsTournamentRosters: await getColumns(client, "tournament_rosters"),
  colsRosterPlayers: await getColumns(client, "roster_players")
});

const importMatchPayload = async ({
  client,
  payload,
  gameId,
  columns
}) => {
  const matchId = payload?.data?.id;
  if (!matchId) return;

  const tournamentIdResult = await client.query(
    `SELECT tournament_id FROM tournament_matches WHERE match_id = $1 LIMIT 1`,
    [matchId]
  );
  const tournamentId = tournamentIdResult.rows[0]?.tournament_id || null;

  const attrs = payload?.data?.attributes || {};
  const matchInfo = filterData(columns.colsMatchInfo, {
    match_id: matchId,
    game_id: gameId,
    tournament_id: tournamentId,
    created_at_api: attrs.createdAt || null,
    created_at: attrs.createdAt || null,
    duration: attrs.duration || null,
    game_mode: attrs.gameMode || null,
    map_name: attrs.mapName || null,
    match_type: attrs.matchType || null,
    shard_id: attrs.shardId || null,
    title_id: attrs.titleId || null,
    season_state: attrs.seasonState || null,
    is_custom_match: attrs.isCustomMatch || null,
    tags: attrs.tags ? JSON.stringify(attrs.tags) : null,
    stats: attrs.stats ? JSON.stringify(attrs.stats) : null
  });
  await insertRow(client, "match_information", matchInfo, "match_id");

  const included = payload?.included || [];
  const rosters = included.filter((i) => i.type === "roster");
  const participants = included.filter((i) => i.type === "participant");
  const assets = included.filter((i) => i.type === "asset");

  const participantToRoster = new Map();
  rosters.forEach((roster) => {
    const rosterId = roster.id;
    const partIds =
      roster.relationships?.participants?.data?.map((p) => p.id) || [];
    partIds.forEach((pid) => participantToRoster.set(pid, rosterId));
  });

  for (const asset of assets) {
    const a = asset.attributes || {};
    const row = filterData(columns.colsMatchAssets, {
      asset_id: asset.id,
      match_id: matchId,
      game_id: gameId,
      url: a.URL || null,
      name: a.name || null,
      description: a.description || null,
      created_at_api: a.createdAt || null,
      created_at: a.createdAt || null
    });
    await insertRow(client, "match_assets", row, "asset_id");
  }

  for (const roster of rosters) {
    const rosterId = roster.id;
    const stats = roster.attributes?.stats || {};
    const teamId = stats.teamId != null ? String(stats.teamId) : null;
    const rank = stats.rank != null ? Number(stats.rank) : null;
    const won =
      roster.attributes?.won === "true"
        ? true
        : roster.attributes?.won === "false"
          ? false
          : null;

    if (teamId && columns.colsTeams.has("team_id")) {
      await insertRowComposite(
        client,
        "teams",
        filterData(columns.colsTeams, {
          game_id: gameId,
          team_id: teamId,
          team_name: `Team ${teamId}`
        }),
        ["game_id", "team_id"]
      );
    }

    if (tournamentId) {
      const tr = filterData(columns.colsTournamentRosters, {
        roster_id: rosterId,
        tournament_id: tournamentId,
        game_id: gameId,
        team_id: teamId
      });
      await insertRow(client, "tournament_rosters", tr, "roster_id");
    }

    const mr = filterData(columns.colsMatchRosters, {
      match_id: matchId,
      roster_id: rosterId,
      rank,
      won
    });
    await insertRowComposite(client, "match_rosters", mr, ["match_id", "roster_id"]);
  }

  for (const participant of participants) {
    const stats = participant.attributes?.stats || {};
    const playerId = stats.playerId || participant.id;
    const playerName = stats.name || stats.playerId || participant.id;
    const rosterId = participantToRoster.get(participant.id) || null;

    await insertRowComposite(
      client,
      "players",
      filterData(columns.colsPlayers, {
        game_id: gameId,
        player_id: playerId,
        player_name: playerName
      }),
      ["game_id", "player_id"]
    );

    const row = filterData(columns.colsMatchPlayers, {
      match_id: matchId,
      player_id: playerId,
      game_id: gameId,
      roster_id: rosterId,
      dbnos: stats.DBNOs ?? null,
      assists: stats.assists ?? null,
      boosts: stats.boosts ?? null,
      damage_dealt: stats.damageDealt ?? null,
      death_type: stats.deathType ?? null,
      headshot_kills: stats.headshotKills ?? null,
      heals: stats.heals ?? null,
      kill_place: stats.killPlace ?? null,
      kill_streaks: stats.killStreaks ?? null,
      kills: stats.kills ?? null,
      longest_kill: stats.longestKill ?? null,
      revives: stats.revives ?? null,
      ride_distance: stats.rideDistance ?? null,
      road_kills: stats.roadKills ?? null,
      swim_distance: stats.swimDistance ?? null,
      team_kills: stats.teamKills ?? null,
      time_survived: stats.timeSurvived ?? null,
      walk_distance: stats.walkDistance ?? null,
      weapons_acquired: stats.weaponsAcquired ?? null,
      win_place: stats.winPlace ?? null,
      raw_stats: stats ? JSON.stringify(stats) : null
    });
    await insertRowComposite(
      client,
      "match_player_stats",
      row,
      ["match_id", "player_id"]
    );

    if (rosterId) {
      const rp = filterData(columns.colsRosterPlayers, {
        roster_id: rosterId,
        player_id: playerId,
        game_id: gameId
      });
      await insertRowComposite(client, "roster_players", rp, ["roster_id", "player_id"]);
    }
  }
};

const importMatchPayloads = async ({ gameId = "pubg", payloads }) => {
  const client = poolFromEnv();
  const columns = await loadColumns(client);
  for (const payload of payloads || []) {
    await importMatchPayload({ client, payload, gameId, columns });
  }
  await client.end();
};

const importMatchJsonDir = async ({ gameId = "pubg", dir }) => {
  const client = poolFromEnv();
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(dir, f));

  const columns = await loadColumns(client);

  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    await importMatchPayload({ client, payload: raw, gameId, columns });
  }

  await client.end();
};

module.exports = {
  importMatchJsonDir,
  importMatchPayloads
};
