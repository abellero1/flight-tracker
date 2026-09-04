// Central config. Edit dates/airlines here — nothing else should need touching.

module.exports = {
  origin: "SIN",
  destination: "CEB",

  // Departure date candidates (outbound leg)
  departureDates: ["2026-12-11", "2026-12-12"],

  // Return date candidates (inbound leg) — every combo with the above
  // departure dates is checked, so 2 x 4 = 8 searches per run.
  returnDates: ["2027-01-03", "2027-01-04", "2027-01-05", "2027-01-06"],

  // Airlines to track, keyed by IATA code (used to filter scraped results).
  airlines: {
    SQ: "Singapore Airlines",
    "5J": "Cebu Pacific",
    PR: "Philippine Airlines",
  },

  currency: "SGD",

  // Only email when a NEW lowest price is found for a given airline
  // (i.e. price today < lowest price ever recorded for that airline
  // across all date combos), not on every check.
  notifyOnlyOnNewLow: true,

  // Optional hard ceiling — if set, only ever notify below this price
  // regardless of whether it's a "new low". Set to null to disable.
  maxPriceAlert: null,
};
