# ATSA Board Election (polling-station version)

Secret-ballot election for the AIU Thai Student Association. Next.js 15 + TypeScript + PostgreSQL.
Voters use **one computer at the polling station**; staff check names on the voter list. Admin and voter areas are separate.
Thai guide: **[README.th.md](README.th.md)**

## How it works
- **Polling-station computers (several at once):** in the admin page (**Polling station computers**) the committee creates one-time links, one per voting computer (for example 5). Opening a link on a computer and pressing one button turns that computer into a voting computer, with **no admin login on it**. Each link works once and only a hash is stored. **Deactivate all computers** stops every one of them at once. Anyone else who opens the site sees "voting takes place at the polling station". (Alternative: sign in as admin on a computer and press *Open ballot on this computer*.)
- Candidates are shown in two sections (President, Board) and numbered 1, 2, 3… in the order the committee entered them, separately for each group. The ballot has a **Details** button next to every candidate.
- Ballot: choose **1 President** (from candidates marked "Runs for President") then **N board members** (default 3, from candidates marked "Competes for the board"; the chosen President cannot also be picked). After Submit, the screen resets for the next voter; an unfinished ballot clears after 90 seconds without touches.
- **Online voting for a few approved members:** the committee creates one-time codes in the admin page (**Online voting**), sends each code privately to one approved member, and keeps its own note of who got which code. The member opens the site, enters the code and fills in the same ballot. Only a hash of each code is stored; the system never records names, and a code is marked used inside the same database transaction as the ballot, with no link kept between them. Online and polling-station ballots share the same ballot limit.
- The ballot is stored with **no name, email, time or device id**. Admins set a **ballot limit**; the server refuses more ballots than that (exact even with simultaneous submits).
- Counting (`src/lib/outcome.ts`): President = most votes. If exactly two ran for President, the other becomes **Assistant Secretary**. Board = the N candidates with most votes, not counting the President or Assistant Secretary. Ties are reported, never broken by software.
- **Admins** (Super Admin, Results Manager) see counts and percentages only after voting closes. The **public** sees only the President, the Assistant Secretary and the board members, never numbers, and only after results are verified and published (manually or automatically at the announcement time). A card with a **?** is always shown for the second Assistant Secretary, whom the committee decides later, and for any seat left open by a tie. The results page has **Present on big screen** (the names are revealed one by one with Space or a click, then confetti for the President) and **Save as picture** (a 1920×1080 PNG of the org chart).
- Roles: Super Admin (everything), Election Committee (settings, candidates, kiosk), Results Manager (verify/publish, results). Candidates and the schedule lock when voting opens. Every admin action goes to a hash-chained append-only audit log.

## Run locally
```
npm install
npm run keys            # copy SESSION_SECRET and SETUP_TOKEN into .env.local (see .env.example)
npm run migrate         # creates tables from schema.sql
npm run seed -- --demo --open     # 9 demo candidates (2 for President), voting open
npm run dev
```
Then `/admin/setup` (first admin) → `/admin` → Open ballot on this computer → `/vote`.

## Upgrading a database made with the previous (email) version
Run `migrate-v2.sql`, `migrate-v3.sql` (online codes) and `migrate-v4.sql` (kiosk links) in that order in the Neon SQL Editor; all are safe to run twice. Tested: old schema + v2 + v3 + v4 passes the full end-to-end test (55 checks). If v3 or v4 is forgotten the admin page still works and tells you to run it.

## Clearing test votes before the real election
`reset-test-data.sql` empties the test ballots, codes and links and un-publishes results. Never run it after real votes. The audit log keeps its history on purpose.

## Tests
`npm test` (counting rules) and, with the server running (`npm run build && npm start -- -p 3100`), `npm run e2e` (kiosk access, ballot rules, limit, hidden results, no identity columns, admin-only numbers, audit chain).

## Limits to know about
- The software cannot know who stands at the computer. **Staff must check each voter against the list.** Reconcile at the end: ballots cast must not exceed names ticked.
- Online voters vote unsupervised: nobody can check who is beside them, and a code can be handed to someone else. Create exactly as many codes as approved members. Someone with full database access could in theory match the order of rows to the order codes were used.
- Ballots are anonymous by construction, but the committee must keep the voter list and the ballot box separate in practice.
- Not independently security-reviewed. Rehearse on a separate database first.
- The second Assistant Secretary is shown as "?" and decided by the committee outside the system. Not included: PDF export (CSV only), several elections at once, Thai admin screens, automated backups (use Neon restore or `pg_dump`).
