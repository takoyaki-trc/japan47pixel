"use strict";


/* ========================================
   JAPANESE TRANSLATION DETECTION
======================================== */

(() => {

  let updateTimer;


  function updateLanguageClass(){

    const heading =
      document.querySelector(".intro h1");

    const containsJapanese =
      heading &&
      /[\u3040-\u30ff\u3400-\u9fff]/.test(
        heading.textContent
      );

    document.body.classList.toggle(
      "is-ja",
      Boolean(containsJapanese)
    );
  }


  const translationObserver =
    new MutationObserver(() => {

      window.clearTimeout(updateTimer);

      updateTimer =
        window.setTimeout(
          updateLanguageClass,
          80
        );
    });


  translationObserver.observe(
    document.body,
    {
      subtree:true,
      childList:true,
      characterData:true
    }
  );


  updateLanguageClass();

})();


/* ========================================
   JAPAN 47 JOURNEY BOARD
======================================== */

(() => {

  const prefectures = [
    "HOKKAIDO",
    "AOMORI",
    "IWATE",
    "MIYAGI",
    "AKITA",
    "YAMAGATA",
    "FUKUSHIMA",
    "IBARAKI",
    "TOCHIGI",
    "GUNMA",
    "SAITAMA",
    "CHIBA",
    "TOKYO",
    "KANAGAWA",
    "NIIGATA",
    "TOYAMA",
    "ISHIKAWA",
    "FUKUI",
    "YAMANASHI",
    "NAGANO",
    "GIFU",
    "SHIZUOKA",
    "AICHI",
    "MIE",
    "SHIGA",
    "KYOTO",
    "OSAKA",
    "HYOGO",
    "NARA",
    "WAKAYAMA",
    "TOTTORI",
    "SHIMANE",
    "OKAYAMA",
    "HIROSHIMA",
    "YAMAGUCHI",
    "TOKUSHIMA",
    "KAGAWA",
    "EHIME",
    "KOCHI",
    "FUKUOKA",
    "SAGA",
    "NAGASAKI",
    "KUMAMOTO",
    "OITA",
    "MIYAZAKI",
    "KAGOSHIMA",
    "OKINAWA"
  ];


  const routeTiles =
    document.getElementById("route-tiles");

  const routeBoard =
    document.getElementById("board");

  const routeSvg =
    document.getElementById("route-svg");

  const routeCar =
    document.getElementById("route-car");

  const driveButton =
    document.getElementById("route-drive");

  const routeStatus =
    document.getElementById("route-status");


  if(
    !routeTiles ||
    !routeBoard ||
    !routeSvg ||
    !routeCar ||
    !driveButton ||
    !routeStatus
  ){
    return;
  }


  let currentPosition = 0;
  let isDriving = false;
  let lastColumnCount = 0;


  /* 現在の列数を取得 */

  function getColumnCount(){

    const gridColumns =
      getComputedStyle(routeTiles)
        .gridTemplateColumns
        .split(" ");

    return gridColumns.length;
  }


  /*
    都道府県番号から、
    折り返しを含めた画面上の位置を取得
  */

  function getVisualOrder(stopNumber){

    const columnCount =
      getColumnCount();

    const row =
      Math.floor(
        stopNumber / columnCount
      );

    const column =
      stopNumber % columnCount;


    if(row % 2 === 1){

      return (
        row * columnCount +
        columnCount -
        1 -
        column
      );
    }


    return (
      row * columnCount +
      column
    );
  }


  /* 地方ごとのクラス名 */

  function getRegion(stopNumber){

    if(stopNumber === 0){
      return "hokkaido";
    }

    if(stopNumber < 7){
      return "tohoku";
    }

    if(stopNumber < 14){
      return "kanto";
    }

    if(stopNumber < 23){
      return "chubu";
    }

    if(stopNumber < 30){
      return "kansai";
    }

    if(stopNumber < 35){
      return "chugoku";
    }

    if(stopNumber < 39){
      return "shikoku";
    }

    return "kyushu";
  }


  /* 47都道府県の丸いマスを作る */

  function renderRouteTiles(){

    routeTiles.innerHTML = "";

    const columnCount =
      getColumnCount();

    /*
      47都道府県のあとに
      GOALを1つ加えるため48マス
    */

    const totalTiles =
      Math.ceil(48 / columnCount) *
      columnCount;


    for(
      let visualIndex = 0;
      visualIndex < totalTiles;
      visualIndex++
    ){

      const row =
        Math.floor(
          visualIndex / columnCount
        );

      const column =
        visualIndex % columnCount;


      /*
        偶数段は左から右、
        奇数段は右から左へ進む
      */

      const stopNumber =
        row * columnCount +
        (
          row % 2 === 1
            ? columnCount - 1 - column
            : column
        );


      const routeTile =
        document.createElement("div");


      let tileType;

      if(stopNumber >= 48){
        tileType = "filler";
      }
      else if(stopNumber === 47){
        tileType = "goal";
      }
      else{
        tileType =
          getRegion(stopNumber);
      }


      let tileState;

      if(stopNumber === currentPosition){
        tileState = "current";
      }
      else if(
        currentPosition === 0 &&
        stopNumber === 1
      ){
        tileState = "next";
      }
      else{
        tileState = "locked";
      }


      routeTile.className =
        "route-tile " +
        tileType +
        " " +
        tileState;

      routeTile.dataset.stop =
        String(stopNumber);


      if(stopNumber < 47){

        const stopName =
          stopNumber < 2 ||
          stopNumber === currentPosition
            ? prefectures[stopNumber]
            : "?";


        routeTile.innerHTML = `
          <b>
            ${String(stopNumber + 1).padStart(2,"0")}
          </b>

          <small>
            ${stopName}
          </small>
        `;
      }
      else if(stopNumber === 47){

        routeTile.innerHTML = `
          <b>★</b>
          <small>GOAL</small>
        `;
      }


      routeTiles.appendChild(
        routeTile
      );
    }


    requestAnimationFrame(
      drawRoute
    );
  }


  /* 指定したマスの中心座標を取得 */

  function getTileCenter(stopNumber){

    const visualIndex =
      getVisualOrder(stopNumber);

    const routeTile =
      routeTiles.children[visualIndex];


    if(!routeTile){

      return {
        x:0,
        y:0
      };
    }


    const boardRectangle =
      routeBoard.getBoundingClientRect();

    const tileRectangle =
      routeTile.getBoundingClientRect();


    return {

      x:
        tileRectangle.left -
        boardRectangle.left +
        tileRectangle.width / 2,

      y:
        tileRectangle.top -
        boardRectangle.top +
        tileRectangle.height / 2

    };
  }


  /* 道路のSVGを描く */

  function drawRoute(){

    const boardWidth =
      routeBoard.clientWidth;

    const boardHeight =
      routeBoard.clientHeight;


    if(
      boardWidth === 0 ||
      boardHeight === 0
    ){
      return;
    }


    routeSvg.setAttribute(
      "viewBox",
      `0 0 ${boardWidth} ${boardHeight}`
    );


    const routePoints =
      prefectures.map(
        (_,index) =>
          getTileCenter(index)
      );


    let routePath =
      `M ${routePoints[0].x} ${routePoints[0].y}`;


    for(
      let index = 1;
      index < routePoints.length;
      index++
    ){

      const previousPoint =
        routePoints[index - 1];

      const currentPoint =
        routePoints[index];


      const changedRow =
        Math.abs(
          previousPoint.y -
          currentPoint.y
        ) > 8;


      if(changedRow){

        const bendY =
          (
            previousPoint.y +
            currentPoint.y
          ) / 2;

        const middleX =
          (
            previousPoint.x +
            currentPoint.x
          ) / 2;


        routePath +=
          ` Q ${previousPoint.x} ${bendY},` +
          ` ${middleX} ${bendY}` +
          ` Q ${currentPoint.x} ${bendY},` +
          ` ${currentPoint.x} ${currentPoint.y}`;
      }
      else{

        const middleX =
          (
            previousPoint.x +
            currentPoint.x
          ) / 2;


        routePath +=
          ` Q ${middleX} ${previousPoint.y - 7},` +
          ` ${currentPoint.x} ${currentPoint.y}`;
      }
    }


    routeSvg.innerHTML = `
      <path
        d="${routePath}"
        fill="none"
        stroke="#786451"
        stroke-width="19"
        stroke-linecap="round"
        stroke-linejoin="round"
      ></path>

      <path
        d="${routePath}"
        fill="none"
        stroke="#e6c994"
        stroke-width="14"
        stroke-linecap="round"
        stroke-linejoin="round"
      ></path>

      <path
        d="${routePath}"
        fill="none"
        stroke="#fff8dc"
        stroke-width="2"
        stroke-dasharray="7 10"
        stroke-linecap="round"
      ></path>
    `;


    /* 車を現在地へ移動 */

    const currentCenter =
      getTileCenter(
        currentPosition
      );


    routeCar.style.left =
      currentCenter.x + "px";

    routeCar.style.top =
      currentCenter.y + "px";


    /*
      偶数段と奇数段で
      車の向きを変更
    */

    const currentRow =
      Math.floor(
        currentPosition /
        getColumnCount()
      );


    routeCar.src =
      currentRow % 2 === 1
        ? "https://ul.h3z.jp/DWCD23BJ.png"
        : "https://ul.h3z.jp/Lu7ch0Ne.png";
  }


  /* 次の県へ車を進める */

  driveButton.addEventListener(
    "click",
    () => {

      if(isDriving){
        return;
      }


      isDriving = true;

      routeCar.classList.remove(
        "idle"
      );


      const previousTile =
        routeTiles.children[
          getVisualOrder(
            currentPosition
          )
        ];


      if(previousTile){

        previousTile.classList.remove(
          "current"
        );

        previousTile.classList.add(
          "locked"
        );
      }


      /*
        沖縄まで進んだら
        北海道へ戻る
      */

      currentPosition =
        currentPosition === 46
          ? 0
          : currentPosition + 1;


      const currentTile =
        routeTiles.children[
          getVisualOrder(
            currentPosition
          )
        ];


      if(currentTile){

        currentTile.classList.remove(
          "locked",
          "next"
        );

        currentTile.classList.add(
          "current"
        );


        const currentLabel =
          currentTile.querySelector(
            "small"
          );


        if(currentLabel){

          currentLabel.textContent =
            prefectures[
              currentPosition
            ];
        }
      }


      driveButton.textContent =
        currentPosition === 46
          ? "RETURN TO HOKKAIDO ↶"
          : "PREVIEW THE NEXT STOP →";


      routeStatus.textContent =
        currentPosition === 0
          ? (
              "CURRENT STOP: " +
              "HOKKAIDO · BOARDING SOON"
            )
          : (
              "NEXT TICKET: " +
              prefectures[
                currentPosition
              ] +
              " · COMING SOON"
            );


      drawRoute();


      window.setTimeout(
        () => {

          isDriving = false;

          routeCar.classList.add(
            "idle"
          );

        },
        1450
      );

    }
  );


  /* 画面サイズ変更への対応 */

  const routeResizeObserver =
    new ResizeObserver(() => {

      const currentColumnCount =
        getColumnCount();


      if(
        currentColumnCount !==
        lastColumnCount
      ){

        lastColumnCount =
          currentColumnCount;

        renderRouteTiles();
      }
      else{
        drawRoute();
      }

    });


  routeResizeObserver.observe(
    routeBoard
  );


  renderRouteTiles();

  routeCar.classList.add(
    "idle"
  );

})();


