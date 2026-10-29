
"use strict";

/* ==========================================
   TRAVELING TAKOYAKI
   JAPAN 47 JOURNEY

   COMPLETE VERSION

   - 47 PREFECTURES
   - IMAGE REVEAL CONTROL
   - TICKET / ART BOOK
   - AUTO ART GALLERIES
   - PLAY / PAUSE
   - PREVIOUS / NEXT
   - MOBILE SWIPE
   - JOURNEY MAP
   - LANGUAGE SWITCH
   - OPENSEA LINKS
========================================== */


/* ==========================================
   BASIC SETTINGS
========================================== */

const $ = selector =>
  document.querySelector(selector);

const $$ = selector =>
  [...document.querySelectorAll(selector)];

const pad = n =>
  String(n).padStart(2, "0");


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


const HOKKAIDO_ART_BOOK_IMAGE =
  "https://ul.h3z.jp/oyLZXgar.png";


const GALLERY_INTERVAL = 4000;


let PREFECTURES = [];
let SETTINGS = {};


/* ==========================================
   APPLICATION STATE
========================================== */

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


/* ==========================================
   JOURNEY MAP STATE
========================================== */

let animationId = null;
let playTimer = null;

let truckDistance = 0;

let coordinates = [];
let cumulative = [];


/* ==========================================
   ART GALLERY STATE

   Each gallery works independently.
========================================== */

const galleryStates = {
  art: {
    index: 0,
    prefecture: 0,
    images: [],
    playing: true,
    timer: null
  },

  journey: {
    index: 0,
    prefecture: 0,
    images: [],
    playing: true,
    timer: null
  }
};


/* ==========================================
   HELPERS
========================================== */

function make(tag, className = "", content) {
  const node = document.createElement(tag);

  if (className) {
    node.className = className;
  }

  if (content !== undefined) {
    node.textContent = content;
  }

  return node;
}


function translate(en, ja) {
  return state.lang === "ja"
    ? ja
    : en;
}


function reducedMotion() {
  return window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
}


function validUrl(url) {
  if (typeof url !== "string") {
    return false;
  }

  try {
    const parsed = new URL(url);

    return [
      "https:",
      "http:"
    ].includes(parsed.protocol);

  } catch {
    return false;
  }
}


function setImage(selector, src) {
  const image = $(selector);

  if (!image) {
    return;
  }

  if (validUrl(src)) {
    image.src = src;
    image.hidden = false;

  } else {
    image.removeAttribute("src");
    image.hidden = true;
  }
}


function setText(selector, value) {
  const node = $(selector);

  if (node) {
    node.textContent = value;
  }
}


function setBilingualText(node, en, ja) {
  if (!node) {
    return;
  }

  node.dataset.en = en;
  node.dataset.ja = ja;

  node.textContent = translate(en, ja);
}


function formatDate(value) {
  return value
    ? String(value)
    : null;
}


function stopNumber(index) {
  return `STOP ${pad(index + 1)}`;
}


function getCurrentIndex() {
  const current =
    Number(SETTINGS.currentStop) || 1;

  return Math.max(
    0,
    Math.min(
      PREFECTURES.length - 1,
      current - 1
    )
  );
}


function getPrefectureName(p) {
  if (!p) {
    return "";
  }

  return state.lang === "ja" && p.nameJa
    ? p.nameJa
    : p.name;
}


function getPrefectureSettings(index) {
  const p = PREFECTURES[index];

  if (!p) {
    return {};
  }

  const key = p.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return SETTINGS[key] || {};
}


function getField(index, key) {
  const p = PREFECTURES[index] || {};
  const extra = getPrefectureSettings(index);

  if (p[key] != null) {
    return p[key];
  }

  if (extra[key] != null) {
    return extra[key];
  }

  return null;
}


/* ==========================================
   STATUS TRANSLATION
========================================== */

function statusText(status) {
  const values = {
    "SOLD OUT": [
      "SOLD OUT",
      "配布終了"
    ],

    "AVAILABLE": [
      "AVAILABLE",
      "公開中"
    ],

    "LIVE": [
      "LIVE NOW",
      "販売中"
    ],

    "ON SALE": [
      "ON SALE",
      "販売中"
    ],

    "COMING SOON": [
      "COMING SOON",
      "近日公開"
    ],

    "MINTING SOON": [
      "MINTING SOON",
      "ミント開始間近"
    ],

    "UPCOMING": [
      "UPCOMING",
      "公開予定"
    ],

    "ENDED": [
      "ENDED",
      "販売終了"
    ]
  };

  const pair = values[status];

  return pair
    ? translate(pair[0], pair[1])
    : status || translate(
        "COMING SOON",
        "近日公開"
      );
}


/* ==========================================
   IMAGE REVEAL CONTROL

   true  = visible
   false = locked

   If the flag is missing:
   Only Hokkaido is visible.

   NOTE:
   Public JSON image URLs are not secret.
========================================== */

function isRevealed(index, type) {
  const key = type === "ticket"
    ? "ticketRevealed"
    : "artRevealed";

  const value = getField(index, key);

  if (value === null) {
    return index === 0;
  }

  return value === true;
}


function getVisibleImage(index, type) {
  if (!isRevealed(index, type)) {
    return null;
  }

  const p = PREFECTURES[index] || {};

  return type === "ticket"
    ? getField(index, "ticketImage")
    : getField(index, "artImage");
}


