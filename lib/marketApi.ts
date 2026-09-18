import Constants from "expo-constants";
import { Platform } from "react-native";

export type QuoteSource = "brapi" | "yahoo" | "local";

export interface Quote {
  symbol: string;
  shortName: string | null;
  longName: string | null;
  currency: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  regularMarketTime: string;
  fetchedAt: string;
  source?: QuoteSource;
  assetType?: string;
}

export interface MarketIndicator {
  id: string;
  label: string;
  value: number;
  suffix: string;
  date: string;
  source: "Banco Central" | "Bolsa";
  note?: string;
}

export interface AssetSearchResult {
  symbol: string;
  name: string;
  type: "stock" | "fund" | "etf" | "index" | "fixed";
  source: "brapi" | "catalog";
}

const BRAPI_FREE_SYMBOLS = new Set(["PETR4", "MGLU3", "VALE3", "ITUB4"]);

const CATALOG: AssetSearchResult[] = [
  { symbol: "PETR4", name: "Petrobras PN", type: "stock", source: "catalog" },
  { symbol: "PETR3", name: "Petrobras ON", type: "stock", source: "catalog" },
  { symbol: "VALE3", name: "Vale ON", type: "stock", source: "catalog" },
  { symbol: "ITUB4", name: "Itau Unibanco PN", type: "stock", source: "catalog" },
  { symbol: "BBDC4", name: "Bradesco PN", type: "stock", source: "catalog" },
  { symbol: "BBAS3", name: "Banco do Brasil ON", type: "stock", source: "catalog" },
  { symbol: "B3SA3", name: "B3 ON", type: "stock", source: "catalog" },
  { symbol: "ABEV3", name: "Ambev ON", type: "stock", source: "catalog" },
  { symbol: "WEGE3", name: "WEG ON", type: "stock", source: "catalog" },
  { symbol: "TAEE11", name: "Taesa UNIT", type: "stock", source: "catalog" },
  { symbol: "XPML11", name: "XP Malls FII", type: "fund", source: "catalog" },
  { symbol: "HGLG11", name: "CSHG Logistica FII", type: "fund", source: "catalog" },
  { symbol: "KNCR11", name: "Kinea Rendimentos FII", type: "fund", source: "catalog" },
  { symbol: "MXRF11", name: "Maxi Renda FII", type: "fund", source: "catalog" },
  { symbol: "VISC11", name: "Vinci Shopping Centers FII", type: "fund", source: "catalog" },
  { symbol: "BOVA11", name: "ETF Ibovespa", type: "etf", source: "catalog" },
  { symbol: "IVVB11", name: "ETF S&P 500", type: "etf", source: "catalog" },
  { symbol: "SMAL11", name: "ETF Small Caps", type: "etf", source: "catalog" },
  { symbol: "IBOV", name: "Indice Ibovespa", type: "index", source: "catalog" },
  { symbol: "TESOURO SELIC", name: "Tesouro Selic", type: "fixed", source: "catalog" },
  { symbol: "CDB 100% CDI", name: "CDB atrelado ao CDI", type: "fixed", source: "catalog" },
];

function getExtraConfig(): Record<string, string> {
  return (Constants.expoConfig?.extra as Record<string, string> | undefined) ?? {};
}

function getApiBaseUrl(): string {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
    return "";
  }
  const extra = getExtraConfig();
  const fromEnv =
    process.env.EXPO_PUBLIC_MARKET_API_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.EXPO_PUBLIC_DOMAIN ||
    extra.marketApiUrl ||
    extra.apiUrl;
  if (fromEnv) {
    if (fromEnv.startsWith("http")) return fromEnv;
    return `https://${fromEnv}`;
  }
  return "";
}

function getBrapiToken(): string {
  return (
    process.env.EXPO_PUBLIC_BRAPI_TOKEN ||
    getExtraConfig().brapiToken ||
    ""
  ).trim();
}

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase().replace(/\s+/g, "");
}

function parseNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function bcbDateToIso(date: string): string {
  const [day, month, year] = date.split("/");
  if (!day || !month || !year) return date;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}

async function fetchLocalQuote(ticker: string): Promise<Quote | null> {
  const base = getApiBaseUrl();
  if (!base) return null;
  try {
    return await fetchJson<Quote>(
      `${base}/api/quote/${encodeURIComponent(ticker)}`,
      { headers: { Accept: "application/json" } },
    );
  } catch {
    return null;
  }
}

async function fetchBrapiQuote(ticker: string): Promise<Quote> {
  const token = getBrapiToken();
  const params = new URLSearchParams({ range: "1d", interval: "1d" });
  const data = await fetchJson<{
    results?: Array<Record<string, unknown>>;
    error?: string;
    message?: string;
  }>(
    `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?${params}`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  );
  const result = data.results?.[0];
  if (!result) {
    throw new Error(data.message || data.error || "Ativo nao encontrado na Brapi.");
  }
  const price = parseNumber(result.regularMarketPrice);
  if (price <= 0) throw new Error("Cotacao sem preco valido.");
  const previousClose =
    parseNumber(result.regularMarketPreviousClose) ||
    parseNumber(result.previousClose) ||
    price;
  const change = parseNumber(result.regularMarketChange) || price - previousClose;
  return {
    symbol: String(result.symbol || ticker).toUpperCase(),
    shortName: typeof result.shortName === "string" ? result.shortName : null,
    longName: typeof result.longName === "string" ? result.longName : null,
    currency: typeof result.currency === "string" ? result.currency : "BRL",
    price,
    previousClose,
    change,
    changePercent:
      parseNumber(result.regularMarketChangePercent) ||
      (previousClose ? (change / previousClose) * 100 : 0),
    regularMarketTime:
      typeof result.regularMarketTime === "string"
        ? result.regularMarketTime
        : new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    source: "brapi",
    assetType: typeof result.type === "string" ? result.type : undefined,
  };
}

function toYahooSymbol(ticker: string): string {
  if (ticker === "IBOV" || ticker === "^BVSP") return "^BVSP";
  if (ticker.includes(".")) return ticker;
  return `${ticker}.SA`;
}

async function fetchYahooQuote(ticker: string): Promise<Quote> {
  const data = await fetchJson<{
    chart?: {
      result?: Array<{ meta?: Record<string, unknown> }>;
      error?: { description?: string };
    };
  }>(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      toYahooSymbol(ticker),
    )}?range=1d&interval=1m`,
  );
  const meta = data.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(data.chart?.error?.description || "Ativo nao encontrado.");
  const price =
    parseNumber(meta.regularMarketPrice) ||
    parseNumber(meta.previousClose) ||
    parseNumber(meta.chartPreviousClose);
  if (price <= 0) throw new Error("Cotacao sem preco valido.");
  const previousClose =
    parseNumber(meta.previousClose) ||
    parseNumber(meta.chartPreviousClose) ||
    price;
  const timestamp = parseNumber(meta.regularMarketTime);
  return {
    symbol: ticker,
    shortName:
      typeof meta.shortName === "string"
        ? meta.shortName
        : typeof meta.symbol === "string"
          ? meta.symbol
          : ticker,
    longName: typeof meta.longName === "string" ? meta.longName : null,
    currency: typeof meta.currency === "string" ? meta.currency : "BRL",
    price,
    previousClose,
    change: price - previousClose,
    changePercent: previousClose ? ((price - previousClose) / previousClose) * 100 : 0,
    regularMarketTime: timestamp
      ? new Date(timestamp * 1000).toISOString()
      : new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    source: "yahoo",
  };
}

export async function fetchQuote(ticker: string): Promise<Quote> {
  const cleaned = normalizeTicker(ticker);
  if (!cleaned) throw new Error("Informe o codigo do ativo.");

  const local = await fetchLocalQuote(cleaned);
  if (local) return { ...local, source: local.source ?? "local" };

  const token = getBrapiToken();
  if (token || BRAPI_FREE_SYMBOLS.has(cleaned)) {
    try {
      return await fetchBrapiQuote(cleaned);
    } catch {
      // Yahoo is the broad fallback when Brapi cannot answer.
    }
  }

  try {
    return await fetchYahooQuote(cleaned);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel buscar a cotacao.";
    throw new Error(
      `${message} Para cobertura completa da B3, configure um token da Brapi no servidor.`,
    );
  }
}

async function fetchSgsLatest(
  id: string,
  label: string,
  suffix: string,
  note?: string,
): Promise<MarketIndicator> {
  const data = await fetchJson<Array<{ data: string; valor: string }>>(
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${id}/dados/ultimos/1?formato=json`,
  );
  const latest = data[0];
  if (!latest) throw new Error(`Serie ${id} sem dados.`);
  return {
    id,
    label,
    value: parseNumber(latest.valor),
    suffix,
    date: bcbDateToIso(latest.data),
    source: "Banco Central",
    note,
  };
}

