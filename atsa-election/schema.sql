-- ATSA election schema. Safe to run more than once.
CREATE TABLE IF NOT EXISTS election (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  club_name text NOT NULL DEFAULT 'AIU Thai Student Association',
  club_short text NOT NULL DEFAULT 'ATSA',
  title text NOT NULL DEFAULT 'Board Election',
  title_th text NOT NULL DEFAULT 'การเลือกตั้งคณะกรรมการ',
  year int NOT NULL DEFAULT 2026,
  description text NOT NULL DEFAULT '',
  announcement text NOT NULL DEFAULT '',
  color_primary text NOT NULL DEFAULT '#d93a2f',
  color_secondary text NOT NULL DEFAULT '#1b2a5e',
  color_accent text NOT NULL DEFAULT '#2e8b3a',
  logo_data text,
  open_at timestamptz NOT NULL,
  close_at timestamptz NOT NULL,
  results_at timestamptz NOT NULL,
  board_seats int NOT NULL DEFAULT 3 CHECK (board_seats BETWEEN 1 AND 20),
  max_ballots int CHECK (max_ballots IS NULL OR max_ballots > 0),
  auto_publish boolean NOT NULL DEFAULT true,
  verified_at timestamptz,
  published_at timestamptz,
  CONSTRAINT schedule_order CHECK (open_at < close_at AND close_at <= results_at)
);
CREATE TABLE IF NOT EXISTS candidates (id serial PRIMARY KEY, sort int NOT NULL DEFAULT 0, name text NOT NULL, bio text NOT NULL DEFAULT '', manifesto text NOT NULL DEFAULT '', photo text, for_president boolean NOT NULL DEFAULT false, for_board boolean NOT NULL DEFAULT true);

-- BALLOTS: no voter identity exists anywhere in this database: random ids, no timestamps, no device id.
CREATE TABLE IF NOT EXISTS ballots (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), president_id int REFERENCES candidates(id));
CREATE TABLE IF NOT EXISTS ballot_board (
  ballot_id uuid NOT NULL REFERENCES ballots(id),
  candidate_id int NOT NULL REFERENCES candidates(id),
  PRIMARY KEY (ballot_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS admins (
  id serial PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('SUPER_ADMIN','COMMITTEE','RESULTS_MANAGER')), created_at timestamptz NOT NULL DEFAULT now()
);
-- details is text (not jsonb) so the hash chain can be recomputed exactly.
CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY, at timestamptz NOT NULL, actor text NOT NULL, action text NOT NULL,
  details text NOT NULL, prev_hash text NOT NULL, hash text NOT NULL
);

CREATE OR REPLACE FUNCTION forbid_change() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'table % is append-only', TG_TABLE_NAME; END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS audit_ro ON audit_log;
CREATE TRIGGER audit_ro BEFORE UPDATE OR DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION forbid_change();
DROP TRIGGER IF EXISTS audit_nt ON audit_log;
CREATE TRIGGER audit_nt BEFORE TRUNCATE ON audit_log FOR EACH STATEMENT EXECUTE FUNCTION forbid_change();
DROP TRIGGER IF EXISTS ballots_ro ON ballots;
CREATE TRIGGER ballots_ro BEFORE UPDATE OR DELETE ON ballots FOR EACH ROW EXECUTE FUNCTION forbid_change();
DROP TRIGGER IF EXISTS board_ro ON ballot_board;
CREATE TRIGGER board_ro BEFORE UPDATE OR DELETE ON ballot_board FOR EACH ROW EXECUTE FUNCTION forbid_change();

-- ONLINE VOTING CODES (for approved members who cannot attend). Only a hash of each code is stored,
-- never a name, and the ballot table has no link to this table.
CREATE TABLE IF NOT EXISTS remote_codes (code_hash text PRIMARY KEY, used boolean NOT NULL DEFAULT false);

-- POLLING-STATION COMPUTERS: one-time activation links (only hashes stored) so each voting computer can be set up
-- without an admin login. kiosk_epoch lets an admin deactivate every polling-station computer at once.
CREATE TABLE IF NOT EXISTS kiosk_links (code_hash text PRIMARY KEY, used boolean NOT NULL DEFAULT false);
ALTER TABLE election ADD COLUMN IF NOT EXISTS kiosk_epoch int NOT NULL DEFAULT 0;