function getVisibleUrl(index, type) {
  if (!isRevealed(index, type)) {
    return null;
  }

  return type === "ticket"
    ? getField(index, "ticketUrl")
    : getField(index, "artUrl");
}


function getArtBookImage(p, index) {
  if (!isRevealed(index, "art")) {
    return null;
  }

  if (validUrl(p.artBookImage)) {
    return p.artBookImage;
  }

  if (index === 0) {
    const htmlImage =
      $("#artGrid")?.dataset.hokkaidoArtImage;

    return validUrl(htmlImage)
      ? htmlImage
      : HOKKAIDO_ART_BOOK_IMAGE;
  }

  return p.artImage;
}


/* ==========================================
   GALLERY IMAGE DATA

   artGallery:
   [
     "https://example.com/01.png",
     "https://example.com/02.png"
   ]

   Supports:
   - prefectures.json
   - settings.json

   If no gallery array exists,
   use the main art image.
========================================== */

function getGallery(index) {
  if (!isRevealed(index, "art")) {
    return [];
  }

  const p = PREFECTURES[index] || {};
  const extra = getPrefectureSettings(index);

  const gallery = Array.isArray(p.artGallery)
    ? p.artGallery
    : Array.isArray(extra.artGallery)
      ? extra.artGallery
      : [];

  const images = gallery.filter(validUrl);

  if (images.length) {
    return [...new Set(images)];
  }

  const fallback =
    getVisibleImage(index, "art");

  return validUrl(fallback)
    ? [fallback]
    : [];
}


/* ==========================================
   DATA LOADING
========================================== */

async function loadData() {
  const [
    prefecturesResponse,
    settingsResponse
  ] = await Promise.all([
    fetch("./prefectures.json", {
      cache: "no-cache"
    }),

    fetch("./settings.json", {
      cache: "no-cache"
    })
  ]);

  if (!prefecturesResponse.ok) {
    throw new Error(
      "Could not load prefectures.json"
    );
  }

  if (!settingsResponse.ok) {
    throw new Error(
      "Could not load settings.json"
    );
  }

  const prefectures =
    await prefecturesResponse.json();

  const settings =
    await settingsResponse.json();

  if (
    !Array.isArray(prefectures) ||
    prefectures.length !== 47
  ) {
    throw new Error(
      "prefectures.json must contain 47 prefectures."
    );
  }

  if (
    !prefectures.every(p =>
      p &&
      typeof p.name === "string" &&
      REGIONS.includes(p.region)
    )
  ) {
    throw new Error(
      "Invalid prefecture data."
    );
  }

  if (
    !settings ||
    typeof settings !== "object"
  ) {
    throw new Error(
      "Invalid settings.json"
    );
  }

  PREFECTURES = prefectures;
  SETTINGS = settings;

  const current = getCurrentIndex();

  state.ticket = current;
  state.art = current;

  state.gallery = 0;
  state.galleryPrefecture = current;

  state.stop = current;

  galleryStates.art.prefecture = current;
  galleryStates.journey.prefecture = current;
}


/* ==========================================
   LANGUAGE
========================================== */

function renderLanguage() {
  document.documentElement.lang = state.lang;

  setText(
    "#langSwitch",
    state.lang === "en"
      ? "日本語"
      : "ENGLISH"
  );

  $$("[data-en][data-ja]").forEach(node => {
    node.textContent =
      node.dataset[state.lang];
  });

  const search = $("#ticketSearch");

  if (search) {
    search.placeholder = translate(
      "SEARCH PREFECTURE...",
      "都道府県を検索..."
    );
  }

  renderStats();

  renderBook("ticket");
  renderBook("art");

  renderDetails();

  rebuildGallery();
  rebuildJourneyGallery();

  renderRarity();
  renderMapLabels();
  renderRegionLabels();

  updateGalleryControls("art");
  updateGalleryControls("journey");
}


function initLanguage() {
  $("#langSwitch").addEventListener(
    "click",
    () => {
      state.lang =
        state.lang === "en"
          ? "ja"
          : "en";

      renderLanguage();
    }
  );
}


/* ==========================================
   NAVIGATION
========================================== */

function showTab(name) {
  $$("[data-tab]").forEach(button => {
    const active =
      button.dataset.tab === name;

    button.classList.toggle(
      "active",
      active
    );

    button.setAttribute(
      "aria-selected",
      String(active)
    );
  });

  $$(".page").forEach(page => {
    page.hidden =
      page.id !== name;
  });

  if (name !== "journey") {
    stopPlayback();
  }

  refreshGalleryTimers();
}


function initNavigation() {
  $$("[data-tab]").forEach(button => {
    button.addEventListener(
      "click",
      () => {
        showTab(button.dataset.tab);
      }
    );
  });
}


/* ==========================================
   STATISTICS
========================================== */

function renderStats() {
  const index = getCurrentIndex();
  const p = PREFECTURES[index];

  if (!p) {
    return;
  }

  setText(
    "#currentStopStat",
    `${pad(index + 1)} / ${PREFECTURES.length}`
  );

  const claimed =
    getField(index, "ticketClaimed");

  const supply =
    getField(index, "ticketSupply");

  setText(
    "#ticketStat",
    claimed != null && supply != null
      ? `${claimed} / ${supply}`
      : "— / —"
  );

  setText(
    "#rarityStat",
    Array.isArray(SETTINGS.rarities)
      ? SETTINGS.rarities.length
      : 5
  );

  renderFeature(index);

  const images = SETTINGS.images || {};

  if (validUrl(images.hero)) {
    setImage("#heroImage", images.hero);
  }

  if (validUrl(SETTINGS.officialOpenSea)) {
    const link = $("#officialLink");

    if (link) {
      link.href = SETTINGS.officialOpenSea;
    }
  }

  setBilingualText(
    $(".stats > div:nth-child(2) small"),
    `${p.name} TICKETS`,
    `${p.nameJa || p.name} チケット`
  );
}


