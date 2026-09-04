const fs = require("fs");
const path = require("path");
const config = require("./config");
const { scrapeAll, buildUrl } = require("./scrape");

// Standalone report: unlike run.js (which only tracks the cheapest fare per
// airline for alerting), this dumps every matching offer found across all
// date combos, so you can browse the full list and click through to the
// actual Google Flights search that produced each one.
const OFFERS_PATH = path.join(__dirname, "..", "docs", "data", "offers.json");

async function main() {
  const results = await scrapeAll({ debug: false });

  const offers = results
    .map((r) => ({ ...r, link: buildUrl(r.departureDate, r.returnDate) }))
    .sort((a, b) => a.price - b.price);

  fs.mkdirSync(path.dirname(OFFERS_PATH), { recursive: true });
  fs.writeFileSync(
    OFFERS_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), offers }, null, 2)
  );

  console.log(`Wrote ${offers.length} offer(s) to ${OFFERS_PATH}`);
}

main();
