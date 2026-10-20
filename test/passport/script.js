
"use strict";

/* ==========================================
   TRAVELING TAKOYAKI
   MY TRAVEL PASSPORT
   ========================================== */

const $ = selector =>
  document.querySelector(selector);

const walletButton = $("#connectWallet");
const walletStatus = $("#walletStatus");
const walletDetails = $("#walletDetails");
const walletAddress = $("#walletAddress");

const refreshButton = $("#refreshWallet");
const disconnectButton = $("#disconnectWallet");

const addressForm = $("#addressForm");
const addressInput = $("#addressInput");

const ticketCount = $("#ticketCount");
const nftCount = $("#nftCount");

const progressText = $("#progressText");
const progressBar = $("#progressBar");

const prefectureGrid = $("#prefectureGrid");

let currentAddress = null;
let currentProvider = null;
let requestVersion = 0;

let collection = {};
let failedContracts = new Set();

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const CONTRACT_PATTERN = /^0x[a-fA-F0-9]{40}$/;

/*
  ERC-721 and ERC-1155:
  balanceOf(address) selector: 0x70a08231

  ERC-1155:
  balanceOf(address,uint256) selector: 0x00fdd58e

  For ERC-1155, configure a token ID
  in contracts.js using:
  { address: "0x...", tokenId: "1" }
*/

const ERC721_BALANCE_SELECTOR = "70a08231";
const ERC1155_BALANCE_SELECTOR = "00fdd58e";

/* ==========================================
   HELPERS
   ========================================== */

function isValidAddress(address) {
  return ADDRESS_PATTERN.test(address);
}

function shortenAddress(address) {
  return (
    address.slice(0, 6) +
    "..." +
    address.slice(-4)
  );
}

function setStatus(message, type = "") {
  walletStatus.textContent = message;

  walletStatus.className = "wallet-status";

  if (type) {
    walletStatus.classList.add(type);
  }
}

function setLoading(loading) {
  walletButton.disabled = loading;
  refreshButton.disabled = loading;

  walletButton.textContent = loading
    ? "LOADING..."
    : "CONNECT WALLET";
}

function initialCollection() {
  return Object.fromEntries(
    PREFECTURES.map(prefecture => [
      prefecture.id,
      {
        ticket: 0n,
        nft: 0n,
        ticketError: false,
        nftError: false
      }
    ])
  );
}

function hasContract(config) {
  if (typeof config === "string") {
    return CONTRACT_PATTERN.test(config);
  }

  return Boolean(
    config &&
    typeof config === "object" &&
    CONTRACT_PATTERN.test(config.address)
  );
}

function getContractAddress(config) {
  return typeof config === "string"
    ? config
    : config.address;
}

function getContractTokenId(config) {
  if (
    config &&
    typeof config === "object" &&
    config.tokenId !== undefined &&
    config.tokenId !== null
  ) {
    return BigInt(config.tokenId);
  }

  return null;
}

function encodeUint256(value) {
  return BigInt(value)
    .toString(16)
    .padStart(64, "0");
}

function encodeAddress(address) {
  return address
    .slice(2)
    .toLowerCase()
    .padStart(64, "0");
}

/* ==========================================
   RPC
   ========================================== */

async function rpcRequest(method, params = []) {
  const response = await fetch(
    PASSPORT_CONFIG.rpcUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      "RPC HTTP error: " + response.status
    );
  }

  const result = await response.json();

  if (result.error) {
    throw new Error(
      result.error.message || "RPC error"
    );
  }

  if (result.result === undefined) {
    throw new Error("Invalid RPC response");
  }

  return result.result;
}

async function verifyNetwork() {
  const chainId = await rpcRequest(
    "eth_chainId"
  );

  if (
    BigInt(chainId) !==
    BigInt(PASSPORT_CONFIG.chainId)
  ) {
    throw new Error(
      "RPC network does not match Robinhood Chain."
    );
  }
}

/* ==========================================
   NFT BALANCE
   ========================================== */

async function getNFTBalance(
  contractConfig,
  ownerAddress
) {
  if (!hasContract(contractConfig)) {
    return 0n;
  }

  const contractAddress =
    getContractAddress(contractConfig);

  const tokenId =
    getContractTokenId(contractConfig);

  let data;

  if (tokenId === null) {
    // ERC-721 balanceOf(address)
    data =
      "0x" +
      ERC721_BALANCE_SELECTOR +
      encodeAddress(ownerAddress);
  } else {
    // ERC-1155 balanceOf(address,uint256)
    data =
      "0x" +
      ERC1155_BALANCE_SELECTOR +
      encodeAddress(ownerAddress) +
      encodeUint256(tokenId);
  }

  const result = await rpcRequest(
    "eth_call",
    [
      {
        to: contractAddress,
        data
      },
      "latest"
    ]
  );

  if (
    typeof result !== "string" ||
    !/^0x[0-9a-fA-F]+$/.test(result) ||
    result.length < 66
  ) {
    throw new Error(
      "Invalid balance response from contract."
    );
  }

  return BigInt(result);
}