/* ==========================================
   FEATURE BANNERS
========================================== */

function renderFeature(index) {
  const p = PREFECTURES[index];

  if (!p) {
    return;
  }

  const ticketStatus =
    getField(index, "ticketStatus") ||
    "COMING SOON";

  const artStatus =
    getField(index, "artStatus") ||
    "COMING SOON";

  const claimed =
    getField(index, "ticketClaimed");

  const supply =
    getField(index, "ticketSupply");

  const ticketTitle =
    claimed != null && supply != null
      ? `${claimed} / ${supply} CLAIMED`
      : `${p.name} · ${statusText(ticketStatus)}`;

  setText(
    "#featureTicketTitle",
    ticketTitle
  );

  const gallery = getGallery(index);

  const artTitle =
    gallery.length > 1
      ? `${p.name} · ${gallery.length} ARTWORKS`
      : `${p.name} · ${statusText(artStatus)}`;

  setText(
    "#featureArtTitle",
    artTitle
  );

  setImage(
    "#featureTicketImage",
    getVisibleImage(index, "ticket")
  );

  setImage(
    "#featureArtImage",
    getVisibleImage(index, "art")
  );

  const ticketFeature =
    $("#featureTicketTitle")?.closest(".feature");

  const artFeature =
    $("#featureArtTitle")?.closest(".feature");


  if (ticketFeature) {
    const eyebrow =
      ticketFeature.querySelector(".eyebrow");

    if (eyebrow) {
      eyebrow.textContent =
        `${stopNumber(index)} · ${p.name}`;
    }

    const paragraph =
      ticketFeature.querySelector("p");

    if (paragraph) {
      setBilingualText(
        paragraph,

        claimed != null && supply != null
          ? `${claimed} of ${supply} Journey Tickets claimed.`
          : `Follow the Journey Ticket release for ${p.name}.`,

        claimed != null && supply != null
          ? `${supply}枚中${claimed}枚のJourney Ticketが取得されました。`
          : `${p.nameJa || p.name}のJourney Ticket公開情報をチェック！`
      );
    }

    const stamps =
      ticketFeature.querySelectorAll(".stamp");

    if (stamps[0]) {
      stamps[0].textContent =
        statusText(ticketStatus);
    }

    if (stamps[1]) {
      const max =
        getField(index, "ticketMaxPerWallet");

      stamps[1].textContent =
        max != null
          ? `${max} PER WALLET`
          : stopNumber(index);
    }
  }


  if (artFeature) {
    const eyebrow =
      artFeature.querySelector(".eyebrow");

    if (eyebrow) {
      eyebrow.textContent =
        `CHAPTER ${pad(index + 1)} · ${p.name}`;
    }

    const paragraph =
      artFeature.querySelector("p");

    if (paragraph) {
      setBilingualText(
        paragraph,

        gallery.length > 1
          ? `Explore ${gallery.length} pixel-art artworks from ${p.name}.`
          : `Discover the ${p.name} NFT artwork chapter.`,

        gallery.length > 1
          ? `${p.nameJa || p.name}のピクセルアート作品${gallery.length}点をご覧いただけます。`
          : `${p.nameJa || p.name}のNFTアート作品をチェック！`
      );
    }

    const stamp =
      artFeature.querySelector(".stamp");

    if (stamp) {
      stamp.textContent =
        statusText(artStatus);
    }
  }
}


/* ==========================================
   REGION FILTERS
========================================== */

function fillRegions(select) {
  if (!select) {
    return;
  }

  select.replaceChildren();

  select.add(
    new Option(
      "ALL REGIONS · 47 PREFECTURES",
      "all"
    )
  );

  REGIONS.forEach(region => {
    select.add(
      new Option(region, region)
    );
  });
}


function renderRegionLabels() {
  [
    "#ticketRegion",
    "#artRegion"
  ].forEach(selector => {
    const select = $(selector);

    if (!select || !select.options.length) {
      return;
    }

    select.options[0].textContent =
      translate(
        "ALL REGIONS · 47 PREFECTURES",
        "すべての地域 · 47都道府県"
      );
  });
}


function initFilters() {
  fillRegions($("#ticketRegion"));
  fillRegions($("#artRegion"));

  $("#ticketSearch").addEventListener(
    "input",
    () => renderBook("ticket")
  );

  $("#ticketRegion").addEventListener(
    "change",
    () => renderBook("ticket")
  );

  $("#artRegion").addEventListener(
    "change",
    () => renderBook("art")
  );
}


/* ==========================================
   PREFECTURE DETAILS
========================================== */

