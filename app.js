(() => {
  "use strict";

  const TMDB = "https://api.themoviedb.org/3";
  const IMG = "https://image.tmdb.org/t/p/w300";
  const LS_KEY = "seance.apiKey";
  const LS_STUDIOS = "seance.studios";
  const LS_CACHE = "seance.cache";

  const PRESET_STUDIOS = [
    { id: 2, name: "Walt Disney Pictures" },
    { id: 420, name: "Marvel Studios" },
    { id: 1, name: "Lucasfilm" },
    { id: 3, name: "Pixar" },
    { id: 174, name: "Warner Bros. Pictures" },
    { id: 33, name: "Universal Pictures" },
    { id: 34, name: "Sony Pictures" },
    { id: 4, name: "Paramount Pictures" },
    { id: 25, name: "20th Century Studios" },
    { id: 521, name: "DreamWorks Animation" },
    { id: 923, name: "Legendary Pictures" },
    { id: 41077, name: "A24" },
    { id: 213, name: "Netflix" },
    { id: 20580, name: "Amazon MGM Studios" },
  ];

  const el = (id) => document.getElementById(id);
  const feedEl = el("feed");
  const loadingEl = el("loading");
  const onboardingEl = el("onboarding");
  const studioPanelEl = el("studioPanel");
  const feedEmptyEl = el("feedEmpty");
  const feedErrorEl = el("feedError");

  let state = {
    apiKey: localStorage.getItem(LS_KEY) || "",
    studios: JSON.parse(localStorage.getItem(LS_STUDIOS) || "[]"),
    tab: "new",
  };

  // ---------- Service worker ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    });
  }

  // ---------- Panel visibility ----------
  function showOnly(id) {
    [onboardingEl, studioPanelEl, feedEmptyEl, feedErrorEl, feedEl, loadingEl].forEach((p) => {
      p.hidden = p.id !== id;
    });
  }

  // ---------- Onboarding ----------
  el("settingsBtn").addEventListener("click", () => {
    el("apiKeyInput").value = state.apiKey;
    showOnly("onboarding");
  });

  el("saveKeyBtn").addEventListener("click", async () => {
    const key = el("apiKeyInput").value.trim();
    const errEl = el("onboardingError");
    errEl.hidden = true;
    if (!key) return;
    try {
      const res = await fetch(`${TMDB}/configuration?api_key=${key}`);
      if (!res.ok) throw new Error("bad key");
      state.apiKey = key;
      localStorage.setItem(LS_KEY, key);
      renderTab();
    } catch (e) {
      errEl.textContent = "Cl\u00e9 invalide, ou pas de connexion. V\u00e9rifie et r\u00e9essaie.";
      errEl.hidden = false;
    }
  });

  // ---------- Tabs ----------
  el("tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("is-active"));
    btn.classList.add("is-active");
    state.tab = btn.dataset.tab;
    renderTab();
  });

  el("retryBtn").addEventListener("click", renderTab);

  // ---------- Studio picker ----------
  function isSelected(id) {
    return state.studios.some((s) => s.id === id);
  }

  function toggleStudio(studio) {
    if (isSelected(studio.id)) {
      state.studios = state.studios.filter((s) => s.id !== studio.id);
    } else {
      state.studios.push(studio);
    }
    localStorage.setItem(LS_STUDIOS, JSON.stringify(state.studios));
    renderStudioChips();
  }

  function chipEl(studio) {
    const b = document.createElement("button");
    b.className = "chip" + (isSelected(studio.id) ? " is-selected" : "");
    b.textContent = studio.name;
    b.addEventListener("click", () => toggleStudio(studio));
    return b;
  }

  function renderStudioChips() {
    const presets = el("studioPresets");
    presets.innerHTML = "";
    PRESET_STUDIOS.forEach((s) => presets.appendChild(chipEl(s)));

    const selected = el("studioSelected");
    selected.innerHTML = "";
    state.studios.forEach((s) => selected.appendChild(chipEl(s)));
  }

  let searchTimer;
  el("studioSearch").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    const resultsEl = el("studioSearchResults");
    if (!q) { resultsEl.innerHTML = ""; return; }
    searchTimer = setTimeout(async () => {
      try {
        const res = await fetch(`${TMDB}/search/company?api_key=${state.apiKey}&query=${encodeURIComponent(q)}`);
        const data = await res.json();
        resultsEl.innerHTML = "";
        (data.results || []).slice(0, 8).forEach((s) => resultsEl.appendChild(chipEl({ id: s.id, name: s.name })));
      } catch (e) { /* silent */ }
    }, 350);
  });

  // ---------- Cache ----------
  function readCache(key) {
    try {
      const all = JSON.parse(localStorage.getItem(LS_CACHE) || "{}");
      const entry = all[key];
      if (!entry) return null;
      if (Date.now() - entry.ts > 1000 * 60 * 30) return null; // 30 min TTL
      return entry.data;
    } catch (e) { return null; }
  }

  function writeCache(key, data) {
    try {
      const all = JSON.parse(localStorage.getItem(LS_CACHE) || "{}");
      all[key] = { ts: Date.now(), data };
      localStorage.setItem(LS_CACHE, JSON.stringify(all));
    } catch (e) { /* storage full, ignore */ }
  }

  // ---------- TMDB fetch helpers ----------
  async function tmdbJson(path) {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${TMDB}${path}${sep}api_key=${state.apiKey}`);
    if (!res.ok) throw new Error("tmdb error " + res.status);
    return res.json();
  }

  function dateOf(item) {
    return item.release_date || item.first_air_date || "";
  }

  async function attachTrailer(item) {
    try {
      const data = await tmdbJson(`/${item.mediaType}/${item.id}/videos`);
      const vids = data.results || [];
      const trailer =
        vids.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ||
        vids.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
        vids.find((v) => v.site === "YouTube" && v.type === "Teaser");
      item.videoKey = trailer ? trailer.key : null;
    } catch (e) {
      item.videoKey = null;
    }
    return item;
  }

  function mapResult(r, mediaType, studioName) {
    return {
      id: r.id,
      mediaType,
      title: r.title || r.name,
      poster: r.poster_path,
      date: mediaType === "movie" ? r.release_date : r.first_air_date,
      studioName: studioName || null,
    };
  }

  function isoDaysFromNow(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  async function fetchNewFeed() {
    const cached = readCache("feed:new");
    if (cached) return cached;

    const gte = isoDaysFromNow(-365);
    const lte = isoDaysFromNow(60);

    const [movieP1, movieP2, tvP1, tvP2] = await Promise.all([
      tmdbJson(`/discover/movie?sort_by=primary_release_date.desc&primary_release_date.gte=${gte}&primary_release_date.lte=${lte}&vote_count.gte=1&page=1`),
      tmdbJson(`/discover/movie?sort_by=primary_release_date.desc&primary_release_date.gte=${gte}&primary_release_date.lte=${lte}&vote_count.gte=1&page=2`),
      tmdbJson(`/discover/tv?sort_by=first_air_date.desc&first_air_date.gte=${gte}&first_air_date.lte=${lte}&vote_count.gte=1&page=1`),
      tmdbJson(`/discover/tv?sort_by=first_air_date.desc&first_air_date.gte=${gte}&first_air_date.lte=${lte}&vote_count.gte=1&page=2`),
    ]);

    let items = [
      ...(movieP1.results || []).map((r) => mapResult(r, "movie")),
      ...(movieP2.results || []).map((r) => mapResult(r, "movie")),
      ...(tvP1.results || []).map((r) => mapResult(r, "tv")),
      ...(tvP2.results || []).map((r) => mapResult(r, "tv")),
    ];

    const seen = new Set();
    items = items.filter((it) => {
      const k = it.mediaType + it.id;
      if (seen.has(k) || !it.date) return false;
      seen.add(k);
      return true;
    });

    items.sort((a, b) => (a.date < b.date ? 1 : -1));
    items = items.slice(0, 36);

    await Promise.all(items.map(attachTrailer));
    items = items.filter((it) => it.videoKey);

    writeCache("feed:new", items);
    return items;
  }

  async function fetchStudioFeed() {
    const cacheKey = "feed:studios:" + state.studios.map((s) => s.id).sort().join(",");
    const cached = readCache(cacheKey);
    if (cached) return cached;

    const perStudio = await Promise.all(
      state.studios.map(async (studio) => {
        const [movies, tv] = await Promise.all([
          tmdbJson(`/discover/movie?with_companies=${studio.id}&sort_by=primary_release_date.desc`),
          tmdbJson(`/discover/tv?with_companies=${studio.id}&sort_by=first_air_date.desc`),
        ]);
        return [
          ...(movies.results || []).slice(0, 8).map((r) => mapResult(r, "movie", studio.name)),
          ...(tv.results || []).slice(0, 8).map((r) => mapResult(r, "tv", studio.name)),
        ];
      })
    );

    let items = perStudio.flat();
    const seen = new Set();
    items = items.filter((it) => {
      const k = it.mediaType + it.id;
      if (seen.has(k) || !it.date) return false;
      seen.add(k);
      return true;
    });
    items.sort((a, b) => (a.date < b.date ? 1 : -1));
    items = items.slice(0, 24);

    await Promise.all(items.map(attachTrailer));
    items = items.filter((it) => it.videoKey);

    writeCache(cacheKey, items);
    return items;
  }

  // ---------- Rendering ----------
  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  }

  function isRecent(iso) {
    const d = new Date(iso + "T00:00:00");
    const days = (d - Date.now()) / (1000 * 60 * 60 * 24);
    return days > -21 && days < 60;
  }

  function renderCard(item) {
    const card = document.createElement("article");
    card.className = "ticket";

    const img = document.createElement("img");
    img.className = "ticket__poster";
    img.loading = "lazy";
    img.alt = item.title;
    img.src = item.poster ? IMG + item.poster : "";

    const body = document.createElement("div");
    body.className = "ticket__body";
    body.innerHTML = `
      <span class="ticket__notch ticket__notch--top"></span>
      <span class="ticket__notch ticket__notch--bottom"></span>
      <span class="ticket__kind">${item.mediaType === "movie" ? "Film" : "S\u00e9rie"}</span>
      <h3 class="ticket__title">${item.title}</h3>
      <span class="ticket__meta">${formatDate(item.date)}</span>
      ${item.studioName ? `<span class="ticket__studio">${item.studioName}</span>` : ""}
    `;

    if (item.videoKey) {
      const playBtn = document.createElement("button");
      playBtn.className = "ticket__play";
      playBtn.textContent = "Bande-annonce";
      playBtn.addEventListener("click", () => openPlayer(item.videoKey));
      body.appendChild(playBtn);
    } else {
      const none = document.createElement("span");
      none.className = "ticket__novideo";
      none.textContent = "Pas encore de bande-annonce";
      body.appendChild(none);
    }

    if (isRecent(item.date)) {
      const tag = document.createElement("span");
      tag.className = "new-tag";
      tag.textContent = "Nouveau";
      card.appendChild(tag);
    }

    card.appendChild(img);
    card.appendChild(body);
    return card;
  }

  function renderFeed(items) {
    feedEl.innerHTML = "";
    items.forEach((it) => feedEl.appendChild(renderCard(it)));
    showOnly("feed");
  }

  // ---------- Player ----------
  const overlay = el("playerOverlay");
  const frame = el("playerFrame");
  function openPlayer(key) {
    frame.src = `https://www.youtube.com/embed/${key}?autoplay=1&playsinline=1`;
    overlay.hidden = false;
  }
  function closePlayer() {
    frame.src = "";
    overlay.hidden = true;
  }
  el("playerClose").addEventListener("click", closePlayer);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closePlayer(); });

  // ---------- Main render dispatch ----------
  async function renderTab() {
    if (!state.apiKey) { showOnly("onboarding"); return; }

    if (state.tab === "studios") {
      renderStudioChips();
      showOnly("studioPanel");
      return;
    }

    showOnly("loading");
    try {
      const items = await fetchNewFeed();
      if (!items.length) {
        el("feedEmptyTitle").textContent = "Rien de neuf pour l'instant";
        el("feedEmptyText").textContent = "Reviens un peu plus tard, la s\u00e9ance se pr\u00e9pare.";
        showOnly("feedEmpty");
        return;
      }
      renderFeed(items);
    } catch (e) {
      el("feedErrorText").textContent = "Impossible de contacter TMDB. V\u00e9rifie ta connexion ou ta cl\u00e9 API.";
      showOnly("feedError");
    }
  }

  // Studio tab needs its own "show results" action rather than auto-fetching feed;
  // add a button to view the filtered feed once studios are chosen.
  const viewFeedBtn = document.createElement("button");
  viewFeedBtn.className = "btn btn--gold";
  viewFeedBtn.textContent = "Voir les bandes-annonces";
  viewFeedBtn.style.marginTop = "20px";
  viewFeedBtn.addEventListener("click", async () => {
    if (!state.studios.length) return;
    showOnly("loading");
    try {
      const items = await fetchStudioFeed();
      if (!items.length) {
        el("feedEmptyTitle").textContent = "Rien de neuf pour ces studios";
        el("feedEmptyText").textContent = "Essaie d'en ajouter d'autres, ou reviens plus tard.";
        showOnly("feedEmpty");
        return;
      }
      renderFeed(items);
    } catch (e) {
      el("feedErrorText").textContent = "Impossible de contacter TMDB. V\u00e9rifie ta connexion ou ta cl\u00e9 API.";
      showOnly("feedError");
    }
  });
  studioPanelEl.appendChild(viewFeedBtn);

  // ---------- Init ----------
  renderStudioChips();
  renderTab();
})();
