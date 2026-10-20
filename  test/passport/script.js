/* ==========================================
   WALLET CONNECTION
   ========================================== */

const connectButton = document.getElementById("connectWallet");
const walletStatus = document.getElementById("walletStatus");

let connectedWallet = null;

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function connectWallet() {
  if (!window.ethereum) {
    walletStatus.textContent =
      "No wallet detected. Please open this page in a wallet browser or install a compatible wallet.";
    return;
  }

  connectButton.disabled = true;
  walletStatus.textContent = "Connecting wallet...";

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    });

    if (!accounts || accounts.length === 0) {
      throw new Error("No wallet account selected.");
    }

    connectedWallet = accounts[0];

    walletStatus.textContent =
      `Connected: ${shortenAddress(connectedWallet)}`;

    connectButton.textContent = "WALLET CONNECTED";

  } catch (error) {
    console.error("Wallet connection error:", error);

    walletStatus.textContent =
      "Wallet connection failed or was cancelled.";

  } finally {
    connectButton.disabled = false;
  }
}

connectButton.addEventListener("click", connectWallet);

/* ==========================================
   ACCOUNT CHANGE
   ========================================== */

if (window.ethereum) {
  window.ethereum.on("accountsChanged", (accounts) => {
    if (accounts.length === 0) {
      connectedWallet = null;

      walletStatus.textContent =
        "Wallet disconnected.";

      connectButton.textContent = "CONNECT WALLET";
    } else {
      connectedWallet = accounts[0];

      walletStatus.textContent =
        `Connected: ${shortenAddress(connectedWallet)}`;

      connectButton.textContent = "WALLET CONNECTED";
    }
  });
}