function createDetail(index, type) {
  const p = PREFECTURES[index];

  if (!p) {
    return make("div");
  }

  const isTicket =
    type === "ticket";

  const revealed =
    isRevealed(index, type);

  const url =
    getVisibleUrl(index, type);

  const imageUrl =
    getVisibleImage(index, type);

  const status =
    getField(
      index,
      isTicket
        ? "ticketStatus"
        : "artStatus"
    ) || "COMING SOON";

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
      `${getPrefectureName(p)} · ${
        isTicket
          ? "JOURNEY TICKET"
          : "NFT ART"
      }`
    )
  );


  /* IMAGE */

  if (validUrl(imageUrl)) {
    const image = make("img");

    image.src = imageUrl;
    image.alt = `${p.name} ${type}`;
    image.loading = "lazy";

    wrapper.append(image);

  } else if (!revealed) {
    const locked = make(
      "div",
      "detail-locked-image",
      "🔒"
    );

    locked.style.display = "flex";
    locked.style.alignItems = "center";
    locked.style.justifyContent = "center";
    locked.style.minHeight = "180px";
    locked.style.background = "#e9e2d1";
    locked.style.fontSize = "52px";
    locked.style.border =
      "2px solid #172033";
    locked.style.margin = "16px 0";

    wrapper.append(locked);
  }


  /* STATUS */

  wrapper.append(
    make(
      "p",
      "status",
      statusText(status)
    )
  );


  /* TICKET DETAILS */

  if (isTicket) {
    const supply =
      getField(index, "ticketSupply");

    const claimed =
      getField(index, "ticketClaimed");

    if (supply != null) {
      wrapper.append(
        make(
          "p",
          "",
          claimed != null
            ? `${claimed} / ${supply} CLAIMED`
            : `TOTAL SUPPLY: ${supply}`
        )
      );
    }

    const snapshot =
      getPrefectureSettings(index).snapshotDate;

    if (snapshot && revealed) {
      wrapper.append(
        make(
          "p",
          "",
          `SNAPSHOT: ${formatDate(snapshot)}`
        )
      );
    }

  } else {
    const extra =
      getPrefectureSettings(index);

    if (extra.mintDate && revealed) {
      wrapper.append(
        make(
          "p",
          "",
          `MINT: ${formatDate(extra.mintDate)}`
        )
      );
    }
  }


  /* ACTION BUTTONS */

  const actions = make(
    "div",
    "art-link-actions"
  );

  if (!isTicket && revealed) {
    const gallery = getGallery(index);

    if (gallery.length) {
      const galleryButton = make(
        "button",
        "action-link",
        translate(
          "VIEW ART GALLERY ↗",
          "作品ギャラリーを見る ↗"
        )
      );

      galleryButton.type = "button";

      galleryButton.addEventListener(
        "click",
        () => {
          state.art = index;

          selectGalleryPrefecture(index);

          showTab("art");
          renderBook("art");
          renderDetails();

          $("#galleryStage")?.scrollIntoView({
            behavior: reducedMotion()
              ? "auto"
              : "smooth",
            block: "center"
          });
        }
      );

      actions.append(galleryButton);
    }
  }


  if (validUrl(url)) {
    const link = make(
      "a",
      "action-link",
      translate(
        "VIEW ON OPENSEA ↗",
        "OPENSEAで見る ↗"
      )
    );

    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    actions.append(link);

  } else {
    actions.append(
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

  wrapper.append(actions);

  return wrapper;
}


/* ==========================================
   RENDER DETAILS
========================================== */

function renderDetails() {
  $("#ticketDetail").replaceChildren(
    createDetail(
      state.ticket,
      "ticket"
    )
  );

  $("#artDetail").replaceChildren(
    createDetail(
      state.art,
      "art"
    )
  );

  $("#journeyDetail").replaceChildren(
    createDetail(
      state.stop,
      "ticket"
    ),

    createDetail(
      state.stop,
      "art"
    )
  );
}


/* ==========================================
   TICKET / ART BOOK
========================================== */

function renderBook(type) {
  const isTicket =
    type === "ticket";

  const grid = $(
    isTicket
      ? "#ticketGrid"
      : "#artGrid"
  );

  const region = $(
    isTicket
      ? "#ticketRegion"
      : "#artRegion"
  ).value;

  const search = isTicket
    ? $("#ticketSearch")
        .value
        .trim()
        .toLowerCase()
    : "";

  grid.replaceChildren();

  let count = 0;

  PREFECTURES.forEach((p, index) => {
    if (
      region !== "all" &&
      p.region !== region
    ) {
      return;
    }

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
      (
        isTicket
          ? state.ticket
          : state.art
      ) === index;

    const button = make(
      "button",
      "book-tile" +
      (selected ? " selected" : "")
    );

    button.type = "button";

    button.setAttribute(
      "aria-label",
      `${p.name} ${type}`
    );

    const thumb = make(
      "div",
      "thumb"
    );

    const imageUrl = isTicket
      ? getVisibleImage(index, "ticket")
      : getArtBookImage(p, index);

    if (validUrl(imageUrl)) {
      const image = make("img");

      image.src = imageUrl;
      image.alt = "";
      image.loading = "lazy";

      thumb.append(image);

    } else {
      thumb.append(
        make(
          "span",
          "lock",
          "🔒"
        )
      );
    }

    button.append(
      thumb,

      make(
        "span",
        "name",
        `${pad(index + 1)} ${getPrefectureName(p)}`
      )
    );


    button.addEventListener(
      "click",
      () => {
        if (isTicket) {
          state.ticket = index;

        } else {
          state.art = index;

          selectGalleryPrefecture(index);
        }

        renderBook(type);
        renderDetails();

        const detail = $(
          isTicket
            ? "#ticketDetail"
            : "#artDetail"
        );

        detail?.scrollIntoView({
          behavior: reducedMotion()
            ? "auto"
            : "smooth",
          block: "nearest"
        });
      }
    );


    const entry = make(
      "div",
      "book-entry"
    );

    entry.append(button);

    const openSeaUrl =
      getVisibleUrl(index, type);

    if (validUrl(openSeaUrl)) {
      const link = make(
        "a",
        "book-opensea",
        translate(
          "VIEW ON OPENSEA ↗",
          "OPENSEAで見る ↗"
        )
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
          translate(
            "COMING SOON",
            "近日公開"
          )
        )
      );
    }

    grid.append(entry);
  });

  if (isTicket) {
    setText(
      "#ticketCount",
      `${count} / 47 DESTINATIONS`
    );
  }
}


