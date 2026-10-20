
"use strict";

/* ==========================================
   TRAVELING TAKOYAKI
   JAPAN 47 JOURNEY
   ========================================== */

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const pad = n => String(n).padStart(2, "0");

const REGIONS = [
  "HOKKAIDO",
  "TOHOKU",
  "KANTO",
  "CHUBU",
  "KANSAI",
  "CHUGOKU",
  "SHIKOKU",
  "KYUSHU & OKINAWA"
];

let PREFECTURES = [];
let SETTINGS = {};

const state = {
  ticket: 0,
  art: 0,
  rarity: 0,
  gallery: 0,
  stop: 0,
  playing: false,
  lang: "en"
};

let animationId = null;
let playTimer = null;
let truckDistance = 0;
let coordinates = [];
let cumulative = [];
let currentGallery = [];

/* ==========================================
   HELPERS
   ========================================== */

function make(tag, className = "", content) {
  const node = document.createElement(tag);

  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;

  return node;
}

function translate(en, ja) {
  return state.lang === "ja" ? ja : en;
}

function reducedMotion() {
  return window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
}

function validUrl(url) {
  if (typeof url !== "string") return false;

  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function setImage(selector, src) {
  const image = $(selector);

  if (image && validUrl(src)) {
    image.src = src;
  }
}

function formatDate(value) {
  if (!value) return null;
  return String(value);
}

function stopNumber(index) {
  return `STOP ${pad(index + 1)}`;
}

function statusText(status) {
  const values = {
    "SOLD OUT": ["SOLD OUT", "配布終了"],
    "AVAILABLE": ["AVAILABLE", "公開中"],
    "COMING SOON": ["COMING SOON", "近日公開"],
    "UPCOMING": ["UPCOMING", "公開予定"]
  };

  const pair = values[status];

  return pair
    ? translate(pair[0], pair[1])
    : status || "COMING SOON";
}

/* ==========================================
   LOAD JSON DATA
   ========================================== */

async function loadData() {
  const [prefecturesResponse, settingsResponse] =
    await Promise.all([
      fetch("./prefectures.json", { cache: "no-cache" }),
      fetch("./settings.json", { cache: "no-cache" })
    ]);

  if (!prefecturesResponse.ok) {
    throw new Error("Could not load prefectures.json");
  }

  if (!settingsResponse.ok) {
    throw new Error("Could not load settings.json");
  }

  const prefectures = await prefecturesResponse.json();
  const settings = await settingsResponse.json();

  if (!Array.isArray(prefectures) || prefectures.length !== 47) {
    throw new Error(
      "prefectures.json must contain exactly 47 prefectures."
    );
  }

  if (
    !prefectures.every(p =>
      p &&
      typeof p.name === "string" &&
      REGIONS.includes(p.region)
    )
  ) {
    throw new Error("Invalid prefecture data.");
  }

  if (!settings || typeof settings !== "object") {
    throw new Error("Invalid settings.json");
  }

  PREFECTURES = prefectures;
  SETTINGS = settings;
}

/* ==========================================
   LANGUAGE
   ========================================== */

function renderLanguage() {
  document.documentElement.lang = state.lang;

  $("#langSwitch").textContent =
    state.lang === "en" ? "日本語" : "ENGLISH";

  $$("[data-en][data-ja]").forEach(node => {
    node.textContent = node.dataset[state.lang];
  });

  $("#ticketSearch").placeholder = translate(
    "SEARCH PREFECTURE...",
    "都道府県を検索..."
  );

  renderStats();
  renderBook("ticket");
  renderBook("art");
  renderDetails();
  renderGallery();
  renderRarity();
  renderMapLabels();
}

function initLanguage() {
  $("#langSwitch").addEventListener("click", () => {
    state.lang = state.lang === "en" ? "ja" : "en";
    renderLanguage();
  });
}

/* ==========================================
   NAVIGATION
   ========================================== */

function showTab(name) {
  $$("[data-tab]").forEach(button => {
    const active = button.dataset.tab === name;

    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  $$(".page").forEach(page => {
    page.hidden = page.id !== name;
  });
}

function initNavigation() {
  $$("[data-tab]").forEach(button => {
    button.addEventListener("click", () => {
      showTab(button.dataset.tab);
    });
  });
}

/* ==========================================
   SITE SETTINGS / STATS
   ========================================== */

function renderStats() {
  const current = Math.max(
    1,
    Math.min(47, Number(SETTINGS.currentStop) || 1)
  );

  $("#currentStopStat").textContent =
    `${pad(current)} / 47`;

  const hokkaido = SETTINGS.hokkaido || {};

  const claimed = hokkaido.ticketClaimed;
  const supply = hokkaido.ticketSupply;

  $("#ticketStat").textContent =
    claimed != null && supply != null
      ? `${claimed} / ${supply}`
      : "— / —";

  $("#rarityStat").textContent =
    Array.isArray(SETTINGS.rarities)
      ? SETTINGS.rarities.length
      : 5;

  if (claimed != null && supply != null) {
    $("#featureTicketTitle").textContent =
      `${claimed} / ${supply} CLAIMED!`;
  }

  const artCount = Array.isArray(hokkaido.artGallery)
    ? hokkaido.artGallery.length
    : 0;

  if (artCount) {
    $("#featureArtTitle").textContent =
      `${Math.max(0, artCount - 1)} + 1 ARTWORKS`;
  }

  const images = SETTINGS.images || {};

  setImage("#heroImage", images.hero);
  setImage("#featureTicketImage", PREFECTURES[0].ticketImage);
  setImage("#featureArtImage", PREFECTURES[0].artImage);

  if (validUrl(SETTINGS.officialOpenSea)) {
    $("#officialLink").href = SETTINGS.officialOpenSea;
  }

  const faq = $("#mintFaq");

  if (hokkaido.mintDate) {
    const price = hokkaido.mintPrice != null
      ? ` · ${hokkaido.mintPrice}`
      : "";

    faq.textContent =
      `Hokkaido artwork mint: ${formatDate(hokkaido.mintDate)}${price}. ` +
      (hokkaido.snapshotDate
        ? `Snapshot: ${formatDate(hokkaido.snapshotDate)}.`
        : "Snapshot date to be announced.");
  }
}

/* ==========================================
   REGIONAL FILTERS
   ========================================== */

function fillRegions(select) {
  select.replaceChildren();

  select.add(new Option(
    "ALL REGIONS · 47 PREFECTURES",
    "all"
  ));

  REGIONS.forEach(region => {
    select.add(new Option(region, region));
  });
}

function initFilters() {
  fillRegions($("#ticketRegion"));
  fillRegions($("#artRegion"));

  $("#ticketSearch").addEventListener("input", () => {
    renderBook("ticket");
  });

  $("#ticketRegion").addEventListener("change", () => {
    renderBook("ticket");
  });

  $("#artRegion").addEventListener("change", () => {
    renderBook("art");
  });
}

/* ==========================================
   PREFECTURE DETAIL
   ========================================== */

function createDetail(index, type) {
  const p = PREFECTURES[index];
  const isTicket = type === "ticket";

  const url = isTicket ? p.ticketUrl : p.artUrl;
  const imageUrl = isTicket ? p.ticketImage : p.artImage;
  const status = isTicket ? p.ticketStatus : p.artStatus;

  const wrapper = make("div");

  wrapper.append(
    make(
      "span",
      "eyebrow",
      `${stopNumber(index)} · ${p.region}`
    ),
    make(
      "h3",
      "",
      `${p.name} · ${isTicket ? "JOURNEY TICKET" : "NFT ART"}`
    )
  );

  if (validUrl(imageUrl)) {
    const image = make("img");
    image.src = imageUrl;
    image.alt = `${p.name} ${type}`;
    image.loading = "lazy";
    wrapper.append(image);
  }

  wrapper.append(
    make("p", "status", statusText(status))
  );

  if (isTicket && p.ticketSupply != null) {
    const claimed = p.ticketClaimed;

    wrapper.append(
      make(
        "p",
        "",
        claimed != null
          ? `${claimed} / ${p.ticketSupply} CLAIMED`
          : `TOTAL SUPPLY: ${p.ticketSupply}`
      )
    );
  }

  if (index === 0 && isTicket) {
    const snapshot = SETTINGS.hokkaido?.snapshotDate;

    wrapper.append(
      make(
        "p",
        "",
        snapshot
          ? `SNAPSHOT: ${formatDate(snapshot)}`
          : translate(
              "Snapshot date to be announced.",
              "スナップショット日は後日発表します。"
            )
      )
    );
  }

  if (index === 0 && !isTicket) {
    const h = SETTINGS.hokkaido || {};

    wrapper.append(
      make(
        "p",
        "",
        h.mintDate
          ? `MINT: ${formatDate(h.mintDate)}`
          : translate(
              "Artwork mint date has not yet been announced.",
              "NFTアートの販売日は後日発表します。"
            )
      )
    );
  }

  if (validUrl(url)) {
    const link = make(
      "a",
      "action-link",
      "VIEW ON OPENSEA ↗"
    );

    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    wrapper.append(link);
  } else {
    wrapper.append(
      make(
        "span",
        "unavailable",
        translate(
          "OPENSEA LINK — COMING SOON",
          "OPENSEAリンク — 近日公開"
        )
      )
    );
  }

  return wrapper;
}

function renderDetails() {
  $("#ticketDetail").replaceChildren(
    createDetail(state.ticket, "ticket")
  );

  $("#artDetail").replaceChildren(
    createDetail(state.art, "art")
  );

  $("#journeyDetail").replaceChildren(
    createDetail(state.stop, "ticket"),
    createDetail(state.stop, "art")
  );
}

/* ==========================================
   COLLECTION BOOK
   OPENSEA LINKS BELOW EACH CARD
   ========================================== */

function renderBook(type) {
  const isTicket = type === "ticket";

  const grid = $(isTicket ? "#ticketGrid" : "#artGrid");

  const region = $(
    isTicket ? "#ticketRegion" : "#artRegion"
  ).value;

  const search = isTicket
    ? $("#ticketSearch").value.trim().toLowerCase()
    : "";

  grid.replaceChildren();

  let count = 0;

  PREFECTURES.forEach((p, index) => {
    if (region !== "all" && p.region !== region) return;

    if (
      search &&
      !p.name.toLowerCase().includes(search) &&
      !(p.nameJa || "").includes(search) &&
      !pad(index + 1).includes(search)
    ) {
      return;
    }

    count++;

    const selected =
      (isTicket ? state.ticket : state.art) === index;

    const button = make(
      "button",
      "book-tile" + (selected ? " selected" : "")
    );

    button.type = "button";
    button.setAttribute(
      "aria-label",
      `${p.name} ${type}`
    );

    const thumb = make("div", "thumb");
    const imageUrl = isTicket ? p.ticketImage : p.artImage;

    if (validUrl(imageUrl)) {
      const image = make("img");
      image.src = imageUrl;
      image.alt = "";
      image.loading = "lazy";
      thumb.append(image);
    } else {
      thumb.append(make("span", "lock", "🔒"));
    }

    button.append(
      thumb,
      make(
        "span",
        "name",
        `${pad(index + 1)} ${
          state.lang === "ja" && p.nameJa
            ? p.nameJa
            : p.name
        }`
      )
    );

    button.addEventListener("click", () => {
      if (isTicket) {
        state.ticket = index;
      } else {
        state.art = index;
      }

      renderBook(type);
      renderDetails();

      const detail = $(
        isTicket ? "#ticketDetail" : "#artDetail"
      );

      detail.scrollIntoView({
        behavior: reducedMotion() ? "auto" : "smooth",
        block: "nearest"
      });
    });

    /* Card and OpenSea link are separate */
    const entry = make("div", "book-entry");
    entry.append(button);

    const openSeaUrl = isTicket ? p.ticketUrl : p.artUrl;

    if (validUrl(openSeaUrl)) {
      const link = make(
        "a",
        "book-opensea",
        "VIEW ON OPENSEA ↗"
      );

      link.href = openSeaUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      entry.append(link);
    } else {
      entry.append(
        make(
          "span",
          "book-coming-soon",
          translate("COMING SOON", "近日公開")
        )
      );
    }

    grid.append(entry);
  });

  if (isTicket) {
    $("#ticketCount").textContent =
      `${count} / 47 DESTINATIONS`;
  }
}

/* ==========================================
   NFT ART GALLERY
   ========================================== */

function getGallery() {
  return SETTINGS.hokkaido?.artGallery || [];
}

function renderGallery() {
  currentGallery = getGallery();

  if (!currentGallery.length) return;

  state.gallery = Math.max(
    0,
    Math.min(currentGallery.length - 1, state.gallery)
  );

  const index = state.gallery;
  const src = currentGallery[index];

  if (validUrl(src)) {
    $("#galleryImage").src = src;
  }

  const isLast = index === currentGallery.length - 1;

  $("#galleryCaption").textContent =
    isLast
      ? `HOKKAIDO LR EXCLUSIVE · ${pad(index + 1)} / ${pad(currentGallery.length)}`
      : `HOKKAIDO ${pad(index + 1)} / ${pad(currentGallery.length)}`;

  $$("#galleryThumbs button").forEach((button, i) => {
    button.classList.toggle("selected", i === index);
    button.setAttribute(
      "aria-pressed",
      String(i === index)
    );
  });
}

function initGallery() {
  currentGallery = getGallery();

  const container = $("#galleryThumbs");
  container.replaceChildren();

  currentGallery.forEach((src, index) => {
    const button = make("button");
    button.type = "button";
    button.setAttribute(
      "aria-label",
      `Hokkaido artwork ${index + 1}`
    );

    const image = make("img");

    if (validUrl(src)) image.src = src;

    image.alt = `Hokkaido artwork ${index + 1}`;
    image.loading = "lazy";

    button.append(image);

    button.addEventListener("click", () => {
      state.gallery = index;
      renderGallery();
    });

    container.append(button);
  });

  $("#prevArt").addEventListener("click", () => {
    if (!currentGallery.length) return;

    state.gallery =
      (state.gallery - 1 + currentGallery.length) %
      currentGallery.length;

    renderGallery();
  });

  $("#nextArt").addEventListener("click", () => {
    if (!currentGallery.length) return;

    state.gallery =
      (state.gallery + 1) % currentGallery.length;

    renderGallery();
  });

  renderGallery();
}

/* ==========================================
   RARITY
   ========================================== */

function getRarities() {
  return SETTINGS.rarities || [];
}

function renderRarity() {
  const rarities = getRarities();
  if (!rarities.length) return;

  const rarity = rarities[state.rarity];
  if (!rarity) return;

  setImage("#rarityImage", rarity.frame);

  $("#rarityImage").alt =
    `${rarity.name} rarity frame`;

  $("#rarityTitle").textContent =
    `${rarity.name} · ${rarity.code}`;

  $("#rarityRate").textContent =
    rarity.rate || "TBA";

  $("#rarityCount").textContent =
    rarity.count != null
      ? `${rarity.count} / ${SETTINGS.rarityExampleSupply || 99} — EXAMPLE ONLY`
      : "FINAL ALLOCATION TBA";

  $$("#rarityTabs button").forEach((button, index) => {
    button.classList.toggle(
      "active",
      index === state.rarity
    );
    button.setAttribute(
      "aria-pressed",
      String(index === state.rarity)
    );
  });

  const exampleSupply = SETTINGS.rarityExampleSupply || 99;

  $("#rarityNoticeTitle").textContent =
    `ILLUSTRATIVE EXAMPLE · ${exampleSupply} NFTs`;

  $("#rarityBreakdown").textContent =
    rarities.map(r => `${r.code} ${r.count}`).join(" · ");
}

function initRarity() {
  const container = $("#rarityTabs");
  container.replaceChildren();

  getRarities().forEach((rarity, index) => {
    const button = make("button", "", rarity.code);
    button.type = "button";

    button.addEventListener("click", () => {
      state.rarity = index;
      renderRarity();
    });

    container.append(button);
  });

  renderRarity();
}

/* ==========================================
   JOURNEY ROUTE
   6 STOPS PER ROW
   ========================================== */

const svgNS = "http://www.w3.org/2000/svg";

function createCoordinates() {
  const columns = 6;
  const spacingX = 102;
  const spacingY = 125;
  const startX = 75;
  const startY = 75;

  coordinates = PREFECTURES.map((p, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;

    const xColumn = row % 2 === 0
      ? column
      : columns - 1 - column;

    return {
      x: startX + xColumn * spacingX,
      y: startY + row * spacingY
    };
  });

  cumulative = [0];

  for (let i = 1; i < coordinates.length; i++) {
    const a = coordinates[i - 1];
    const b = coordinates[i];

    cumulative.push(
      cumulative[i - 1] +
      Math.hypot(b.x - a.x, b.y - a.y)
    );
  }
}

function renderMapLabels() {
  $("#mapCounter").textContent =
    `STOP ${pad(state.stop + 1)} / 47`;

  $$(".route-node").forEach((node, index) => {
    const p = PREFECTURES[index];

    node.setAttribute(
      "aria-label",
      `${pad(index + 1)} ${
        state.lang === "ja" && p.nameJa
          ? p.nameJa
          : p.name
      }`
    );
  });
}

function positionTruck(distance) {
  const roadPath = $("#roadOutline");
  const progressPath = $("#routeProgress");
  const truck = $("#truckSprite");

  const total = roadPath.getTotalLength();

  const d = Math.max(
    0,
    Math.min(total, distance)
  );

  const point = roadPath.getPointAtLength(d);

  const ahead = roadPath.getPointAtLength(
    Math.min(total, d + 3)
  );

  const behind = roadPath.getPointAtLength(
    Math.max(0, d - 3)
  );

  truck.setAttribute("x", point.x - 32);
  truck.setAttribute("y", point.y - 48);

  const images = SETTINGS.images || {};

  const right = images.truckRight;
  const left = images.truckLeft;

  const direction =
    ahead.x < behind.x ? left : right;

  if (validUrl(direction)) {
    truck.setAttribute("href", direction);
  }

  progressPath.style.strokeDasharray =
    `${d} ${total + 2}`;
}

function moveTo(index, animate = true) {
  state.stop = Math.max(
    0,
    Math.min(PREFECTURES.length - 1, index)
  );

  renderMapLabels();

  $$(".route-node").forEach((node, i) => {
    node.classList.toggle(
      "selected",
      i === state.stop
    );

    node.classList.toggle(
      "visited",
      i < state.stop
    );
  });

  renderDetails();

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  const start = truckDistance;
  const end = cumulative[state.stop];

  if (!animate || reducedMotion()) {
    truckDistance = end;
    positionTruck(end);
    return;
  }

  const begin = performance.now();

  const duration = Math.min(
    2500,
    500 + Math.abs(end - start) * 2
  );

  function frame(now) {
    const t = Math.min(
      1,
      (now - begin) / duration
    );

    const eased = t * t * (3 - 2 * t);

    truckDistance =
      start + (end - start) * eased;

    positionTruck(truckDistance);

    if (t < 1) {
      animationId = requestAnimationFrame(frame);
    } else {
      truckDistance = end;
      animationId = null;
    }
  }

  animationId = requestAnimationFrame(frame);
}

function stopPlayback() {
  state.playing = false;

  if (playTimer !== null) {
    clearTimeout(playTimer);
    playTimer = null;
  }

  $("#playRoute").textContent = "▶ PLAY";
}

function playNext() {
  if (!state.playing) return;

  if (state.stop >= PREFECTURES.length - 1) {
    stopPlayback();
    return;
  }

  moveTo(state.stop + 1);

  playTimer = setTimeout(playNext, 2700);
}

function initRoute() {
  createCoordinates();

  const pathData =
    "M " +
    coordinates.map(p => `${p.x} ${p.y}`).join(" L ");

  $("#roadOutline").setAttribute("d", pathData);
  $("#road").setAttribute("d", pathData);
  $("#routeProgress").setAttribute("d", pathData);

  const nodes = $("#routeNodes");
  nodes.replaceChildren();

  coordinates.forEach((point, index) => {
    const group = document.createElementNS(svgNS, "g");

    group.setAttribute("class", "route-node");
    group.setAttribute(
      "transform",
      `translate(${point.x} ${point.y})`
    );

    group.setAttribute("role", "button");
    group.setAttribute("tabindex", "0");

    const circle = document.createElementNS(
      svgNS,
      "circle"
    );

    circle.setAttribute("r", "26");

    const label = document.createElementNS(
      svgNS,
      "text"
    );

    label.textContent = pad(index + 1);

    group.append(circle, label);

    group.addEventListener("click", () => {
      stopPlayback();
      moveTo(index);
    });

    group.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        stopPlayback();
        moveTo(index);
      }
    });

    nodes.append(group);
  });

  $("#prevStop").addEventListener("click", () => {
    stopPlayback();
    moveTo(state.stop - 1);
  });

  $("#nextStop").addEventListener("click", () => {
    stopPlayback();
    moveTo(state.stop + 1);
  });

  $("#playRoute").addEventListener("click", () => {
    if (state.playing) {
      stopPlayback();
      return;
    }

    if (state.stop >= PREFECTURES.length - 1) {
      moveTo(0, false);
    }

    state.playing = true;
    $("#playRoute").textContent = "■ STOP";

    playNext();
  });

  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) stopPlayback();
    }
  );

  const current = Math.max(
    0,
    Math.min(
      46,
      (Number(SETTINGS.currentStop) || 1) - 1
    )
  );

  moveTo(current, false);
}

/* ==========================================
   INITIALIZATION
   ========================================== */

async function init() {
  try {
    await loadData();

    initNavigation();
    initLanguage();
    initFilters();

    renderStats();

    initGallery();
    initRarity();
    initRoute();

    renderBook("ticket");
    renderBook("art");
    renderDetails();

    $("#loading").hidden = true;

    showTab("tickets");

  } catch (error) {
    console.error("TRAVELING TAKOYAKI:", error);

    $("#loading").hidden = true;

    const errorBox = $("#error");
    errorBox.hidden = false;

    errorBox.textContent =
      "Unable to load the journey data. " +
      "Please check prefectures.json and settings.json.";
  }
}

init();
