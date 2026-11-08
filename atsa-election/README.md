# ATSA Board Election

Secret-ballot online election for the AIU Thai Student Association. Next.js 15 + TypeScript + PostgreSQL.
Public site (English/Thai switch) and admin area are separate: different layouts, different login cookies, server-side roles.

**Thai step-by-step guide: [README.th.md](README.th.md)**

## How voting works
1. Admin imports the voter emails. The voter enters their email and gets a one-time sign-in link.
2. The browser makes a random token, **blinds** it, and asks the server to sign the blinded value (RSA blind signature).
   The server records only that this voter received one signature (`voters.blinded_msg`). It never sees the token.
3. The browser removes the blinding and later submits `token + signature + choices` **without cookies**.
   The server checks the signature and stores the ballot with no voter id and no timestamp. A reused token hits a UNIQUE constraint.
4. Positions are voted one at a time (President first). Counting is sequential: someone who wins an earlier position is removed from later ones.
   A tie stops the count so the committee decides.
5. Results are never queried or sent to browsers until published (manually, or automatically after verification at the announcement time).

Code: `src/lib/blind.ts` (blind signatures), `src/app/api/vote/*` (credential + anonymous submit), `src/lib/rounds.ts` (counting), `schema.sql`.

## Roles
| Role | Can do |
|---|---|
| Super Admin | everything, including admin accounts and publishing |
| Election Committee | election settings, branding, positions, candidates, voter list, audit view |
| Results Manager | verify and publish results, audit view |

Positions, candidates and the voter list lock automatically when voting opens. Every admin action is written to a hash-chained, append-only audit log (the database also blocks UPDATE/DELETE).

## Run locally
```
npm install
npm run keys                 # paste SESSION_SECRET and BLIND_KEY_B64 into .env.local (copy .env.example)
npm run migrate              # creates tables
npm run seed -- --demo --open   # demo candidates, 5 demo voters, voting open
npm run dev                  # http://localhost:3000   (sign-in links print in the terminal when no email is configured)
```
Admin: `/admin/login` (or run `/admin/setup` on a fresh database).

## Tests
- `npm test`: blind-signature round trip, key compatibility with keygen.html, sequential counting and tie rules.
- `npm run e2e`: against a running server (`npm run build && npm start -- -p 3100`, output saved to /tmp/server.log):
  sign-in, one credential per voter, double vote rejected, forged signature rejected, CSRF check, hidden results.

## Deploy
Vercel + Neon (or any PostgreSQL). See README.th.md. Run `schema.sql` once, set the environment variables, open `/admin/setup`.

## Privacy and security notes (read before relying on it)
- Identity and ballots are in separate tables with no shared value. Ballots have no timestamp or IP. Verified in the end-to-end run: no row of `ballots` matches any value in `voters`.
- Not protected against: someone who controls the server code or both the database and hosting logs. Sign-in time (`login_tokens.created_at`) and hosting request logs could be correlated with ballot insertion order by such a person. Delete `login_tokens` after the election, switch off request logging where you can, and keep admin accounts few.
- Anyone who can read a voter's mailbox can vote as that voter.
- If a voter clears browser data after receiving a ballot and before submitting, the credential cannot be re-issued safely (the server cannot tell whether it was already used). The committee must decide how to handle that.
- Login rate limiting is per account in the database. Add Vercel's firewall/rate limits for general abuse.
- This has not had an independent security review. Rehearse on a separate copy, and have someone else read the code before a real election.

## Not included (compared with the original brief)
Tailwind/shadcn/Recharts (plain CSS and CSS bars instead), PDF report (CSV only), several elections at once, admin UI in Thai, automated backups (use your database provider's: Neon point-in-time restore or `pg_dump`).
