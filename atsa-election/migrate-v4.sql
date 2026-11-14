-- Run ONCE in the Neon SQL Editor (after migrate-v2.sql and migrate-v3.sql). Safe to run again.
-- Adds one-time activation links for polling-station computers, and "deactivate all computers".
CREATE TABLE IF NOT EXISTS kiosk_links (code_hash text PRIMARY KEY, used boolean NOT NULL DEFAULT false);
ALTER TABLE election ADD COLUMN IF NOT EXISTS kiosk_epoch int NOT NULL DEFAULT 0;
