
"use strict";

/* ==========================================
   TRAVELING TAKOYAKI
   JAPAN 47 JOURNEY
   LONG-TERM VERSION

   IMAGE REVEAL CONTROL
   ticketRevealed / artRevealed

   BUTTON LAYOUT FIX PRESERVED
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

const HOKKAIDO_ART_BOOK_IMAGE =
  "https://ul.h3z.jp/oyLZXgar.png";

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
  if (!image) return;

  if (validUrl(src)) {
    image.src = src;
    image.hidden = false;
  } else {
    image.removeAttribute("src");
    image.hidden = true;
  }
}

function formatDate(value) {
  return value ? String(value) : null;
}

function stopNumber(index) {
  return `STOP ${pad(index + 1)}`;
}

function getCurrentIndex() {
  const current = Number(SETTINGS.currentStop) || 1;

  return Math.max(
    0,
    Math.min(PREFECTURES.length - 1, current - 1)
  );
}

function getPrefectureName(p) {
  return state.lang === "ja" && p.nameJa
    ? p.nameJa
    : p.name;
}

function getPrefectureSettings(index) {
  const p = PREFECTURES[index];

  if (!p) return {};

  const key = p.name.toLowerCase().replace(
    /[^a-z0-9]/g,
    ""
  );

  return SETTINGS[key] || {};
}

function getField(index, key) {
  const p = PREFECTURES[index] || {};
  const extra = getPrefectureSettings(index);

  if (p[key] != null) return p[key];
  if (extra[key] != null) return extra[key];

  return null;
}

function statusText(status) {
  const values = {
    "SOLD OUT": ["SOLD OUT", "配布終了"],
    "AVAILABLE": ["AVAILABLE", "公開中"],
    "LIVE": ["LIVE NOW", "販売中"],
    "ON SALE": ["ON SALE", "販売中"],
    "COMING SOON": ["COMING SOON", "近日公開"],
    "MINTING SOON": ["MINTING SOON", "ミント開始間近"],
    "UPCOMING": ["UPCOMING", "公開予定"],
    "ENDED": ["ENDED", "販売終了"]
  };

  const pair = values[status];

  return pair
    ? translate(pair[0], pair[1])
    : status || translate("COMING SOON", "近日公開");
}

/* ==========================================
   IMAGE REVEAL CONTROL

   true  = image is public
   false = show lock

   IMPORTANT:
   This controls website display only.
   Image URLs in public JSON are not secret.
========================================== */

function isRevealed(index, type) {
  const key = type === "ticket"
    ? "ticketRevealed"
    : "artRevealed";

  const value = getField(index, key);

  /*
    Backward compatibility:
    If the flag is missing, only Hokkaido
    is revealed by default.
  */

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
    ? p.ticketImage
    : p.artImage;
}

function getVisibleUrl(index, type) {
  if (!isRevealed(index, type)) {
    return null;
  }

  const p = PREFECTURES[index] || {};

  return type === "ticket"
    ? p.ticketUrl
    : p.artUrl;
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

  return gallery.filter(validUrl);
}

function appendLockedImage(container, className = "") {
  const locked = make(
    "div",
    className,
    "🔒"
  );

  locked.setAttribute(
    "aria-label",
    translate(
      "Artwork locked until reveal",
      "公開までロックされています"
    )
  );

  container.append(locked);

  return locked;
}

function setText(selector, value) {
  const node = $(selector);
  if (node) node.textContent = value;
}

function setBilingualText(node, en, ja) {
  if (!node) return;

  node.dataset.en = en;
  node.dataset.ja = ja;
  node.textContent = translate(en, ja);
}

/* ==========================================
   LOAD DATA
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
    throw new Error("Invalid prefecture data.");
  }

  if (!settings || typeof settings !== "object") {
    throw new Error("Invalid settings.json");
  }

  PREFECTURES = prefectures;
  SETTINGS = settings;

  const current = getCurrentIndex();

  state.ticket = current;
  state.art = current;
  state.galleryPrefecture = current;
  state.stop = current;
}

/* ==========================================
   LANGUAGE
========================================== */