export async function fetchMarketIndicators(): Promise<MarketIndicator[]> {
  const base = getApiBaseUrl();
  if (base) {
    try {
      return await fetchJson<MarketIndicator[]>(`${base}/api/market/indicators`);
    } catch {
      // fall through to direct public APIs
    }
  }
  const [selic, cdi, ipca, ibov] = await Promise.allSettled([
    fetchSgsLatest("432", "Selic meta", "% a.a.", "Serie SGS 432"),
    fetchSgsLatest("12", "CDI", "% a.a.", "Serie SGS 12"),
    fetchSgsLatest("433", "IPCA", "% a.m.", "Serie SGS 433"),
    fetchQuote("IBOV").then((quote) => ({
      id: "IBOV",
      label: "Ibovespa",
      value: quote.price,
      suffix: "pts",
      date: quote.regularMarketTime,
      source: "Bolsa" as const,
      note: quote.source === "yahoo" ? "Yahoo Finance / B3" : quote.source,
    })),
  ]);
  return [selic, cdi, ipca, ibov]
    .filter((item): item is PromiseFulfilledResult<MarketIndicator> => item.status === "fulfilled")
    .map((item) => item.value);
}

export async function searchAssets(
  query: string,
  type?: AssetSearchResult["type"],
): Promise<AssetSearchResult[]> {
  const cleaned = query.trim().toUpperCase();
  if (!cleaned) return [];
  const base = getApiBaseUrl();
  if (base) {
    try {
      const params = new URLSearchParams({ search: cleaned });
      if (type) params.set("type", type);
      return await fetchJson<AssetSearchResult[]>(`${base}/api/assets?${params}`);
    } catch {
      // local server may be absent during Expo dev
    }
  }

  const token = getBrapiToken();
  if (token) {
    try {
      const params = new URLSearchParams({ search: cleaned, limit: "20" });
      const data = await fetchJson<{ stocks?: Array<Record<string, unknown>> }>(
        `https://brapi.dev/api/quote/list?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const remote =
        data.stocks?.map((stock) => ({
          symbol: String(stock.stock || stock.symbol || "").toUpperCase(),
          name: String(stock.name || stock.longName || stock.shortName || ""),
          type: stock.type === "fund" ? "fund" as const : "stock" as const,
          source: "brapi" as const,
        })) ?? [];
      return remote
        .filter((item) => item.symbol && (!type || item.type === type))
        .slice(0, 20);
    } catch {
      // use local catalog fallback
    }
  }

  return CATALOG.filter((item) => {
    if (type && item.type !== type) return false;
    return item.symbol.includes(cleaned) || item.name.toUpperCase().includes(cleaned);
  }).slice(0, 20);
}
