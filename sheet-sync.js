
"use strict";

/*
 * TRAVELING TAKOYAKI
 * Google Spreadsheet Auto Sync
 *
 * メインサイト用
 * 公開カタログを優先して読み込みます。
 * 取得失敗時は従来のJSONを使用します。
 */

(() => {
  const API =
    "https://traveling-takoyaki-apigentle-art-710b.japan47pixel.workers.dev/api/catalog";

  const originalFetch = window.fetch.bind(window);

  const prefURL = new URL(
    "./prefectures.json",
    document.baseURI
  );

  const settingsURL = new URL(
    "./settings.json",
    document.baseURI
  );

  let catalogPromise = null;

  function getCatalog() {
    if (!catalogPromise) {
      catalogPromise = (async () => {
        const controller = new AbortController();

        const timer = setTimeout(
          () => controller.abort(),
          10000
        );

        try {
          const res = await originalFetch(API, {
            cache: "no-store",
            signal: controller.signal
          });

          if (!res.ok) {
            throw new Error(
              "Catalog HTTP " + res.status
            );
          }

          const data = await res.json();

          if (
            data.ok !== true ||
            !Array.isArray(data.prefectures) ||
            data.prefectures.length !== 47 ||
            !Number.isInteger(data.currentStop) ||
            data.currentStop < 1 ||
            data.currentStop > 47
          ) {
            throw new Error(
              "Invalid catalog data"
            );
          }

          return data;

        } catch (error) {
          console.warn(
            "Sheet sync unavailable. Local JSON will be used.",
            error
          );

          return null;

        } finally {
          clearTimeout(timer);
        }
      })();
    }

    return catalogPromise;
  }

  window.fetch = async function fetchWithSheetSync(
    input,
    options
  ) {
    let url;

    try {
      url = new URL(
        typeof input === "string"
          ? input
          : input.url,
        document.baseURI
      );
    } catch (_) {
      return originalFetch(input, options);
    }

    const isPref =
      url.origin === prefURL.origin &&
      url.pathname === prefURL.pathname;

    const isSettings =
      url.origin === settingsURL.origin &&
      url.pathname === settingsURL.pathname;

    if (!isPref && !isSettings) {
      return originalFetch(input, options);
    }

    const original = await originalFetch(
      input,
      options
    );

    if (!original.ok) {
      return original;
    }

    try {
      const catalog = await getCatalog();

      if (!catalog) {
        return original;
      }

      const local = await original.clone().json();

      let merged;

      if (isPref) {
        if (
          !Array.isArray(local) ||
          local.length !== 47
        ) {
          throw new Error(
            "Invalid local prefecture list"
          );
        }

        if (
          catalog.prefectures.some(
            (row, i) =>
              !row ||
              row.name !== local[i].name ||
              row.region !== local[i].region
          )
        ) {
          throw new Error(
            "Prefecture order mismatch"
          );
        }

        merged = local.map((row, i) => ({
          ...row,
          ...catalog.prefectures[i]
        }));

      } else {
        merged = {
          ...local,
          currentStop: catalog.currentStop
        };
      }

      return new Response(
        JSON.stringify(merged),
        {
          status: 200,
          headers: {
            "Content-Type":
              "application/json; charset=utf-8"
          }
        }
      );

    } catch (error) {
      console.warn(
        "Sheet merge failed. Local JSON will be used.",
        error
      );

      return original;
    }
  };
})();
