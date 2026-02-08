const fetch = require("node-fetch");

const PUBG_BASE = "https://api.pubg.com/shards/steam";
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

const cacheKey = (cacheId, limit, mode) => `${cacheId}:${limit}:${mode}`;

const getCache = (key) => {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
};

const setCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

const request = async (apiKey, path) => {
  const response = await fetch(`${PUBG_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/vnd.api+json"
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PUBG API ${response.status}: ${text}`);
  }
  return response.json();
};

const mapNameMap = new Map([
  ["Baltic_Main", "Erangel"],
  ["Desert_Main", "Miramar"],
  ["Tiger_Main", "Taego"],
  ["Neon_Main", "Rondo"]
]);

const normalizeMapName = (mapName) => {
  const cleaned = String(mapName || "").trim();
  if (!cleaned) {
    return null;
  }
  return mapNameMap.get(cleaned) || cleaned;
};

const placementPoints = (rank) => {
  if (!rank || rank < 1) {
    return 0;
  }
  if (rank === 1) return 10;
  if (rank === 2) return 6;
  if (rank === 3) return 5;
  if (rank === 4) return 4;
  if (rank === 5) return 3;
  if (rank === 6) return 2;
  if (rank === 7 || rank === 8) return 1;
  return 0;
};

const aggregateMatchPayloads = ({
  matchPayloads,
  matchCount,
  cacheId,
  limit = 12,
  fresh = false,
  onlyCustom = false,
  tournamentId = null
}) => {
  const key = cacheKey(cacheId, limit, onlyCustom ? "custom" : "tournament");
  if (!fresh) {
    const cached = getCache(key);
    if (cached) {
      return cached;
    }
  }

  const matches = [];
  const players = new Map();
  const teams = new Map();

  const safePayloads = Array.isArray(matchPayloads) ? matchPayloads : [];
  const limitedPayloads = safePayloads.slice(0, limit);

  for (const match of limitedPayloads) {
    if (!match || !match.data) {
      continue;
    }
    const attributes = match.data.attributes || {};
    if (onlyCustom && attributes.isCustomMatch !== true) {
      continue;
    }
    const included = match.included || [];
    const participants = included.filter((item) => item.type === "participant");
    const rosters = included.filter((item) => item.type === "roster");
    let winnerTeamId = null;
    let winnerTeamName = null;

    const participantStats = new Map();
    participants.forEach((participant) => {
      const stats = participant.attributes.stats || {};
      participantStats.set(participant.id, stats);

      const name = stats.name || "Unknown";
      const current = players.get(name) || {
        player_name: name,
        matches_played: 0,
        total_kills: 0,
        assists: 0,
        revives: 0,
        deaths: 0,
        death_reason: "Cannot determine",
        _death_reason_counts: {
          alive: 0,
          killed: 0,
          suicide: 0,
          unknown: 0
        },
        total_points: 0,
        avg_placement: 0,
        kd_ratio: 0,
        damage: 0,
        wins: 0,
        _placementTotal: 0
      };
      current.matches_played += 1;
      current.total_kills += stats.kills || 0;
      current.assists += stats.assists || 0;
      current.revives += stats.revives || 0;
      current.damage += stats.damageDealt || 0;
      const rank = stats.winPlace || stats.rank || 0;
      current._placementTotal += rank;
      if (rank === 1) {
        current.wins += 1;
      }
      if (stats.deathType === "alive") {
        current._death_reason_counts.alive += 1;
      } else if (stats.deathType === "byplayer") {
        current.deaths += 1;
        current._death_reason_counts.killed += 1;
      } else if (stats.deathType === "suicide") {
        current.deaths += 1;
        current._death_reason_counts.suicide += 1;
      } else {
        current._death_reason_counts.unknown += 1;
      }
      current.total_points += (stats.kills || 0) + placementPoints(rank);
      players.set(name, current);
    });

    rosters.forEach((roster) => {
      const rosterStats = roster.attributes.stats || {};
      const teamId =
        rosterStats.teamId !== undefined && rosterStats.teamId !== null
          ? rosterStats.teamId
          : "-";
      const rank = rosterStats.rank || rosterStats.winPlace || 0;
      if (rank === 1 && winnerTeamId === null) {
        winnerTeamId = String(teamId);
        winnerTeamName = `Team ${teamId}`;
      }
      const rosterParticipants = (roster.relationships.participants?.data || [])
        .map((ref) => participantStats.get(ref.id))
        .filter(Boolean);
      const rosterKills = rosterParticipants.reduce(
        (total, stats) => total + (stats.kills || 0),
        0
      );
      const rosterNames = rosterParticipants.map((stats) => stats.name).filter(Boolean);
      const keyId = String(teamId);
      const current = teams.get(keyId) || {
        team_id: keyId,
        team_name: `Team ${teamId}`,
        matches_played: 0,
        wins: 0,
        total_kills: 0,
        total_points: 0,
        avg_placement: 0,
        win_rate: 0,
        players: [],
        _placementTotal: 0
      };
      current.matches_played += 1;
      if (rank === 1) {
        current.wins += 1;
      }
      current.total_kills += rosterKills;
      current.total_points += rosterKills + placementPoints(rank);
      current._placementTotal += rank;
      current.players = Array.from(new Set([...current.players, ...rosterNames]));
      teams.set(keyId, current);
    });

    matches.push({
      match_id: match.data.id,
      map_name: normalizeMapName(attributes.mapName),
      game_mode: attributes.gameMode,
      created_at: attributes.createdAt,
      duration: attributes.duration,
      match_type: attributes.matchType,
      winner_team_id: winnerTeamId,
      winner_team_name: winnerTeamName
    });
  }

  const teamStats = Array.from(teams.values()).map((team) => {
    const avgPlacement = team.matches_played
      ? team._placementTotal / team.matches_played
      : 0;
    const winRate = team.matches_played ? (team.wins / team.matches_played) * 100 : 0;
    return {
      ...team,
      avg_placement: Number(avgPlacement.toFixed(2)),
      win_rate: Number(winRate.toFixed(1))
    };
  });

  const playerStats = Array.from(players.values()).map((player) => {
    const avgPlacement = player.matches_played
      ? player._placementTotal / player.matches_played
      : 0;
    const kdRatio = player.matches_played ? player.total_kills / player.matches_played : 0;
    const { alive, killed, suicide, unknown } = player._death_reason_counts || {};
    let deathReason = "Cannot determine";
    if (!unknown) {
      if (alive > 0 && !killed && !suicide) {
        deathReason = "alive";
      } else if (killed > 0 && !suicide && !alive) {
        deathReason = "killed";
      } else if (suicide > 0 && !killed && !alive) {
        deathReason = "suicide";
      }
    }
    return {
      ...player,
      avg_placement: Number(avgPlacement.toFixed(2)),
      kd_ratio: Number(kdRatio.toFixed(2)),
      total_points: Math.round(player.total_points),
      damage: Math.round(player.damage),
      assists: Math.round(player.assists || 0),
      revives: Math.round(player.revives || 0),
      deaths: Math.round(player.deaths || 0),
      death_reason: deathReason
    };
  });

  const leaderboards = {
    teams: [...teamStats].sort((a, b) => b.total_points - a.total_points).slice(0, 10),
    players: [...playerStats].sort((a, b) => b.total_points - a.total_points).slice(0, 10)
  };

  const data = {
    tournament: {
      id: tournamentId || cacheId,
      match_count: matchCount ?? safePayloads.length
    },
    matches,
    teams: teamStats,
    teamStats,
    playerStats,
    leaderboards
  };

  setCache(key, data);
  return data;
};

