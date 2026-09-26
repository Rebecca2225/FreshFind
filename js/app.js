/* =========================================================
   FreshFind — client-side app
   Static, no-backend SPA. All data loaded from /data/*.json.
   ========================================================= */

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FRUIT_PRODUCE_IDS = [
  "plantain",
  "banana",
  "pineapple",
  "mango",
  "pawpaw",
  "grapes",
  "watermelon",
  "apple",
  "pear",
  "avocado",
  "citrus",
];

const MARKET_REGIONS = {
  south: new Set([
    "Abia State",
    "Akwa Ibom State",
    "Anambra State",
    "Bayelsa State",
    "Cross River State",
    "Delta State",
    "Edo State",
    "Ekiti State",
    "Enugu State",
    "Imo State",
    "Lagos State",
    "Ogun State",
    "Ondo State",
    "Osun State",
    "Oyo State",
    "Rivers State",
  ]),
  north: new Set([
    "Adamawa State",
    "Bauchi State",
    "Borno State",
    "Gombe State",
    "Jigawa State",
    "Kaduna State",
    "Kano State",
    "Katsina State",
    "Kebbi State",
    "Sokoto State",
    "Taraba State",
    "Yobe State",
    "Zamfara State",
  ]),
  central: new Set([
    "Benue State",
    "FCT",
    "Kogi State",
    "Kwara State",
    "Nasarawa State",
    "Niger State",
    "Plateau State",
  ]),
};

const REGIONAL_MARKET_PRODUCE = {
  south: {
    fresh: [
      ...FRUIT_PRODUCE_IDS,
      "tomatoes",
      "pepper",
      "onions",
      "okra",
      "ugu",
      "waterleaf",
      "yam",
      "cassava",
      "rice",
      "beans",
    ],
    staples: [
      "plantain",
      "mango",
      "watermelon",
      "yam",
      "cassava",
      "cocoyam",
      "garri",
      "tomatoes",
      "pepper",
      "onions",
      "ugu",
      "bitterleaf",
      "palm-oil",
      "fresh-fish",
      "dried-fish",
      "crayfish",
      "periwinkle",
      "beans",
      "rice",
      "egusi",
    ],
  },
  north: {
    fresh: [
      ...FRUIT_PRODUCE_IDS,
      "tomatoes",
      "pepper",
      "onions",
      "okra",
      "potatoes",
      "cabbage",
      "yam",
      "beans",
      "rice",
    ],
    staples: [
      "banana",
      "mango",
      "watermelon",
      "citrus",
      "yam",
      "cassava",
      "garri",
      "tomatoes",
      "pepper",
      "onions",
      "okra",
      "dried-fish",
      "fresh-fish",
      "beans",
      "rice",
      "maize",
      "egusi",
    ],
  },
  central: {
    fresh: [
      ...FRUIT_PRODUCE_IDS,
      "tomatoes",
      "pepper",
      "onions",
      "okra",
      "cabbage",
      "potatoes",
      "yam",
      "cassava",
      "beans",
      "rice",
    ],
    staples: [
      "plantain",
      "mango",
      "watermelon",
      "yam",
      "cassava",
      "garri",
      "tomatoes",
      "pepper",
      "onions",
      "okra",
      "dried-fish",
      "fresh-fish",
      "beans",
      "rice",
      "maize",
      "egusi",
    ],
  },
};

function marketProduceProfile(stateName, profile) {
  const region =
    Object.entries(MARKET_REGIONS).find(([, states]) =>
      states.has(stateName),
    )?.[0] || "central";
  return REGIONAL_MARKET_PRODUCE[region][profile];
}

function fillStateProduceCoverage(markets, produce) {
  const listings = markets.map((market) => ({
    ...market,
    produce: [...(market.produce || [])],
  }));
  const byState = new Map();

  listings
    .filter((market) => marketCountry(market) === "Nigeria")
    .forEach((market) => {
      const group = byState.get(market.state) || [];
      group.push(market);
      byState.set(market.state, group);
    });

  byState.forEach((stateMarkets) => {
    const represented = new Set(
      stateMarkets.flatMap((market) => market.produce),
    );
    const missing = produce.filter((item) => !represented.has(item.id));

    missing.forEach((item) => {
      const target = stateMarkets.reduce((shortest, market) =>
        market.produce.length < shortest.produce.length ? market : shortest,
      );
      target.produce.push(item.id);
    });
  });

  return listings;
}

const state = {
  markets: [],
  produce: [],
  chatbot: null,
  bookmarks: JSON.parse(localStorage.getItem("ff_bookmarks") || "[]"),
  notes: JSON.parse(sessionStorage.getItem("ff_notes") || "{}"),
  userLocation: null,
};