/* ==========================================
   GALLERY CONFIGURATION
========================================== */

function getGalleryConfig(type) {
  if (type === "journey") {
    return {
      section: "#journeyArtGallery",
      stage: "#journeyGalleryStage",
      image: "#journeyGalleryImage",
      caption: "#journeyGalleryCaption",
      thumbs: "#journeyGalleryThumbs",
      prev: "#journeyPrevArt",
      next: "#journeyNextArt",
      toggle: "#toggleJourneyGalleryPlay"
    };
  }

  return {
    section: "#art",
    stage: "#galleryStage",
    image: "#galleryImage",
    caption: "#galleryCaption",
    thumbs: "#galleryThumbs",
    prev: "#prevArt",
    next: "#nextArt",
    toggle: "#toggleGalleryPlay"
  };
}


/* ==========================================
   GALLERY TIMER MANAGEMENT
========================================== */

function clearGalleryTimer(type) {
  const gallery = galleryStates[type];

  if (gallery.timer !== null) {
    clearTimeout(gallery.timer);
    gallery.timer = null;
  }
}


function galleryIsVisible(type) {
  if (document.hidden) {
    return false;
  }

  const pageId =
    type === "journey"
      ? "journey"
      : "art";

  const page = document.getElementById(pageId);

  return Boolean(
    page &&
    !page.hidden
  );
}


function scheduleGallery(type) {
  clearGalleryTimer(type);

  const gallery = galleryStates[type];

  if (
    !gallery.playing ||
    gallery.images.length < 2 ||
    !galleryIsVisible(type) ||
    reducedMotion()
  ) {
    return;
  }

  gallery.timer = setTimeout(() => {
    gallery.timer = null;

    if (
      !gallery.playing ||
      !galleryIsVisible(type)
    ) {
      return;
    }

    gallery.index =
      (gallery.index + 1) %
      gallery.images.length;

    renderAutoGallery(type);

    scheduleGallery(type);

  }, GALLERY_INTERVAL);
}


function refreshGalleryTimers() {
  scheduleGallery("art");
  scheduleGallery("journey");
}


/* ==========================================
   GALLERY PLAY / PAUSE
========================================== */

function setGalleryPlaying(type, playing) {
  const gallery = galleryStates[type];

  gallery.playing = Boolean(playing);

  updateGalleryControls(type);
  scheduleGallery(type);
}


function updateGalleryControls(type) {
  const gallery = galleryStates[type];
  const config = getGalleryConfig(type);

  const button = $(config.toggle);

  if (!button) {
    return;
  }

  const canPlay =
    gallery.images.length > 1;

  button.disabled = !canPlay;

  button.classList.toggle(
    "is-paused",
    !gallery.playing
  );

  if (!canPlay) {
    button.textContent = translate(
      "▶ PLAY",
      "▶ 再生"
    );

    button.setAttribute(
      "aria-label",
      translate(
        "Not enough artworks to play",
        "再生できる作品が不足しています"
      )
    );

    button.setAttribute(
      "aria-pressed",
      "false"
    );

    return;
  }

  button.textContent = gallery.playing
    ? translate(
        "⏸ PAUSE",
        "⏸ 一時停止"
      )
    : translate(
        "▶ PLAY",
        "▶ 再生"
      );

  button.setAttribute(
    "aria-label",
    gallery.playing
      ? translate(
          "Pause automatic slideshow",
          "自動再生を一時停止"
        )
      : translate(
          "Resume automatic slideshow",
          "自動再生を再開"
        )
  );

  button.setAttribute(
    "aria-pressed",
    String(!gallery.playing)
  );
}


/* ==========================================
   GALLERY MANUAL NAVIGATION

   Manual navigation pauses autoplay.
========================================== */

function galleryGoTo(type, index, manual = true) {
  const gallery = galleryStates[type];

  if (!gallery.images.length) {
    return;
  }

  const length = gallery.images.length;

  gallery.index =
    ((index % length) + length) % length;

  if (manual) {
    gallery.playing = false;
    clearGalleryTimer(type);
  }

  renderAutoGallery(type);
  updateGalleryControls(type);

  if (!manual) {
    scheduleGallery(type);
  }
}


function galleryNext(type, manual = true) {
  const gallery = galleryStates[type];

  galleryGoTo(
    type,
    gallery.index + 1,
    manual
  );
}


function galleryPrevious(type, manual = true) {
  const gallery = galleryStates[type];

  galleryGoTo(
    type,
    gallery.index - 1,
    manual
  );
}


/* ==========================================
   GALLERY RENDERING
========================================== */

