# SIN ⇄ CEB flight price tracker

Checks Google Flights on a schedule for round-trip fares between Singapore
(SIN) and Cebu (CEB), across a matrix of departure/return dates, filtered
to Singapore Airlines (SQ), Cebu Pacific (5J), and Philippine Airlines (PR).
Emails you only when an airline hits a **new all-time-low** price — not on
every check.

## Before you rely on this — read this first

1. **The scraper has been verified against the live site** (result rows
   live under `ul[role="list"] li [role="link"][aria-label]` — Google
   duplicates that list across several hidden layout copies, so the
   scraper de-dupes by label). Google can still change this without
   notice. Run `npm run scrape:debug` locally to re-check — it writes
   `debug-labels.json` with the raw text it's parsing. If prices/airlines
   come back empty or wrong, that file is where you start debugging.
2. **Scraping Google Flights isn't officially sanctioned** — it's against
   their terms of service, same as most scraping. This is a personal,
   low-volume, non-commercial use case, but you're taking on that risk
   knowingly, not because it's risk-free.
3. **Google may block or CAPTCHA the requests**, especially from
   datacenter IPs like GitHub Actions runners (vs. your home connection).
   If runs start returning 0 offers, check `debug-labels.json` locally —
   silence usually means blocked, not "no flights."
4. **10-minute checks were the original ask; this runs every 30 minutes
   instead.** At 8 date-combos per check, 10 minutes would mean ~1,150
   requests/day against a site actively trying to detect bots — that's
   not sustainable. 30 minutes (48 checks/day, ~380 requests/day) is a
   more defensible starting point. Tune the cron in
   `.github/workflows/tracker.yml` if you want to push it.

## Setup

1. **Create the repo as public** (private repos only get 2,000 free
   Actions minutes/month; a public repo gets unlimited minutes, which you
   need at this check frequency).
2. Push this code to it.
3. In repo **Settings → Secrets and variables → Actions**, add:
   - `GMAIL_USER` — your Gmail address
   - `GMAIL_APP_PASSWORD` — a Google [App Password](https://myaccount.google.com/apppasswords)
     (requires 2-Step Verification on the account; your normal Gmail
     password will not work over SMTP)
   - `NOTIFY_TO` — where alerts should be sent (can be the same as
     `GMAIL_USER`)
4. In repo **Settings → Pages**, set source to "Deploy from a branch" →
   `main` → `/docs`. This serves `docs/index.html` as your status
   dashboard at `https://<you>.github.io/<repo>/`, and the full offer
   list at `https://<you>.github.io/<repo>/offers.html`. (Pages on a
   private repo needs GitHub Pro/Team/Enterprise — Free-plan private
   repos can't publish a Pages site.)
5. Edit `src/config.js` if you need to change dates, add airlines, or
   adjust the currency.
6. Trigger a manual run from the **Actions** tab (`workflow_dispatch`) to
   confirm it works before waiting for the schedule.

## Local development

```bash
npm install
npx playwright install --with-deps chromium
npm run scrape:debug   # dumps raw parsed labels to debug-labels.json
npm run check           # full run: scrape, update state/log, maybe email
npm run offers          # scrape every offer (not just cheapest-per-airline)
                         # to docs/data/offers.json, for docs/offers.html
```

## How it works

- `src/scrape.js` — Playwright hits Google Flights for each
  departure×return date combo, parses result rows' `aria-label` text for
  price + airline.
- `src/state.js` — tracks the lowest price ever seen per airline in
  `docs/data/state.json`, and a capped rolling history in
  `docs/data/log.json`.
- `src/notify.js` — sends an email via Gmail SMTP (nodemailer) when a new
  low is found.
- `src/run.js` — orchestrates the above; this is what the GitHub Actions
  workflow runs on schedule.
- `docs/` — a static dashboard reading those same JSON files, served via
  GitHub Pages.

## If Google scraping turns out to be too unreliable

Worth knowing as a fallback: [SerpApi's Google Flights
API](https://serpapi.com/google-flights-api) wraps this same data source
with a maintained scraper (free tier ~250 searches/month, paid from
~$50/mo for 5,000). Swapping `src/scrape.js` for an API call would be a
small, contained change — everything else (state, email, dashboard)
stays the same.