/* ---------------- Data loading ---------------- */
async function loadData() {
  const [markets, produce, chatbot, nigeriaMarkets, marketExpansion] =
    await Promise.all([
      fetch("data/markets.json").then((r) => r.json()),
      fetch("data/produce.json").then((r) => r.json()),
      fetch("data/chatbot.json").then((r) => r.json()),
      fetch("data/nigeria-markets.json").then((r) => r.json()),
      fetch("data/nigeria-market-expansion.json").then((r) => r.json()),
    ]);
  const listedNigeriaMarkets = nigeriaMarkets.map((market) => ({
    ...market,
    produce: marketProduceProfile(market.state, "fresh"),
  }));
  const additionalMarkets = marketExpansion.flatMap(
    ({ state: stateName, markets: entries }) =>
      entries.map((market, index) => ({
        ...market,
        state: stateName,
        address: `${market.name}, ${market.city}, ${stateName}, Nigeria`,
        hoursNote: "Trading days and hours vary by trader; confirm locally.",
        description: `${market.name} is a local food market. FreshFind listings are a guide; seasonal availability and trader stock vary.`,
        country: "Nigeria",
        produce: marketProduceProfile(
          stateName,
          index === 0 ? "fresh" : "staples",
        ),
      })),
  );
  state.markets = fillStateProduceCoverage(
    [...markets, ...listedNigeriaMarkets, ...additionalMarkets],
    produce,
  );
  state.produce = produce;
  state.chatbot = chatbot;
}

/* ---------------- Utilities ---------------- */
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function hasSchedule(market) {
  return (
    Array.isArray(market.days) &&
    market.days.length > 0 &&
    market.openTime &&
    market.closeTime
  );
}

function isOpenNow(market, now = new Date()) {
  if (!hasSchedule(market)) return false;
  const day = DAY_NAMES[now.getDay()];
  if (!market.days.includes(day)) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  return (
    mins >= toMinutes(market.openTime) && mins <= toMinutes(market.closeTime)
  );
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function produceById(id) {
  return state.produce.find((p) => p.id === id);
}
function marketById(id) {
  return state.markets.find((m) => m.id === id);
}

function marketCountry(market) {
  return market.country || "Nigeria";
}

function marketsForProduce(produceId) {
  return state.markets.filter((m) => m.produce.includes(produceId));
}
function produceForMarket(market) {
  return market.produce.map(produceById).filter(Boolean);
}

function formatTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (s) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[s],
  );
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ---------------- Bookmarks ---------------- */
function isBookmarked(type, id) {
  return state.bookmarks.some((b) => b.type === type && b.id === id);
}
function toggleBookmark(type, id, label) {
  const idx = state.bookmarks.findIndex((b) => b.type === type && b.id === id);
  if (idx > -1) {
    state.bookmarks.splice(idx, 1);
    showToast(`Removed "${label}" from bookmarks`);
  } else {
    state.bookmarks.push({ type, id, label });
    showToast(`Bookmarked "${label}"`);
  }
  localStorage.setItem("ff_bookmarks", JSON.stringify(state.bookmarks));
  updateBookmarkCount();
  renderBookmarksDrawer();
  // refresh any visible star buttons
  document.querySelectorAll(`[data-star="${type}:${id}"]`).forEach((btn) => {
    const on = isBookmarked(type, id);
    btn.setAttribute("aria-pressed", on);
    btn.textContent = on ? "★" : "☆";
  });
}
function updateBookmarkCount() {
  document.getElementById("bookmarkCount").textContent = state.bookmarks.length;
}
function starButton(type, id, label) {
  const on = isBookmarked(type, id);
  return `<button class="star-btn" data-star="${type}:${id}" aria-pressed="${on}"
    aria-label="Bookmark ${escapeHtml(label)}" onclick="handleStarClick(this,'${type}','${id}','${escapeHtml(label).replace(/'/g, "&#39;")}')">${on ? "★" : "☆"}</button>`;
}
function handleStarClick(btn, type, id, label) {
  toggleBookmark(type, id, label);
}

function renderBookmarksDrawer() {
  const list = document.getElementById("bookmarksList");
  if (state.bookmarks.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="big">⭐</div><p>No bookmarks yet. Tap the ☆ on any market or produce item to save it here.</p></div>`;
    return;
  }
  list.innerHTML = state.bookmarks
    .map((b) => {
      const note = state.notes[b.type + ":" + b.id] || "";
      const hash =
        b.type === "market" ? `#/market/${b.id}` : `#/produce/${b.id}`;
      return `<div class="bookmark-item">
      <h4><a href="${hash}">${escapeHtml(b.label)}</a></h4>
      <span class="muted" style="font-size:0.78rem;">${b.type === "market" ? "Market" : "Produce item"}</span>
      <textarea rows="2" placeholder="Personal note (this session only)…"
        onchange="saveNote('${b.type}','${b.id}',this.value)">${escapeHtml(note)}</textarea>
      <div class="row">
        <button class="btn-small" onclick="shareBookmark('${escapeHtml(b.label).replace(/'/g, "&#39;")}','${hash}')">Share</button>
        <button class="btn-small" onclick="handleStarClick(null,'${b.type}','${b.id}','${escapeHtml(b.label).replace(/'/g, "&#39;")}')">Remove</button>
      </div>
    </div>`;
    })
    .join("");
}
function saveNote(type, id, value) {
  state.notes[type + ":" + id] = value;
  sessionStorage.setItem("ff_notes", JSON.stringify(state.notes));
}
function shareBookmark(label, hash) {
  const url = location.origin + location.pathname + hash;
  const text = encodeURIComponent(`Check out "${label}" on FreshFind: `);
  window.open(
    `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`,
    "_blank",
    "noopener",
  );
}
function exportBookmarks() {
  if (state.bookmarks.length === 0) {
    showToast("No bookmarks to export yet");
    return;
  }
  const lines = ["FreshFind — My Bookmarks", "".padEnd(28, "="), ""];
  state.bookmarks.forEach((b) => {
    lines.push(`• ${b.label} (${b.type === "market" ? "Market" : "Produce"})`);
    const note = state.notes[b.type + ":" + b.id];
    if (note) lines.push(`   Note: ${note}`);
  });
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "freshfind-bookmarks.txt";
  a.click();
  showToast("Bookmark list downloaded");
}

