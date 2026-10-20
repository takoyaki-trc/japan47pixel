
"use strict";

/*
  TRAVELING TAKOYAKI
  JAPAN 47 JOURNEY
  CONTRACT REGISTRY

  Network: Robinhood Chain Mainnet

  ticket: Journey Ticket contract
  nft:    Prefecture NFT contract

  null means the contract has not been registered.
*/

const PASSPORT_CONFIG = {
  chainId: 4663,

  chainIdHex: "0x1237",

  chainName: "Robinhood Chain",

  rpcUrl:
    "https://rpc.mainnet.chain.robinhood.com",

  explorer:
    "https://robinhoodchain.blockscout.com",

  currency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  }
};

const PREFECTURES = [
  { id: "hokkaido", name: "Hokkaido" },
  { id: "aomori", name: "Aomori" },
  { id: "iwate", name: "Iwate" },
  { id: "miyagi", name: "Miyagi" },
  { id: "akita", name: "Akita" },
  { id: "yamagata", name: "Yamagata" },
  { id: "fukushima", name: "Fukushima" },
  { id: "ibaraki", name: "Ibaraki" },
  { id: "tochigi", name: "Tochigi" },
  { id: "gunma", name: "Gunma" },
  { id: "saitama", name: "Saitama" },
  { id: "chiba", name: "Chiba" },
  { id: "tokyo", name: "Tokyo" },
  { id: "kanagawa", name: "Kanagawa" },
  { id: "niigata", name: "Niigata" },
  { id: "toyama", name: "Toyama" },
  { id: "ishikawa", name: "Ishikawa" },
  { id: "fukui", name: "Fukui" },
  { id: "yamanashi", name: "Yamanashi" },
  { id: "nagano", name: "Nagano" },
  { id: "gifu", name: "Gifu" },
  { id: "shizuoka", name: "Shizuoka" },
  { id: "aichi", name: "Aichi" },
  { id: "mie", name: "Mie" },
  { id: "shiga", name: "Shiga" },
  { id: "kyoto", name: "Kyoto" },
  { id: "osaka", name: "Osaka" },
  { id: "hyogo", name: "Hyogo" },
  { id: "nara", name: "Nara" },
  { id: "wakayama", name: "Wakayama" },
  { id: "tottori", name: "Tottori" },
  { id: "shimane", name: "Shimane" },
  { id: "okayama", name: "Okayama" },
  { id: "hiroshima", name: "Hiroshima" },
  { id: "yamaguchi", name: "Yamaguchi" },
  { id: "tokushima", name: "Tokushima" },
  { id: "kagawa", name: "Kagawa" },
  { id: "ehime", name: "Ehime" },
  { id: "kochi", name: "Kochi" },
  { id: "fukuoka", name: "Fukuoka" },
  { id: "saga", name: "Saga" },
  { id: "nagasaki", name: "Nagasaki" },
  { id: "kumamoto", name: "Kumamoto" },
  { id: "oita", name: "Oita" },
  { id: "miyazaki", name: "Miyazaki" },
  { id: "kagoshima", name: "Kagoshima" },
  { id: "okinawa", name: "Okinawa" }
];

const NFT_CONTRACTS = {
  hokkaido: {
    ticket:
      "0xb00bc4887f01f3ef12b21cf805703f8cd49329d4",
    nft: null
  },

  aomori: {
    ticket: null,
    nft: null
  },

  iwate: {
    ticket: null,
    nft: null
  },

  miyagi: {
    ticket: null,
    nft: null
  },

  akita: {
    ticket: null,
    nft: null
  },

  yamagata: {
    ticket: null,
    nft: null
  },

  fukushima: {
    ticket: null,
    nft: null
  },

  ibaraki: {
    ticket: null,
    nft: null
  },

  tochigi: {
    ticket: null,
    nft: null
  },

  gunma: {
    ticket: null,
    nft: null
  },

  saitama: {
    ticket: null,
    nft: null
  },

  chiba: {
    ticket: null,
    nft: null
  },

  tokyo: {
    ticket: null,
    nft: null
  },

  kanagawa: {
    ticket: null,
    nft: null
  },

  niigata: {
    ticket: null,
    nft: null
  },

  toyama: {
    ticket: null,
    nft: null
  },

  ishikawa: {
    ticket: null,
    nft: null
  },

  fukui: {
    ticket: null,
    nft: null
  },

  yamanashi: {
    ticket: null,
    nft: null
  },

  nagano: {
    ticket: null,
    nft: null
  },

  gifu: {
    ticket: null,
    nft: null
  },

  shizuoka: {
    ticket: null,
    nft: null
  },

  aichi: {
    ticket: null,
    nft: null
  },

  mie: {
    ticket: null,
    nft: null
  },

  shiga: {
    ticket: null,
    nft: null
  },

  kyoto: {
    ticket: null,
    nft: null
  },

  osaka: {
    ticket: null,
    nft: null
  },

  hyogo: {
    ticket: null,
    nft: null
  },

  nara: {
    ticket: null,
    nft: null
  },

  wakayama: {
    ticket: null,
    nft: null
  },

  tottori: {
    ticket: null,
    nft: null
  },

  shimane: {
    ticket: null,
    nft: null
  },

  okayama: {
    ticket: null,
    nft: null
  },

  hiroshima: {
    ticket: null,
    nft: null
  },

  yamaguchi: {
    ticket: null,
    nft: null
  },

  tokushima: {
    ticket: null,
    nft: null
  },

  kagawa: {
    ticket: null,
    nft: null
  },

  ehime: {
    ticket: null,
    nft: null
  },

  kochi: {
    ticket: null,
    nft: null
  },

  fukuoka: {
    ticket: null,
    nft: null
  },

  saga: {
    ticket: null,
    nft: null
  },

  nagasaki: {
    ticket: null,
    nft: null
  },

  kumamoto: {
    ticket: null,
    nft: null
  },

  oita: {
    ticket: null,
    nft: null
  },

  miyazaki: {
    ticket: null,
    nft: null
  },

  kagoshima: {
    ticket: null,
    nft: null
  },

  okinawa: {
    ticket: null,
    nft: null
  }
};
