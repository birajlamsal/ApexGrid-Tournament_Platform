-- Supabase additions for ApexGrid (keep routes same, no JSON storage)

-- 1) Extend tournaments table for admin fields + multi-event support
ALTER TABLE IF EXISTS tournaments
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'tournament',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming',
  ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'closed',
  ADD COLUMN IF NOT EXISTS registration_charge NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_slots INTEGER,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tier TEXT,
  ADD COLUMN IF NOT EXISTS mode TEXT,
  ADD COLUMN IF NOT EXISTS match_type TEXT,
  ADD COLUMN IF NOT EXISTS perspective TEXT,
  ADD COLUMN IF NOT EXISTS prize_pool NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS rules TEXT,
  ADD COLUMN IF NOT EXISTS contact_discord TEXT,
  ADD COLUMN IF NOT EXISTS api_key_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS api_provider TEXT DEFAULT 'PUBG',
  ADD COLUMN IF NOT EXISTS pubg_tournament_id TEXT,
  ADD COLUMN IF NOT EXISTS custom_match_mode BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allow_non_custom BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS custom_match_ids JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tournaments_event_type_check'
  ) THEN
    ALTER TABLE tournaments
      ADD CONSTRAINT tournaments_event_type_check
      CHECK (event_type IN ('tournament', 'scrim'));
  END IF;
END $$;

-- 2) Announcements (admin-managed)
CREATE TABLE IF NOT EXISTS announcements (
  announcement_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'notice',
  importance TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2b) Extend players/teams for admin fields
ALTER TABLE IF EXISTS players
  ADD COLUMN IF NOT EXISTS discord_id TEXT,
  ADD COLUMN IF NOT EXISTS pubg_ingame_name TEXT,
  ADD COLUMN IF NOT EXISTS profile_pic_url TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE IF EXISTS teams
  ADD COLUMN IF NOT EXISTS team_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS captain_player_id TEXT,
  ADD COLUMN IF NOT EXISTS discord_contact TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3) Participants (registrations)
CREATE TABLE IF NOT EXISTS participants (
  participant_id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'team',
  linked_team_id TEXT,
  linked_player_id TEXT,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'unpaid',
  slot_number INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) Winners (optional summary table)
CREATE TABLE IF NOT EXISTS winners (
  winner_id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
  place INTEGER,
  team_id TEXT,
  team_name TEXT,
  points INTEGER,
  kills INTEGER
);

-- 4b) Tournament ↔ Match linkage (allows custom IDs before match ingestion)
CREATE TABLE IF NOT EXISTS tournament_matches (
  tournament_id TEXT NOT NULL REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
  match_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tournament_id, match_id)
);

-- 5) Match winner pointer (optional)
ALTER TABLE IF EXISTS match_information
  ADD COLUMN IF NOT EXISTS winner_team_id TEXT;

-- 6) Compatibility for old match tables (used by API caching)
ALTER TABLE IF EXISTS match_rosters
  ADD COLUMN IF NOT EXISTS team_id TEXT,
  ADD COLUMN IF NOT EXISTS shard_id TEXT;

-- 7) Ensure unique constraints for ON CONFLICT upserts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'matches'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'matches_pkey'
    ) THEN
      ALTER TABLE matches ADD CONSTRAINT matches_pkey PRIMARY KEY (match_id);
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'match_details'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'match_details_pkey'
    ) THEN
      ALTER TABLE match_details ADD CONSTRAINT match_details_pkey PRIMARY KEY (match_id);
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'match_assets'
  ) THEN
    ALTER TABLE match_assets
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS created_at_api TIMESTAMPTZ;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'match_assets_pkey'
    ) THEN
      ALTER TABLE match_assets ADD CONSTRAINT match_assets_pkey PRIMARY KEY (asset_id);
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'match_assets_match_id_fkey'
    ) THEN
      ALTER TABLE match_assets DROP CONSTRAINT match_assets_match_id_fkey;
    END IF;
    ALTER TABLE match_assets
      ADD CONSTRAINT match_assets_match_id_fkey
      FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'match_rosters'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'match_rosters_pkey'
    ) THEN
      ALTER TABLE match_rosters ADD CONSTRAINT match_rosters_pkey PRIMARY KEY (roster_id);
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'match_rosters_match_id_fkey'
    ) THEN
      ALTER TABLE match_rosters DROP CONSTRAINT match_rosters_match_id_fkey;
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'match_rosters_roster_id_fkey'
    ) THEN
      ALTER TABLE match_rosters DROP CONSTRAINT match_rosters_roster_id_fkey;
    END IF;
    ALTER TABLE match_rosters
      ADD CONSTRAINT match_rosters_match_id_fkey
      FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE CASCADE;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'match_rosters_roster_id_key'
    ) THEN
      ALTER TABLE match_rosters ADD CONSTRAINT match_rosters_roster_id_key UNIQUE (roster_id);
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'match_participants'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'match_participants_pkey'
    ) THEN
      ALTER TABLE match_participants ADD CONSTRAINT match_participants_pkey PRIMARY KEY (participant_id);
    END IF;
  END IF;
END $$;

-- 8) Create missing match tables for normalization
CREATE TABLE IF NOT EXISTS match_participants (
  participant_id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
  roster_id TEXT,
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'match_participants_roster_id_fkey'
  ) THEN
    ALTER TABLE match_participants
      ADD CONSTRAINT match_participants_roster_id_fkey
      FOREIGN KEY (roster_id) REFERENCES match_rosters(roster_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS match_roster_participants (
  roster_id TEXT NOT NULL REFERENCES match_rosters(roster_id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES match_participants(participant_id) ON DELETE CASCADE,
  PRIMARY KEY (roster_id, participant_id)
);