/* ---------------- Page renderers ---------------- */

function marketCardHtml(market, opts = {}) {
  const scheduled = hasSchedule(market);
  const open = isOpenNow(market);
  return `<article class="card">
    <div class="card-top">
      <span class="card-icon" aria-hidden="true">${market.icon}</span>
      ${starButton("market", market.id, market.name)}
    </div>
    <div class="card-body">
      <h3><a class="link-btn" href="#/market/${market.id}" style="color:var(--green-deep);">${escapeHtml(market.name)}</a></h3>
      <span class="muted">${escapeHtml(market.city)}, ${escapeHtml(market.state)}, ${escapeHtml(marketCountry(market))}</span>
      <div class="tag-row">
        ${scheduled ? `<span class="tag">${market.days.join(", ")}</span><span class="tag">${formatTime(market.openTime)}–${formatTime(market.closeTime)}</span>${open ? '<span class="tag open-now">Open now</span>' : ""}` : `<span class="tag">Hours vary by trader</span>`}
      </div>
      <p style="font-size:0.88rem;margin-top:4px;">${escapeHtml(market.description)}</p>
      ${opts.distance != null ? `<span class="muted">${opts.distance.toFixed(1)} km away</span>` : ""}
    </div>
    <div class="card-footer">
      <a class="link-btn" href="#/market/${market.id}">View details →</a>
    </div>
  </article>`;
}

function produceCardHtml(item) {
  const markets = marketsForProduce(item.id);
  return `<article class="card">
    <div class="card-top">
      <span class="card-icon" aria-hidden="true">${item.icon}</span>
      ${starButton("produce", item.id, item.name)}
    </div>
    <div class="card-body">
      <h3><a class="link-btn" href="#/produce/${item.id}" style="color:var(--green-deep);">${escapeHtml(item.name)}</a></h3>
      <span class="tag">${escapeHtml(item.category)}</span>
      <p style="font-size:0.88rem;">${escapeHtml(item.description)}</p>
      <span class="muted">Availability: ${escapeHtml(item.season)}</span>
      <span class="muted">${markets.length} ${markets.length === 1 ? "market carries" : "markets carry"} this</span>
    </div>
  </article>`;
}

function renderHome() {
  const countryCount = new Set(state.markets.map(marketCountry)).size;
  const regions = [...new Map(state.markets.map((m) => [m.state, m])).values()];
  const countries = [...new Set(state.markets.map(marketCountry))];
  const featured = state.markets.slice(0, 3);
  return `
  <section class="hero">
    <div>
      <h1>Find fresh markets across Africa.</h1>
      <p class="lead">Explore produce markets across all 36 Nigerian states and the FCT, plus selected cities in Ghana, Kenya, and South Africa. Listings are a guide; confirm current stock and trader hours locally.</p>
      <div class="tag-row">
        <span class="tag" style="background:rgba(255,255,255,0.15);color:#fff;">${state.markets.length} markets listed</span>
        <span class="tag" style="background:rgba(255,255,255,0.15);color:#fff;">${countryCount} countries</span>
      </div>
    </div>
    <div class="hero-chalk">
      <h3>Find a Market</h3>
      <form class="find-form" onsubmit="handleQuickFind(event)">
        <select id="qfCountry" aria-label="Filter by country">
          <option value="">Any country</option>
          ${countries.map((country) => `<option value="${escapeHtml(country)}">${escapeHtml(country)}</option>`).join("")}
        </select>
        <select id="qfState" aria-label="Filter by state or region">
          <option value="">Any state or region</option>
          ${regions.map((m) => `<option value="${escapeHtml(m.state)}">${escapeHtml(m.state)}, ${escapeHtml(marketCountry(m))}</option>`).join("")}
        </select>
        <select id="qfProduce" aria-label="Filter by produce">
          <option value="">Any produce</option>
          ${state.produce.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("")}
        </select>
        <button type="submit">Find a Market →</button>
      </form>
    </div>
  </section>

  <section class="section">
    <div class="section-head">
      <h2>This week's highlights</h2>
      <a class="link-btn" href="#/directory">See all markets →</a>
    </div>
    <div class="grid">${featured.map((m) => marketCardHtml(m)).join("")}</div>
  </section>

  <section class="section">
    <div class="section-head">
      <h2>Market staples</h2>
      <a class="link-btn" href="#/produce">See full produce guide →</a>
    </div>
    <div class="grid">${state.produce
      .slice(0, 3)
      .map((p) => produceCardHtml(p))
      .join("")}</div>
  </section>`;
}

function handleQuickFind(e) {
  e.preventDefault();
  const country = document.getElementById("qfCountry").value;
  const stateName = document.getElementById("qfState").value;
  const produce = document.getElementById("qfProduce").value;
  const params = new URLSearchParams();
  if (country) params.set("country", country);
  if (
    stateName &&
    (!country ||
      state.markets.some(
        (m) => m.state === stateName && marketCountry(m) === country,
      ))
  ) {
    params.set("state", stateName);
  }
  if (produce) params.set("produce", produce);
  location.hash =
    "#/directory" + (params.toString() ? "?" + params.toString() : "");
}

