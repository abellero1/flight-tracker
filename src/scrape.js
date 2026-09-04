const { chromium } = require("playwright");
const config = require("./config");

/**
 * IMPORTANT — read this before trusting this file.
 *
 * This scrapes Google Flights (not the airlines' own sites) because it
 * surfaces all three target airlines from a single page load per date
 * combo. It works by parsing the `aria-label` text Google attaches to each
 * result row for accessibility — those labels are far more stable than the
 * hashed CSS class names Google Flights uses, but they are NOT a contract.
 * Google can and does change wording/layout without notice.
 *
 * This has NOT been run against the live site (this dev environment can't
 * reach google.com). Before you trust any output:
 *   1. Run `node src/scrape.js --debug` locally.
 *   2. It will dump raw aria-label strings to debug-labels.json.
 *   3. Check the price/airline regexes below still match what you see.
 *
 * If Google blocks the request (CAPTCHA / "unusual traffic"), you'll get
 * zero results back, not an error — check debug output when a run
 * suddenly returns nothing.
 */

const PRICE_RE = /(?:^|\s)([\d,]{2,})\s*(?:Singapore dollars|SGD|US dollars|dollars)/i;
// Google's summary sentence reads "... round trip total. Nonstop flight
// with X." for direct itineraries, vs "... 1 stop flight with X." (or
// "2 stops") for connections.
const NONSTOP_RE = /\bNonstop flight\b/i;

function buildUrl(departureDate, returnDate) {
  const q = `Flights from ${config.origin} to ${config.destination} on ${departureDate} through ${returnDate}`;
  return `https://www.google.com/travel/flights?hl=en&curr=${config.currency}&q=${encodeURIComponent(q)}`;
}

function matchAirline(labelText) {
  for (const [code, name] of Object.entries(config.airlines)) {
    if (labelText.includes(name)) return { code, name };
  }
  return null;
}

function parsePrice(labelText) {
  const m = labelText.match(PRICE_RE);
  if (!m) return null;
  return Number(m[1].replace(/,/g, ""));
}

function isNonstop(labelText) {
  return NONSTOP_RE.test(labelText);
}

async function scrapeOneCombo(browser, departureDate, returnDate, debugSink) {
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });

  const url = buildUrl(departureDate, returnDate);
  const results = [];

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    // Google Flights renders results async; give it room, then wait for
    // at least one result row to show up. Results live in a `ul[role="list"]`
    // whose `li` children each hold a `div[role="link"]` carrying the full
    // price/airline summary as its aria-label (there is no `role="listitem"`
    // on this page — that was verified wrong against the live site).
    await page.waitForSelector('ul[role="list"] li [role="link"][aria-label]', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const rawLabels = await page.$$eval('ul[role="list"] li [role="link"][aria-label]', (nodes) =>
      nodes.map((n) => n.getAttribute("aria-label")).filter(Boolean)
    );
    // The page renders multiple `ul[role="list"]` copies of the same result
    // set (likely for responsive layouts), producing exact-duplicate
    // aria-labels — collapse them here so every consumer sees each flight once.
    const labels = [...new Set(rawLabels)];

    if (debugSink) debugSink.push({ departureDate, returnDate, url, labels });

    for (const label of labels) {
      const airline = matchAirline(label);
      const price = parsePrice(label);
      if (config.nonstopOnly && !isNonstop(label)) continue;
      if (airline && price) {
        results.push({
          airlineCode: airline.code,
          airline: airline.name,
          price,
          currency: config.currency,
          departureDate,
          returnDate,
          rawLabel: label,
        });
      }
    }
  } finally {
    await page.close();
  }

  return results;
}

async function scrapeAll({ debug = false } = {}) {
  const browser = await chromium.launch({ headless: true });
  const debugSink = debug ? [] : null;
  const allResults = [];

  try {
    for (const departureDate of config.departureDates) {
      for (const returnDate of config.returnDates) {
        const combo = await scrapeOneCombo(browser, departureDate, returnDate, debugSink);
        allResults.push(...combo);
        // Be polite / reduce block risk: small delay between requests.
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  } finally {
    await browser.close();
  }

  if (debug) {
    require("fs").writeFileSync(
      "debug-labels.json",
      JSON.stringify(debugSink, null, 2)
    );
    console.log(`Wrote debug-labels.json (${debugSink.length} page(s) captured)`);
  }

  return allResults;
}

// Reduce raw results down to the cheapest fare per airline across all
// date combos, keeping the winning date pair.
function cheapestPerAirline(results) {
  const best = {};
  for (const r of results) {
    if (!best[r.airlineCode] || r.price < best[r.airlineCode].price) {
      best[r.airlineCode] = r;
    }
  }
  return best;
}

module.exports = { scrapeAll, cheapestPerAirline, buildUrl, matchAirline, parsePrice, isNonstop };

if (require.main === module) {
  const debug = process.argv.includes("--debug");
  scrapeAll({ debug }).then((results) => {
    console.log(`Scraped ${results.length} matching offers.`);
    console.log(JSON.stringify(cheapestPerAirline(results), null, 2));
  });
}
