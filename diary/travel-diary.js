
(() => {
"use strict";

/* =====================================================
   TRAVELING TAKOYAKI — TRAVEL DIARY
   47 PREFECTURES EDITION
   ===================================================== */

const $ = id => document.getElementById(id);

const safe = value => String(value ?? "").replace(
  /[&<>"']/g,
  c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[c])
);

const pad = n => String(n).padStart(2,"0");

/* =====================================================
   47 PREFECTURES
   ===================================================== */

const prefectures = [
  ["HOKKAIDO","北海道","HOKKAIDO"],
  ["AOMORI","青森県","TOHOKU"],
  ["AKITA","秋田県","TOHOKU"],
  ["IWATE","岩手県","TOHOKU"],
  ["YAMAGATA","山形県","TOHOKU"],
  ["FUKUSHIMA","福島県","TOHOKU"],
  ["MIYAGI","宮城県","TOHOKU"],
  ["IBARAKI","茨城県","KANTO"],
  ["TOCHIGI","栃木県","KANTO"],
  ["GUNMA","群馬県","KANTO"],
  ["SAITAMA","埼玉県","KANTO"],
  ["CHIBA","千葉県","KANTO"],
  ["TOKYO","東京都","KANTO"],
  ["KANAGAWA","神奈川県","KANTO"],
  ["NIIGATA","新潟県","CHUBU"],
  ["TOYAMA","富山県","CHUBU"],
  ["ISHIKAWA","石川県","CHUBU"],
  ["FUKUI","福井県","CHUBU"],
  ["YAMANASHI","山梨県","CHUBU"],
  ["NAGANO","長野県","CHUBU"],
  ["GIFU","岐阜県","CHUBU"],
  ["SHIZUOKA","静岡県","CHUBU"],
  ["AICHI","愛知県","CHUBU"],
  ["MIE","三重県","KANSAI"],
  ["SHIGA","滋賀県","KANSAI"],
  ["KYOTO","京都府","KANSAI"],
  ["OSAKA","大阪府","KANSAI"],
  ["HYOGO","兵庫県","KANSAI"],
  ["NARA","奈良県","KANSAI"],
  ["WAKAYAMA","和歌山県","KANSAI"],
  ["TOTTORI","鳥取県","CHUGOKU"],
  ["SHIMANE","島根県","CHUGOKU"],
  ["OKAYAMA","岡山県","CHUGOKU"],
  ["HIROSHIMA","広島県","CHUGOKU"],
  ["YAMAGUCHI","山口県","CHUGOKU"],
  ["TOKUSHIMA","徳島県","SHIKOKU"],
  ["KAGAWA","香川県","SHIKOKU"],
  ["EHIME","愛媛県","SHIKOKU"],
  ["KOCHI","高知県","SHIKOKU"],
  ["FUKUOKA","福岡県","KYUSHU"],
  ["SAGA","佐賀県","KYUSHU"],
  ["NAGASAKI","長崎県","KYUSHU"],
  ["KUMAMOTO","熊本県","KYUSHU"],
  ["OITA","大分県","KYUSHU"],
  ["MIYAZAKI","宮崎県","KYUSHU"],
  ["KAGOSHIMA","鹿児島県","KYUSHU"],
  ["OKINAWA","沖縄県","OKINAWA"]
].map((p,i) => ({
  id:i+1,
  key:p[0].toLowerCase(),
  en:p[0],
  ja:p[1],
  region:p[2],

  // JSONを追加した県をここで有効にする
  enabled:i===0,

  file:"./stories/"+p[0].toLowerCase()+".json"
}));

const regions = [
  ["HOKKAIDO","北海道","HOKKAIDO"],
  ["TOHOKU","東北","TOHOKU"],
  ["KANTO","関東","KANTO"],
  ["CHUBU","中部","CHUBU"],
  ["KANSAI","関西","KANSAI"],
  ["CHUGOKU","中国","CHUGOKU"],
  ["SHIKOKU","四国","SHIKOKU"],
  ["KYUSHU","九州","KYUSHU"],
  ["OKINAWA","沖縄","OKINAWA"]
];

/* =====================================================
   STATE
   ===================================================== */

let lang = "en";

try {
  lang = localStorage.getItem(
    "travel-diary-language"
  ) === "ja" ? "ja" : "en";
} catch(e) {}

let currentPage = {
  type:"cover",
  prefecture:null,
  chapter:null
};

let storyCache = {};
let loading = false;

const getPrefecture = key =>
  prefectures.find(p => p.key === key);

const isAvailable = chapter =>
  !chapter.release ||
  Date.now() >= Date.parse(chapter.release);

const dateLabel = iso => {
  if(!iso) return "";

  const d = new Date(iso);

  if(Number.isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat(
    lang === "ja" ? "ja-JP" : "en-GB",
    {
      timeZone:"Asia/Tokyo",
      month:"short",
      day:"numeric",
      hour:"2-digit",
      minute:"2-digit",
      hour12:false
    }
  ).format(d)+" JST";
};

const textLines = lines =>
  (Array.isArray(lines) ? lines : [])
    .map(line => "<p>"+safe(line)+"</p>")
    .join("");

/* =====================================================
   DATA LOADING
   ===================================================== */

async function loadStory(prefecture) {
  if(!prefecture || !prefecture.enabled) {
    return null;
  }

  if(storyCache[prefecture.key]) {
    return storyCache[prefecture.key];
  }

  const response = await fetch(prefecture.file, {
    cache:"no-cache"
  });

  if(!response.ok) {
    throw new Error(
      "Failed to load "+prefecture.file
    );
  }

  const data = await response.json();

  if(!Array.isArray(data.chapters)) {
    throw new Error(
      "Invalid story data: "+prefecture.key
    );
  }

  storyCache[prefecture.key] = data;

  return data;
}

/* =====================================================
   COVER
   ===================================================== */

function renderCover() {
  const ja = lang === "ja";

  $("page").innerHTML = `
    <article class="cover">

      <div class="cover-kicker">
        TRAVELING TAKOYAKI · JAPAN 47
      </div>

      <div class="cover-rule">
        ✦ ───────── ✦ ───────── ✦
      </div>

      <div class="stamp">
        ${ja ? "日本全国 · 47都道府県" : "JAPAN · 47 PREFECTURES"}
      </div>

      <h1 class="${ja ? "" : "en"}">
        ${ja
          ? "<span>たこ焼き</span><span>旅日記</span>"
          : "<span>TAKOYAKI</span><span>TRAVEL DIARY</span>"
        }
      </h1>

      <div class="cover-subtitle">
        ${ja ? "鉄板の向こう側へ" : "BEYOND THE GRIDDLE"}
      </div>

      <p class="cover-description">
        ${ja
          ? "毎日焼かれて食べられる人生を抜け出し、ひとつのたこ焼きが旅に出た。日本全国47都道府県を巡る、小さくて壮大な冒険の記録。"
          : "One takoyaki escaped the griddle and set out to explore all 47 prefectures of Japan. A little traveler on a very big adventure."
        }
      </p>

      <button class="open-btn" id="openBook" type="button">
        ${ja ? "日記を開く" : "OPEN DIARY"} →
      </button>

      <div class="cover-foot">
        JAPAN 47 JOURNEY
      </div>

    </article>
  `;

  $("openBook").addEventListener(
    "click",
    () => navigate({type:"index"})
  );
}

/* =====================================================
   NATIONAL INDEX
   ===================================================== */

function renderIndex() {
  const ja = lang === "ja";

  const visited = prefectures.filter(
    p => p.enabled
  ).length;

  const groups = regions.map(region => {
    const items = prefectures.filter(
      p => p.region === region[0]
    );

    return `
      <section class="region-group">

        <div class="region-heading">
          <h3>
            ${safe(ja ? region[1] : region[2])}
          </h3>
        </div>

        <div class="prefecture-grid">

          ${items.map(p => `
            <button
              type="button"
              class="prefecture-entry ${p.enabled ? "" : "locked"}"
              data-prefecture="${safe(p.key)}"
              ${p.enabled ? "" : "disabled"}
            >

              <span class="prefecture-number">
                ${pad(p.id)} / 47
              </span>

              <span class="prefecture-name">
                ${safe(ja ? p.ja : p.en)}
              </span>

              <span class="prefecture-en">
                ${safe(ja ? p.en : p.ja)}
              </span>

              ${p.enabled
                ? '<span class="visited-stamp">VISITED</span>'
                : '<span class="lock-mark">🔒</span>'
              }

            </button>
          `).join("")}

        </div>
      </section>
    `;
  }).join("");

  $("page").innerHTML = `
    <article class="journey-index">

      <header class="index-heading">

        <div class="index-kicker">
          TRAVELING TAKOYAKI
        </div>

        <h2>
          ${ja ? "旅の目次" : "JOURNEY INDEX"}
        </h2>

        <div class="index-subtitle">
          JAPAN 47 JOURNEY
        </div>

        <div class="index-rule"></div>

      </header>

      <div class="journey-progress">

        <div class="progress-label">
          <span>
            ${ja ? "訪問した都道府県" : "PREFECTURES VISITED"}
          </span>

          <strong>${pad(visited)} / 47</strong>
        </div>

        <div class="progress-track">
          <div
            class="progress-fill"
            style="width:${visited/47*100}%"
          ></div>
        </div>

      </div>

      ${groups}

      <div class="index-bottom">
        ${ja
          ? "まだ見ぬ景色が、旅人を待っている。"
          : "The road ahead is full of places yet to discover."
        }
      </div>

    </article>
  `;

  $("page")
    .querySelectorAll("[data-prefecture]")
    .forEach(button => {
      button.addEventListener("click", () => {
        navigate({
          type:"prefecture",
          prefecture:button.dataset.prefecture
        });
      });
    });
}

/* =====================================================
   PREFECTURE COVER
   ===================================================== */

function renderPrefecture(prefecture,data) {
  const ja = lang === "ja";

  const chapters = data.chapters || [];

  const description = ja
    ? (data.descriptionJa || "")
    : (data.descriptionEn || "");

  const entries = chapters.map((c,i) => {
    const open = isAvailable(c);

    return `
      <button
        class="chapter-entry"
        type="button"
        data-chapter="${i}"
        ${open ? "" : "disabled"}
      >

        <span class="chapter-entry-number">
          ${pad(c.id ?? i)}
        </span>

        <span class="chapter-entry-title">
          ${safe(ja ? c.title : c.titleEn)}
        </span>

        <span class="chapter-entry-lock">
          ${open ? "→" : "🔒"}
        </span>

      </button>
    `;
  }).join("");

  $("page").innerHTML = `
    <article class="prefecture-cover">

      <div class="prefecture-stop">
        STOP ${pad(prefecture.id)} / 47
      </div>

      <h2>${safe(prefecture.ja)}</h2>

      <div class="prefecture-roman">
        ${safe(prefecture.en)}
      </div>

      <p class="prefecture-description">
        ${safe(description)}
      </p>

      <div class="prefecture-chapters">

        <h3>
          ${ja ? "旅の記録" : "CHAPTER INDEX"}
          · ${chapters.length}
        </h3>

        ${entries}

      </div>

    </article>
  `;

  $("page")
    .querySelectorAll("[data-chapter]")
    .forEach(button => {
      button.addEventListener("click", () => {
        navigate({
          type:"story",
          prefecture:prefecture.key,
          chapter:Number(button.dataset.chapter)
        });
      });
    });
}

/* =====================================================
   STORY PAGE
   ===================================================== */

function renderStory(prefecture,data,chapterIndex) {
  const c = data.chapters[chapterIndex];

  if(!c) return;

  const ja = lang === "ja";

  const title = ja ? c.title : c.titleEn;
  const place = ja
    ? (c.scene || "")
    : (c.sceneEn || "");

  const lines = ja ? c.ja : c.en;

  const label = c.id === 0
    ? "PROLOGUE 00"
    : "CHAPTER "+pad(c.id)+" / "+
      pad(data.chapters.length-1);

  const imagePath = c.image || "";

  const date = c.release
    ? dateLabel(c.release)
    : "STOP "+pad(prefecture.id)+" / 47";

  const isLast =
    chapterIndex === data.chapters.length-1;

  const nextPrefecture =
    prefectures[prefecture.id];

  $("page").innerHTML = `
    <article class="spread">

      <section class="art-side">

        <div class="kicker">
          ${safe(label)}
        </div>

        <figure class="photo">

          <img
            src="${safe(imagePath)}"
            id="storyPhoto"
            alt="${safe(place)}"
          >

          <div
            class="photo-fallback"
            id="storyFallback"
          >
            ${safe(place)}
          </div>

          <figcaption>
            ${safe(place)}
          </figcaption>

        </figure>

      </section>

      <section class="text-side">

        <div class="meta">
          <span>${safe(label)}</span>
          <span>${safe(date)}</span>
        </div>

        <h2 class="story-title">
          ${safe(title)}
        </h2>

        <div class="underline"></div>

        <div class="story">
          ${textLines(lines)}
        </div>

        <div class="page-foot">

          <span>
            ${isLast && nextPrefecture
              ? "NEXT STOP — "+safe(nextPrefecture.en)
              : "TRAVELING TAKOYAKI"
            }
          </span>

          <span>${pad(c.id)}</span>

        </div>

      </section>

    </article>
  `;

  const photo = $("storyPhoto");
  const fallback = $("storyFallback");

  const fail = () => {
    photo.style.display = "none";
    fallback.style.display = "flex";
  };

  const ok = () => {
    photo.style.display = "block";
    fallback.style.display = "none";
  };

  photo.addEventListener("error",fail);
  photo.addEventListener("load",ok);

  if(photo.complete) {
    photo.naturalWidth > 0 ? ok() : fail();
  }
}

/* =====================================================
   BOOKMARKS
   ===================================================== */

function renderBookmarks() {
  const container = $("bookmarkTabs");

  if(
    currentPage.type === "cover" ||
    currentPage.type === "index"
  ) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }

  const current = getPrefecture(
    currentPage.prefecture
  );

  if(!current) {
    container.hidden = true;
    return;
  }

  const nearby = prefectures.filter(
    p => Math.abs(p.id-current.id) <= 1
  );

  container.innerHTML = nearby.map(p => `
    <button
      class="bookmark-tab ${
        p.id === current.id ? "active" : ""
      }"
      type="button"
      data-bookmark="${safe(p.key)}"
      ${p.enabled ? "" : "disabled"}
    >

      <span class="bookmark-tab-number">
        ${pad(p.id)}
      </span>

      <span class="bookmark-tab-name">
        ${safe(lang === "ja" ? p.ja : p.en)}
      </span>

    </button>
  `).join("");

  container.hidden = false;

  container
    .querySelectorAll("[data-bookmark]")
    .forEach(button => {
      button.addEventListener("click", () => {
        navigate({
          type:"prefecture",
          prefecture:button.dataset.bookmark
        });
      });
    });
}

/* =====================================================
   PAGE ORDER
   ===================================================== */

function getPageList() {
  const pages = [
    {type:"cover"},
    {type:"index"}
  ];

  for(const p of prefectures) {
    if(!p.enabled) continue;

    pages.push({
      type:"prefecture",
      prefecture:p.key
    });

    const data = storyCache[p.key];

    if(!data) continue;

    data.chapters.forEach((c,i) => {
      if(isAvailable(c)) {
        pages.push({
          type:"story",
          prefecture:p.key,
          chapter:i
        });
      }
    });
  }

  return pages;
}

function pageKey(page) {
  if(page.type === "cover") return "cover";
  if(page.type === "index") return "index";

  if(page.type === "prefecture") {
    return page.prefecture;
  }

  return page.prefecture+"-"+
    pad(page.chapter);
}

/* =====================================================
   NAVIGATION
   ===================================================== */

async function navigate(target,options={}) {
  if(loading) return;

  loading = true;

  try {
    if(
      target.type === "prefecture" ||
      target.type === "story"
    ) {
      const p = getPrefecture(target.prefecture);

      if(!p || !p.enabled) return;

      const data = await loadStory(p);

      if(
        target.type === "story" &&
        (
          !data.chapters[target.chapter] ||
          !isAvailable(data.chapters[target.chapter])
        )
      ) {
        return;
      }
    }

    currentPage = {...target};

    await render(true);

    if(!options.noScroll) {
      $("notebook").scrollIntoView({
        behavior:"smooth",
        block:"start"
      });
    }

  } catch(error) {
    console.error(error);
    alert(
      lang === "ja"
        ? "旅日記を読み込めませんでした。"
        : "Could not load the travel diary."
    );
  } finally {
    loading = false;
  }
}

async function move(direction) {
  if(loading) return;

  // 有効な県のデータを先に読み込む
  for(const p of prefectures) {
    if(p.enabled) {
      try {
        await loadStory(p);
      } catch(e) {
        console.error(e);
      }
    }
  }

  const pages = getPageList();

  const current = pages.findIndex(
    p => pageKey(p) === pageKey(currentPage)
  );

  if(current < 0) return;

  const target = pages[current+direction];

  if(target) {
    await navigate(target);
  }
}

/* =====================================================
   RENDER
   ===================================================== */

async function render(animated=false) {
  document.documentElement.lang = lang;

  $("tocBtn").textContent =
    lang === "ja" ? "目次" : "INDEX";

  $("langBtn").textContent =
    lang === "ja" ? "ENGLISH" : "日本語";

  $("prev").textContent =
    lang === "ja" ? "← 前へ" : "← PREVIOUS";

  $("next").textContent =
    lang === "ja" ? "次へ →" : "NEXT →";

  if(currentPage.type === "cover") {
    renderCover();
  }

  if(currentPage.type === "index") {
    renderIndex();
  }

  if(
    currentPage.type === "prefecture" ||
    currentPage.type === "story"
  ) {
    const p = getPrefecture(
      currentPage.prefecture
    );

    const data = await loadStory(p);

    if(currentPage.type === "prefecture") {
      renderPrefecture(p,data);
    } else {
      renderStory(
        p,
        data,
        currentPage.chapter
      );
    }
  }

  renderBookmarks();

  if(animated) {
    $("page").classList.remove("turn");
    void $("page").offsetWidth;
    $("page").classList.add("turn");
  }

  const pages = getPageList();

  const position = pages.findIndex(
    p => pageKey(p) === pageKey(currentPage)
  );

  $("prev").disabled = position <= 0;

  $("next").disabled =
    position < 0 || position >= pages.length-1;

  if(currentPage.type === "cover") {
    $("pageNumber").textContent =
      lang === "ja" ? "表紙" : "COVER";
  }

  if(currentPage.type === "index") {
    $("pageNumber").textContent =
      lang === "ja" ? "全国目次" : "JOURNEY INDEX";
  }

  if(currentPage.type === "prefecture") {
    const p = getPrefecture(
      currentPage.prefecture
    );

    $("pageNumber").textContent =
      "STOP "+pad(p.id)+" / 47";
  }

  if(currentPage.type === "story") {
    const p = getPrefecture(
      currentPage.prefecture
    );

    const data = storyCache[p.key];
    const c = data.chapters[currentPage.chapter];

    $("pageNumber").textContent =
      c.id === 0
        ? "PROLOGUE"
        : "CHAPTER "+pad(c.id);
  }

  updateReleaseInfo();

  try {
    const hash = currentPage.type === "cover"
      ? ""
      : "#"+pageKey(currentPage);

    history.replaceState(
      null,
      "",
      location.pathname+location.search+hash
    );
  } catch(e) {}
}

/* =====================================================
   RELEASE INFORMATION
   ===================================================== */

function updateReleaseInfo() {
  const upcoming = [];

  for(const p of prefectures) {
    if(!p.enabled) continue;

    const data = storyCache[p.key];
    if(!data) continue;

    data.chapters.forEach(c => {
      if(
        c.release &&
        Date.now() < Date.parse(c.release)
      ) {
        upcoming.push(c.release);
      }
    });
  }

  upcoming.sort(
    (a,b) => Date.parse(a)-Date.parse(b)
  );

  if(upcoming.length) {
    $("releaseInfo").textContent =
      (lang === "ja" ? "次の公開：" : "NEXT: ")+
      dateLabel(upcoming[0]);
  } else {
    $("releaseInfo").textContent =
      lang === "ja"
        ? "旅は続く"
        : "THE JOURNEY CONTINUES";
  }
}

/* =====================================================
   CHAPTER INDEX MODAL
   ===================================================== */

async function showToc() {
  $("tocTitle").textContent =
    lang === "ja" ? "旅の目次" : "INDEX";

  if(
    currentPage.type === "cover" ||
    currentPage.type === "index"
  ) {
    await navigate(
      {type:"index"},
      {noScroll:true}
    );
    return;
  }

  const p = getPrefecture(
    currentPage.prefecture
  );

  if(!p) return;

  const data = await loadStory(p);

  $("tocItems").innerHTML =
    data.chapters.map((c,i) => {
      const open = isAvailable(c);

      return `
        <button
          class="toc-entry"
          data-chapter="${i}"
          type="button"
          ${open ? "" : "disabled"}
        >

          <small>
            ${open ? "📖" : "🔒"}
            ${c.id === 0
              ? "PROLOGUE 00"
              : "CHAPTER "+pad(c.id)
            }
          </small>

          <strong>
            ${safe(
              lang === "ja" ? c.title : c.titleEn
            )}
          </strong>

          ${c.release
            ? "<small>"+
              safe(dateLabel(c.release))+
              "</small>"
            : ""
          }

        </button>
      `;
    }).join("");

  $("tocItems")
    .querySelectorAll("[data-chapter]")
    .forEach(button => {
      button.addEventListener("click", () => {
        closeToc();

        navigate({
          type:"story",
          prefecture:p.key,
          chapter:Number(button.dataset.chapter)
        });
      });
    });

  $("overlay").hidden = false;
  $("overlay").classList.add("open");

  $("tocClose").focus();
}

function closeToc() {
  $("overlay").classList.remove("open");
  $("overlay").hidden = true;
  $("tocBtn").focus();
}

/* =====================================================
   BUTTON EVENTS
   ===================================================== */

$("prev").addEventListener(
  "click",
  () => move(-1)
);

$("next").addEventListener(
  "click",
  () => move(1)
);

$("tocBtn").addEventListener(
  "click",
  showToc
);

$("tocClose").addEventListener(
  "click",
  closeToc
);

$("overlay").addEventListener("click",e => {
  if(e.target === $("overlay")) {
    closeToc();
  }
});

$("langBtn").addEventListener(
  "click",
  async () => {
    lang = lang === "ja" ? "en" : "ja";

    try {
      localStorage.setItem(
        "travel-diary-language",
        lang
      );
    } catch(e) {}

    await render();
  }
);

/* =====================================================
   KEYBOARD
   ===================================================== */

document.addEventListener("keydown",e => {
  if(e.key === "Escape") {
    if($("overlay").classList.contains("open")) {
      closeToc();
    }
    return;
  }

  if($("overlay").classList.contains("open")) {
    return;
  }

  if(e.key === "ArrowRight") {
    move(1);
  }

  if(e.key === "ArrowLeft") {
    move(-1);
  }
});

/* =====================================================
   MOBILE SWIPE
   ===================================================== */

let touchX = null;

$("page").addEventListener(
  "touchstart",
  e => {
    touchX = e.touches[0].clientX;
  },
  {passive:true}
);

$("page").addEventListener(
  "touchend",
  e => {
    if(touchX === null) return;

    const delta =
      e.changedTouches[0].clientX-touchX;

    touchX = null;

    if(Math.abs(delta) > 85) {
      move(delta < 0 ? 1 : -1);
    }
  },
  {passive:true}
);

/* =====================================================
   HERO IMAGE
   ===================================================== */

const hero = $("heroImg");
const heroFallback = $("heroFallback");

function heroOK() {
  hero.style.display = "block";
  heroFallback.style.display = "none";
}

function heroFail() {
  hero.style.display = "none";
  heroFallback.style.display = "flex";
}

hero.addEventListener("load",heroOK);
hero.addEventListener("error",heroFail);

if(hero.complete) {
  hero.naturalWidth > 0
    ? heroOK()
    : heroFail();
}

/* =====================================================
   INITIALIZE
   ===================================================== */

async function init() {
  // 有効な都道府県のJSONを読み込む
  for(const p of prefectures) {
    if(!p.enabled) continue;

    try {
      await loadStory(p);
    } catch(error) {
      console.error(error);
    }
  }

  const hash = decodeURIComponent(
    location.hash.replace(/^#/,"")
  );

  if(hash === "index") {
    currentPage = {type:"index"};
  } else {
    const p = prefectures.find(
      item => item.key === hash
    );

    if(p && p.enabled && storyCache[p.key]) {
      currentPage = {
        type:"prefecture",
        prefecture:p.key
      };
    } else {
      const match = hash.match(
        /^([a-z]+)-(\d{2})$/
      );

      if(match) {
        const pref = getPrefecture(match[1]);

        if(pref && pref.enabled) {
          const data = storyCache[pref.key];

          const chapterIndex = data?.chapters
            .findIndex(
              c => Number(c.id) === Number(match[2])
            );

          if(
            chapterIndex >= 0 &&
            isAvailable(data.chapters[chapterIndex])
          ) {
            currentPage = {
              type:"story",
              prefecture:pref.key,
              chapter:chapterIndex
            };
          }
        }
      }
    }
  }

  await render();
}

init();

/* =====================================================
   AUTO RELEASE CHECK
   ===================================================== */

setInterval(async () => {
  const pagesBefore = getPageList().length;

  const pagesAfter = getPageList().length;

  if(pagesAfter !== pagesBefore) {
    await render();
  } else {
    updateReleaseInfo();
  }
},60000);

})();