function renderLanguage() {
  document.documentElement.lang = state.lang;

  setText(
    "#langSwitch",
    state.lang === "en" ? "日本語" : "ENGLISH"
  );

  $$("[data-en][data-ja]").forEach(node => {
    node.textContent = node.dataset[state.lang];
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
  renderRarity();
  renderMapLabels();
  renderRegionLabels();
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
    button.setAttribute(
      "aria-selected",
      String(active)
    );
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
   CURRENT FEATURE / STATISTICS
========================================== */

function renderStats() {
  const index = getCurrentIndex();
  const p = PREFECTURES[index];

  if (!p) return;

  const total = PREFECTURES.length;

  setText(
    "#currentStopStat",
    `${pad(index + 1)} / ${total}`
  );

  const claimed = getField(index, "ticketClaimed");
  const supply = getField(index, "ticketSupply");

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

  setImage("#heroImage", images.hero);

  if (validUrl(SETTINGS.officialOpenSea)) {
    const link = $("#officialLink");
    if (link) link.href = SETTINGS.officialOpenSea;
  }

  const ticketStatLabel =
    $(".stats > div:nth-child(2) small");

  setBilingualText(
    ticketStatLabel,
    `${p.name} TICKETS`,
    `${p.nameJa || p.name} チケット`
  );
}

function renderFeature(index) {
  const p = PREFECTURES[index];
  if (!p) return;

  const ticketStatus =
    getField(index, "ticketStatus") || "COMING SOON";

  const artStatus =
    getField(index, "artStatus") || "COMING SOON";

  const claimed = getField(index, "ticketClaimed");
  const supply = getField(index, "ticketSupply");

  const ticketTitle =
    claimed != null && supply != null
      ? `${claimed} / ${supply} CLAIMED`
      : `${p.name} · ${statusText(ticketStatus)}`;

  setText("#featureTicketTitle", ticketTitle);

  const gallery = getGallery(index);

  const artTitle = gallery.length
    ? `${p.name} · ${gallery.length} ARTWORKS`
    : `${p.name} · ${statusText(artStatus)}`;

  setText("#featureArtTitle", artTitle);

  setImage(
    "#featureTicketImage",
    getVisibleImage(index, "ticket")
  );

  setImage(
    "#featureArtImage",
    getVisibleImage(index, "art")
  );

  const ticketFeature = $("#featureTicketTitle")
    ?.closest(".feature");

  const artFeature = $("#featureArtTitle")
    ?.closest(".feature");

  if (ticketFeature) {
    const eyebrow = ticketFeature.querySelector(
      ".eyebrow"
    );

    if (eyebrow) {
      eyebrow.textContent =
        `${stopNumber(index)} · ${p.name}`;
    }

    const paragraph = ticketFeature.querySelector("p");

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

    const stamps = ticketFeature.querySelectorAll(
      ".stamp"
    );

    if (stamps[0]) {
      stamps[0].textContent = statusText(ticketStatus);
    }

    if (stamps[1]) {
      const max = getField(index, "ticketMaxPerWallet");

      stamps[1].textContent =
        max != null
          ? `${max} PER WALLET`
          : stopNumber(index);
    }
  }

  if (artFeature) {
    const eyebrow = artFeature.querySelector(
      ".eyebrow"
    );

    if (eyebrow) {
      eyebrow.textContent =
        `CHAPTER ${pad(index + 1)} · ${p.name}`;
    }

    const paragraph = artFeature.querySelector("p");

    if (paragraph) {
      setBilingualText(
        paragraph,
        gallery.length
          ? `Explore ${gallery.length} pixel-art artworks from ${p.name}.`
          : `The ${p.name} NFT artwork collection is being prepared.`,
        gallery.length
          ? `${p.nameJa || p.name}のピクセルアート作品${gallery.length}点をご覧いただけます。`
          : `${p.nameJa || p.name}のNFTアートコレクションは準備中です。`
      );
    }

    const stamp = artFeature.querySelector(".stamp");

    if (stamp) {
      stamp.textContent = statusText(artStatus);
    }
  }
}

/* ==========================================
   REGIONAL FILTERS
========================================== */

function fillRegions(select) {
  if (!select) return;

  select.replaceChildren();

  select.add(
    new Option(
      "ALL REGIONS · 47 PREFECTURES",
      "all"
    )
  );

  REGIONS.forEach(region => {
    select.add(new Option(region, region));
  });
}

function renderRegionLabels() {
  ["#ticketRegion", "#artRegion"].forEach(selector => {
    const select = $(selector);
    if (!select || !select.options.length) return;

    select.options[0].textContent = translate(
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
   FIXED TWO-BUTTON LAYOUT
========================================== */

function createDetail(index, type) {
  const p = PREFECTURES[index];
  const isTicket = type === "ticket";
  const revealed = isRevealed(index, type);

  const url = getVisibleUrl(index, type);
  const imageUrl = getVisibleImage(index, type);

  const status = isTicket
    ? p.ticketStatus
    : p.artStatus;

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
        isTicket ? "JOURNEY TICKET" : "NFT ART"
      }`
    )
  );

  if (validUrl(imageUrl)) {
    const image = make("img");

    image.src = imageUrl;
    image.alt = `${p.name} ${type}`;
    image.loading = "lazy";

    wrapper.append(image);
  } else if (!revealed) {
    const locked = make(
      "div",
      "detail-locked-image"
    );

    locked.style.display = "flex";
    locked.style.alignItems = "center";
    locked.style.justifyContent = "center";
    locked.style.minHeight = "180px";
    locked.style.background = "#e9e2d1";
    locked.style.fontSize = "52px";
    locked.style.border = "2px solid #172033";
    locked.style.margin = "16px 0";

    locked.textContent = "🔒";

    wrapper.append(locked);
  }

  wrapper.append(
    make(
      "p",
      "status",
      statusText(status)
    )
  );

  if (isTicket) {
    const supply = getField(index, "ticketSupply");
    const claimed = getField(index, "ticketClaimed");

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
    const extra = getPrefectureSettings(index);

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

  const actions = make("div", "art-link-actions");

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

      galleryButton.addEventListener("click", () => {
        selectGalleryPrefecture(index);

        const gallerySection = $(".gallery-stage");

        gallerySection?.scrollIntoView({
          behavior: reducedMotion()
            ? "auto"
            : "smooth",
          block: "center"
        });
      });

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
   TICKET BOOK / ART BOOK
========================================== */

function renderBook(type) {
  const isTicket = type === "ticket";

  const grid = $(
    isTicket ? "#ticketGrid" : "#artGrid"
  );

  const region = $(
    isTicket ? "#ticketRegion" : "#artRegion"
  ).value;

  const search = isTicket
    ? $("#ticketSearch").value.trim().toLowerCase()
    : "";

  grid.replaceChildren();

  let count = 0;

  PREFECTURES.forEach((p, index) => {
    if (region !== "all" && p.region !== region) {
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
        make("span", "lock", "🔒")
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

    button.addEventListener("click", () => {
      if (isTicket) {
        state.ticket = index;
      } else {
        state.art = index;
        selectGalleryPrefecture(index);
      }

      renderBook(type);
      renderDetails();

      const detail = $(
        isTicket ? "#ticketDetail" : "#artDetail"
      );

      detail?.scrollIntoView({
        behavior: reducedMotion()
          ? "auto"
          : "smooth",
        block: "nearest"
      });
    });

    const entry = make("div", "book-entry");
    entry.append(button);

    const openSeaUrl = getVisibleUrl(index, type);

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
          translate("COMING SOON", "近日公開")
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
   NFT ART GALLERY
========================================== */

function selectGalleryPrefecture(index) {
  state.galleryPrefecture = index;
  state.gallery = 0;

  rebuildGallery();
}

function rebuildGallery() {
  const index = state.galleryPrefecture;
  const p = PREFECTURES[index];

  currentGallery = getGallery(index);

  const container = $("#galleryThumbs");
  container.replaceChildren();

  const stage = $(".gallery-stage");

  const heading = stage?.previousElementSibling;

  if (heading && heading.tagName === "H3") {
    heading.textContent = `${p.name} ART GALLERY`;
  }

  if (!currentGallery.length) {
    if (stage) stage.hidden = true;

    setText(
      "#galleryCaption",
      translate(
        `${p.name} ART GALLERY · COMING SOON`,
        `${p.nameJa || p.name}の作品は近日公開`
      )
    );

    setImage("#galleryImage", null);

    return;
  }

  if (stage) stage.hidden = false;

  currentGallery.forEach((src, galleryIndex) => {
    const button = make("button");
    button.type = "button";

    button.setAttribute(
      "aria-label",
      `${p.name} artwork ${galleryIndex + 1}`
    );

    const image = make("img");

    image.src = src;
    image.alt = `${p.name} artwork ${galleryIndex + 1}`;
    image.loading = "lazy";

    button.append(image);

    button.addEventListener("click", () => {
      state.gallery = galleryIndex;
      renderGallery();
    });

    container.append(button);
  });

  renderGallery();
}

function renderGallery() {
  const index = state.galleryPrefecture;
  const p = PREFECTURES[index];

  if (!p) return;

  currentGallery = getGallery(index);

  if (!currentGallery.length) {
    const stage = $(".gallery-stage");
    if (stage) stage.hidden = true;

    setImage("#galleryImage", null);

    setText(
      "#galleryCaption",
      translate(
        `${p.name} ART GALLERY · COMING SOON`,
        `${p.nameJa || p.name}の作品は近日公開`
      )
    );

    return;
  }

  const stage = $(".gallery-stage");
  if (stage) stage.hidden = false;

  state.gallery = Math.max(
    0,
    Math.min(
      currentGallery.length - 1,
      state.gallery
    )
  );

  const galleryIndex = state.gallery;
  const src = currentGallery[galleryIndex];

  setImage("#galleryImage", src);

  const isLast =
    galleryIndex === currentGallery.length - 1;

  const suffix = isLast
    ? " · FINAL ARTWORK"
    : "";

  setText(
    "#galleryCaption",
    `${getPrefectureName(p)} · ${
      pad(galleryIndex + 1)
    } / ${pad(currentGallery.length)}${suffix}`
  );

  $$("#galleryThumbs button").forEach(
    (button, i) => {
      button.classList.toggle(
        "selected",
        i === galleryIndex
      );

      button.setAttribute(
        "aria-pressed",
        String(i === galleryIndex)
      );
    }
  );
}

function initGallery() {
  $("#prevArt").addEventListener("click", () => {
    if (!currentGallery.length) return;

    state.gallery =
      (
        state.gallery - 1 +
        currentGallery.length
      ) % currentGallery.length;

    renderGallery();
  });

  $("#nextArt").addEventListener("click", () => {
    if (!currentGallery.length) return;

    state.gallery =
      (state.gallery + 1) %
      currentGallery.length;

    renderGallery();
  });

  selectGalleryPrefecture(getCurrentIndex());
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

  if (!rarities.length) return;

  const rarity = rarities[state.rarity];
  if (!rarity) return;

  setImage("#rarityImage", rarity.frame);

  $("#rarityImage").alt =
    `${rarity.name} rarity frame`;

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
      .map(r => `${r.code} ${r.count}`)
      .join(" · ")
  );
}

function initRarity() {
  const container = $("#rarityTabs");
  container.replaceChildren();

  getRarities().forEach((rarity, index) => {
    const button = make(
      "button",
      "",
      rarity.code
    );

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

    const xColumn =
      row % 2 === 0
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
      Math.hypot(
        b.x - a.x,
        b.y - a.y
      )
    );
  }
}

function renderMapLabels() {
  setText(
    "#mapCounter",
    `STOP ${pad(state.stop + 1)} / 47`
  );

  $$(".route-node").forEach((node, index) => {
    const p = PREFECTURES[index];

    node.setAttribute(
      "aria-label",
      `${pad(index + 1)} ${getPrefectureName(p)}`
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

  const direction =
    ahead.x < behind.x
      ? images.truckLeft
      : images.truckRight;

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

  setText("#playRoute", "▶ PLAY");
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
    coordinates
      .map(p => `${p.x} ${p.y}`)
      .join(" L ");

  ["#roadOutline", "#road", "#routeProgress"]
    .forEach(selector => {
      $(selector).setAttribute("d", pathData);
    });

  const nodes = $("#routeNodes");
  nodes.replaceChildren();

  coordinates.forEach((point, index) => {
    const group = document.createElementNS(
      svgNS,
      "g"
    );

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
      if (
        event.key === "Enter" ||
        event.key === " "
      ) {
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
    setText("#playRoute", "■ STOP");

    playNext();
  });

  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        stopPlayback();
      }
    }
  );

  moveTo(getCurrentIndex(), false);
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
    console.error(
      "TRAVELING TAKOYAKI:",
      error
    );

    const loading = $("#loading");
    if (loading) loading.hidden = true;

    const errorBox = $("#error");

    if (errorBox) {
      errorBox.hidden = false;

      errorBox.textContent =
        "Unable to load the journey data. " +
        "Please check prefectures.json and settings.json.";
    }
  }
}

init();