function renderAutoGallery(type) {
  const gallery = galleryStates[type];
  const config = getGalleryConfig(type);

  const p =
    PREFECTURES[gallery.prefecture];

  if (!p) {
    return;
  }

  const stage = $(config.stage);
  const section = $(config.section);

  if (!gallery.images.length) {
    if (type === "journey") {
      section.hidden = true;

    } else if (stage) {
      stage.hidden = true;
    }

    setImage(config.image, null);

    setText(
      config.caption,
      translate(
        `${p.name} ART GALLERY · COMING SOON`,
        `${p.nameJa || p.name}の作品は近日公開`
      )
    );

    updateGalleryControls(type);

    return;
  }

  if (type === "journey") {
    section.hidden = false;

  } else if (stage) {
    stage.hidden = false;
  }

  gallery.index = Math.max(
    0,
    Math.min(
      gallery.images.length - 1,
      gallery.index
    )
  );

  const src =
    gallery.images[gallery.index];

  setImage(config.image, src);

  const image = $(config.image);

  if (image) {
    image.alt =
      `${p.name} artwork ${gallery.index + 1}`;
  }

  const suffix =
    gallery.index === gallery.images.length - 1
      ? translate(
          " · FINAL ARTWORK",
          " · 最後の作品"
        )
      : "";

  setText(
    config.caption,
    `${getPrefectureName(p)} · ${
      pad(gallery.index + 1)
    } / ${pad(gallery.images.length)}${suffix}`
  );

  $$(config.thumbs + " button").forEach(
    (button, index) => {
      const selected =
        index === gallery.index;

      button.classList.toggle(
        "selected",
        selected
      );

      button.setAttribute(
        "aria-pressed",
        String(selected)
      );

      if (selected) {
        button.scrollIntoView({
          behavior: reducedMotion()
            ? "auto"
            : "smooth",
          block: "nearest",
          inline: "nearest"
        });
      }
    }
  );

  if (type === "art") {
    state.gallery = gallery.index;
    state.galleryPrefecture =
      gallery.prefecture;
  }

  updateGalleryControls(type);
}


/* ==========================================
   GALLERY THUMBNAILS
========================================== */

function rebuildAutoGallery(type) {
  const gallery = galleryStates[type];
  const config = getGalleryConfig(type);

  const p =
    PREFECTURES[gallery.prefecture];

  if (!p) {
    return;
  }

  gallery.images =
    getGallery(gallery.prefecture);

  gallery.index = Math.max(
    0,
    Math.min(
      gallery.index,
      Math.max(0, gallery.images.length - 1)
    )
  );

  const container = $(config.thumbs);

  if (!container) {
    return;
  }

  container.replaceChildren();

  gallery.images.forEach((src, index) => {
    const button = make("button");

    button.type = "button";

    button.setAttribute(
      "aria-label",
      `${p.name} artwork ${index + 1}`
    );

    const image = make("img");

    image.src = src;
    image.alt =
      `${p.name} artwork ${index + 1}`;

    image.loading = "lazy";

    button.append(image);

    button.addEventListener(
      "click",
      () => {
        galleryGoTo(type, index, true);
      }
    );

    container.append(button);
  });

  renderAutoGallery(type);
  scheduleGallery(type);
}


/* ==========================================
   NFT ART BOOK GALLERY
========================================== */

function selectGalleryPrefecture(index) {
  state.galleryPrefecture = index;
  state.gallery = 0;

  const gallery = galleryStates.art;

  gallery.prefecture = index;
  gallery.index = 0;

  gallery.playing = true;

  rebuildAutoGallery("art");
}


function rebuildGallery() {
  const gallery = galleryStates.art;

  gallery.prefecture =
    state.galleryPrefecture;

  gallery.index =
    state.gallery;

  rebuildAutoGallery("art");
}


function renderGallery() {
  renderAutoGallery("art");
}


/* ==========================================
   JOURNEY GALLERY
========================================== */

function selectJourneyGalleryPrefecture(index) {
  const gallery = galleryStates.journey;

  gallery.prefecture = index;
  gallery.index = 0;

  gallery.playing = true;

  rebuildJourneyGallery();
}


function rebuildJourneyGallery() {
  const gallery = galleryStates.journey;

  const p =
    PREFECTURES[gallery.prefecture];

  if (!p) {
    return;
  }

  setText(
    "#journeyGalleryTitle",
    `${getPrefectureName(p)} ART GALLERY`
  );

  rebuildAutoGallery("journey");
}


/* ==========================================
   MOBILE SWIPE SUPPORT
========================================== */

function initGallerySwipe(type) {
  const config = getGalleryConfig(type);
  const stage = $(config.stage);

  if (!stage) {
    return;
  }

  let startX = 0;
  let startY = 0;
  let tracking = false;

  stage.addEventListener(
    "touchstart",
    event => {
      if (event.touches.length !== 1) {
        tracking = false;
        return;
      }

      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;

      tracking = true;
    },
    { passive: true }
  );

  stage.addEventListener(
    "touchend",
    event => {
      if (!tracking) {
        return;
      }

      tracking = false;

      const touch =
        event.changedTouches[0];

      if (!touch) {
        return;
      }

      const deltaX =
        touch.clientX - startX;

      const deltaY =
        touch.clientY - startY;

      if (
        Math.abs(deltaX) < 45 ||
        Math.abs(deltaX) <= Math.abs(deltaY)
      ) {
        return;
      }

      if (deltaX < 0) {
        galleryNext(type, true);

      } else {
        galleryPrevious(type, true);
      }
    },
    { passive: true }
  );

  stage.addEventListener(
    "touchcancel",
    () => {
      tracking = false;
    },
    { passive: true }
  );
}


