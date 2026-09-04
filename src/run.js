const config = require("./config");
const { scrapeAll, cheapestPerAirline } = require("./scrape");
const { loadState, saveState, loadLog, saveLog, applyResults } = require("./state");
const { sendPriceAlert } = require("./notify");

async function main() {
  const state = loadState();
  const log = loadLog();

  let results = [];
  let runStatus = "ok";
  let runError = null;

  try {
    results = await scrapeAll({ debug: false });
  } catch (err) {
    runStatus = "error";
    runError = String(err && err.message ? err.message : err);
  }

  const cheapest = cheapestPerAirline(results);
  const { newLows, nextState } = applyResults(state, cheapest);

  if (runStatus === "error") {
    nextState.lastRunStatus = "error";
    nextState.lastError = runError;
  }

  log.push({
    at: new Date().toISOString(),
    status: runStatus,
    offersFound: results.length,
    cheapestPerAirline: cheapest,
    newLows,
    error: runError,
  });

  saveState(nextState);
  saveLog(log);

  if (config.notifyOnlyOnNewLow && newLows.length) {
    const eligible = config.maxPriceAlert
      ? newLows.filter((o) => o.price <= config.maxPriceAlert)
      : newLows;
    if (eligible.length) {
      await sendPriceAlert(eligible, config);
      console.log(`Sent email for ${eligible.length} new low(s).`);
    }
  } else {
    console.log("No new low found this run — no email sent.");
  }

  if (runStatus === "error") {
    console.error("Run finished with an error:", runError);
    process.exitCode = 1;
  }
}

main();