const fetchMatchPayloads = async ({ apiKey, matchIds }) => {
  const cleanedIds = Array.from(
    new Set((matchIds || []).map((id) => String(id).trim()).filter(Boolean))
  );
  const payloads = [];
  for (const matchId of cleanedIds) {
    try {
      payloads.push(await request(apiKey, `/matches/${matchId}`));
    } catch (error) {
      if (String(error.message || "").startsWith("PUBG API 404")) {
        continue;
      }
      throw error;
    }
  }
  return payloads;
};

const fetchTournamentMatchIds = async ({ apiKey, tournamentId }) => {
  const tournament = await request(apiKey, `/tournaments/${tournamentId}`);
  const matchRefs = tournament.data?.relationships?.matches?.data || [];
  const ids = matchRefs.map((match) => match.id).filter(Boolean);
  return Array.from(new Set(ids));
};

const aggregateMatches = async ({
  apiKey,
  matchIds,
  cacheId,
  limit = 12,
  fresh = false,
  onlyCustom = false,
  tournamentId = null
}) => {
  const limitedIds = matchIds.slice(0, limit);
  const matchPayloads = await fetchMatchPayloads({ apiKey, matchIds: limitedIds });
  return aggregateMatchPayloads({
    matchPayloads,
    matchCount: matchIds.length,
    cacheId,
    limit,
    fresh,
    onlyCustom,
    tournamentId
  });
};