/* ==========================================
   RENDER PREFECTURES
   ========================================== */

function createBadge(
  label,
  quantity,
  registered,
  error
) {
  const badge = document.createElement("span");

  badge.className = "collection-badge";

  if (!registered) {
    badge.classList.add("pending");
    badge.textContent = label + " —";
  } else if (error) {
    badge.textContent = label + " ?";
  } else if (quantity > 0n) {
    badge.classList.add("owned");

    badge.textContent =
      label + " ✓";

    if (quantity > 1n) {
      badge.textContent +=
        " ×" + quantity.toString();
    }
  } else {
    badge.textContent = label + " 0";
  }

  return badge;
}

function renderPrefectures() {
  prefectureGrid.replaceChildren();

  PREFECTURES.forEach((prefecture, index) => {
    const contracts =
      NFT_CONTRACTS[prefecture.id] || {};

    const owned =
      collection[prefecture.id] || {
        ticket: 0n,
        nft: 0n,
        ticketError: false,
        nftError: false
      };

    const ticketRegistered =
      hasContract(contracts.ticket);

    const nftRegistered =
      hasContract(contracts.nft);

    const launched =
      ticketRegistered || nftRegistered;

    const hasTicket = owned.ticket > 0n;
    const hasNFT = owned.nft > 0n;

    const hasAny = hasTicket || hasNFT;

    const hasError =
      owned.ticketError || owned.nftError;

    const card = document.createElement("div");

    card.className = "prefecture-card";

    if (!launched) {
      card.classList.add("upcoming");
    }

    if (hasAny) {
      card.classList.add("collected");
    }

    const stop = document.createElement("div");
    stop.className = "stop-number";
    stop.textContent =
      "STOP " + String(index + 1).padStart(2, "0");

    const symbol = document.createElement("div");
    symbol.className = "prefecture-symbol";

    symbol.textContent = hasAny
      ? "🏅"
      : launched
        ? "🐙"
        : "🔒";

    const name = document.createElement("h3");
    name.className = "prefecture-name";
    name.textContent = prefecture.name;

    const badges = document.createElement("div");
    badges.className = "collection-badges";

    badges.appendChild(
      createBadge(
        "🎟️",
        owned.ticket,
        ticketRegistered,
        owned.ticketError
      )
    );

    badges.appendChild(
      createBadge(
        "🖼️",
        owned.nft,
        nftRegistered,
        owned.nftError
      )
    );

    const state = document.createElement("div");
    state.className = "prefecture-state";

    if (hasAny) {
      state.classList.add("complete");

      state.textContent =
        hasTicket && hasNFT
          ? "TICKET + NFT COLLECTED"
          : hasTicket
            ? "TICKET COLLECTED"
            : "NFT COLLECTED";
    } else if (hasError) {
      state.classList.add("warning");
      state.textContent = "CHECK FAILED";
    } else if (!launched) {
      state.textContent = "COMING SOON";
    } else if (!currentAddress) {
      state.textContent = "NOT CHECKED";
    } else {
      state.textContent = "NOT COLLECTED";
    }

    card.append(
      stop,
      symbol,
      name,
      badges,
      state
    );

    prefectureGrid.appendChild(card);
  });
}

/* ==========================================
   RENDER TOTALS
   ========================================== */

function updateTotals() {
  let ticketPrefectures = 0;
  let nftPrefectures = 0;
  let visitedPrefectures = 0;

  PREFECTURES.forEach(prefecture => {
    const owned = collection[prefecture.id];

    if (!owned) return;

    const hasTicket = owned.ticket > 0n;
    const hasNFT = owned.nft > 0n;

    if (hasTicket) {
      ticketPrefectures++;
    }

    if (hasNFT) {
      nftPrefectures++;
    }

    if (hasTicket || hasNFT) {
      visitedPrefectures++;
    }
  });

  ticketCount.textContent =
    ticketPrefectures + " / 47";

  nftCount.textContent =
    nftPrefectures + " / 47";

  progressText.textContent =
    visitedPrefectures + " / 47";

  progressBar.style.width =
    (
      visitedPrefectures /
      PREFECTURES.length *
      100
    ) + "%";
}

/* ==========================================
   LOAD COLLECTION
   ========================================== */

