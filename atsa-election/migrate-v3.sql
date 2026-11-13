-- Run ONCE in the Neon SQL Editor (after migrate-v2.sql). Safe to run again.
-- Adds the one-time codes used for online voting by approved members.
CREATE TABLE IF NOT EXISTS remote_codes (code_hash text PRIMARY KEY, used boolean NOT NULL DEFAULT false);
