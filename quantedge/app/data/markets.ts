export type FinancialCentre = {
  id: string;
  city: string;
  country: string;
  exchange: string;
  lat: number;
  lon: number;
  session: "open" | "closed" | "pre" | "post";
  indices: { symbol: string; last: number; chg: number }[];
  tz: string;
  activity: number; // 0..1 relative trading intensity
};

export const CENTRES: FinancialCentre[] = [
  {
    id: "nyc",
    city: "New York",
    country: "USA",
    exchange: "NYSE / NASDAQ",
    lat: 40.7128,
    lon: -74.006,
    session: "open",
    tz: "America/New_York",
    activity: 1.0,
    indices: [
      { symbol: "SPX", last: 5812.42, chg: 0.42 },
      { symbol: "NDX", last: 20410.6, chg: 0.71 },
      { symbol: "DJI", last: 43120.1, chg: 0.21 },
    ],
  },
  {
    id: "lon",
    city: "London",
    country: "UK",
    exchange: "LSE",
    lat: 51.5074,
    lon: -0.1278,
    session: "closed",
    tz: "Europe/London",
    activity: 0.78,
    indices: [{ symbol: "FTSE", last: 8231.4, chg: -0.18 }],
  },
  {
    id: "fra",
    city: "Frankfurt",
    country: "Germany",
    exchange: "XETRA",
    lat: 50.1109,
    lon: 8.6821,
    session: "closed",
    tz: "Europe/Berlin",
    activity: 0.63,
    indices: [{ symbol: "DAX", last: 19422.11, chg: -0.32 }],
  },
  {
    id: "zrh",
    city: "Zurich",
    country: "Switzerland",
    exchange: "SIX",
    lat: 47.3769,
    lon: 8.5417,
    session: "closed",
    tz: "Europe/Zurich",
    activity: 0.41,
    indices: [{ symbol: "SMI", last: 12104.3, chg: 0.07 }],
  },
  {
    id: "tyo",
    city: "Tokyo",
    country: "Japan",
    exchange: "TSE",
    lat: 35.6762,
    lon: 139.6503,
    session: "pre",
    tz: "Asia/Tokyo",
    activity: 0.69,
    indices: [{ symbol: "N225", last: 38510.9, chg: 0.33 }],
  },
  {
    id: "hkg",
    city: "Hong Kong",
    country: "Hong Kong",
    exchange: "HKEX",
    lat: 22.3193,
    lon: 114.1694,
    session: "pre",
    tz: "Asia/Hong_Kong",
    activity: 0.72,
    indices: [{ symbol: "HSI", last: 20412.0, chg: 1.12 }],
  },
  {
    id: "sgp",
    city: "Singapore",
    country: "Singapore",
    exchange: "SGX",
    lat: 1.3521,
    lon: 103.8198,
    session: "pre",
    tz: "Asia/Singapore",
    activity: 0.55,
    indices: [{ symbol: "STI", last: 3691.2, chg: 0.21 }],
  },
  {
    id: "syd",
    city: "Sydney",
    country: "Australia",
    exchange: "ASX",
    lat: -33.8688,
    lon: 151.2093,
    session: "closed",
    tz: "Australia/Sydney",
    activity: 0.38,
    indices: [{ symbol: "AXJO", last: 8294.1, chg: -0.14 }],
  },
  {
    id: "dxb",
    city: "Dubai",
    country: "UAE",
    exchange: "DFM",
    lat: 25.2048,
    lon: 55.2708,
    session: "closed",
    tz: "Asia/Dubai",
    activity: 0.31,
    indices: [{ symbol: "DFMGI", last: 4712.5, chg: 0.09 }],
  },
];

export const ARCS: { from: string; to: string }[] = [
  { from: "nyc", to: "lon" },
  { from: "nyc", to: "tyo" },
  { from: "lon", to: "fra" },
  { from: "lon", to: "zrh" },
  { from: "fra", to: "dxb" },
  { from: "dxb", to: "sgp" },
  { from: "sgp", to: "hkg" },
  { from: "hkg", to: "tyo" },
  { from: "tyo", to: "syd" },
  { from: "nyc", to: "fra" },
  { from: "lon", to: "nyc" },
  { from: "sgp", to: "syd" },
];

export type AssetClass =
  | "equities"
  | "etfs"
  | "crypto"
  | "forex"
  | "indices"
  | "commodities";

export const ASSET_CLASSES: AssetClass[] = [
  "equities",
  "etfs",
  "crypto",
  "forex",
  "indices",
  "commodities",
];

export type Instrument = {
  symbol: string;
  name: string;
  cls: AssetClass;
  venue: string;
  isin?: string;
  last: number;
  chg: number;
};