function renderDirectory(query) {
  const params = new URLSearchParams(query || "");
  const country = params.get("country") || "";
  const stateName = params.get("state") || "";
  const produceFilter = params.get("produce") || "";
  const sort = params.get("sort") || "az";

  let list = state.markets.filter((m) => {
    if (country && marketCountry(m) !== country) return false;
    if (stateName && m.state !== stateName) return false;
    if (produceFilter && !m.produce.includes(produceFilter)) return false;
    return true;
  });

  let distances = {};
  if (sort === "proximity" && state.userLocation) {
    list.forEach(
      (m) =>
        (distances[m.id] = haversineKm(
          state.userLocation.lat,
          state.userLocation.lng,
          m.lat,
          m.lng,
        )),
    );
    list = [...list].sort((a, b) => distances[a.id] - distances[b.id]);
  } else {
    list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  }

  const countries = [...new Set(state.markets.map(marketCountry))];
  const regions = [
    ...new Map(
      state.markets
        .filter((m) => !country || marketCountry(m) === country)
        .map((m) => [m.state, m]),
    ).values(),
  ];

  return `
  <div class="section-head"><h1>Market Directory</h1></div>
  <div class="filters-bar">
    <div class="field"><label for="fCountry">Country</label>
      <select id="fCountry" onchange="updateDirectoryFilters()">
        <option value="">All countries</option>
        ${countries.map((name) => `<option value="${escapeHtml(name)}" ${name === country ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}
      </select>
    </div>
    <div class="field"><label for="fState">State / region</label>
      <select id="fState" onchange="updateDirectoryFilters()">
        <option value="">All states and regions</option>
        ${regions.map((m) => `<option value="${escapeHtml(m.state)}" ${m.state === stateName ? "selected" : ""}>${escapeHtml(m.state)}, ${escapeHtml(marketCountry(m))}</option>`).join("")}
      </select>
    </div>
    <div class="field"><label for="fProduce">Produce</label>
      <select id="fProduce" onchange="updateDirectoryFilters()">
        <option value="">Any produce</option>
        ${state.produce.map((p) => `<option value="${p.id}" ${p.id === produceFilter ? "selected" : ""}>${escapeHtml(p.name)}</option>`).join("")}
      </select>
    </div>
    <div class="field"><label for="fSort">Sort by</label>
      <select id="fSort" onchange="updateDirectoryFilters()">
        <option value="az" ${sort === "az" ? "selected" : ""}>Alphabetical</option>
        <option value="proximity" ${sort === "proximity" ? "selected" : ""}>Proximity to me</option>
      </select>
    </div>
    ${sort === "proximity" && !state.userLocation ? `<button class="btn-small" onclick="requestLocation()">Enable location</button>` : ""}
  </div>
  <p class="result-count">${list.length} market${list.length === 1 ? "" : "s"} found</p>
  ${
    list.length
      ? `<div class="grid">${list.map((m) => marketCardHtml(m, { distance: distances[m.id] })).join("")}</div>`
      : `<div class="empty-state"><div class="big">🧺</div><p>No markets match those filters. Try widening your search.</p></div>`
  }
  `;
}

function updateDirectoryFilters() {
  const country = document.getElementById("fCountry").value;
  const stateName = document.getElementById("fState").value;
  const produce = document.getElementById("fProduce").value;
  const sort = document.getElementById("fSort").value;
  const params = new URLSearchParams();
  if (country) params.set("country", country);
  if (
    stateName &&
    (!country ||
      state.markets.some(
        (m) => m.state === stateName && marketCountry(m) === country,
      ))
  ) {
    params.set("state", stateName);
  }
  if (produce) params.set("produce", produce);
  if (sort) params.set("sort", sort);
  location.hash =
    "#/directory" + (params.toString() ? "?" + params.toString() : "");
}

function requestLocation() {
  if (!navigator.geolocation) {
    showToast("Geolocation isn't available in this browser");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.userLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      showToast("Location enabled — sorting by proximity");
      router();
    },
    () => showToast("Location access was denied"),
  );
}

function renderMarketDetail(id) {
  const market = marketById(id);
  if (!market) return notFound("Market");
  const scheduled = hasSchedule(market);
  const items = produceForMarket(market);
  const mapQuery = encodeURIComponent(market.address);
  return `
  <div class="detail-header">
    <span class="detail-icon">${market.icon}</span>
    <div>
      <h1 style="margin-bottom:2px;">${escapeHtml(market.name)}</h1>
      <span class="muted">${escapeHtml(market.city)}, ${escapeHtml(market.state)}, ${escapeHtml(marketCountry(market))} · ${escapeHtml(market.address)}</span>
    </div>
    ${starButton("market", market.id, market.name)}
  </div>
  <div class="tag-row" style="margin:10px 0 0;">
    ${scheduled ? (isOpenNow(market) ? '<span class="tag open-now">Open right now</span>' : '<span class="tag">Closed right now</span>') : '<span class="tag">Hours unconfirmed</span>'}
  </div>
  <p style="margin-top:14px;max-width:70ch;">${escapeHtml(market.description)}</p>

  <div class="detail-grid">
    <div>
      <div class="info-block">
        <h3>Schedule</h3>
        ${
          scheduled
            ? `
        <table class="schedule-table">
          <thead><tr><th>Day</th><th>Hours</th></tr></thead>
          <tbody>
          ${DAY_NAMES.map((d, i) => {
            if (!market.days.includes(d)) return "";
            const isToday = new Date().getDay() === i;
            return `<tr class="${isToday ? "today" : ""}"><td>${d}${isToday ? " (today)" : ""}</td><td>${formatTime(market.openTime)}–${formatTime(market.closeTime)}</td></tr>`;
          }).join("")}
          </tbody>
        </table>`
            : `<p>${escapeHtml(market.hoursNote || "Trading days and hours vary by trader; confirm locally.")}</p>`
        }
      </div>
      <div class="info-block">
        <h3>Typically available</h3>
        <div class="produce-chip-grid">
          ${items.map((p) => `<a class="produce-chip" href="#/produce/${p.id}">${p.icon} ${escapeHtml(p.name)}</a>`).join("")}
        </div>
      </div>
    </div>
    <div>
      <div class="info-block">
        <h3>Location</h3>
        <div class="map-embed">
          <iframe title="Map for ${escapeHtml(market.name)}" loading="lazy"
            src="https://maps.google.com/maps?q=${mapQuery}&output=embed"></iframe>
        </div>
      </div>
    </div>
  </div>
  <a class="link-btn" href="#/directory">← Back to Market Directory</a>
  `;
}

function renderProduceGuide(query) {
  const params = new URLSearchParams(query || "");
  const category = params.get("category") || "";
  const categories = [...new Set(state.produce.map((p) => p.category))];
  const list = state.produce.filter(
    (p) => !category || p.category === category,
  );
  return `
  <div class="section-head"><h1>Produce Guide</h1></div>
  <div class="filters-bar">
    <div class="field"><label for="pCategory">Category</label>
      <select id="pCategory" onchange="location.hash='#/produce'+(this.value?'?category='+encodeURIComponent(this.value):'')">
        <option value="">All categories</option>
        ${categories.map((c) => `<option value="${escapeHtml(c)}" ${c === category ? "selected" : ""}>${escapeHtml(c)}</option>`).join("")}
      </select>
    </div>
  </div>
  <p class="result-count">${list.length} item${list.length === 1 ? "" : "s"}</p>
  <div class="grid">${list.map((p) => produceCardHtml(p)).join("")}</div>
  `;
}

function renderProduceDetail(id) {
  const item = produceById(id);
  if (!item) return notFound("Produce item");
  const markets = marketsForProduce(id);
  return `
  <div class="detail-header">
    <span class="detail-icon">${item.icon}</span>
    <div>
      <h1 style="margin-bottom:2px;">${escapeHtml(item.name)}</h1>
      <span class="muted">${escapeHtml(item.category)} · Availability: ${escapeHtml(item.season)}</span>
    </div>
    ${starButton("produce", item.id, item.name)}
  </div>
  <p style="margin-top:14px;max-width:70ch;">${escapeHtml(item.description)}</p>
  <div class="info-block" style="margin-top:20px;max-width:640px;">
    <h3>Where to find it</h3>
    <div class="grid">
      ${markets.length ? markets.map((m) => marketCardHtml(m)).join("") : "<p>No markets currently list this item.</p>"}
    </div>
  </div>
  <a class="link-btn" href="#/produce">← Back to Produce Guide</a>
  `;
}

function renderContact() {
  return `
  <div class="section-head"><h1>Contact Us</h1></div>
  <div class="info-block" style="max-width:720px;">
    <h3>Market information</h3>
    <p>FreshFind is a static guide to selected Nigerian markets and commonly traded goods. Listings are not live inventory or official market schedules.</p>
    <p>Trading days, hours, prices, and stock can change by trader and season. Please confirm details with the market or vendor before travelling.</p>
  </div>`;
}

function renderAbout() {
  return `
  <div class="section-head"><h1>About Us</h1></div>
  <p style="max-width:70ch;">FreshFind is a lightweight directory for discovering selected markets across Nigeria and the foods commonly traded there. It is a static guide, so vendor stock, prices, and opening details should be confirmed locally.</p>
  <div class="about-grid">
    <div class="team-card"><div class="avatar">🧑‍🌾</div><h4>Community Growers</h4><p class="muted">The farmers and vendors who bring fresh produce to every market on this site.</p></div>
    <div class="team-card"><div class="avatar">🗺️</div><h4>Neighborhood Volunteers</h4><p class="muted">Residents who keep market details accurate week to week.</p></div>
    <div class="team-card"><div class="avatar">💻</div><h4>Platform Team</h4><p class="muted">A small team maintaining FreshFind as a lightweight, static website.</p></div>
  </div>`;
}

function notFound(kind) {
  return `<div class="empty-state"><div class="big">🔎</div><h2>${kind} not found</h2><p>It may have been removed or the link is incorrect.</p><a class="link-btn" href="#/home">← Back to Home</a></div>`;
}

/* ---------------- Router ---------------- */
const ROUTES = [
  { pattern: /^\/home$/, render: () => renderHome(), breadcrumb: ["Home"] },
  {
    pattern: /^\/directory$/,
    render: (m, q) => renderDirectory(q),
    breadcrumb: ["Home", "Market Directory"],
    parents: ["#/home"],
  },
  {
    pattern: /^\/market\/([\w-]+)$/,
    render: (m) => renderMarketDetail(m[1]),
    breadcrumbFn: (m) => [
      "Home",
      "Market Directory",
      marketById(m[1])?.name || "Market",
    ],
    parents: ["#/home", "#/directory"],
  },
  {
    pattern: /^\/produce$/,
    render: (m, q) => renderProduceGuide(q),
    breadcrumb: ["Home", "Produce Guide"],
    parents: ["#/home"],
  },
  {
    pattern: /^\/produce\/([\w-]+)$/,
    render: (m) => renderProduceDetail(m[1]),
    breadcrumbFn: (m) => [
      "Home",
      "Produce Guide",
      produceById(m[1])?.name || "Produce",
    ],
    parents: ["#/home", "#/produce"],
  },
  {
    pattern: /^\/contact$/,
    render: () => renderContact(),
    breadcrumb: ["Home", "Contact Us"],
    parents: ["#/home"],
  },
  {
    pattern: /^\/about$/,
    render: () => renderAbout(),
    breadcrumb: ["Home", "About Us"],
    parents: ["#/home"],
  },
];

function parseHash() {
  const raw = location.hash.replace(/^#/, "") || "/home";
  const [path, query] = raw.split("?");
  return { path, query };
}

function router() {
  const { path, query } = parseHash();
  const container = document.getElementById("app-content");
  let matched = null,
    match = null;
  for (const r of ROUTES) {
    const m = path.match(r.pattern);
    if (m) {
      matched = r;
      match = m;
      break;
    }
  }
  if (matched) {
    container.innerHTML = matched.render(match, query);
    renderBreadcrumb(matched, match);
    document.title =
      "FreshFind — " +
      (matched.breadcrumbFn
        ? matched.breadcrumbFn(match).slice(-1)[0]
        : (matched.breadcrumb || ["FreshFind"]).slice(-1)[0]);
  } else {
    container.innerHTML = notFound("Page");
    document.getElementById("breadcrumb").innerHTML = "";
  }
  updateActiveNav(path);
  container.scrollIntoView({ behavior: "smooth", block: "start" });
  window.scrollTo({
    top: 0,
    behavior: "instant" in window ? "instant" : "auto",
  });
}

function renderBreadcrumb(route, match) {
  const labels = route.breadcrumbFn
    ? route.breadcrumbFn(match)
    : route.breadcrumb;
  const parents = route.parents || [];
  const crumbEl = document.getElementById("breadcrumb");
  crumbEl.innerHTML = labels
    .map((label, i) => {
      const isLast = i === labels.length - 1;
      if (isLast) return `<span class="current">${escapeHtml(label)}</span>`;
      const href = parents[i] || "#/home";
      return `<a href="${href}">${escapeHtml(label)}</a><span class="sep">/</span>`;
    })
    .join("");
}

function updateActiveNav(path) {
  document.querySelectorAll(".main-nav a").forEach((a) => {
    const href = a.getAttribute("href").replace(/^#\//, "/");
    a.classList.toggle(
      "active",
      (path.startsWith(href) && href !== "/home") || path === href,
    );
  });
}

window.addEventListener("hashchange", router);

/* ---------------- Chatbot ---------------- */
function chatAddMessage(role, html) {
  const box = document.getElementById("chatbotMessages");
  const div = document.createElement("div");
  div.className = "msg " + role;
  div.innerHTML = html;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function renderQuickReplies() {
  const wrap = document.getElementById("chatbotQuickReplies");
  wrap.innerHTML = state.chatbot.quickReplies
    .map(
      (q) =>
        `<button class="chip-btn" onclick='sendChatMessage(${JSON.stringify(q)})'>${escapeHtml(q)}</button>`,
    )
    .join("");
}

function normalizeChatText(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasChatPhrase(query, phrase) {
  const normalizedPhrase = normalizeChatText(phrase);
  return normalizedPhrase && ` ${query} `.includes(` ${normalizedPhrase} `);
}

function matchIntent(text) {
  const query = normalizeChatText(text);
  const matches = state.chatbot.intents.flatMap((intent) =>
    intent.keywords
      .filter((keyword) => hasChatPhrase(query, keyword))
      .map((keyword) => ({ intent, keyword })),
  );
  return matches.sort((a, b) => b.keyword.length - a.keyword.length)[0]?.intent;
}

function getChatbotResponse(text) {
  const query = normalizeChatText(text);
  const hoursIntent = state.chatbot.intents.find(
    (intent) =>
      intent.type === "hours" &&
      intent.keywords.some((keyword) => hasChatPhrase(query, keyword)),
  );
  if (hoursIntent)
    return { answer: hoursIntent.answer, link: hoursIntent.link };
  const liveDataIntent = state.chatbot.intents.find(
    (intent) =>
      intent.type === "live_data" &&
      intent.keywords.some((keyword) => hasChatPhrase(query, keyword)),
  );
  if (liveDataIntent)
    return { answer: liveDataIntent.answer, link: liveDataIntent.link };

  const market = [...state.markets]
    .sort((a, b) => b.name.length - a.name.length)
    .find(
      (item) =>
        hasChatPhrase(query, item.name) ||
        hasChatPhrase(query, item.id.replace(/-/g, " ")),
    );
  const stateNames = [...new Set(state.markets.map((item) => item.state))].sort(
    (a, b) => b.length - a.length,
  );
  const matchedState = stateNames.find((name) => {
    const shortName = name.replace(/\s+State$/i, "");
    return (
      hasChatPhrase(query, name) ||
      (shortName.length > 3 && hasChatPhrase(query, shortName))
    );
  });
  const matchedCity = [
    ...new Set(
      state.markets.flatMap((item) =>
        item.city.split(",").map((city) => city.trim()),
      ),
    ),
  ]
    .sort((a, b) => b.length - a.length)
    .find((city) => city.length > 2 && hasChatPhrase(query, city));
  const matchedCountry = [...new Set(state.markets.map(marketCountry))]
    .sort((a, b) => b.length - a.length)
    .find((country) => hasChatPhrase(query, country));

  const aliases = {
    apples: ["apple"],
    avocado: ["avocados"],
    banana: ["bananas"],
    beans: ["bean"],
    cabbage: ["cabbages"],
    citrus: ["orange", "oranges", "mandarin", "mandarins"],
    grapes: ["grape"],
    mango: ["mangoes", "mangos"],
    onions: ["onion"],
    "palm-oil": ["palm oil"],
    pawpaw: ["pawpaws", "papaya", "papayas"],
    pear: ["pears"],
    pepper: ["fresh pepper", "peppers"],
    pineapple: ["pineapples"],
    plantain: ["plantains"],
    potatoes: ["potato"],
    tomatoes: ["tomato"],
    ugu: ["ugu leaves", "fluted pumpkin", "fluted pumpkin leaves"],
    watermelon: ["watermelons"],
    waterleaf: ["waterleaf leaves"],
  };
  const matchedItems = state.produce.filter((item) =>
    [item.name, item.id.replace(/-/g, " "), ...(aliases[item.id] || [])].some(
      (phrase) => hasChatPhrase(query, phrase),
    ),
  );

  const categoryAliases = {
    Fruits: ["fruit", "fruits"],
    Vegetables: ["vegetable", "vegetables"],
    "Roots & Tubers": ["root", "roots", "tuber", "tubers"],
    "Grains & Pantry": ["grain", "grains", "pantry", "staples"],
    "Oils & Pantry": ["oils", "cooking oils"],
    "Fish & Seafood": ["fish", "seafood"],
  };
  const matchedCategories = Object.entries(categoryAliases)
    .filter(([, phrases]) =>
      phrases.some((phrase) => hasChatPhrase(query, phrase)),
    )
    .map(([category]) => category);
  const categoryItems = state.produce.filter((item) =>
    matchedCategories.includes(item.category),
  );
  const requestedItems = matchedCategories.length
    ? categoryItems
    : matchedItems;
  const requestedItemIds = requestedItems.map((item) => item.id);
  const locationLabel = matchedState || matchedCity || matchedCountry;
  const scopedMarkets = state.markets.filter((item) => {
    if (matchedState && item.state !== matchedState) return false;
    if (
      !matchedState &&
      matchedCity &&
      !item.city.split(",").some((city) => city.trim() === matchedCity)
    ) {
      return false;
    }
    if (matchedCountry && marketCountry(item) !== matchedCountry) return false;
    return true;
  });

  let matchingMarkets = scopedMarkets;
  if (requestedItemIds.length) {
    const useAnyItem =
      matchedCategories.length > 0 || hasChatPhrase(query, "or");
    matchingMarkets = scopedMarkets.filter((item) =>
      useAnyItem
        ? requestedItemIds.some((id) => item.produce.includes(id))
        : requestedItemIds.every((id) => item.produce.includes(id)),
    );
  }

  if (market) {
    const marketItems = produceForMarket(market);
    if (requestedItemIds.length) {
      const listedRequestedItems = marketItems.filter((item) =>
        requestedItemIds.includes(item.id),
      );
      const carriesRequestedItems = matchedCategories.length
        ? listedRequestedItems.length > 0
        : hasChatPhrase(query, "or")
          ? listedRequestedItems.length > 0
          : listedRequestedItems.length === requestedItemIds.length;
      const names = requestedItems.map((item) => item.name).join(", ");
      return {
        answer: carriesRequestedItems
          ? matchedCategories.length
            ? `${market.name} lists these ${matchedCategories.join(" and ").toLowerCase()}: ${listedRequestedItems.map((item) => item.name).join(", ")}. Availability is not live-verified.`
            : `${market.name} is listed as carrying ${names}. Listings are guides, not live stock; confirm with traders.`
          : `FreshFind does not list ${names} at ${market.name}. Its listed goods are: ${marketItems.map((item) => item.name).join(", ")}.`,
        link: { label: `View ${market.name}`, hash: `#/market/${market.id}` },
      };
    }

    return {
      answer: `${market.name} is listed in ${market.city}, ${market.state}, ${marketCountry(market)}. FreshFind lists these goods: ${marketItems.map((item) => item.name).join(", ")}. ${market.hoursNote || "Trading days and hours vary; confirm locally."}`,
      link: { label: `View ${market.name}`, hash: `#/market/${market.id}` },
    };
  }

  if (requestedItems.length || locationLabel) {
    const itemLabel = matchedCategories.length
      ? matchedCategories.join(" and ").toLowerCase()
      : requestedItems.map((item) => item.name).join(", ");
    const placeLabel = locationLabel ? ` in ${locationLabel}` : "";
    if (!matchingMarkets.length) {
      return {
        answer: `FreshFind does not currently list ${itemLabel || "markets"}${placeLabel}. Try another item or location. Listings are not live inventory.`,
        link: { label: "Browse the directory", hash: "#/directory" },
      };
    }

    const limit = 10;
    const locations = matchingMarkets
      .slice(0, limit)
      .map((item) => `${item.name} (${item.city}, ${item.state})`);
    const remaining = matchingMarkets.length - locations.length;
    const link =
      requestedItems.length && requestedItems.length === 1
        ? {
            label: `Browse ${requestedItems[0].name}`,
            hash: `#/produce/${requestedItems[0].id}`,
          }
        : locationLabel
          ? {
              label: `Browse ${locationLabel}`,
              hash: matchedState
                ? `#/directory?state=${encodeURIComponent(matchedState)}`
                : "#/directory",
            }
          : { label: "Browse produce", hash: "#/produce" };
    return {
      answer: `${itemLabel ? `${itemLabel}: ` : ""}FreshFind lists ${matchingMarkets.length} matching market${matchingMarkets.length === 1 ? "" : "s"}${placeLabel}: ${locations.join(", ")}${remaining ? `, and ${remaining} more` : ""}. Listings are not live stock; confirm availability with traders.`,
      link,
    };
  }

  const intent = matchIntent(query);
  if (intent) return { answer: intent.answer, link: intent.link };
  return { answer: state.chatbot.fallback, link: null };
}