const aggregateTournament = async ({ apiKey, tournamentId, limit = 12, fresh = false }) => {
  const matchIds = await fetchTournamentMatchIds({ apiKey, tournamentId });
  const limitedIds = matchIds.slice(0, limit);
  const matchPayloads = await fetchMatchPayloads({ apiKey, matchIds: limitedIds });
  return aggregateMatchPayloads({
    matchPayloads,
    matchCount: matchIds.length,
    cacheId: tournamentId,
    limit,
    fresh,
    onlyCustom: false,
    tournamentId
  });
};

const aggregateCustomMatches = async ({
  apiKey,
  playerNames,
  limit = 12,
  fresh = false,
  includeNonCustom = false
}) => {
  const cleanedNames = Array.from(
    new Set(
      (playerNames || [])
        .map((name) => String(name).trim())
        .filter(Boolean)
    )
  );
  if (!cleanedNames.length) {
    throw new Error("No player names provided for custom match lookup");
  }
  const lookupNames = cleanedNames.slice(0, 6);
  const query = encodeURIComponent(lookupNames.join(","));
  const players = await request(apiKey, `/players?filter[playerNames]=${query}`);
  const matchIds = [];
  const seen = new Set();
  (players.data || []).forEach((player) => {
    const matches = player.relationships?.matches?.data || [];
    matches.forEach((match) => {
      if (!seen.has(match.id)) {
        seen.add(match.id);
        matchIds.push(match.id);
      }
    });
  });

  return aggregateMatches({
    apiKey,
    matchIds,
    cacheId: `custom:${lookupNames.join(",")}`,
    limit,
    fresh,
    onlyCustom: !includeNonCustom
  });
};

const aggregateMatchIds = async ({
  apiKey,
  matchIds,
  limit = 12,
  fresh = false,
  onlyCustom = false
}) => {
  const cleanedIds = Array.from(
    new Set((matchIds || []).map((id) => String(id).trim()).filter(Boolean))
  );
  if (!cleanedIds.length) {
    throw new Error("No match IDs provided");
  }
  const limitedIds = cleanedIds.slice(0, limit);
  const matchPayloads = await fetchMatchPayloads({ apiKey, matchIds: limitedIds });
  return aggregateMatchPayloads({
    matchPayloads,
    matchCount: cleanedIds.length,
    cacheId: `matchids:${cleanedIds.join(",")}`,
    limit,
    fresh,
    onlyCustom
  });
};

const fetchPlayerMatches = async ({ apiKey, playerName, limit = 50 }) => {
  const cleaned = String(playerName || "").trim();
  if (!cleaned) {
    throw new Error("Player name is required");
  }
  const query = encodeURIComponent(cleaned);
  const data = await request(apiKey, `/players?filter[playerNames]=${query}`);
  const matches = data?.data?.[0]?.relationships?.matches?.data || [];
  const ids = matches.map((match) => match.id).filter(Boolean);
  return ids.slice(0, limit);
};

const fetchMatchSummaries = async ({ apiKey, matchIds }) => {
  const summaries = [];
  for (const matchId of matchIds) {
    const match = await request(apiKey, `/matches/${matchId}`);
    const attrs = match.data.attributes || {};
    summaries.push({
      match_id: match.data.id,
      is_custom_match: attrs.isCustomMatch === true,
      created_at: attrs.createdAt || null,
      map_name: normalizeMapName(attrs.mapName),
      game_mode: attrs.gameMode || null,
      match_type: attrs.matchType || null
    });
  }
  return summaries;
};

module.exports = {
  aggregateTournament,
  aggregateCustomMatches,
  aggregateMatchIds,
  aggregateMatchPayloads,
  fetchMatchPayloads,
  fetchTournamentMatchIds,
  fetchPlayerMatches,
  fetchMatchSummaries
};