export const INSTRUMENTS: Instrument[] = [
  { symbol: "AAPL", name: "Apple Inc.", cls: "equities", venue: "NASDAQ", isin: "US0378331005", last: 241.12, chg: 0.63 },
  { symbol: "MSFT", name: "Microsoft Corp.", cls: "equities", venue: "NASDAQ", isin: "US5949181045", last: 432.21, chg: 0.42 },
  { symbol: "NVDA", name: "NVIDIA Corp.", cls: "equities", venue: "NASDAQ", isin: "US67066G1040", last: 141.9, chg: 2.11 },
  { symbol: "TSLA", name: "Tesla Inc.", cls: "equities", venue: "NASDAQ", isin: "US88160R1014", last: 268.1, chg: -1.23 },
  { symbol: "META", name: "Meta Platforms", cls: "equities", venue: "NASDAQ", last: 579.2, chg: 0.98 },
  { symbol: "GOOGL", name: "Alphabet Inc. A", cls: "equities", venue: "NASDAQ", last: 171.5, chg: 0.11 },
  { symbol: "AMZN", name: "Amazon.com", cls: "equities", venue: "NASDAQ", last: 196.4, chg: 0.55 },
  { symbol: "JPM", name: "JPMorgan Chase", cls: "equities", venue: "NYSE", last: 231.1, chg: 0.22 },
  { symbol: "BRK.B", name: "Berkshire Hathaway B", cls: "equities", venue: "NYSE", last: 462.7, chg: 0.08 },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", cls: "etfs", venue: "NYSE Arca", last: 580.3, chg: 0.41 },
  { symbol: "QQQ", name: "Invesco QQQ", cls: "etfs", venue: "NASDAQ", last: 497.8, chg: 0.69 },
  { symbol: "IWM", name: "iShares Russell 2000", cls: "etfs", venue: "NYSE Arca", last: 225.4, chg: -0.33 },
  { symbol: "BTCUSD", name: "Bitcoin", cls: "crypto", venue: "Coinbase", last: 72431.1, chg: 1.84 },
  { symbol: "ETHUSD", name: "Ethereum", cls: "crypto", venue: "Coinbase", last: 2581.7, chg: 0.92 },
  { symbol: "SOLUSD", name: "Solana", cls: "crypto", venue: "Coinbase", last: 172.3, chg: 3.10 },
  { symbol: "XRPUSD", name: "XRP", cls: "crypto", venue: "Coinbase", last: 0.5241, chg: 0.44 },
  { symbol: "EURUSD", name: "Euro / US Dollar", cls: "forex", venue: "FX", last: 1.0821, chg: -0.21 },
  { symbol: "USDJPY", name: "US Dollar / Yen", cls: "forex", venue: "FX", last: 152.33, chg: 0.17 },
  { symbol: "GBPUSD", name: "GBP / USD", cls: "forex", venue: "FX", last: 1.2984, chg: 0.08 },
  { symbol: "SPX", name: "S&P 500 Index", cls: "indices", venue: "CBOE", last: 5812.42, chg: 0.42 },
  { symbol: "NDX", name: "NASDAQ 100", cls: "indices", venue: "NASDAQ", last: 20410.6, chg: 0.71 },
  { symbol: "FTSE", name: "FTSE 100", cls: "indices", venue: "LSE", last: 8231.4, chg: -0.18 },
  { symbol: "N225", name: "Nikkei 225", cls: "indices", venue: "TSE", last: 38510.9, chg: 0.33 },
  { symbol: "XAUUSD", name: "Gold Spot", cls: "commodities", venue: "COMEX", last: 2731.1, chg: 0.52 },
  { symbol: "CL", name: "WTI Crude", cls: "commodities", venue: "NYMEX", last: 71.23, chg: -0.81 },
  { symbol: "NG", name: "Natural Gas", cls: "commodities", venue: "NYMEX", last: 2.511, chg: 1.33 },
];

export const TOP_GAINERS = [
  { symbol: "NVDA", chg: 2.11 },
  { symbol: "SOLUSD", chg: 3.10 },
  { symbol: "META", chg: 0.98 },
  { symbol: "BTCUSD", chg: 1.84 },
  { symbol: "NG", chg: 1.33 },
  { symbol: "HSI", chg: 1.12 },
  { symbol: "ETHUSD", chg: 0.92 },
  { symbol: "QQQ", chg: 0.69 },
  { symbol: "AMZN", chg: 0.55 },
  { symbol: "XAUUSD", chg: 0.52 },
];

export const TOP_LOSERS = [
  { symbol: "TSLA", chg: -1.23 },
  { symbol: "CL", chg: -0.81 },
  { symbol: "IWM", chg: -0.33 },
  { symbol: "DAX", chg: -0.32 },
  { symbol: "EURUSD", chg: -0.21 },
  { symbol: "FTSE", chg: -0.18 },
  { symbol: "AXJO", chg: -0.14 },
  { symbol: "USDCHF", chg: -0.11 },
  { symbol: "COPPER", chg: -0.09 },
  { symbol: "WHEAT", chg: -0.06 },
];
