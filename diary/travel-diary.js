
(() => {
  "use strict";

  /* =====================================================
     TRAVELING TAKOYAKI
     TRAVEL DIARY — JAPAN 47 JOURNEY

     COMPLETE VERSION
     HOKKAIDO + AOMORI
     ENGLISH / JAPANESE
     ===================================================== */

  const $ = id => document.getElementById(id);

  const safe = value => String(value ?? "").replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c])
  );

  const pad = n => String(n).padStart(2, "0");

  /* =====================================================
     PREFECTURES
     ===================================================== */

  const prefectureList = [
    ["HOKKAIDO", "北海道", "HOKKAIDO"],
    ["AOMORI", "青森県", "TOHOKU"],
    ["AKITA", "秋田県", "TOHOKU"],
    ["IWATE", "岩手県", "TOHOKU"],
    ["YAMAGATA", "山形県", "TOHOKU"],
    ["FUKUSHIMA", "福島県", "TOHOKU"],
    ["MIYAGI", "宮城県", "TOHOKU"],
    ["IBARAKI", "茨城県", "KANTO"],
    ["TOCHIGI", "栃木県", "KANTO"],
    ["GUNMA", "群馬県", "KANTO"],
    ["SAITAMA", "埼玉県", "KANTO"],
    ["CHIBA", "千葉県", "KANTO"],
    ["TOKYO", "東京都", "KANTO"],
    ["KANAGAWA", "神奈川県", "KANTO"],
    ["NIIGATA", "新潟県", "CHUBU"],
    ["TOYAMA", "富山県", "CHUBU"],
    ["ISHIKAWA", "石川県", "CHUBU"],
    ["FUKUI", "福井県", "CHUBU"],
    ["YAMANASHI", "山梨県", "CHUBU"],
    ["NAGANO", "長野県", "CHUBU"],
    ["GIFU", "岐阜県", "CHUBU"],
    ["SHIZUOKA", "静岡県", "CHUBU"],
    ["AICHI", "愛知県", "CHUBU"],
    ["MIE", "三重県", "KANSAI"],
    ["SHIGA", "滋賀県", "KANSAI"],
    ["KYOTO", "京都府", "KANSAI"],
    ["OSAKA", "大阪府", "KANSAI"],
    ["HYOGO", "兵庫県", "KANSAI"],
    ["NARA", "奈良県", "KANSAI"],
    ["WAKAYAMA", "和歌山県", "KANSAI"],
    ["TOTTORI", "鳥取県", "CHUGOKU"],
    ["SHIMANE", "島根県", "CHUGOKU"],
    ["OKAYAMA", "岡山県", "CHUGOKU"],
    ["HIROSHIMA", "広島県", "CHUGOKU"],
    ["YAMAGUCHI", "山口県", "CHUGOKU"],
    ["TOKUSHIMA", "徳島県", "SHIKOKU"],
    ["KAGAWA", "香川県", "SHIKOKU"],
    ["EHIME", "愛媛県", "SHIKOKU"],
    ["KOCHI", "高知県", "SHIKOKU"],
    ["FUKUOKA", "福岡県", "KYUSHU"],
    ["SAGA", "佐賀県", "KYUSHU"],
    ["NAGASAKI", "長崎県", "KYUSHU"],
    ["KUMAMOTO", "熊本県", "KYUSHU"],
    ["OITA", "大分県", "KYUSHU"],
    ["MIYAZAKI", "宮崎県", "KYUSHU"],
    ["KAGOSHIMA", "鹿児島県", "KYUSHU"],
    ["OKINAWA", "沖縄県", "OKINAWA"]
  ];

  const prefectures = prefectureList.map((item, i) => ({
    id: i + 1,
    key: item[0].toLowerCase(),
    en: item[0],
    ja: item[1],
    region: item[2],

    // 北海道と青森を公開
    // 秋田追加時は i <= 2 に変更
    enabled: i <= 0,

    file: "./stories/" + item[0].toLowerCase() + ".json"
  }));

  const regions = [
    ["HOKKAIDO", "北海道", "HOKKAIDO"],
    ["TOHOKU", "東北", "TOHOKU"],
    ["KANTO", "関東", "KANTO"],
    ["CHUBU", "中部", "CHUBU"],
    ["KANSAI", "関西", "KANSAI"],
    ["CHUGOKU", "中国", "CHUGOKU"],
    ["SHIKOKU", "四国", "SHIKOKU"],
    ["KYUSHU", "九州", "KYUSHU"],
    ["OKINAWA", "沖縄", "OKINAWA"]
  ];

  const getPrefecture = key =>
    prefectures.find(p => p.key === key);

  /* =====================================================
     LANGUAGE
     ===================================================== */

  let lang = "en";

  try {
    lang = localStorage.getItem(
      "travel-diary-language"
    ) === "ja" ? "ja" : "en";
  } catch (e) {
    // Storage may be unavailable.
  }

  const localized = (ja, en) =>
    lang === "ja" ? ja : en;

  /* =====================================================
     STATE
     ===================================================== */

  const storyCache = {};

  let currentPage = {
    type: "cover"
  };

  let navigating = false;
  let lastAvailableSignature = "";

  /* =====================================================
     DATE & RELEASE
     ===================================================== */

  function isReleased(chapter) {
    if (!chapter.release) return true;

    const timestamp = Date.parse(chapter.release);

    return Number.isFinite(timestamp) &&
      Date.now() >= timestamp;
  }

  function dateLabel(iso) {
    if (!iso) return "";

    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat(
      lang === "ja" ? "ja-JP" : "en-GB",
      {
        timeZone: "Asia/Tokyo",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }
    ).format(date) + " JST";
  }

  /* =====================================================
     LOAD JSON
     ===================================================== */

  async function loadStory(prefecture) {
    if (!prefecture || !prefecture.enabled) {
      return null;
    }

    if (storyCache[prefecture.key]) {
      return storyCache[prefecture.key];
    }

    const response = await fetch(prefecture.file, {
      cache: "no-cache"
    });

    if (!response.ok) {
      throw new Error(
        "Could not load " + prefecture.file
      );
    }

    const data = await response.json();

    if (!Array.isArray(data.chapters)) {
      throw new Error(
        "Invalid chapters: " + prefecture.key
      );
    }

    const chapters = data.chapters.map(
      (chapter, index) => ({
        ...chapter,
        id: Number(chapter.id ?? index)
      })
    );

    if (
      chapters.some(
        chapter => !Number.isInteger(chapter.id)
      )
    ) {
      throw new Error(
        "Invalid chapter ID: " + prefecture.key
      );
    }

    chapters.sort((a, b) => a.id - b.id);

    const normalized = {
      ...data,
      chapters
    };

    storyCache[prefecture.key] = normalized;

    return normalized;
  }

  async function loadEnabledStories() {
    const enabled = prefectures.filter(p => p.enabled);

    await Promise.all(
      enabled.map(async p => {
        try {
          await loadStory(p);
        } catch (error) {
          console.error(error);
        }
      })
    );
  }

  /* =====================================================
     PAGE IDENTIFIERS
     ===================================================== */

  function pageKey(page) {
    if (!page) return "cover";

    if (page.type === "cover") {
      return "cover";
    }

    if (page.type === "index") {
      return "index";
    }

    if (page.type === "prefecture") {
      return page.prefecture;
    }

    if (page.type === "story") {
      return page.prefecture + "-" +
        pad(page.chapter);
    }

    return "cover";
  }

  function getPages() {
    const pages = [
      { type: "cover" },
      { type: "index" }
    ];

    for (const p of prefectures) {
      if (!p.enabled) continue;

      const data = storyCache[p.key];

      if (!data) continue;

      pages.push({
        type: "prefecture",
        prefecture: p.key
      });

      for (const chapter of data.chapters) {
        if (!isReleased(chapter)) continue;

        pages.push({
          type: "story",
          prefecture: p.key,
          chapter: chapter.id
        });
      }
    }

    return pages;
  }

  function getCurrentPosition() {
    const pages = getPages();

    const position = pages.findIndex(
      p => pageKey(p) === pageKey(currentPage)
    );

    return { pages, position };
  }

  function getChapter(data, chapterId) {
    if (!data) return null;

    return data.chapters.find(
      c => c.id === Number(chapterId)
    );
  }

  /* =====================================================
     TEXT & IMAGES
     ===================================================== */

  function textLines(lines) {
    if (!Array.isArray(lines)) return "";

    return lines.map(
      line => "<p>" + safe(line) + "</p>"
    ).join("");
  }

  function setupPhoto() {
    const photo = $("storyPhoto");
    const fallback = $("storyFallback");

    if (!photo || !fallback) return;

    function showFallback() {
      photo.style.display = "none";
      fallback.style.display = "flex";
    }

    function showPhoto() {
      photo.style.display = "block";
      fallback.style.display = "none";
    }

    photo.addEventListener("error", showFallback);
    photo.addEventListener("load", showPhoto);

    if (photo.complete) {
      photo.naturalWidth > 0
        ? showPhoto()
        : showFallback();
    }
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
          ${ja
            ? "日本全国 · 47都道府県"
            : "JAPAN · 47 PREFECTURES"}
        </div>

        <h1 class="${ja ? "" : "en"}">
          ${ja
            ? "<span>たこ焼き</span><span>旅日記</span>"
            : "<span>TAKOYAKI</span><span>TRAVEL DIARY</span>"}
        </h1>

        <div class="cover-subtitle">
          ${ja
            ? "鉄板の向こう側へ"
            : "BEYOND THE GRIDDLE"}
        </div>

        <p class="cover-description">
          ${ja
            ? "毎日焼かれて食べられる人生を抜け出し、ひとつのたこ焼きが旅に出た。"
            : "One takoyaki escaped the griddle to discover the world beyond the frying pan."}
        </p>

        <button
          class="open-btn"
          id="openBook"
          type="button"
        >
          ${ja ? "日記を開く" : "OPEN DIARY"} →
        </button>

        <div class="cover-foot">
          JAPAN 47 JOURNEY
        </div>

      </article>
    `;

    $("openBook").addEventListener(
      "click",
      () => navigate({ type: "index" })
    );
  }

  /* =====================================================
     NATIONAL INDEX
     ===================================================== */

  function renderIndex() {
    const ja = lang === "ja";

    const visited = prefectures.filter(
      p => p.enabled && !!storyCache[p.key]
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

            ${items.map(p => {
              const open = p.enabled &&
                !!storyCache[p.key];

              return `
                <button
                  type="button"
                  class="prefecture-entry ${open ? "" : "locked"}"
                  data-prefecture="${safe(p.key)}"
                  ${open ? "" : "disabled"}
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

                  ${open
                    ? '<span class="visited-stamp">VISITED</span>'
                    : '<span class="lock-mark">🔒</span>'}

                </button>
              `;
            }).join("")}

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
              ${ja
                ? "訪問した都道府県"
                : "PREFECTURES VISITED"}
            </span>

            <strong>${pad(visited)} / 47</strong>
          </div>

          <div class="progress-track">
            <div
              class="progress-fill"
              style="width:${visited / 47 * 100}%"
            ></div>
          </div>

        </div>

        ${groups}

        <div class="index-bottom">
          ${ja
            ? "まだ見ぬ景色が、旅人を待っている。"
            : "The road ahead is full of places yet to discover."}
        </div>

      </article>
    `;

    $("page")
      .querySelectorAll("[data-prefecture]")
      .forEach(button => {
        button.addEventListener("click", () => {
          navigate({
            type: "prefecture",
            prefecture: button.dataset.prefecture
          });
        });
      });
  }

  /* =====================================================
     PREFECTURE COVER
     ===================================================== */

  function renderPrefecture(prefecture, data) {
    const ja = lang === "ja";

    const description = localized(
      data.descriptionJa || "",
      data.descriptionEn || ""
    );

    const entries = data.chapters.map(chapter => {
      const open = isReleased(chapter);

      const title = localized(
        chapter.title,
        chapter.titleEn
      );

      return `
        <button
          class="chapter-entry"
          type="button"
          data-chapter="${chapter.id}"
          ${open ? "" : "disabled"}
        >

          <span class="chapter-entry-number">
            ${pad(chapter.id)}
          </span>

          <span class="chapter-entry-title">
            ${safe(title)}
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
            · ${data.chapters.length}
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
            type: "story",
            prefecture: prefecture.key,
            chapter: Number(button.dataset.chapter)
          });
        });
      });
  }

  /* =====================================================
     STORY PAGE
     ===================================================== */

  function renderStory(prefecture, data, chapterId) {
    const chapter = getChapter(data, chapterId);

    if (!chapter) return;

    const ja = lang === "ja";
    const isPrologue = chapter.id === 0;

    const storyCount = data.chapters.filter(
      c => c.id > 0
    ).length;

    const label = isPrologue
      ? "PROLOGUE 00"
      : "CHAPTER " + pad(chapter.id) +
        " / " + pad(storyCount);

    const title = localized(
      chapter.title,
      chapter.titleEn
    );

    const place = localized(
      chapter.scene || "",
      chapter.sceneEn || ""
    );

    const lines = ja ? chapter.ja : chapter.en;

    const date = chapter.release
      ? dateLabel(chapter.release)
      : pad(prefecture.id) +
        " / 47 · " + prefecture.en;

    const lastChapter = data.chapters[
      data.chapters.length - 1
    ];

    const nextPrefecture = prefectures[
      prefecture.id
    ];

    const isLast = chapter.id === lastChapter.id;

    $("page").innerHTML = `
      <article class="spread">

        <section class="art-side">

          <div class="kicker">
            ${safe(label)}
          </div>

          <figure class="photo">

            <img
              src="${safe(chapter.image || "")}"
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
                ? "NEXT STOP — " + safe(nextPrefecture.en)
                : "TRAVELING TAKOYAKI"}
            </span>

            <span>${pad(chapter.id)}</span>

          </div>

        </section>

      </article>
    `;

    setupPhoto();
  }

  /* =====================================================
     BOOKMARKS
     ===================================================== */

  function renderBookmarks() {
    const container = $("bookmarkTabs");

    if (
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

    if (!current) {
      container.hidden = true;
      container.innerHTML = "";
      return;
    }

    const nearby = prefectures.filter(
      p => Math.abs(p.id - current.id) <= 1
    );

    container.innerHTML = nearby.map(p => {
      const open = p.enabled &&
        !!storyCache[p.key];

      return `
        <button
          class="bookmark-tab ${
            p.id === current.id ? "active" : ""
          }"
          type="button"
          data-bookmark="${safe(p.key)}"
          ${open ? "" : "disabled"}
        >

          <span class="bookmark-tab-number">
            ${pad(p.id)}
          </span>

          <span class="bookmark-tab-name">
            ${safe(localized(p.ja, p.en))}
          </span>

        </button>
      `;
    }).join("");

    container.hidden = false;

    container
      .querySelectorAll("[data-bookmark]")
      .forEach(button => {
        button.addEventListener("click", () => {
          navigate({
            type: "prefecture",
            prefecture: button.dataset.bookmark
          });
        });
      });
  }

  /* =====================================================
     STATUS
     ===================================================== */

  function updateReleaseInfo() {
    const upcoming = [];

    for (const p of prefectures) {
      if (!p.enabled) continue;

      const data = storyCache[p.key];

      if (!data) continue;

      for (const chapter of data.chapters) {
        if (
          chapter.release &&
          !isReleased(chapter)
        ) {
          upcoming.push(chapter.release);
        }
      }
    }

    upcoming.sort(
      (a, b) => Date.parse(a) - Date.parse(b)
    );

    if (upcoming.length > 0) {
      $("releaseInfo").textContent =
        localized("次の公開：", "NEXT: ") +
        dateLabel(upcoming[0]);
    } else {
      $("releaseInfo").textContent =
        localized(
          "旅は続く",
          "THE JOURNEY CONTINUES"
        );
    }
  }

  function updatePager() {
    const { pages, position } = getCurrentPosition();

    $("prev").disabled = position <= 0;

    $("next").disabled =
      position < 0 ||
      position >= pages.length - 1;

    if (currentPage.type === "cover") {
      $("pageNumber").textContent =
        localized("表紙", "COVER");
    }

    if (currentPage.type === "index") {
      $("pageNumber").textContent =
        localized("全国目次", "JOURNEY INDEX");
    }

    if (currentPage.type === "prefecture") {
      const p = getPrefecture(
        currentPage.prefecture
      );

      $("pageNumber").textContent =
        p
          ? "STOP " + pad(p.id) + " / 47"
          : "JOURNEY INDEX";
    }

    if (currentPage.type === "story") {
      const p = getPrefecture(
        currentPage.prefecture
      );

      const data = p ? storyCache[p.key] : null;

      const chapter = getChapter(
        data,
        currentPage.chapter
      );

      $("pageNumber").textContent =
        chapter
          ? (
            chapter.id === 0
              ? localized("プロローグ", "PROLOGUE")
              : "CHAPTER " + pad(chapter.id)
          )
          : "JOURNEY INDEX";
    }

    updateReleaseInfo();
  }

  /* =====================================================
     RENDER
     ===================================================== */

  function render(animated = false) {
    document.documentElement.lang = lang;

    $("tocBtn").textContent =
      localized("目次", "INDEX");

    $("langBtn").textContent =
      lang === "ja" ? "ENGLISH" : "日本語";

    $("prev").textContent =
      localized("← 前へ", "← PREVIOUS");

    $("next").textContent =
      localized("次へ →", "NEXT →");

    if (currentPage.type === "cover") {
      renderCover();
    } else if (currentPage.type === "index") {
      renderIndex();
    } else if (
      currentPage.type === "prefecture" ||
      currentPage.type === "story"
    ) {
      const p = getPrefecture(
        currentPage.prefecture
      );

      const data = p ? storyCache[p.key] : null;

      if (!p || !p.enabled || !data) {
        currentPage = { type: "index" };
        renderIndex();
      } else if (currentPage.type === "prefecture") {
        renderPrefecture(p, data);
      } else {
        const chapter = getChapter(
          data,
          currentPage.chapter
        );

        if (!chapter || !isReleased(chapter)) {
          currentPage = {
            type: "prefecture",
            prefecture: p.key
          };
          renderPrefecture(p, data);
        } else {
          renderStory(
            p,
            data,
            currentPage.chapter
          );
        }
      }
    }

    renderBookmarks();
    updatePager();

    if (animated) {
      $("page").classList.remove("turn");
      void $("page").offsetWidth;
      $("page").classList.add("turn");
    }
  }

  /* =====================================================
     URL
     ===================================================== */

  function updateURL() {
    const key = pageKey(currentPage);

    const hash = key === "cover"
      ? ""
      : "#" + key;

    try {
      history.replaceState(
        null,
        "",
        location.pathname +
        location.search +
        hash
      );
    } catch (e) {
      // Ignore history errors.
    }
  }

  function parseHash() {
    let hash;

    try {
      hash = decodeURIComponent(
        location.hash.replace(/^#/, "")
      );
    } catch (e) {
      return { type: "cover" };
    }

    if (!hash || hash === "cover") {
      return { type: "cover" };
    }

    if (hash === "index") {
      return { type: "index" };
    }

    const p = getPrefecture(hash);

    if (p && p.enabled) {
      return {
        type: "prefecture",
        prefecture: p.key
      };
    }

    const match = hash.match(
      /^([a-z]+)-(\d{2})$/
    );

    if (match) {
      const prefecture = getPrefecture(match[1]);

      if (prefecture && prefecture.enabled) {
        return {
          type: "story",
          prefecture: prefecture.key,
          chapter: Number(match[2])
        };
      }
    }

    // 旧北海道ページURLとの互換性
    const legacy = hash.match(/^page-(\d+)$/);

    if (legacy) {
      const number = Number(legacy[1]);

      if (number === 0) {
        return { type: "cover" };
      }

      return {
        type: "story",
        prefecture: "hokkaido",
        chapter: number - 1
      };
    }

    return { type: "cover" };
  }

  /* =====================================================
     NAVIGATION
     ===================================================== */

  async function navigate(target, options = {}) {
    if (navigating) return;

    navigating = true;

    try {
      if (
        target.type === "prefecture" ||
        target.type === "story"
      ) {
        const p = getPrefecture(
          target.prefecture
        );

        if (!p || !p.enabled) return;

        const data = await loadStory(p);

        if (target.type === "story") {
          const chapter = getChapter(
            data,
            target.chapter
          );

          if (!chapter || !isReleased(chapter)) {
            return;
          }
        }
      }

      currentPage = { ...target };

      render(true);
      updateURL();

      if (!options.noScroll) {
        $("notebook").scrollIntoView({
          behavior: window.matchMedia(
            "(prefers-reduced-motion: reduce)"
          ).matches ? "auto" : "smooth",
          block: "start"
        });
      }

    } catch (error) {
      console.error(error);

      alert(localized(
        "旅日記を読み込めませんでした。",
        "Could not load the travel diary."
      ));
    } finally {
      navigating = false;
    }
  }

  function move(direction) {
    if (navigating) return;

    const { pages, position } = getCurrentPosition();

    if (position < 0) return;

    const target = pages[position + direction];

    if (target) {
      navigate(target);
    }
  }

  /* =====================================================
     TABLE OF CONTENTS
     ===================================================== */

  function closeToc(restoreFocus = true) {
    $("overlay").classList.remove("open");
    $("overlay").hidden = true;

    if (restoreFocus) {
      $("tocBtn").focus();
    }
  }

  function showToc() {
    $("tocTitle").textContent =
      localized("旅の目次", "INDEX");

    const entries = [];

    entries.push({
      page: { type: "cover" },
      label: "COVER",
      title: localized("表紙", "Travel Diary"),
      open: true
    });

    entries.push({
      page: { type: "index" },
      label: "JAPAN 47",
      title: localized("全国目次", "Journey Index"),
      open: true
    });

    for (const p of prefectures) {
      if (!p.enabled) continue;

      const data = storyCache[p.key];

      if (!data) continue;

      entries.push({
        page: {
          type: "prefecture",
          prefecture: p.key
        },
        label: "STOP " + pad(p.id),
        title: localized(p.ja, p.en),
        open: true
      });

      for (const chapter of data.chapters) {
        entries.push({
          page: {
            type: "story",
            prefecture: p.key,
            chapter: chapter.id
          },
          label: chapter.id === 0
            ? "PROLOGUE 00"
            : "CHAPTER " + pad(chapter.id),
          title: localized(
            chapter.title,
            chapter.titleEn
          ),
          open: isReleased(chapter),
          release: chapter.release
        });
      }
    }

    $("tocItems").innerHTML = entries.map(
      (entry, i) => `
        <button
          class="toc-entry"
          type="button"
          data-entry="${i}"
          ${entry.open ? "" : "disabled"}
        >

          <small>
            ${entry.open ? "📖" : "🔒"}
            ${safe(entry.label)}
          </small>

          <strong>
            ${safe(entry.title)}
          </strong>

          ${entry.release
            ? "<small>" +
              safe(dateLabel(entry.release)) +
              "</small>"
            : ""}

        </button>
      `
    ).join("");

    $("tocItems")
      .querySelectorAll("[data-entry]")
      .forEach(button => {
        button.addEventListener("click", () => {
          const entry = entries[
            Number(button.dataset.entry)
          ];

          closeToc(false);
          navigate(entry.page);
        });
      });

    $("overlay").hidden = false;
    $("overlay").classList.add("open");
    $("tocClose").focus();
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
    () => closeToc()
  );

  $("overlay").addEventListener("click", e => {
    if (e.target === $("overlay")) {
      closeToc();
    }
  });

  $("langBtn").addEventListener("click", () => {
    lang = lang === "ja" ? "en" : "ja";

    try {
      localStorage.setItem(
        "travel-diary-language",
        lang
      );
    } catch (e) {
      // Storage may be unavailable.
    }

    render();

    if ($("overlay").classList.contains("open")) {
      showToc();
    }
  });

  /* =====================================================
     KEYBOARD
     ===================================================== */

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if ($("overlay").classList.contains("open")) {
        closeToc();
      }
      return;
    }

    if ($("overlay").classList.contains("open")) {
      return;
    }

    const tag = document.activeElement?.tagName;

    if (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT"
    ) {
      return;
    }

    if (e.key === "ArrowRight") {
      move(1);
    }

    if (e.key === "ArrowLeft") {
      move(-1);
    }
  });

  /* =====================================================
     MOBILE SWIPE
     ===================================================== */

  let touchX = null;
  let touchY = null;

  $("page").addEventListener(
    "touchstart",
    e => {
      if (!e.touches.length) return;

      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    },
    { passive: true }
  );

  $("page").addEventListener(
    "touchend",
    e => {
      if (
        touchX === null ||
        touchY === null ||
        !e.changedTouches.length
      ) {
        return;
      }

      const dx =
        e.changedTouches[0].clientX - touchX;

      const dy =
        e.changedTouches[0].clientY - touchY;

      touchX = null;
      touchY = null;

      if (
        Math.abs(dx) > 85 &&
        Math.abs(dx) > Math.abs(dy) * 1.5
      ) {
        move(dx < 0 ? 1 : -1);
      }
    },
    { passive: true }
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

  hero.addEventListener("load", heroOK);
  hero.addEventListener("error", heroFail);

  if (hero.complete) {
    hero.naturalWidth > 0
      ? heroOK()
      : heroFail();
  }

  /* =====================================================
     AUTOMATIC RELEASE CHECK
     ===================================================== */

  function availableSignature() {
    const released = [];

    for (const p of prefectures) {
      if (!p.enabled) continue;

      const data = storyCache[p.key];

      if (!data) continue;

      for (const chapter of data.chapters) {
        if (isReleased(chapter)) {
          released.push(
            p.key + "-" + pad(chapter.id)
          );
        }
      }
    }

    return released.join("|");
  }

  function checkNewReleases() {
    const signature = availableSignature();

    if (signature !== lastAvailableSignature) {
      lastAvailableSignature = signature;

      render();

      if ($("overlay").classList.contains("open")) {
        showToc();
      }
    } else {
      updateReleaseInfo();
    }
  }

  /* =====================================================
     HASH NAVIGATION
     ===================================================== */

  window.addEventListener("hashchange", () => {
    const requested = parseHash();

    navigate(requested, {
      noScroll: true
    });
  });

  /* =====================================================
     INITIALIZE
     ===================================================== */

  async function init() {
    await loadEnabledStories();

    const requested = parseHash();

    if (
      requested.type === "prefecture" ||
      requested.type === "story"
    ) {
      const p = getPrefecture(
        requested.prefecture
      );

      const data = p
        ? storyCache[p.key]
        : null;

      if (!p || !p.enabled || !data) {
        currentPage = { type: "index" };
      } else if (requested.type === "story") {
        const chapter = getChapter(
          data,
          requested.chapter
        );

        if (chapter && isReleased(chapter)) {
          currentPage = requested;
        } else {
          currentPage = {
            type: "prefecture",
            prefecture: p.key
          };
        }
      } else {
        currentPage = requested;
      }
    } else {
      currentPage = requested;
    }

    lastAvailableSignature = availableSignature();

    render();
    updateURL();
  }

  init().catch(error => {
    console.error(error);

    $("page").innerHTML = `
      <div style="
        padding:40px 20px;
        text-align:center;
      ">
        <h2>TRAVEL DIARY</h2>
        <p>
          ${safe(localized(
            "旅日記の読み込みに失敗しました。",
            "Failed to load the travel diary."
          ))}
        </p>
      </div>
    `;
  });

  // 1分ごとに新しい章の公開を確認
  setInterval(checkNewReleases, 60000);

})();
