CREATE TABLE IF NOT EXISTS matches (
  match_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  tournament_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tournament_id, match_id)
);

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

CREATE TABLE IF NOT EXISTS match_assets (
  asset_id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
  url TEXT,
  created_at TIMESTAMPTZ,
  description TEXT,
  name TEXT
);

CREATE TABLE IF NOT EXISTS match_rosters (
  roster_id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
  team_id TEXT,
  rank INTEGER,
  won BOOLEAN,
  shard_id TEXT
);

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

CREATE TABLE IF NOT EXISTS match_roster_participants (
  roster_id TEXT NOT NULL REFERENCES match_rosters(roster_id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES match_participants(participant_id) ON DELETE CASCADE,
  PRIMARY KEY (roster_id, participant_id)
);