/* ========================================
   TICKET COUNTDOWN
======================================== */

(() => {

  const countdown =
    document.getElementById(
      "ticket-countdown"
    );


  if(!countdown){
    return;
  }


  /*
    ミント開始日時が決まったら、
    index.htmlのdata-mint-startへ
    日時を入力してください。

    例：

    data-mint-start=
    "2026-11-01T12:00:00+09:00"

    日時が空欄の場合は、
    DATE TO BE ANNOUNCEDのまま表示します。
  */

  const rawStartDate =
    countdown.dataset.mintStart;


  if(!rawStartDate){
    return;
  }


  const mintStartTime =
    new Date(
      rawStartDate
    ).getTime();


  if(
    !Number.isFinite(
      mintStartTime
    )
  ){
    return;
  }


  const dayNode =
    document.getElementById(
      "count-days"
    );

  const hourNode =
    document.getElementById(
      "count-hours"
    );

  const minuteNode =
    document.getElementById(
      "count-minutes"
    );

  const secondNode =
    document.getElementById(
      "count-seconds"
    );

  const countdownCaption =
    document.getElementById(
      "countdown-caption"
    );


  function updateCountdown(){

    const totalSeconds =
      Math.max(
        0,
        Math.floor(
          (
            mintStartTime -
            Date.now()
          ) / 1000
        )
      );


    const days =
      Math.floor(
        totalSeconds / 86400
      );

    const hours =
      Math.floor(
        (
          totalSeconds % 86400
        ) / 3600
      );

    const minutes =
      Math.floor(
        (
          totalSeconds % 3600
        ) / 60
      );

    const seconds =
      totalSeconds % 60;


    dayNode.textContent =
      String(days).padStart(
        2,
        "0"
      );

    hourNode.textContent =
      String(hours).padStart(
        2,
        "0"
      );

    minuteNode.textContent =
      String(minutes).padStart(
        2,
        "0"
      );

    secondNode.textContent =
      String(seconds).padStart(
        2,
        "0"
      );


    countdownCaption.textContent =
      totalSeconds > 0
        ? "FREE JOURNEY TICKET MINTING IN"
        : "JOURNEY TICKET MINT IS OPEN";


    if(totalSeconds === 0){

      window.clearInterval(
        countdownTimer
      );
    }
  }


  const countdownTimer =
    window.setInterval(
      updateCountdown,
      1000
    );


  updateCountdown();

})();


