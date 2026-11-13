-- Run ONCE in the Neon SQL Editor on your existing database (safe to run again).
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS for_president boolean NOT NULL DEFAULT false;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS for_board boolean NOT NULL DEFAULT true;
ALTER TABLE election ADD COLUMN IF NOT EXISTS board_seats int NOT NULL DEFAULT 3;
ALTER TABLE election ADD COLUMN IF NOT EXISTS max_ballots int;
ALTER TABLE ballots ALTER COLUMN token_hash DROP NOT NULL;
ALTER TABLE ballots ADD COLUMN IF NOT EXISTS president_id int REFERENCES candidates(id);
CREATE TABLE IF NOT EXISTS ballot_board (
  ballot_id uuid NOT NULL REFERENCES ballots(id),
  candidate_id int NOT NULL REFERENCES candidates(id),
  PRIMARY KEY (ballot_id, candidate_id)
);
DROP TRIGGER IF EXISTS board_ro ON ballot_board;
CREATE TRIGGER board_ro BEFORE UPDATE OR DELETE ON ballot_board FOR EACH ROW EXECUTE FUNCTION forbid_change();