function sendChatMessage(text) {
  if (!text || !text.trim()) return;
  chatAddMessage("user", escapeHtml(text));
  const response = getChatbotResponse(text);
  setTimeout(() => {
    let html = escapeHtml(response.answer);
    if (response.link)
      html += ` <br><a href="${response.link.hash}" onclick="document.getElementById('chatbotPanel').hidden=true; document.getElementById('chatbotLauncher').setAttribute('aria-expanded','false');">${escapeHtml(response.link.label)} →</a>`;
    chatAddMessage("bot", html);
  }, 350);
}

function initChatbot() {
  const launcher = document.getElementById("chatbotLauncher");
  const panel = document.getElementById("chatbotPanel");
  const closeBtn = document.getElementById("chatbotClose");
  const form = document.getElementById("chatbotForm");
  const input = document.getElementById("chatbotInput");

  launcher.addEventListener("click", () => {
    const isHidden = panel.hidden;
    panel.hidden = !isHidden;
    launcher.setAttribute("aria-expanded", String(isHidden));
    if (
      isHidden &&
      document.getElementById("chatbotMessages").children.length === 0
    ) {
      chatAddMessage("bot", escapeHtml(state.chatbot.greeting));
      renderQuickReplies();
    }
    if (isHidden) input.focus();
  });
  closeBtn.addEventListener("click", () => {
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = input.value;
    input.value = "";
    sendChatMessage(val);
  });
}