/* ========================================
   AUTO-SCROLL COLLECTION GALLERY
======================================== */

(() => {

  const gallery =
    document.getElementById(
      "collection-gallery"
    );

  const previousButton =
    document.getElementById(
      "gallery-previous"
    );

  const nextButton =
    document.getElementById(
      "gallery-next"
    );

  const toggleButton =
    document.getElementById(
      "gallery-toggle"
    );


  if(
    !gallery ||
    !previousButton ||
    !nextButton ||
    !toggleButton
  ){
    return;
  }


  const reduceMotion =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );


  /*
    元画像を複製し、
    終端から先頭へ自然につながる
    ループを作る
  */

  const originalCards =
    Array.from(
      gallery.children
    );


  originalCards.forEach(
    (card) => {

      const clonedCard =
        card.cloneNode(true);


      clonedCard.classList.add(
        "is-clone"
      );


      clonedCard.setAttribute(
        "aria-hidden",
        "true"
      );


      clonedCard
        .querySelectorAll("img")
        .forEach(
          (image) => {

            image.alt = "";

          }
        );


      gallery.appendChild(
        clonedCard
      );

    }
  );


  let manuallyPaused =
    reduceMotion.matches;

  let temporarilyPaused = false;

  let resumeTimer = 0;

  let previousTime =
    performance.now();


  /* 複製前の画像全体の横幅 */

  function getOriginalGalleryWidth(){

    if(originalCards.length === 0){
      return 0;
    }


    const firstCard =
      originalCards[0];

    const lastCard =
      originalCards[
        originalCards.length - 1
      ];


    return (
      lastCard.offsetLeft +
      lastCard.offsetWidth -
      firstCard.offsetLeft +
      14
    );
  }


  /* 再生・停止ボタンの表示更新 */

  function updateGalleryState(){

    const isRunning =
      !manuallyPaused &&
      !temporarilyPaused &&
      !reduceMotion.matches;


    gallery.classList.toggle(
      "is-auto",
      isRunning
    );


    toggleButton.textContent =
      manuallyPaused
        ? "PLAY"
        : "PAUSE";


    toggleButton.setAttribute(
      "aria-pressed",
      String(manuallyPaused)
    );


    toggleButton.setAttribute(
      "aria-label",
      manuallyPaused
        ? "Start automatic scrolling"
        : "Pause automatic scrolling"
    );
  }


  /*
    スワイプ、ホイール、ボタン操作時は
    一時的に自動スクロールを停止
  */

  function pauseTemporarily(
    duration = 3500
  ){

    temporarilyPaused = true;

    window.clearTimeout(
      resumeTimer
    );

    updateGalleryState();


    resumeTimer =
      window.setTimeout(
        () => {

          temporarilyPaused = false;

          updateGalleryState();

        },
        duration
      );
  }


  /* カード1枚分の移動距離 */

  function getCardDistance(){

    const firstCard =
      gallery.querySelector(
        ".piece"
      );


    if(!firstCard){
      return 180;
    }


    return (
      firstCard
        .getBoundingClientRect()
        .width +
      14
    );
  }


  /* 前後ボタンで画像を動かす */

  function moveGallery(direction){

    pauseTemporarily();


    gallery.scrollBy({

      left:
        direction *
        getCardDistance(),

      behavior:
        reduceMotion.matches
          ? "auto"
          : "smooth"

    });
  }


  /*
    requestAnimationFrameで
    自動スクロール
  */

  function animateGallery(
    currentTime
  ){

    const elapsedTime =
      Math.min(
        40,
        currentTime -
        previousTime
      );


    previousTime =
      currentTime;


    if(
      !manuallyPaused &&
      !temporarilyPaused &&
      !reduceMotion.matches
    ){

      /*
        数字を大きくすると速く、
        小さくすると遅くなる
      */

      gallery.scrollLeft +=
        elapsedTime * 0.035;


      const originalWidth =
        getOriginalGalleryWidth();


      /*
        複製部分へ到達したら、
        同じ見た目の先頭位置へ戻す
      */

      if(
        originalWidth > 0 &&
        gallery.scrollLeft >=
          originalWidth
      ){

        gallery.scrollLeft -=
          originalWidth;
      }
    }


    requestAnimationFrame(
      animateGallery
    );
  }


  /* 前の画像 */

  previousButton.addEventListener(
    "click",
    () => {

      moveGallery(-1);

    }
  );


  /* 次の画像 */

  nextButton.addEventListener(
    "click",
    () => {

      moveGallery(1);

    }
  );


  /* 自動スクロールの再生・停止 */

  toggleButton.addEventListener(
    "click",
    () => {

      manuallyPaused =
        !manuallyPaused;

      temporarilyPaused = false;


      window.clearTimeout(
        resumeTimer
      );


      updateGalleryState();

    }
  );


  /*
    スマホ操作やマウス操作中は
    自動スクロールを一時停止
  */

  gallery.addEventListener(
    "pointerdown",
    () => {

      pauseTemporarily(5000);

    }
  );


  gallery.addEventListener(
    "wheel",
    () => {

      pauseTemporarily(5000);

    },
    {
      passive:true
    }
  );


  gallery.addEventListener(
    "focusin",
    () => {

      pauseTemporarily(5000);

    }
  );


  /*
    パソコンでカーソルが
    ギャラリー上にある間は停止
  */

  gallery.addEventListener(
    "mouseenter",
    () => {

      temporarilyPaused = true;

      updateGalleryState();

    }
  );


  gallery.addEventListener(
    "mouseleave",
    () => {

      temporarilyPaused = false;

      updateGalleryState();

    }
  );


  /*
    端末側の
    アニメーション軽減設定に対応
  */

  if(
    typeof reduceMotion
      .addEventListener ===
      "function"
  ){

    reduceMotion.addEventListener(
      "change",
      updateGalleryState
    );
  }
  else{

    /*
      古いSafari用
    */

    reduceMotion.addListener(
      updateGalleryState
    );
  }


  updateGalleryState();

  requestAnimationFrame(
    animateGallery
  );

})();


/* ========================================
   FAQ ACCORDION
======================================== */

(() => {

  const faqItems =
    document.querySelectorAll(
      ".faq-item"
    );


  faqItems.forEach(
    (faqItem) => {

      faqItem.addEventListener(
        "toggle",
        () => {

          /*
            閉じたFAQでは
            何もしない
          */

          if(!faqItem.open){
            return;
          }


          /*
            1つ開いたら、
            ほかのFAQを閉じる
          */

          faqItems.forEach(
            (otherItem) => {

              if(
                otherItem !==
                faqItem
              ){

                otherItem.open =
                  false;
              }

            }
          );

        }
      );

    }
  );

})();