async function loadCollection(address) {
  const thisRequest = ++requestVersion;

  collection = initialCollection();
  failedContracts = new Set();

  updateTotals();
  renderPrefectures();

  setLoading(true);

  setStatus(
    "Checking your collection on Robinhood Chain..."
  );

  try {
    await verifyNetwork();

    if (thisRequest !== requestVersion) {
      return;
    }

    const tasks = [];

    for (const prefecture of PREFECTURES) {
      const contracts =
        NFT_CONTRACTS[prefecture.id] || {};

      for (const type of ["ticket", "nft"]) {
        const contract = contracts[type];

        if (!hasContract(contract)) {
          continue;
        }

        tasks.push({
          prefectureId: prefecture.id,
          type,
          contract
        });
      }
    }

    // Check registered contracts sequentially to
    // reduce pressure on the public RPC endpoint.
    for (const task of tasks) {
      if (thisRequest !== requestVersion) {
        return;
      }

      try {
        const balance = await getNFTBalance(
          task.contract,
          address
        );

        if (thisRequest !== requestVersion) {
          return;
        }

        collection[task.prefectureId][task.type] =
          balance;
      } catch (error) {
        if (thisRequest !== requestVersion) {
          return;
        }

        console.error(
          "NFT balance check failed:",
          task.prefectureId,
          task.type,
          error
        );

        collection[task.prefectureId][
          task.type + "Error"
        ] = true;

        failedContracts.add(
          task.prefectureId + ":" + task.type
        );
      }

      updateTotals();
      renderPrefectures();
    }

    if (thisRequest !== requestVersion) {
      return;
    }

    if (failedContracts.size > 0) {
      setStatus(
        "Collection check partially completed. " +
        failedContracts.size +
        " contract check(s) failed. " +
        "Please try REFRESH COLLECTION.",
        "error"
      );
    } else {
      setStatus(
        "Collection checked successfully!",
        "success"
      );
    }

  } catch (error) {
    if (thisRequest !== requestVersion) {
      return;
    }

    console.error(error);

    setStatus(
      "Unable to read Robinhood Chain. " +
      "Please try again later. " +
      error.message,
      "error"
    );
  } finally {
    if (thisRequest === requestVersion) {
      setLoading(false);
    }
  }
}

/* ==========================================
   SELECT WALLET
   ========================================== */

async function selectWallet(
  address,
  provider = null
) {
  if (!isValidAddress(address)) {
    setStatus(
      "Please enter a valid wallet address.",
      "error"
    );
    return;
  }

  currentAddress = address;
  currentProvider = provider;

  walletDetails.hidden = false;

  walletAddress.textContent =
    "WALLET: " + shortenAddress(address);

  await loadCollection(address);
}

/* ==========================================
   CONNECT WALLET
   ========================================== */

async function connectWallet() {
  const provider = window.ethereum;

  if (
    !provider ||
    typeof provider.request !== "function"
  ) {
    setStatus(
      "No compatible wallet detected. " +
      "Open this page in a wallet browser, " +
      "or enter your public wallet address below.",
      "error"
    );
    return;
  }

  try {
    setStatus("Waiting for wallet approval...");

    const accounts = await provider.request({
      method: "eth_requestAccounts"
    });

    if (!accounts || !accounts.length) {
      throw new Error(
        "No wallet account was selected."
      );
    }

    await selectWallet(
      accounts[0],
      provider
    );

  } catch (error) {
    console.error(error);

    if (error.code === 4001) {
      setStatus(
        "Wallet connection was cancelled.",
        "error"
      );
    } else {
      setStatus(
        "Wallet connection failed: " +
        (error.message || "Unknown error"),
        "error"
      );
    }
  }
}

/* ==========================================
   CLEAR WALLET
   ========================================== */

function clearWallet() {
  requestVersion++;

  currentAddress = null;
  currentProvider = null;

  collection = initialCollection();
  failedContracts = new Set();

  walletDetails.hidden = true;
  walletAddress.textContent = "";
  addressInput.value = "";

  setLoading(false);

  setStatus(
    "Enter or connect a wallet to view your collection."
  );

  updateTotals();
  renderPrefectures();
}

/* ==========================================
   WALLET EVENTS
   ========================================== */

function handleAccountsChanged(accounts) {
  if (!currentProvider) {
    return;
  }

  if (!accounts || !accounts.length) {
    clearWallet();
    return;
  }

  if (
    accounts[0].toLowerCase() !==
    (currentAddress || "").toLowerCase()
  ) {
    selectWallet(
      accounts[0],
      currentProvider
    );
  }
}

if (
  window.ethereum &&
  typeof window.ethereum.on === "function"
) {
  window.ethereum.on(
    "accountsChanged",
    handleAccountsChanged
  );
}

/* ==========================================
   BUTTON EVENTS
   ========================================== */

walletButton.addEventListener(
  "click",
  connectWallet
);

refreshButton.addEventListener(
  "click",
  () => {
    if (currentAddress) {
      loadCollection(currentAddress);
    }
  }
);

disconnectButton.addEventListener(
  "click",
  clearWallet
);

addressForm.addEventListener(
  "submit",
  event => {
    event.preventDefault();

    const address = addressInput.value.trim();

    if (!isValidAddress(address)) {
      setStatus(
        "Please enter a valid 0x wallet address.",
        "error"
      );
      return;
    }

    selectWallet(address, null);
  }
);

/* ==========================================
   INITIALIZE
   ========================================== */

function initializePassport() {
  collection = initialCollection();

  updateTotals();
  renderPrefectures();

  console.log(
    "TRAVELING TAKOYAKI PASSPORT READY"
  );
}

initializePassport();
