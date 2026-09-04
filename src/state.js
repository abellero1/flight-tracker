const fs = require("fs");
const path = require("path");

// Deliberately inside docs/ — GitHub Pages is configured to serve the
// /docs folder on main, so these JSON files are reachable at
// https://<user>.github.io/<repo>/data/state.json without a separate
// publish/deploy step. The dashboard (docs/index.html) fetches them
// directly.
const STATE_PATH = path.join(__dirname, "..", "docs", "data", "state.json");
const LOG_PATH = path.join(__dirname, "..", "docs", "data", "log.json");
const MAX_LOG_ENTRIES = 500; // keep the repo from growing unbounded

function loadState() {
  if (!fs.existsSync(STATE_PATH)) {
    return { lowestByAirline: {}, lastCheckedAt: null, lastRunStatus: null };
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

function loadLog() {
  if (!fs.existsSync(LOG_PATH)) return [];
  return JSON.parse(fs.readFileSync(LOG_PATH, "utf8"));
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function saveLog(log) {
  const trimmed = log.slice(-MAX_LOG_ENTRIES);
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, JSON.stringify(trimmed, null, 2));
}

/**
 * Compares this run's cheapest-per-airline results against the
 * all-time-lowest recorded so far. Returns which airlines hit a new low
 * (these are the ones worth emailing about) and the updated state.
 */
function applyResults(state, cheapestPerAirline) {
  const newLows = [];
  const nextLowest = { ...state.lowestByAirline };

  for (const [code, offer] of Object.entries(cheapestPerAirline)) {
    const prev = nextLowest[code];
    if (!prev || offer.price < prev.price) {
      nextLowest[code] = offer;
      // Don't fire a "new low" email the very first time we ever see an
      // airline — that's just baseline data collection, not a price drop.
      if (prev) newLows.push({ ...offer, previousPrice: prev.price });
    }
  }

  const nextState = {
    lowestByAirline: nextLowest,
    lastCheckedAt: new Date().toISOString(),
    lastRunStatus: "ok",
  };

  return { newLows, nextState };
}

module.exports = { loadState, saveState, loadLog, saveLog, applyResults, STATE_PATH, LOG_PATH };
