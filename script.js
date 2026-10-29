
"use strict";

/* =============================================================
   TRAVELING TAKOYAKI — JAPAN 47 JOURNEY
   Requires ./prefectures.json and ./settings.json in the same folder.
   The two JSON files are NOT changed by this repair.
   ============================================================= */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const pad = (value) => String(value).padStart(2, "0");

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

const HOKKAIDO_ART_BOOK_IMAGE = "https://ul.h3z.jp/oyLZXgar.png";
const HERO_DEFAULT_IMAGE = "https://ul.h3z.jp/nz0rNaws.gif";

const DEFAULT_RARITIES = [
  { name: "NORMAL", code: "N", count: 49, rate: "49.49%", frame: "https://ul.h3z.jp/mpichzx4.png" },
  { name: "RARE", code: "R", count: 28, rate: "28.28%" },
  { name: "SUPER RARE", code: "SR", count: 14, rate: "14.14%" },
  { name: "ULTRA RARE", code: "UR", count: 7, rate: "7.07%" },
  { name: "LEGENDARY", code: "LR", count: 1, rate: "1.01%" }
];

let PREFECTURES = [];
let SETTINGS = {};

const state = {
  ticket: 0,
  art: 0,
  rarity: 0,
  gallery: 0,
  galleryPrefecture: 0,
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

/* HELPERS */
function make(tag, className = "", content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = String(content);
  return node;
}

function translate(en, ja) {
  return state.lang === "ja" ? ja : en;
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function validUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function setImage(selector, src) {
  const image = $(selector);
  if (!image) return;
  if (validUrl(src)) {
    image.src = src;
    image.hidden = false;
  } else {
    image.removeAttribute("src");
    image.hidden = true;
  }
}

function setText(selector, text) {
  const node = $(selector);
  if (node) node.textContent = text;
}

function setBilingualText(node, en, ja) {
  if (!node) return;
  node.dataset.en = en;
  node.dataset.ja = ja;
  node.textContent = translate(en, ja);
}

function stopNumber(index) {
  return `STOP ${pad(index + 1)}`;
}

function formatDate(value) {
  return value == null || value === "" ? null : String(value);
}

function getCurrentIndex() {
  const current = Number(SETTINGS.currentStop) || 1;
  return Math.max(0, Math.min(PREFECTURES.length - 1, current - 1));
}

function getPrefectureName(prefecture) {
  return state.lang === "ja" && prefecture.nameJa
    ? prefecture.nameJa
    : prefecture.name;
}

function getPrefectureSettings(index) {
  const prefecture = PREFECTURES[index];
  if (!prefecture) return {};

  const key = prefecture.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const direct = SETTINGS[key];
  const nested = SETTINGS.prefectures && SETTINGS.prefectures[key];
  const result = direct || nested;
  return result && typeof result === "object" && !Array.isArray(result) ? result : {};
}

function getField(index, key) {
  const prefecture = PREFECTURES[index] || {};
  const extra = getPrefectureSettings(index);
  if (prefecture[key] != null) return prefecture[key];
  if (extra[key] != null) return extra[key];
  return null;
}

function statusText(status) {
  const labels = {
    "SOLD OUT": ["SOLD OUT", "配布終了"],
    "AVAILABLE": ["AVAILABLE", "公開中"],
    "LIVE": ["LIVE NOW", "販売中"],
    "ON SALE": ["ON SALE", "販売中"],
    "COMING SOON": ["COMING SOON", "近日公開"],
    "MINTING SOON": ["MINTING SOON", "ミント開始間近"],
    "UPCOMING": ["UPCOMING", "公開予定"],
    "ENDED": ["ENDED", "販売終了"]
  };
  const pair = labels[status];
  return pair ? translate(pair[0], pair[1]) : (status || translate("COMING SOON", "近日公開"));
}

/* REVEAL CONTROL
   true  = website displays image/link
   false = website displays a lock
   If missing, Hokkaido (index 0) stays revealed for compatibility.
   Important: URLs stored in public JSON cannot be kept secret.
*/
function isRevealed(index, type) {
  const field = type === "ticket" ? "ticketRevealed" : "artRevealed";
  const value = getField(index, field);
  return value === null ? index === 0 : value === true;
}

function getVisibleImage(index, type) {
  if (!isRevealed(index, type)) return null;
  return getField(index, type === "ticket" ? "ticketImage" : "artImage");
}

function getVisibleUrl(index, type) {
  if (!isRevealed(index, type)) return null;
  return getField(index, type === "ticket" ? "ticketUrl" : "artUrl");
}

function getArtBookImage(prefecture, index) {
  if (!isRevealed(index, "art")) return null;
  const direct = getField(index, "artBookImage");
  if (validUrl(direct)) return direct;
  if (index === 0) {
    const htmlImage = $("#artGrid")?.dataset.hokkaidoArtImage;
    return validUrl(htmlImage) ? htmlImage : HOKKAIDO_ART_BOOK_IMAGE;
  }
  return getVisibleImage(index, "art");
}

function getGallery(index) {
  if (!isRevealed(index, "art")) return [];
  const gallery = getField(index, "artGallery");
  return Array.isArray(gallery) ? gallery.filter(validUrl) : [];
}

/* LOAD JSON DATA */
async function loadData() {
  const [prefecturesResponse, settingsResponse] = await Promise.all([
    fetch("./prefectures.json", { cache: "no-cache" }),
    fetch("./settings.json", { cache: "no-cache" })
  ]);

  if (!prefecturesResponse.ok) {
    throw new Error(`prefectures.json: HTTP ${prefecturesResponse.status}`);
  }
  if (!settingsResponse.ok) {
    throw new Error(`settings.json: HTTP ${settingsResponse.status}`);
  }

  const prefectures = await prefecturesResponse.json();
  const settings = await settingsResponse.json();

  if (!Array.isArray(prefectures) || prefectures.length !== 47) {
    throw new Error("prefectures.json must contain exactly 47 prefectures.");
  }
  if (!prefectures.every((prefecture) =>
    prefecture && typeof prefecture.name === "string" && REGIONS.includes(prefecture.region)
  )) {
    throw new Error("prefectures.json contains an invalid prefecture or region.");
  }
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new Error("settings.json must contain a JSON object.");
  }

  PREFECTURES = prefectures;
  SETTINGS = settings;
  const current = getCurrentIndex();
  state.ticket = current;
  state.art = current;
  state.galleryPrefecture = current;
  state.stop = current;
}

/* LANGUAGE */
function renderLanguage() {
  document.documentElement.lang = state.lang;
  setText("#langSwitch", state.lang === "en" ? "日本語" : "ENGLISH");
  $$("[data-en][data-ja]").forEach((node) => {
    node.textContent = node.dataset[state.lang];
  });

  const search = $("#ticketSearch");
  if (search) {
    search.placeholder = translate("SEARCH PREFECTURE...", "都道府県を検索...");
  }

  renderStats();
  renderRegionLabels();
  renderBook("ticket");
  renderBook("art");
  renderDetails();
  rebuildGallery();
  renderRarity();
  renderMapLabels();
  updatePlayLabel();
}

function initLanguage() {
  $("#langSwitch").addEventListener("click", () => {
    state.lang = state.lang === "en" ? "ja" : "en";
    renderLanguage();
  });
}

/* NAVIGATION */
function showTab(name) {
  $$("[data-tab]").forEach((button) => {
    const active = button.dataset.tab === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  $$(".page").forEach((page) => {
    page.hidden = page.id !== name;
  });
}

function initNavigation() {
  const tabs = $$("[data-tab]");
  tabs.forEach((button, index) => {
    button.addEventListener("click", () => showTab(button.dataset.tab));
    button.addEventListener("keydown", (event) => {
      if (!(["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0
        : event.key === "End" ? tabs.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      showTab(tabs[next].dataset.tab);
      tabs[next].focus();
    });
  });
}

/* FEATURE / STATISTICS */
function renderStats() {
  const index = getCurrentIndex();
  const prefecture = PREFECTURES[index];
  if (!prefecture) return;

  setText("#currentStopStat", `${pad(index + 1)} / ${PREFECTURES.length}`);
  const claimed = getField(index, "ticketClaimed");
  const supply = getField(index, "ticketSupply");
  setText("#ticketStat", claimed != null && supply != null ? `${claimed} / ${supply}` : "— / —");
  setText("#rarityStat", getRarities().length);

  const images = SETTINGS.images || {};
  setImage("#heroImage", validUrl(images.hero) ? images.hero : HERO_DEFAULT_IMAGE);

  if (validUrl(SETTINGS.officialOpenSea)) {
    const official = $("#officialLink");
    if (official) official.href = SETTINGS.officialOpenSea;
  }
  setBilingualText(
    $(".stats > div:nth-child(2) small"),
    `${prefecture.name} TICKETS`,
    `${prefecture.nameJa || prefecture.name} チケット`
  );
  renderFeature(index);
}

function setFeatureImage(selector, src) {
  const image = $(selector);
  if (!image) return;
  const parent = image.parentElement;
  if (!parent) return;
  let locked = parent.querySelector(".feature-locked");
  if (validUrl(src)) {
    setImage(selector, src);
    if (locked) locked.remove();
  } else {
    setImage(selector, null);
    if (!locked) {
      locked = make("div", "feature-locked", "🔒");
      locked.setAttribute("aria-label", translate("Not revealed", "未公開"));
      parent.append(locked);
    }
  }
}

function renderFeature(index) {
  const prefecture = PREFECTURES[index];
  if (!prefecture) return;

  const ticketStatus = getField(index, "ticketStatus") || "COMING SOON";
  const artStatus = getField(index, "artStatus") || "COMING SOON";
  const claimed = getField(index, "ticketClaimed");
  const supply = getField(index, "ticketSupply");
  const gallery = getGallery(index);

  setText("#featureTicketTitle", claimed != null && supply != null
    ? `${claimed} / ${supply} CLAIMED`
    : `${prefecture.name} · ${statusText(ticketStatus)}`);
  setText("#featureArtTitle", gallery.length
    ? `${prefecture.name} · ${gallery.length} ARTWORKS`
    : `${prefecture.name} · ${statusText(artStatus)}`);

  setFeatureImage("#featureTicketImage", getVisibleImage(index, "ticket"));
  setFeatureImage("#featureArtImage", getVisibleImage(index, "art"));

  const ticketFeature = $("#featureTicketTitle")?.closest(".feature");
  const artFeature = $("#featureArtTitle")?.closest(".feature");

  if (ticketFeature) {
    const eyebrow = ticketFeature.querySelector(".eyebrow");
    if (eyebrow) eyebrow.textContent = `${stopNumber(index)} · ${prefecture.name}`;
    const paragraph = ticketFeature.querySelector("p");
    setBilingualText(
      paragraph,
      claimed != null && supply != null
        ? `${claimed} of ${supply} Journey Tickets claimed.`
        : `Follow the Journey Ticket release for ${prefecture.name}.`,
      claimed != null && supply != null
        ? `${supply}枚中${claimed}枚のJourney Ticketが取得されました。`
        : `${prefecture.nameJa || prefecture.name}のJourney Ticket公開情報をチェック！`
    );
    const stamps = ticketFeature.querySelectorAll(".stamp");
    if (stamps[0]) stamps[0].textContent = statusText(ticketStatus);
    const maxPerWallet = getField(index, "ticketMaxPerWallet");
    if (stamps[1]) {
      stamps[1].textContent = maxPerWallet != null
        ? `${maxPerWallet} PER WALLET` : stopNumber(index);
    }
  }

  if (artFeature) {
    const eyebrow = artFeature.querySelector(".eyebrow");
    if (eyebrow) eyebrow.textContent = `CHAPTER ${pad(index + 1)} · ${prefecture.name}`;
    setBilingualText(
      artFeature.querySelector("p"),
      gallery.length
        ? `Explore ${gallery.length} pixel-art artworks from ${prefecture.name}.`
        : `The ${prefecture.name} NFT artwork collection is being prepared.`,
      gallery.length
        ? `${prefecture.nameJa || prefecture.name}のピクセルアート作品${gallery.length}点をご覧いただけます。`
        : `${prefecture.nameJa || prefecture.name}のNFTアートコレクションは準備中です。`
    );
    const stamp = artFeature.querySelector(".stamp");
    if (stamp) stamp.textContent = statusText(artStatus);
  }
}

/* REGION FILTERS */
function fillRegions(select) {
  if (!select) return;
  select.replaceChildren();
  select.add(new Option("ALL REGIONS · 47 PREFECTURES", "all"));
  REGIONS.forEach((region) => select.add(new Option(region, region)));
}

function renderRegionLabels() {
  ["#ticketRegion", "#artRegion"].forEach((selector) => {
    const select = $(selector);
    if (select?.options.length) {
      select.options[0].textContent = translate(
        "ALL REGIONS · 47 PREFECTURES",
        "すべての地域 · 47都道府県"
      );
    }
  });
}

function initFilters() {
  fillRegions($("#ticketRegion"));
  fillRegions($("#artRegion"));
  $("#ticketSearch").addEventListener("input", () => renderBook("ticket"));
  $("#ticketRegion").addEventListener("change", () => renderBook("ticket"));
  $("#artRegion").addEventListener("change", () => renderBook("art"));
}

/* PREFECTURE DETAILS */
function createDetail(index, type) {
  const prefecture = PREFECTURES[index];
  const isTicket = type === "ticket";
  const revealed = isRevealed(index, type);
  const url = getVisibleUrl(index, type);
  const imageUrl = getVisibleImage(index, type);
  const status = getField(index, isTicket ? "ticketStatus" : "artStatus");
  const wrapper = make("div");

  wrapper.append(
    make("span", "eyebrow", `${stopNumber(index)} · ${prefecture.region}`),
    make("h3", "", `${getPrefectureName(prefecture)} · ${isTicket ? "JOURNEY TICKET" : "NFT ART"}`)
  );

  if (validUrl(imageUrl)) {
    const image = make("img");
    image.src = imageUrl;
    image.alt = `${prefecture.name} ${type}`;
    image.loading = "lazy";
    wrapper.append(image);
  } else if (!revealed) {
    const locked = make("div", "detail-locked-image", "🔒");
    locked.setAttribute("aria-label", translate("Not revealed", "未公開"));
    wrapper.append(locked);
  }

  wrapper.append(make("p", "status", statusText(status)));
  if (isTicket) {
    const supply = getField(index, "ticketSupply");
    const claimed = getField(index, "ticketClaimed");
    if (supply != null) {
      wrapper.append(make("p", "", claimed != null
        ? `${claimed} / ${supply} CLAIMED`
        : `TOTAL SUPPLY: ${supply}`));
    }
    const snapshot = getField(index, "snapshotDate");
    if (snapshot && revealed) {
      wrapper.append(make("p", "", `SNAPSHOT: ${formatDate(snapshot)}`));
    }
  } else {
    const mintDate = getField(index, "mintDate");
    if (mintDate && revealed) {
      wrapper.append(make("p", "", `MINT: ${formatDate(mintDate)}`));
    }
  }

  const actions = make("div", "art-link-actions");
  if (!isTicket && revealed && getGallery(index).length) {
    const galleryButton = make("button", "action-link", translate(
      "VIEW ART GALLERY ↗", "作品ギャラリーを見る ↗"
    ));
    galleryButton.type = "button";
    galleryButton.addEventListener("click", () => {
      showTab("art");
      state.art = index;
      selectGalleryPrefecture(index);
      renderBook("art");
      renderDetails();
      $(".gallery-stage")?.scrollIntoView({
        behavior: reducedMotion() ? "auto" : "smooth",
        block: "center"
      });
    });
    actions.append(galleryButton);
  }

  if (validUrl(url)) {
    const link = make("a", "action-link", translate(
      "VIEW ON OPENSEA ↗", "OPENSEAで見る ↗"
    ));
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    actions.append(link);
  } else {
    actions.append(make("span", "unavailable", translate(
      "OPENSEA LINK — COMING SOON", "OPENSEAリンク — 近日公開"
    )));
  }

  wrapper.append(actions);
  return wrapper;
}

function renderDetails() {
  $("#ticketDetail").replaceChildren(createDetail(state.ticket, "ticket"));
  $("#artDetail").replaceChildren(createDetail(state.art, "art"));
  $("#journeyDetail").replaceChildren(
    createDetail(state.stop, "ticket"),
    createDetail(state.stop, "art")
  );
}

/* TICKET BOOK / ART BOOK */
function renderBook(type) {
  const isTicket = type === "ticket";
  const grid = $(isTicket ? "#ticketGrid" : "#artGrid");
  const region = $(isTicket ? "#ticketRegion" : "#artRegion").value;
  const search = isTicket ? $("#ticketSearch").value.trim().toLowerCase() : "";
  grid.replaceChildren();

  let count = 0;
  PREFECTURES.forEach((prefecture, index) => {
    if (region !== "all" && prefecture.region !== region) return;
    if (search &&
      !prefecture.name.toLowerCase().includes(search) &&
      !(prefecture.nameJa || "").includes(search) &&
      !pad(index + 1).includes(search)
    ) return;

    count++;
    const selected = (isTicket ? state.ticket : state.art) === index;
    const button = make("button", `book-tile${selected ? " selected" : ""}`);
    button.type = "button";
    button.setAttribute("aria-label", `${prefecture.name} ${type}`);
    button.setAttribute("aria-pressed", String(selected));

    const thumb = make("div", "thumb");
    const imageUrl = isTicket
      ? getVisibleImage(index, "ticket")
      : getArtBookImage(prefecture, index);

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
      make("span", "name", `${pad(index + 1)} ${getPrefectureName(prefecture)}`)
    );

    button.addEventListener("click", () => {
      if (isTicket) {
        state.ticket = index;
      } else {
        state.art = index;
        selectGalleryPrefecture(index);
      }
      renderBook(type);
      renderDetails();
      $(isTicket ? "#ticketDetail" : "#artDetail")?.scrollIntoView({
        behavior: reducedMotion() ? "auto" : "smooth",
        block: "nearest"
      });
    });

    const entry = make("div", "book-entry");
    entry.append(button);
    const openSeaUrl = getVisibleUrl(index, type);
    if (validUrl(openSeaUrl)) {
      const link = make("a", "book-opensea", translate(
        "VIEW ON OPENSEA ↗", "OPENSEAで見る ↗"
      ));
      link.href = openSeaUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      entry.append(link);
    } else {
      entry.append(make("span", "book-coming-soon", translate("COMING SOON", "近日公開")));
    }
    grid.append(entry);
  });

  if (isTicket) {
    setText("#ticketCount", `${count} / ${PREFECTURES.length} DESTINATIONS`);
  }
}

/* NFT ART GALLERY */
function selectGalleryPrefecture(index) {
  state.galleryPrefecture = index;
  state.gallery = 0;
  rebuildGallery();
}

function rebuildGallery() {
  const index = state.galleryPrefecture;
  const prefecture = PREFECTURES[index];
  if (!prefecture) return;

  currentGallery = getGallery(index);
  $("#galleryThumbs").replaceChildren();
  const stage = $(".gallery-stage");
  setText("#galleryHeading", translate(
    `${prefecture.name} ART GALLERY`,
    `${prefecture.nameJa || prefecture.name} アートギャラリー`
  ));

  if (!currentGallery.length) {
    if (stage) stage.hidden = true;
    setImage("#galleryImage", null);
    setText("#galleryCaption", translate(
      `${prefecture.name} ART GALLERY · COMING SOON`,
      `${prefecture.nameJa || prefecture.name}の作品は近日公開`
    ));
    return;
  }

  if (stage) stage.hidden = false;
  currentGallery.forEach((src, galleryIndex) => {
    const button = make("button");
    button.type = "button";
    button.setAttribute("aria-label", `${prefecture.name} artwork ${galleryIndex + 1}`);
    const image = make("img");
    image.src = src;
    image.alt = `${prefecture.name} artwork ${galleryIndex + 1}`;
    image.loading = "lazy";
    button.append(image);
    button.addEventListener("click", () => {
      state.gallery = galleryIndex;
      renderGallery();
    });
    $("#galleryThumbs").append(button);
  });
  renderGallery();
}

function renderGallery() {
  const index = state.galleryPrefecture;
  const prefecture = PREFECTURES[index];
  if (!prefecture) return;
  currentGallery = getGallery(index);

  if (!currentGallery.length) {
    $(".gallery-stage").hidden = true;
    setImage("#galleryImage", null);
    setText("#galleryCaption", translate(
      `${prefecture.name} ART GALLERY · COMING SOON`,
      `${prefecture.nameJa || prefecture.name}の作品は近日公開`
    ));
    return;
  }

  $(".gallery-stage").hidden = false;
  state.gallery = Math.max(0, Math.min(currentGallery.length - 1, state.gallery));
  const galleryIndex = state.gallery;
  setImage("#galleryImage", currentGallery[galleryIndex]);
  $("#galleryImage").alt = `${prefecture.name} artwork ${galleryIndex + 1}`;
  const suffix = galleryIndex === currentGallery.length - 1 ? " · FINAL ARTWORK" : "";
  setText("#galleryCaption",
    `${getPrefectureName(prefecture)} · ${pad(galleryIndex + 1)} / ${pad(currentGallery.length)}${suffix}`
  );
  $$("#galleryThumbs button").forEach((button, i) => {
    button.classList.toggle("selected", i === galleryIndex);
    button.setAttribute("aria-pressed", String(i === galleryIndex));
  });
}

function initGallery() {
  $("#prevArt").addEventListener("click", () => {
    if (!currentGallery.length) return;
    state.gallery = (state.gallery - 1 + currentGallery.length) % currentGallery.length;
    renderGallery();
  });
  $("#nextArt").addEventListener("click", () => {
    if (!currentGallery.length) return;
    state.gallery = (state.gallery + 1) % currentGallery.length;
    renderGallery();
  });
  selectGalleryPrefecture(getCurrentIndex());
}

/* RARITY */
function getRarities() {
  return Array.isArray(SETTINGS.rarities) && SETTINGS.rarities.length
    ? SETTINGS.rarities : DEFAULT_RARITIES;
}

function renderRarity() {
  const rarities = getRarities();
  const rarity = rarities[state.rarity];
  if (!rarity) return;

  setImage("#rarityImage", rarity.frame);
  $("#rarityImage").alt = `${rarity.name} rarity frame`;
  setText("#rarityTitle", `${rarity.name} · ${rarity.code}`);
  setText("#rarityRate", rarity.rate ?? "TBA");

  const exampleSupply = SETTINGS.rarityExampleSupply || 99;
  setText("#rarityCount", rarity.count != null
    ? `${rarity.count} / ${exampleSupply} — EXAMPLE ONLY`
    : "FINAL ALLOCATION TBA");

  $$("#rarityTabs button").forEach((button, index) => {
    button.classList.toggle("active", index === state.rarity);
    button.setAttribute("aria-pressed", String(index === state.rarity));
  });
  setText("#rarityNoticeTitle", `ILLUSTRATIVE EXAMPLE · ${exampleSupply} NFTs`);
  setText("#rarityBreakdown", rarities.map((r) => `${r.code} ${r.count ?? "TBA"}`).join(" · "));
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

/* JOURNEY ROUTE — SIX STOPS PER ROW */
const svgNS = "http://www.w3.org/2000/svg";

function createCoordinates() {
  const columns = 6;
  const spacingX = 102;
  const spacingY = 125;
  const startX = 75;
  const startY = 75;

  coordinates = PREFECTURES.map((_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const xColumn = row % 2 === 0 ? column : columns - 1 - column;
    return { x: startX + xColumn * spacingX, y: startY + row * spacingY };
  });

  cumulative = [0];
  for (let i = 1; i < coordinates.length; i++) {
    const a = coordinates[i - 1];
    const b = coordinates[i];
    cumulative.push(cumulative[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
  }
}

function renderMapLabels() {
  setText("#mapCounter", `STOP ${pad(state.stop + 1)} / ${PREFECTURES.length}`);
  $$(".route-node").forEach((node, index) => {
    node.setAttribute("aria-label", `${pad(index + 1)} ${getPrefectureName(PREFECTURES[index])}`);
  });
}

function positionTruck(distance) {
  const roadPath = $("#roadOutline");
  const progressPath = $("#routeProgress");
  const truck = $("#truckSprite");
  const total = roadPath.getTotalLength();
  const d = Math.max(0, Math.min(total, distance));
  const point = roadPath.getPointAtLength(d);
  const ahead = roadPath.getPointAtLength(Math.min(total, d + 3));
  const behind = roadPath.getPointAtLength(Math.max(0, d - 3));

  truck.setAttribute("x", point.x - 32);
  truck.setAttribute("y", point.y - 48);

  const images = SETTINGS.images || {};
  const direction = ahead.x < behind.x ? images.truckLeft : images.truckRight;
  if (validUrl(direction)) truck.setAttribute("href", direction);
  progressPath.style.strokeDasharray = `${d} ${total + 2}`;
}

function moveTo(index, animate = true) {
  state.stop = Math.max(0, Math.min(PREFECTURES.length - 1, index));
  renderMapLabels();
  $$(".route-node").forEach((node, i) => {
    node.classList.toggle("selected", i === state.stop);
    node.classList.toggle("visited", i < state.stop);
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
  const duration = Math.min(2500, 500 + Math.abs(end - start) * 2);
  function frame(now) {
    const t = Math.min(1, (now - begin) / duration);
    const eased = t * t * (3 - 2 * t);
    truckDistance = start + (end - start) * eased;
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

function updatePlayLabel() {
  setText("#playRoute", state.playing ? "■ STOP" : "▶ PLAY");
}

function stopPlayback() {
  state.playing = false;
  if (playTimer !== null) {
    clearTimeout(playTimer);
    playTimer = null;
  }
  updatePlayLabel();
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
  const pathData = "M " + coordinates.map((p) => `${p.x} ${p.y}`).join(" L ");
  ["#roadOutline", "#road", "#routeProgress"].forEach((selector) => {
    $(selector).setAttribute("d", pathData);
  });

  const nodes = $("#routeNodes");
  nodes.replaceChildren();
  coordinates.forEach((point, index) => {
    const group = document.createElementNS(svgNS, "g");
    group.setAttribute("class", "route-node");
    group.setAttribute("transform", `translate(${point.x} ${point.y})`);
    group.setAttribute("role", "button");
    group.setAttribute("tabindex", "0");

    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("r", "26");
    const label = document.createElementNS(svgNS, "text");
    label.textContent = pad(index + 1);
    group.append(circle, label);

    group.addEventListener("click", () => {
      stopPlayback();
      moveTo(index);
    });
    group.addEventListener("keydown", (event) => {
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
    if (state.stop >= PREFECTURES.length - 1) moveTo(0, false);
    state.playing = true;
    updatePlayLabel();
    playNext();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopPlayback();
  });
  moveTo(getCurrentIndex(), false);
}

/* INITIALIZATION */
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
    if (errorBox) {
      errorBox.hidden = false;
      errorBox.textContent = `Unable to load journey data: ${error.message}. ` +
        "Confirm that prefectures.json and settings.json exist alongside index.html.";
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
