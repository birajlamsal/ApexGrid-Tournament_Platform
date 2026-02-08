const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { Pool } = require("pg");
const { nanoid } = require("nanoid");

const dataDir = path.join(__dirname, "..", "data");

const readJson = (file) => {
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.trim()) {
    return [];
  }
  return JSON.parse(raw);
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.PGSSL === "true"
      ? {
          rejectUnauthorized: false
        }
      : undefined
});

const gameNameForId = (gameId) => {
  if (!gameId) {
    return "PUBG";
  }
  if (String(gameId).toLowerCase() === "pubg") {
    return "PUBG";
  }
  return String(gameId)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
};

const ensureGame = async (gameId) => {
  await pool.query(
    `INSERT INTO games (game_id, name) VALUES ($1, $2) ON CONFLICT (game_id) DO NOTHING`,
    [gameId, gameNameForId(gameId)]
  );
};

const upsertTournament = async (t) => {
  const gameId = t.game_id || "pubg";
  await ensureGame(gameId);
  await pool.query(
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
      ON CONFLICT (tournament_id)
      DO UPDATE SET
        game_id = EXCLUDED.game_id,
        event_type = EXCLUDED.event_type,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        banner_url = EXCLUDED.banner_url,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = EXCLUDED.status,
        registration_status = EXCLUDED.registration_status,
        mode = EXCLUDED.mode,
        match_type = EXCLUDED.match_type,
        perspective = EXCLUDED.perspective,
        tier = EXCLUDED.tier,
        prize_pool = EXCLUDED.prize_pool,
        registration_charge = EXCLUDED.registration_charge,
        featured = EXCLUDED.featured,
        max_slots = EXCLUDED.max_slots,
        region = EXCLUDED.region,
        rules = EXCLUDED.rules,
        contact_discord = EXCLUDED.contact_discord,
        api_key_required = EXCLUDED.api_key_required,
        api_provider = EXCLUDED.api_provider,
        pubg_tournament_id = EXCLUDED.pubg_tournament_id,
        custom_match_mode = EXCLUDED.custom_match_mode,
        allow_non_custom = EXCLUDED.allow_non_custom,
        custom_match_ids = EXCLUDED.custom_match_ids
    `,
    [
      t.tournament_id,
      gameId,
      t.event_type || "tournament",
      t.name,
      t.description || "",
      t.banner_url || "",
      t.start_date || null,
      t.end_date || null,
      t.status || "upcoming",
      t.registration_status || "closed",
      t.mode || "squad",
      t.match_type || "classic",
      t.perspective || "TPP",
      t.tier || null,
      Number(t.prize_pool || 0),
      Number(t.registration_charge || 0),
      t.featured === true,
      t.max_slots || null,
      t.region || "",
      t.rules || "",
      t.contact_discord || "",
      t.api_key_required === true,
      t.api_provider || "PUBG",
      t.pubg_tournament_id || "",
      t.custom_match_mode === true,
      t.allow_non_custom === true,
      t.custom_match_ids ? JSON.stringify(t.custom_match_ids) : null
    ]
  );
};

const upsertTeam = async (team) => {
  const gameId = team.game_id || "pubg";
  await ensureGame(gameId);
  await pool.query(
    `
      INSERT INTO teams (
        game_id, team_id, team_name, region, team_logo_url, captain_player_id,
        discord_contact, notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (game_id, team_id)
      DO UPDATE SET
        team_name = EXCLUDED.team_name,
        region = EXCLUDED.region,
        team_logo_url = EXCLUDED.team_logo_url,
        captain_player_id = EXCLUDED.captain_player_id,
        discord_contact = EXCLUDED.discord_contact,
        notes = EXCLUDED.notes
    `,
    [
      gameId,
      team.team_id,
      team.team_name,
      team.region || "",
      team.team_logo_url || "",
      team.captain_player_id || "",
      team.discord_contact || "",
      team.notes || ""
    ]
  );
};

const upsertPlayer = async (player) => {
  const gameId = player.game_id || "pubg";
  await ensureGame(gameId);
  await pool.query(
    `
      INSERT INTO players (
        game_id, player_id, player_name, discord_id, pubg_ingame_name,
        profile_pic_url, email, region, notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (game_id, player_id)
      DO UPDATE SET
        player_name = EXCLUDED.player_name,
        discord_id = EXCLUDED.discord_id,
        pubg_ingame_name = EXCLUDED.pubg_ingame_name,
        profile_pic_url = EXCLUDED.profile_pic_url,
        email = EXCLUDED.email,
        region = EXCLUDED.region,
        notes = EXCLUDED.notes
    `,
    [
      gameId,
      player.player_id,
      player.player_name,
      player.discord_id || "",
      player.pubg_ingame_name || "",
      player.profile_pic_url || "",
      player.email || "",
      player.region || "",
      player.notes || ""
    ]
  );
};

const upsertParticipant = async (p) => {
  if (p.tournament_id) {
    await upsertTournament({
      tournament_id: p.tournament_id,
      name: p.tournament_id,
      status: "upcoming",
      event_type: "tournament",
      prize_pool: 0,
      registration_charge: 0
    });
  }
  await pool.query(
    `
      INSERT INTO participants (
        participant_id, tournament_id, type, linked_team_id, linked_player_id,
        status, payment_status, slot_number, notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (participant_id)
      DO UPDATE SET
        tournament_id = EXCLUDED.tournament_id,
        type = EXCLUDED.type,
        linked_team_id = EXCLUDED.linked_team_id,
        linked_player_id = EXCLUDED.linked_player_id,
        status = EXCLUDED.status,
        payment_status = EXCLUDED.payment_status,
        slot_number = EXCLUDED.slot_number,
        notes = EXCLUDED.notes
    `,
    [
      p.participant_id,
      p.tournament_id,
      p.type || "team",
      p.linked_team_id || null,
      p.linked_player_id || null,
      p.status || "pending",
      p.payment_status || "unpaid",
      p.slot_number || null,
      p.notes || ""
    ]
  );
};

const upsertAnnouncement = async (a) => {
  await pool.query(
    `
      INSERT INTO announcements (announcement_id, title, body, type, importance, created_at)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (announcement_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        type = EXCLUDED.type,
        importance = EXCLUDED.importance,
        created_at = EXCLUDED.created_at
    `,
    [
      a.announcement_id || nanoid(10),
      a.title,
      a.body,
      a.type || "notice",
      a.importance || "medium",
      a.created_at || new Date().toISOString()
    ]
  );
};

const upsertWinnerRows = async (w) => {
  if (w.tournament_id) {
    await upsertTournament({
      tournament_id: w.tournament_id,
      name: w.tournament_id,
      status: "completed",
      event_type: "tournament",
      prize_pool: 0,
      registration_charge: 0
    });
  }
  const rows = [];
  if (w.by_points) {
    const points = Array.isArray(w.by_points.points) ? w.by_points.points : [];
    if (w.by_points.first) {
      rows.push({
        winner_id: `${w.winner_id || nanoid(6)}-p1`,
        tournament_id: w.tournament_id,
        place: 1,
        team_name: w.by_points.first,
        points: points[0] || null,
        kills: null
      });
    }
    if (w.by_points.second) {
      rows.push({
        winner_id: `${w.winner_id || nanoid(6)}-p2`,
        tournament_id: w.tournament_id,
        place: 2,
        team_name: w.by_points.second,
        points: points[1] || null,
        kills: null
      });
    }
    if (w.by_points.third) {
      rows.push({
        winner_id: `${w.winner_id || nanoid(6)}-p3`,
        tournament_id: w.tournament_id,
        place: 3,
        team_name: w.by_points.third,
        points: points[2] || null,
        kills: null
      });
    }
  }
  if (w.most_kills?.winner) {
    rows.push({
      winner_id: `${w.winner_id || nanoid(6)}-kills`,
      tournament_id: w.tournament_id,
      place: null,
      team_name: w.most_kills.winner,
      points: null,
      kills: w.most_kills.kills || null
    });
  }

  for (const row of rows) {
    await pool.query(
      `
        INSERT INTO winners (winner_id, tournament_id, place, team_name, points, kills)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (winner_id)
        DO UPDATE SET
          tournament_id = EXCLUDED.tournament_id,
          place = EXCLUDED.place,
          team_name = EXCLUDED.team_name,
          points = EXCLUDED.points,
          kills = EXCLUDED.kills
      `,
      [
        row.winner_id,
        row.tournament_id,
        row.place,
        row.team_name,
        row.points,
        row.kills
      ]
    );
  }
};

const syncTournamentMatches = async (t) => {
  const ids = (t.custom_match_ids || []).map((id) => String(id).trim()).filter(Boolean);
  if (!ids.length) {
    return;
  }
  await pool.query("DELETE FROM tournament_matches WHERE tournament_id = $1", [
    t.tournament_id
  ]);
  for (const id of ids) {
    await pool.query(
      `
        INSERT INTO tournament_matches (tournament_id, match_id)
        VALUES ($1,$2)
        ON CONFLICT DO NOTHING;
      `,
      [t.tournament_id, id]
    );
  }
};

const main = async () => {
  const tournaments = readJson("tournaments.json");
  const teams = readJson("teams.json");
  const players = readJson("players.json");
  const participants = readJson("participants.json");
  const announcements = readJson("announcements.json");
  const winners = readJson("winners.json");

  for (const t of tournaments) {
    await upsertTournament(t);
    if (t.custom_match_mode) {
      await syncTournamentMatches(t);
    }
  }

  for (const team of teams) {
    await upsertTeam(team);
  }

  for (const player of players) {
    await upsertPlayer(player);
  }

  for (const participant of participants) {
    await upsertParticipant(participant);
  }

  for (const announcement of announcements) {
    await upsertAnnouncement(announcement);
  }

  for (const winner of winners) {
    await upsertWinnerRows(winner);
  }

  await pool.end();
  console.log("Migration complete.");
};

main().catch((error) => {
  console.error("Migration failed:", error);
  pool.end();
  process.exit(1);
});