/* ==========================================
   INITIALIZE GALLERY CONTROLS
========================================== */

function initAutoGalleryControls(type) {
  const config = getGalleryConfig(type);

  const previous = $(config.prev);
  const next = $(config.next);
  const toggle = $(config.toggle);

  if (previous) {
    previous.addEventListener(
      "click",
      () => {
        galleryPrevious(type, true);
      }
    );
  }

  if (next) {
    next.addEventListener(
      "click",
      () => {
        galleryNext(type, true);
      }
    );
  }

  if (toggle) {
    toggle.addEventListener(
      "click",
      () => {
        const gallery = galleryStates[type];

        setGalleryPlaying(
          type,
          !gallery.playing
        );
      }
    );
  }

  initGallerySwipe(type);
}


function initGallery() {
  initAutoGalleryControls("art");
  initAutoGalleryControls("journey");

  selectGalleryPrefecture(
    getCurrentIndex()
  );

  selectJourneyGalleryPrefecture(
    getCurrentIndex()
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        clearGalleryTimer("art");
        clearGalleryTimer("journey");

        stopPlayback();

      } else {
        refreshGalleryTimers();
      }
    }
  );
}


/* ==========================================
   RARITY
========================================== */

function getRarities() {
  return Array.isArray(SETTINGS.rarities)
    ? SETTINGS.rarities
    : [];
}


function renderRarity() {
  const rarities = getRarities();

  if (!rarities.length) {
    return;
  }

  const rarity =
    rarities[state.rarity];

  if (!rarity) {
    return;
  }

  setImage(
    "#rarityImage",
    rarity.frame
  );

  const rarityImage =
    $("#rarityImage");

  if (rarityImage) {
    rarityImage.alt =
      `${rarity.name} rarity frame`;
  }

  setText(
    "#rarityTitle",
    `${rarity.name} · ${rarity.code}`
  );

  setText(
    "#rarityRate",
    rarity.rate || "TBA"
  );

  const exampleSupply =
    SETTINGS.rarityExampleSupply || 99;

  setText(
    "#rarityCount",
    rarity.count != null
      ? `${rarity.count} / ${exampleSupply} — EXAMPLE ONLY`
      : "FINAL ALLOCATION TBA"
  );

  $$("#rarityTabs button").forEach(
    (button, index) => {
      button.classList.toggle(
        "active",
        index === state.rarity
      );

      button.setAttribute(
        "aria-pressed",
        String(index === state.rarity)
      );
    }
  );

  setText(
    "#rarityNoticeTitle",
    `ILLUSTRATIVE EXAMPLE · ${exampleSupply} NFTs`
  );

  setText(
    "#rarityBreakdown",
    rarities
      .map(r =>
        `${r.code} ${r.count}`
      )
      .join(" · ")
  );
}


function initRarity() {
  const container =
    $("#rarityTabs");

  container.replaceChildren();

  getRarities().forEach(
    (rarity, index) => {
      const button = make(
        "button",
        "",
        rarity.code
      );

      button.type = "button";

      button.addEventListener(
        "click",
        () => {
          state.rarity = index;
          renderRarity();
        }
      );

      container.append(button);
    }
  );

  renderRarity();
}


/* ==========================================
   JOURNEY ROUTE

   6 STOPS PER ROW
========================================== */

const svgNS =
  "http://www.w3.org/2000/svg";


function createCoordinates() {
  const columns = 6;

  const spacingX = 102;
  const spacingY = 125;

  const startX = 75;
  const startY = 75;

  coordinates = PREFECTURES.map(
    (p, index) => {
      const row =
        Math.floor(index / columns);

      const column =
        index % columns;

      const xColumn =
        row % 2 === 0
          ? column
          : columns - 1 - column;

      return {
        x: startX + xColumn * spacingX,
        y: startY + row * spacingY
      };
    }
  );

  cumulative = [0];

  for (
    let i = 1;
    i < coordinates.length;
    i++
  ) {
    const a = coordinates[i - 1];
    const b = coordinates[i];

    cumulative.push(
      cumulative[i - 1] +
      Math.hypot(
        b.x - a.x,
        b.y - a.y
      )
    );
  }
}


/* ==========================================
   MAP LABELS
========================================== */

function renderMapLabels() {
  setText(
    "#mapCounter",
    `STOP ${pad(state.stop + 1)} / 47`
  );

  $$(".route-node").forEach(
    (node, index) => {
      const p = PREFECTURES[index];

      node.setAttribute(
        "aria-label",
        `${pad(index + 1)} ${getPrefectureName(p)}`
      );
    }
  );
}


/* ==========================================
   TRUCK POSITION
========================================== */

