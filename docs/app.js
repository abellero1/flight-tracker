async function fetchJson(path) {
  try {
    const res = await fetch(`${path}?_=${Date.now()}`); // cache-bust
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function renderFares(state) {
  const el = document.getElementById("fares");
  const entries = Object.values(state?.lowestByAirline || {});
  if (!entries.length) return; // leave the empty-state markup in place

  el.innerHTML = entries
    .sort((a, b) => a.price - b.price)
    .map(
      (o) => `
      <div class="fare-row">
        <div class="fare-row__airline">${o.airline}<span class="fare-row__code">${o.airlineCode}</span></div>
        <div class="fare-row__price">${o.currency} ${o.price.toLocaleString()}</div>
        <div class="fare-row__dates">Depart ${o.departureDate} · Return ${o.returnDate}</div>
      </div>`
    )
    .join("");
}

function renderLog(log) {
  const el = document.getElementById("log");
  if (!log || !log.length) return;

  el.innerHTML = log
    .slice()
    .reverse()
    .slice(0, 30)
    .map((entry) => {
      const statusClass = entry.status === "ok" ? "status-ok" : "status-error";
      const lows = entry.newLows?.length
        ? ` — new low: ${entry.newLows.map((l) => l.airlineCode).join(", ")}`
        : "";
      return `<li><span class="${statusClass}">[${entry.status}]</span> ${fmtDate(entry.at)} — ${entry.offersFound} offers found${lows}</li>`;
    })
    .join("");
}

async function main() {
  const [state, log] = await Promise.all([
    fetchJson("data/state.json"),
    fetchJson("data/log.json"),
  ]);

  document.getElementById("last-checked").textContent = fmtDate(state?.lastCheckedAt);
  renderFares(state);
  renderLog(log);
}

main();