/* ---------------- Header widgets ---------------- */
function initClock() {
  const el = document.getElementById("liveClock");
  function tick() {
    const now = new Date();
    el.textContent = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  tick();
  setInterval(tick, 1000 * 15);
}

function initVisitorCounter() {
  let count = parseInt(localStorage.getItem("ff_visitor_count") || "0", 10);
  const sessionKey = "ff_session_counted";
  if (!sessionStorage.getItem(sessionKey)) {
    count += 1;
    localStorage.setItem("ff_visitor_count", String(count));
    sessionStorage.setItem(sessionKey, "1");
  }
  document.getElementById("visitorCounter").textContent =
    `👁 Visitor #${count.toLocaleString()} this browser`;
}

function initNavToggle() {
  const btn = document.getElementById("navToggle");
  const nav = document.getElementById("mainNav");
  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
  });
  nav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }),
  );
}

/* ---------------- Bookmarks drawer ---------------- */
function initDrawer() {
  const drawer = document.getElementById("bookmarksDrawer");
  const scrim = document.getElementById("scrim");
  const openBtn = document.getElementById("bookmarksBtn");
  const closeBtn = document.getElementById("bookmarksClose");

  function openDrawer() {
    drawer.hidden = false;
    scrim.hidden = false;
    renderBookmarksDrawer();
  }
  function closeDrawer() {
    drawer.hidden = true;
    scrim.hidden = true;
  }

  openBtn.addEventListener("click", openDrawer);
  closeBtn.addEventListener("click", closeDrawer);
  document
    .getElementById("exportBookmarksBtn")
    .addEventListener("click", exportBookmarks);

  scrim.addEventListener("click", () => {
    drawer.hidden = true;
    scrim.hidden = true;
  });
}

/* ---------------- Init ---------------- */
async function init() {
  document.getElementById("footerYear").textContent = new Date().getFullYear();
  try {
    await loadData();
  } catch (err) {
    document.getElementById("app-content").innerHTML = `
      <div class="empty-state"><div class="big">⚠️</div>
      <h2>Could not load market data</h2>
      <p>FreshFind loads its data from local JSON files using <code>fetch()</code>, which most browsers block on the <code>file://</code> protocol.</p>
      <p>Please serve this folder with a local server, e.g. <code>python3 -m http.server</code>, then open <code>http://localhost:8000</code>.</p>
      </div>`;
    console.error(err);
    return;
  }
  initClock();
  initVisitorCounter();
  initNavToggle();
  initChatbot();
  initDrawer();
  updateBookmarkCount();
  router();
}

document.addEventListener("DOMContentLoaded", init);