function positionTruck(distance) {
  const roadPath =
    $("#roadOutline");

  const progressPath =
    $("#routeProgress");

  const truck =
    $("#truckSprite");

  const total =
    roadPath.getTotalLength();

  const d = Math.max(
    0,
    Math.min(total, distance)
  );

  const point =
    roadPath.getPointAtLength(d);

  const ahead =
    roadPath.getPointAtLength(
      Math.min(total, d + 3)
    );

  const behind =
    roadPath.getPointAtLength(
      Math.max(0, d - 3)
    );

  truck.setAttribute(
    "x",
    point.x - 32
  );

  truck.setAttribute(
    "y",
    point.y - 48
  );

  const images =
    SETTINGS.images || {};

  const direction =
    ahead.x < behind.x
      ? images.truckLeft
      : images.truckRight;

  if (validUrl(direction)) {
    truck.setAttribute(
      "href",
      direction
    );
  }

  progressPath.style.strokeDasharray =
    `${d} ${total + 2}`;
}


/* ==========================================
   MOVE TO DESTINATION
========================================== */

function moveTo(index, animate = true) {
  state.stop = Math.max(
    0,
    Math.min(
      PREFECTURES.length - 1,
      index
    )
  );

  renderMapLabels();

  $$(".route-node").forEach(
    (node, i) => {
      node.classList.toggle(
        "selected",
        i === state.stop
      );

      node.classList.toggle(
        "visited",
        i < state.stop
      );
    }
  );

  renderDetails();

  selectJourneyGalleryPrefecture(
    state.stop
  );

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  const start =
    truckDistance;

  const end =
    cumulative[state.stop];

  if (!animate || reducedMotion()) {
    truckDistance = end;

    positionTruck(end);

    return;
  }

  const begin =
    performance.now();

  const duration = Math.min(
    2500,
    500 + Math.abs(end - start) * 2
  );

  function frame(now) {
    const t = Math.min(
      1,
      (now - begin) / duration
    );

    const eased =
      t * t * (3 - 2 * t);

    truckDistance =
      start + (end - start) * eased;

    positionTruck(truckDistance);

    if (t < 1) {
      animationId =
        requestAnimationFrame(frame);

    } else {
      truckDistance = end;
      animationId = null;
    }
  }

  animationId =
    requestAnimationFrame(frame);
}


/* ==========================================
   JOURNEY PLAYBACK
========================================== */

function stopPlayback() {
  state.playing = false;

  if (playTimer !== null) {
    clearTimeout(playTimer);
    playTimer = null;
  }

  setText(
    "#playRoute",
    "▶ PLAY"
  );
}


function playNext() {
  if (!state.playing) {
    return;
  }

  if (
    state.stop >=
    PREFECTURES.length - 1
  ) {
    stopPlayback();
    return;
  }

  moveTo(
    state.stop + 1
  );

  playTimer = setTimeout(
    playNext,
    2700
  );
}


/* ==========================================
   INITIALIZE JOURNEY MAP
========================================== */

function initRoute() {
  createCoordinates();

  const pathData =
    "M " +
    coordinates
      .map(p =>
        `${p.x} ${p.y}`
      )
      .join(" L ");

  [
    "#roadOutline",
    "#road",
    "#routeProgress"
  ].forEach(selector => {
    $(selector).setAttribute(
      "d",
      pathData
    );
  });

  const nodes =
    $("#routeNodes");

  nodes.replaceChildren();

  coordinates.forEach(
    (point, index) => {
      const group =
        document.createElementNS(
          svgNS,
          "g"
        );

      group.setAttribute(
        "class",
        "route-node"
      );

      group.setAttribute(
        "transform",
        `translate(${point.x} ${point.y})`
      );

      group.setAttribute(
        "role",
        "button"
      );

      group.setAttribute(
        "tabindex",
        "0"
      );

      const circle =
        document.createElementNS(
          svgNS,
          "circle"
        );

      circle.setAttribute(
        "r",
        "26"
      );

      const label =
        document.createElementNS(
          svgNS,
          "text"
        );

      label.textContent =
        pad(index + 1);

      group.append(
        circle,
        label
      );

      group.addEventListener(
        "click",
        () => {
          stopPlayback();
          moveTo(index);
        }
      );

      group.addEventListener(
        "keydown",
        event => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();

            stopPlayback();
            moveTo(index);
          }
        }
      );

      nodes.append(group);
    }
  );


  /* PREVIOUS STOP */

  $("#prevStop").addEventListener(
    "click",
    () => {
      stopPlayback();

      moveTo(
        state.stop - 1
      );
    }
  );


  /* NEXT STOP */

  $("#nextStop").addEventListener(
    "click",
    () => {
      stopPlayback();

      moveTo(
        state.stop + 1
      );
    }
  );


  /* PLAY ROUTE */

  $("#playRoute").addEventListener(
    "click",
    () => {
      if (state.playing) {
        stopPlayback();
        return;
      }

      if (
        state.stop >=
        PREFECTURES.length - 1
      ) {
        moveTo(0, false);
      }

      state.playing = true;

      setText(
        "#playRoute",
        "■ STOP"
      );

      playNext();
    }
  );

  moveTo(
    getCurrentIndex(),
    false
  );
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

    const loading = $("#loading");

    if (loading) {
      loading.hidden = true;
    }

    showTab("tickets");

  } catch (error) {
    console.error(
      "TRAVELING TAKOYAKI:",
      error
    );

    const loading = $("#loading");

    if (loading) {
      loading.hidden = true;
    }

    const errorBox = $("#error");

    if (errorBox) {
      errorBox.hidden = false;

      errorBox.textContent =
        "Unable to load the journey data. " +
        "Please check prefectures.json and settings.json.";
    }
  }
}


/* ==========================================
   START APPLICATION
========================================== */

init();
