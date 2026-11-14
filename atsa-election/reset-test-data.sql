-- Clears TEST votes so the real election starts from zero. Run in the Neon SQL Editor BEFORE the real election only.
-- NEVER run this after real votes have been cast. The audit log is append-only and keeps its history (that is intended).
TRUNCATE ballot_board, ballots;
UPDATE election SET verified_at = NULL, published_at = NULL;
DO $$ BEGIN
  IF to_regclass('remote_codes') IS NOT NULL THEN TRUNCATE remote_codes; END IF;
  IF to_regclass('kiosk_links') IS NOT NULL THEN TRUNCATE kiosk_links; END IF;
END $$;
-- After running it: set the real opening/closing times in the admin page, create fresh online codes and kiosk links.
