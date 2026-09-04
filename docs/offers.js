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

function renderOffers(data) {
  const el = document.getElementById("offers");
  const countEl = document.getElementById("offers-count");
  const offers = data?.offers || [];
  if (!offers.length) return; // leave the empty-state markup in place

  countEl.textContent = `(${offers.length})`;

  el.innerHTML = offers
    .map(
      (o) => `
      <a class="fare-row fare-row--link" href="${o.link}" target="_blank" rel="noopener noreferrer">
        <div class="fare-row__airline">${o.airline}<span class="fare-row__code">${o.airlineCode}</span></div>
        <div class="fare-row__price">${o.currency} ${o.price.toLocaleString()}</div>
        <div class="fare-row__dates">Depart ${o.departureDate} · Return ${o.returnDate}</div>
      </a>`
    )
    .join("");
}

async function main() {
  const data = await fetchJson("data/offers.json");
  document.getElementById("generated-at").textContent = fmtDate(data?.generatedAt);
  renderOffers(data);
}

main();
