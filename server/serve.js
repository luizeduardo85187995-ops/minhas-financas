/**
 * Standalone server for the notebook build.
 * It serves web-build/static-build and exposes small market API routes.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const STATIC_ROOT = process.env.STATIC_ROOT
  ? path.resolve(process.cwd(), process.env.STATIC_ROOT)
  : path.resolve(__dirname, "..", "static-build");
const TEMPLATE_PATH = path.resolve(__dirname, "templates", "landing-page.html");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");
const brapiToken = process.env.BRAPI_TOKEN || process.env.EXPO_PUBLIC_BRAPI_TOKEN || "";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
};

const ASSET_CATALOG = [
  { symbol: "PETR4", name: "Petrobras PN", type: "stock", source: "catalog" },
  { symbol: "VALE3", name: "Vale ON", type: "stock", source: "catalog" },
  { symbol: "ITUB4", name: "Itau Unibanco PN", type: "stock", source: "catalog" },
  { symbol: "BBAS3", name: "Banco do Brasil ON", type: "stock", source: "catalog" },
  { symbol: "B3SA3", name: "B3 ON", type: "stock", source: "catalog" },
  { symbol: "MXRF11", name: "Maxi Renda FII", type: "fund", source: "catalog" },
  { symbol: "HGLG11", name: "CSHG Logistica FII", type: "fund", source: "catalog" },
  { symbol: "KNCR11", name: "Kinea Rendimentos FII", type: "fund", source: "catalog" },
  { symbol: "BOVA11", name: "ETF Ibovespa", type: "etf", source: "catalog" },
  { symbol: "IVVB11", name: "ETF S&P 500", type: "etf", source: "catalog" },
];

function getAppName() {
  try {
    const appJsonPath = path.resolve(__dirname, "..", "app.json");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function parseNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function bcbDateToIso(date) {
  const [day, month, year] = String(date).split("/");
  if (!day || !month || !year) return date;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function toYahooSymbol(ticker) {
  if (ticker === "IBOV" || ticker === "^BVSP") return "^BVSP";
  if (ticker.includes(".")) return ticker;
  return `${ticker}.SA`;
}

async function fetchBrapiQuote(ticker) {
  const params = new URLSearchParams({ range: "1d", interval: "1d" });
  const data = await fetchJson(
    `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?${params}`,
    brapiToken ? { headers: { Authorization: `Bearer ${brapiToken}` } } : undefined,
  );
  const result = data.results?.[0];
  if (!result) throw new Error(data.message || data.error || "Ativo nao encontrado.");
  const price = parseNumber(result.regularMarketPrice);
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
  };
}

async function fetchYahooQuote(ticker) {
  const data = await fetchJson(
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
  const previousClose =
    parseNumber(meta.previousClose) || parseNumber(meta.chartPreviousClose) || price;
  const timestamp = parseNumber(meta.regularMarketTime);
  return {
    symbol: ticker,
    shortName: typeof meta.shortName === "string" ? meta.shortName : ticker,
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

async function fetchQuote(ticker) {
  const cleaned = String(ticker || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!cleaned) throw new Error("Informe o codigo do ativo.");
  const free = new Set(["PETR4", "MGLU3", "VALE3", "ITUB4"]);
  if (brapiToken || free.has(cleaned)) {
    try {
      return await fetchBrapiQuote(cleaned);
    } catch {
      // Yahoo fallback
    }
  }
  return fetchYahooQuote(cleaned);
}

async function fetchSgsLatest(id, label, suffix, note) {
  const data = await fetchJson(
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${id}/dados/ultimos/1?formato=json`,
  );
  const latest = data[0];
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

async function searchAssets(search, type) {
  const cleaned = String(search || "").trim().toUpperCase();
  if (!cleaned) return [];
  if (brapiToken) {
    try {
      const params = new URLSearchParams({ search: cleaned, limit: "25" });
      if (type === "stock" || type === "fund" || type === "bdr") params.set("type", type);
      const data = await fetchJson(`https://brapi.dev/api/quote/list?${params}`, {
        headers: { Authorization: `Bearer ${brapiToken}` },
      });
      return (data.stocks || []).map((stock) => ({
        symbol: String(stock.stock || stock.symbol || "").toUpperCase(),
        name: String(stock.name || stock.longName || stock.shortName || ""),
        type: stock.type === "fund" ? "fund" : "stock",
        source: "brapi",
      })).filter((asset) => asset.symbol).slice(0, 25);
    } catch {
      // catalog fallback
    }
  }
  return ASSET_CATALOG.filter((asset) => {
    if (type && asset.type !== type) return false;
    return asset.symbol.includes(cleaned) || asset.name.toUpperCase().includes(cleaned);
  }).slice(0, 25);
}

async function serveJson(res, producer) {
  try {
    const body = await producer();
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));
  } catch (error) {
    res.writeHead(502, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: error.message || "Erro de mercado" }));
  }
}

function serveManifest(platform, res) {
  const manifestPath = path.join(STATIC_ROOT, platform, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: `Manifest not found for platform: ${platform}` }));
    return;
  }
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.writeHead(200, {
    "content-type": "application/json",
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
  });
  res.end(manifest);
}

function serveLandingPage(req, res, landingPageTemplate, appName) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = forwardedProto || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"];
  const baseUrl = `${protocol}://${host}`;
  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, host)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

function serveStaticFile(urlPath, res) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(STATIC_ROOT, safePath);
  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  res.writeHead(200, { "content-type": contentType });
  res.end(fs.readFileSync(filePath));
}

const landingPageTemplate = fs.readFileSync(TEMPLATE_PATH, "utf-8");
const appName = getAppName();

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = url.pathname;
  if (basePath && pathname.startsWith(basePath)) pathname = pathname.slice(basePath.length) || "/";

  if (pathname.startsWith("/api/quote/")) {
    const ticker = decodeURIComponent(pathname.replace("/api/quote/", ""));
    return serveJson(res, () => fetchQuote(ticker));
  }

  if (pathname === "/api/assets") {
    return serveJson(res, () => searchAssets(url.searchParams.get("search"), url.searchParams.get("type")));
  }

  if (pathname === "/api/market/indicators") {
    return serveJson(res, async () => {
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
          source: "Bolsa",
          note: quote.source,
        })),
      ]);
      return [selic, cdi, ipca, ibov]
        .filter((item) => item.status === "fulfilled")
        .map((item) => item.value);
    });
  }

  if (pathname === "/" || pathname === "/manifest") {
    const platform = req.headers["expo-platform"];
    if (platform === "ios" || platform === "android") return serveManifest(platform, res);
    if (fs.existsSync(path.join(STATIC_ROOT, "index.html"))) return serveStaticFile("/index.html", res);
    if (pathname === "/") return serveLandingPage(req, res, landingPageTemplate, appName);
  }

  if (fs.existsSync(path.join(STATIC_ROOT, "index.html")) && !path.extname(pathname)) {
    return serveStaticFile("/index.html", res);
  }

  serveStaticFile(pathname, res);
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`Serving static Expo build on port ${port}`);
});
