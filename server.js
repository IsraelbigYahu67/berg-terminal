#!/usr/bin/env node
/**
 * BERG Terminal server.
 *
 * Zero-dependency Node (>=18) server that:
 *   1. Serves the static front-end from ./public
 *   2. Proxies free, no-API-key market data sources under /api/*
 *      (Yahoo Finance public endpoints, ECB rates via frankfurter.app,
 *       Binance public crypto tickers, public RSS news feeds)
 *   3. Falls back to deterministic synthetic "demo" data whenever an
 *      upstream source is unreachable, so the terminal always works.
 *
 * Run:  node server.js  [PORT=8787]
 */

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

/* ------------------------------------------------------------------ */
/* Small utilities                                                     */
/* ------------------------------------------------------------------ */

const cache = new Map(); // key -> { exp, val }

function cacheGet(key) {
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.val;
  cache.delete(key);
  return undefined;
}

function cachePut(key, val, ttlMs) {
  if (cache.size > 2000) cache.clear(); // crude but sufficient bound
  cache.set(key, { exp: Date.now() + ttlMs, val });
}

async function fetchWithTimeout(url, ms = 8000, headers = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, {
      signal: ctl.signal,
      headers: { "User-Agent": UA, Accept: "*/*", ...headers },
      redirect: "follow",
    });
  } finally {
    clearTimeout(t);
  }
}

async function fetchJson(url, ms, headers) {
  const res = await fetchWithTimeout(url, ms, headers);
  if (!res.ok) {
    const e = new Error(`upstream ${res.status} for ${url}`);
    e.status = res.status;
    throw e;
  }
  return res.json();
}

async function fetchText(url, ms, headers) {
  const res = await fetchWithTimeout(url, ms, headers);
  if (!res.ok) {
    const e = new Error(`upstream ${res.status} for ${url}`);
    e.status = res.status;
    throw e;
  }
  return res.text();
}

/** Run async jobs with bounded concurrency, preserving order. */
async function pmap(items, fn, limit = 8) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return out;
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

/* ------------------------------------------------------------------ */
/* Deterministic demo data (offline fallback)                          */
/* ------------------------------------------------------------------ */

let lastLiveOk = 0; // timestamp of the last successful upstream fetch

function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Plausible base prices so demo mode does not look absurd.
const DEMO_BASE = {
  AAPL: 245, MSFT: 470, GOOGL: 195, AMZN: 230, NVDA: 150, META: 660,
  TSLA: 320, "BRK-B": 480, JPM: 265, V: 340, JNJ: 155, WMT: 95,
  XOM: 115, UNH: 520, PG: 170, MA: 540, HD: 410, KO: 70, PEP: 165,
  BAC: 45, "^GSPC": 6200, "^DJI": 44500, "^IXIC": 20100, "^RUT": 2250,
  "^FTSE": 8300, "^GDAXI": 21500, "^FCHI": 7900, "^STOXX50E": 5100,
  "^N225": 39500, "^HSI": 19800, "000001.SS": 3250, "^AXJO": 8400,
  "^KS11": 2700, "^NSEI": 24500, "^GSPTSE": 25200, "^BVSP": 128000,
  "^VIX": 16, SPY: 620, QQQ: 540, "BTC-USD": 105000, "ETH-USD": 3900,
  "EURUSD=X": 1.09, "GBPUSD=X": 1.27, "USDJPY=X": 151.5,
  "GC=F": 2700, "CL=F": 72, "SI=F": 31, "NG=F": 3.1,
};

function demoBasePrice(symbol) {
  if (DEMO_BASE[symbol] != null) return DEMO_BASE[symbol];
  const r = mulberry32(strHash(symbol))();
  return 10 + r * 490; // 10 .. 500
}

const DAY_MS = 86400000;

/**
 * Deterministic daily close for a symbol on a given epoch-day. A random
 * walk seeded by symbol; consistent across quotes, charts and screeners.
 */
function demoCloseAtDay(symbol, epochDay) {
  const base = demoBasePrice(symbol);
  const seed = strHash(symbol);
  // sum of bounded pseudo-random daily moves over a 600-day window
  const start = epochDay - 600;
  let p = base * 0.85;
  const rng = mulberry32(seed);
  // jump rng forward deterministically per symbol (cheap warm-up)
  for (let i = 0; i < 10; i++) rng();
  for (let d = start; d <= epochDay; d++) {
    const r = mulberry32(seed ^ (d * 2654435761))();
    const drift = 0.0006;
    const move = (r - 0.5) * 0.035 + drift;
    p *= 1 + move;
  }
  return p;
}

function demoQuote(symbol) {
  const now = Date.now();
  const epochDay = Math.floor(now / DAY_MS);
  const prevClose = demoCloseAtDay(symbol, epochDay - 1);
  // intraday wiggle, updates every ~20s deterministically
  const tick = Math.floor(now / 20000);
  const r = mulberry32(strHash(symbol) ^ (tick * 40503))();
  const dayR = mulberry32(strHash(symbol) ^ (epochDay * 97))();
  const intradayBias = (dayR - 0.5) * 0.02;
  const price = prevClose * (1 + intradayBias + (r - 0.5) * 0.006);
  const change = price - prevClose;
  const hi = Math.max(price, prevClose * (1 + intradayBias + 0.006));
  const lo = Math.min(price, prevClose * (1 + intradayBias - 0.006));
  const volSeed = mulberry32(strHash(symbol) ^ epochDay)();
  return {
    symbol,
    name: symbol,
    price: round4(price),
    prevClose: round4(prevClose),
    change: round4(change),
    changePct: round4((change / prevClose) * 100),
    dayHigh: round4(hi),
    dayLow: round4(lo),
    open: round4(prevClose * (1 + intradayBias * 0.3)),
    volume: Math.floor(2e6 + volSeed * 5e7),
    high52: round4(demo52(symbol, epochDay).hi),
    low52: round4(demo52(symbol, epochDay).lo),
    currency: "USD",
    exchange: "DEMO",
    marketState: "DEMO",
    time: now,
    source: "demo",
  };
}

const demo52cache = new Map();
function demo52(symbol, epochDay) {
  const key = symbol + ":" + epochDay;
  let v = demo52cache.get(key);
  if (v) return v;
  let hi = -Infinity;
  let lo = Infinity;
  for (let d = epochDay - 365; d <= epochDay; d += 5) {
    const c = demoCloseAtDay(symbol, d);
    if (c > hi) hi = c;
    if (c < lo) lo = c;
  }
  v = { hi, lo };
  if (demo52cache.size > 500) demo52cache.clear();
  demo52cache.set(key, v);
  return v;
}

function demoHistory(symbol, range, interval) {
  const now = Date.now();
  const epochDay = Math.floor(now / DAY_MS);
  const t = [];
  const o = [];
  const h = [];
  const l = [];
  const c = [];
  const v = [];

  const intraday = interval.endsWith("m") || interval.endsWith("h");
  if (intraday) {
    // one synthetic session: 390 one-minute bars ending "now"
    const stepMin = interval === "1m" ? 1 : interval === "5m" ? 5 : 30;
    const bars = Math.min(390, Math.floor(390 / stepMin) * daysInRange(range));
    const prevClose = demoCloseAtDay(symbol, epochDay - 1);
    let p = prevClose;
    for (let i = bars; i >= 1; i--) {
      const ts = now - i * stepMin * 60000;
      const r = mulberry32(strHash(symbol) ^ Math.floor(ts / 60000))();
      const open = p;
      p *= 1 + (r - 0.5) * 0.0035;
      t.push(Math.floor(ts / 1000));
      o.push(round4(open));
      c.push(round4(p));
      h.push(round4(Math.max(open, p) * 1.0008));
      l.push(round4(Math.min(open, p) * 0.9992));
      v.push(Math.floor(1e5 + r * 9e5));
    }
  } else {
    const days = daysInRange(range);
    const step = interval === "1wk" ? 7 : interval === "1mo" ? 30 : 1;
    for (let d = epochDay - days; d <= epochDay; d += step) {
      const close = demoCloseAtDay(symbol, d);
      const prev = demoCloseAtDay(symbol, d - step);
      const r = mulberry32(strHash(symbol) ^ d)();
      t.push(Math.floor(d * DAY_MS / 1000));
      o.push(round4(prev));
      c.push(round4(close));
      h.push(round4(Math.max(prev, close) * (1 + r * 0.008)));
      l.push(round4(Math.min(prev, close) * (1 - r * 0.008)));
      v.push(Math.floor(2e6 + r * 4e7));
    }
  }
  return {
    symbol,
    range,
    interval,
    t,
    o,
    h,
    l,
    c,
    v,
    prevClose: demoCloseAtDay(symbol, epochDay - 1),
    currency: "USD",
    source: "demo",
  };
}

function daysInRange(range) {
  const m = {
    "1d": 1, "5d": 5, "1mo": 30, "3mo": 91, "6mo": 182,
    "1y": 365, "2y": 730, "5y": 1825, "10y": 3650, max: 3650, ytd: 200,
  };
  return m[range] || 365;
}

function round4(x) {
  return Math.round(x * 10000) / 10000;
}

const DEMO_HEADLINES = [
  "Equities drift as traders weigh central bank guidance",
  "Treasury yields edge higher ahead of inflation data",
  "Oil steadies after inventory draw surprises analysts",
  "Tech megacaps mixed in early trade; chipmakers lead",
  "Dollar holds gains versus major peers before payrolls",
  "Gold hovers near record as haven demand persists",
  "Earnings season outlook: margins in focus for retailers",
  "European shares open flat; banks outperform",
  "Asia stocks close mostly higher on policy support hopes",
  "Crypto consolidates as funding rates normalize",
  "Fed officials signal patience on next rate move",
  "Small caps lag as risk appetite cools",
];

function demoNews(symbol) {
  const now = Date.now();
  const items = DEMO_HEADLINES.map((title, i) => ({
    title: symbol ? `${symbol}: ${title}` : title,
    link: "",
    source: "DEMO WIRE",
    time: now - (i + 1) * 9 * 60000,
  }));
  return { items, source: "demo" };
}

const DEMO_FX = {
  EUR: 0.918, GBP: 0.787, JPY: 151.4, CHF: 0.885, CAD: 1.37,
  AUD: 1.52, NZD: 1.66, CNY: 7.24, SEK: 10.6, NOK: 10.9,
  MXN: 18.4, INR: 84.6, BRL: 5.45, KRW: 1372, SGD: 1.33, HKD: 7.79,
};

function demoFx() {
  // small deterministic wiggle so the matrix is not frozen
  const tick = Math.floor(Date.now() / 30000);
  const rates = {};
  for (const [ccy, base] of Object.entries(DEMO_FX)) {
    const r = mulberry32(strHash(ccy) ^ tick)();
    rates[ccy] = round4(base * (1 + (r - 0.5) * 0.004));
  }
  return { base: "USD", date: new Date().toISOString().slice(0, 10), rates, source: "demo" };
}

/* ------------------------------------------------------------------ */
/* Live data sources                                                   */
/* ------------------------------------------------------------------ */

const YH1 = "https://query1.finance.yahoo.com";
const YH2 = "https://query2.finance.yahoo.com";
const FMP_KEY = process.env.FMP_API_KEY || "";
const FMP = "https://financialmodelingprep.com/api/v3";

/* ---- Yahoo (cookie/crumb session to avoid 401/403/429 blocks) ---- */

let ySession = { cookie: "", crumb: "", exp: 0 };

async function yahooSession() {
  if (ySession.exp > Date.now()) return ySession;
  let cookie = "";
  let crumb = "";
  try {
    // fc.yahoo.com replies 404 but sets the consent cookie we need
    const res = await fetchWithTimeout("https://fc.yahoo.com/", 6000);
    const raw = res.headers.getSetCookie
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")].filter(Boolean);
    cookie = raw.map((c) => c.split(";")[0]).join("; ");
    if (cookie) {
      const r2 = await fetchWithTimeout(`${YH1}/v1/test/getcrumb`, 6000, { Cookie: cookie });
      if (r2.ok) crumb = (await r2.text()).trim();
    }
  } catch {
    /* proceed without a session */
  }
  ySession = { cookie, crumb, exp: Date.now() + 20 * 60000 };
  return ySession;
}

async function yahooChart(symbol, range, interval) {
  const qs =
    `?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}` +
    `&includePrePost=false&events=div%2Csplit`;
  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}${qs}`;
  // plain first, then with a browser-like session on both hosts
  const attempts = [
    { host: YH1, sess: false },
    { host: YH1, sess: true },
    { host: YH2, sess: true },
  ];
  let lastErr;
  for (const a of attempts) {
    try {
      let url = a.host + path;
      const headers = {};
      if (a.sess) {
        const s = await yahooSession();
        if (s.cookie) headers.Cookie = s.cookie;
        if (s.crumb) url += `&crumb=${encodeURIComponent(s.crumb)}`;
      }
      const j = await fetchJson(url, 8000, headers);
      const r = j && j.chart && j.chart.result && j.chart.result[0];
      if (!r) {
        const e = new Error(`no chart data for ${symbol}`);
        e.status = 404;
        throw e;
      }
      return r;
    } catch (e) {
      lastErr = e;
      if (e && e.status === 404) throw e; // authoritative: symbol unknown
      ySession.exp = 0; // force a fresh session on the next attempt
    }
  }
  throw lastErr;
}

function yahooQuote(r, symbol) {
  const m = r.meta || {};
  const price = m.regularMarketPrice;
  const prevClose = m.chartPreviousClose ?? m.previousClose ?? price;
  if (price == null) throw new Error(`no price for ${symbol}`);
  return {
    symbol,
    name: m.longName || m.shortName || symbol,
    price,
    prevClose,
    change: round4(price - prevClose),
    changePct: prevClose ? round4(((price - prevClose) / prevClose) * 100) : 0,
    dayHigh: m.regularMarketDayHigh ?? null,
    dayLow: m.regularMarketDayLow ?? null,
    open: null,
    volume: m.regularMarketVolume ?? null,
    high52: m.fiftyTwoWeekHigh ?? null,
    low52: m.fiftyTwoWeekLow ?? null,
    currency: m.currency || "",
    exchange: m.exchangeName || m.fullExchangeName || "",
    marketState: m.marketState || "",
    time: (m.regularMarketTime || 0) * 1000 || Date.now(),
    source: "live",
    provider: "yahoo",
  };
}

/* ---- Stooq (free EOD CSV, no key) ---------------------------------- */

const STOOQ_INDEX = {
  "^GSPC": "^spx", "^DJI": "^dji", "^IXIC": "^ndq",
  "^FTSE": "^ukx", "^GDAXI": "^dax", "^FCHI": "^cac", "^N225": "^nkx",
};

function stooqSymbol(sym) {
  if (STOOQ_INDEX[sym]) return STOOQ_INDEX[sym];
  if (/^[A-Z]{6}=X$/.test(sym)) return sym.slice(0, 6).toLowerCase(); // EURUSD=X
  // plain US listings (AAPL, BRK-B). Skip futures/crypto/foreign listings.
  if (/^[A-Z][A-Z0-9\-]{0,9}$/.test(sym)) return sym.toLowerCase() + ".us";
  return null;
}

function ymd(d) {
  return (
    d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
  );
}

/** daily bars (oldest first) from stooq, or throws */
async function stooqDaily(sym, days, intervalCode = "d") {
  const ss = stooqSymbol(sym);
  if (!ss) throw new Error(`stooq: unsupported symbol ${sym}`);
  const d2 = new Date();
  const d1 = new Date(Date.now() - days * DAY_MS);
  const url =
    `https://stooq.com/q/d/l/?s=${encodeURIComponent(ss)}` +
    `&i=${intervalCode}&d1=${ymd(d1)}&d2=${ymd(d2)}`;
  const text = await fetchText(url, 8000);
  const lines = text.trim().split(/\r?\n/);
  // header: Date,Open,High,Low,Close,Volume
  if (lines.length < 2 || !/^Date,/i.test(lines[0])) {
    throw new Error(`stooq: no data for ${sym}`);
  }
  const bars = [];
  for (let i = 1; i < lines.length; i++) {
    const [date, o, h, l, c, v] = lines[i].split(",");
    const close = parseFloat(c);
    if (!date || !isFinite(close)) continue;
    bars.push({
      t: Math.floor(Date.parse(date + "T21:00:00Z") / 1000),
      o: parseFloat(o),
      h: parseFloat(h),
      l: parseFloat(l),
      c: close,
      v: parseFloat(v) || 0,
    });
  }
  if (bars.length < 1) throw new Error(`stooq: empty series for ${sym}`);
  return bars;
}

async function stooqQuote(symbol) {
  const bars = await stooqDaily(symbol, 14);
  const last = bars[bars.length - 1];
  const prev = bars.length > 1 ? bars[bars.length - 2] : last;
  return {
    symbol,
    name: symbol,
    price: last.c,
    prevClose: prev.c,
    change: round4(last.c - prev.c),
    changePct: prev.c ? round4(((last.c - prev.c) / prev.c) * 100) : 0,
    dayHigh: last.h,
    dayLow: last.l,
    open: last.o,
    volume: last.v || null,
    high52: null,
    low52: null,
    currency: "",
    exchange: "STOOQ EOD",
    marketState: "CLOSED",
    time: last.t * 1000,
    source: "live",
    provider: "stooq",
  };
}

async function stooqHistory(symbol, range, interval) {
  if (interval.endsWith("m") || interval.endsWith("h")) {
    throw new Error("stooq: no intraday data");
  }
  const code = interval === "1wk" ? "w" : interval === "1mo" ? "m" : "d";
  const bars = await stooqDaily(symbol, daysInRange(range) + 7, code);
  return {
    symbol,
    range,
    interval,
    t: bars.map((b) => b.t),
    o: bars.map((b) => b.o),
    h: bars.map((b) => b.h),
    l: bars.map((b) => b.l),
    c: bars.map((b) => b.c),
    v: bars.map((b) => b.v),
    prevClose: bars.length > 1 ? bars[bars.length - 2].c : null,
    currency: "",
    source: "live",
    provider: "stooq",
  };
}

/* ---- Financial Modeling Prep (optional, free API key) -------------- */

async function fmpQuote(symbol) {
  const j = await fetchJson(
    `${FMP}/quote/${encodeURIComponent(symbol)}?apikey=${FMP_KEY}`,
    8000
  );
  const x = Array.isArray(j) && j[0];
  if (!x || x.price == null) throw new Error(`fmp: no quote for ${symbol}`);
  return {
    symbol,
    name: x.name || symbol,
    price: x.price,
    prevClose: x.previousClose ?? x.price,
    change: x.change ?? 0,
    changePct: x.changesPercentage ?? 0,
    dayHigh: x.dayHigh ?? null,
    dayLow: x.dayLow ?? null,
    open: x.open ?? null,
    volume: x.volume ?? null,
    high52: x.yearHigh ?? null,
    low52: x.yearLow ?? null,
    currency: "USD",
    exchange: x.exchange || "",
    marketState: "",
    time: (x.timestamp || 0) * 1000 || Date.now(),
    source: "live",
    provider: "fmp",
  };
}

async function fmpHistory(symbol, range, interval) {
  const days = daysInRange(range);
  let rows;
  if (interval === "5m" || interval === "30m" || interval === "1m") {
    const gran = interval === "1m" ? "1min" : interval === "5m" ? "5min" : "30min";
    rows = await fetchJson(
      `${FMP}/historical-chart/${gran}/${encodeURIComponent(symbol)}?apikey=${FMP_KEY}`,
      8000
    );
    if (!Array.isArray(rows) || !rows.length) throw new Error("fmp: no intraday");
    const cutoff = Date.now() - days * DAY_MS;
    rows = rows.filter((r) => Date.parse(r.date) >= cutoff);
  } else if (interval === "1d") {
    const from = new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
    const j = await fetchJson(
      `${FMP}/historical-price-full/${encodeURIComponent(symbol)}?from=${from}&apikey=${FMP_KEY}`,
      8000
    );
    rows = j && j.historical;
    if (!Array.isArray(rows) || !rows.length) throw new Error("fmp: no history");
  } else {
    throw new Error("fmp: interval not supported"); // 1wk/1mo -> next provider
  }
  rows = [...rows].reverse(); // FMP returns newest first
  return {
    symbol,
    range,
    interval,
    t: rows.map((r) => Math.floor(Date.parse(r.date) / 1000)),
    o: rows.map((r) => r.open),
    h: rows.map((r) => r.high),
    l: rows.map((r) => r.low),
    c: rows.map((r) => r.close),
    v: rows.map((r) => r.volume || 0),
    prevClose: null,
    currency: "USD",
    source: "live",
    provider: "fmp",
  };
}

/* ---- provider chains ------------------------------------------------ */

async function liveQuote(symbol) {
  const key = `q:${symbol}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const chain = [];
  if (FMP_KEY) chain.push(() => fmpQuote(symbol));
  chain.push(async () => yahooQuote(await yahooChart(symbol, "1d", "1d"), symbol));
  chain.push(() => stooqQuote(symbol));
  let lastErr;
  for (const p of chain) {
    try {
      const q = await p();
      lastLiveOk = Date.now();
      cachePut(key, q, 15000);
      return q;
    } catch (e) {
      lastErr = e;
      if (e && e.status === 404) throw e; // symbol genuinely unknown
    }
  }
  throw lastErr || new Error("all quote providers failed");
}

async function liveHistory(symbol, range, interval) {
  const key = `h:${symbol}:${range}:${interval}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const chain = [];
  if (FMP_KEY) chain.push(() => fmpHistory(symbol, range, interval));
  chain.push(async () => {
    const r = await yahooChart(symbol, range, interval);
    const q = (r.indicators && r.indicators.quote && r.indicators.quote[0]) || {};
    const out = {
      symbol,
      range,
      interval,
      t: r.timestamp || [],
      o: q.open || [],
      h: q.high || [],
      l: q.low || [],
      c: q.close || [],
      v: q.volume || [],
      prevClose: (r.meta && (r.meta.chartPreviousClose ?? r.meta.previousClose)) ?? null,
      currency: (r.meta && r.meta.currency) || "",
      source: "live",
      provider: "yahoo",
    };
    if (!out.t.length || !out.c.length) throw new Error(`empty history for ${symbol}`);
    return out;
  });
  chain.push(() => stooqHistory(symbol, range, interval));
  let lastErr;
  for (const p of chain) {
    try {
      const out = await p();
      lastLiveOk = Date.now();
      cachePut(key, out, 60000);
      return out;
    } catch (e) {
      lastErr = e;
      if (e && e.status === 404) throw e;
    }
  }
  throw lastErr || new Error("all history providers failed");
}

async function liveSearch(qstr) {
  const key = `s:${qstr}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const url =
    `${YH1}/v1/finance/search?q=${encodeURIComponent(qstr)}` +
    `&quotesCount=12&newsCount=0&listsCount=0`;
  const s = await yahooSession();
  const j = await fetchJson(url, 8000, s.cookie ? { Cookie: s.cookie } : {});
  const items = (j.quotes || [])
    .filter((x) => x.symbol)
    .map((x) => ({
      symbol: x.symbol,
      name: x.longname || x.shortname || "",
      exchange: x.exchDisp || x.exchange || "",
      type: x.quoteType || x.typeDisp || "",
    }));
  const out = { items, source: "live" };
  lastLiveOk = Date.now();
  cachePut(key, out, 300000);
  return out;
}

/** Minimal RSS <item> parser — handles the feeds we use. */
function parseRss(xml, sourceName) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) && items.length < 30) {
    const block = m[1];
    const pick = (tag) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(block);
      if (!r) return "";
      return r[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .trim();
    };
    const title = pick("title");
    if (!title) continue;
    const pub = pick("pubDate");
    items.push({
      title,
      link: pick("link"),
      source: sourceName,
      time: pub ? Date.parse(pub) || Date.now() : Date.now(),
    });
  }
  return items;
}

const GENERAL_FEEDS = [
  ["https://feeds.content.dowjones.io/public/rss/mw_topstories", "MARKETWATCH"],
  ["https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines", "MW REALTIME"],
  ["https://finance.yahoo.com/news/rssindex", "YAHOO FIN"],
  ["https://www.cnbc.com/id/100003114/device/rss/rss.html", "CNBC"],
  ["https://www.cnbc.com/id/15839135/device/rss/rss.html", "CNBC MKTS"],
];

async function fmpNews(symbol) {
  const url = symbol
    ? `${FMP}/stock_news?tickers=${encodeURIComponent(symbol)}&limit=30&apikey=${FMP_KEY}`
    : `${FMP}/stock_news?limit=40&apikey=${FMP_KEY}`;
  const j = await fetchJson(url, 8000);
  if (!Array.isArray(j) || !j.length) throw new Error("fmp: no news");
  return j.map((x) => ({
    title: x.title,
    link: x.url || "",
    source: (x.site || "FMP").toUpperCase(),
    time: Date.parse(x.publishedDate) || Date.now(),
  }));
}

async function liveNews(symbol) {
  const key = `n:${symbol || "*"}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  let items = [];
  if (FMP_KEY) {
    try {
      items = await fmpNews(symbol);
    } catch {
      /* fall through to the free feeds */
    }
  }
  if (!items.length && symbol) {
    const url =
      `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}` +
      `&region=US&lang=en-US`;
    items = parseRss(await fetchText(url), "YAHOO FIN");
  } else if (!items.length) {
    const results = await Promise.allSettled(
      GENERAL_FEEDS.map(async ([url, name]) => parseRss(await fetchText(url), name))
    );
    for (const r of results) if (r.status === "fulfilled") items.push(...r.value);
    if (!items.length) throw new Error("all news feeds failed");
    items.sort((a, b) => b.time - a.time);
    items = items.slice(0, 40);
  }
  if (!items.length) throw new Error("no news items");
  const out = { items, source: "live" };
  lastLiveOk = Date.now();
  cachePut(key, out, 120000);
  return out;
}

async function frankfurterFx(base) {
  const j = await fetchJson(
    `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`,
    8000
  );
  if (!j || !j.rates) throw new Error("frankfurter: no fx rates");
  return { base: j.base, date: j.date, rates: j.rates, source: "live", provider: "ecb" };
}

async function erApiFx(base) {
  const j = await fetchJson(
    `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`,
    8000
  );
  if (!j || j.result !== "success" || !j.rates) throw new Error("er-api: no fx rates");
  const date = j.time_last_update_unix
    ? new Date(j.time_last_update_unix * 1000).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  return { base, date, rates: j.rates, source: "live", provider: "er-api" };
}

async function liveFx(base) {
  const key = `fx:${base}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  let out;
  try {
    out = await frankfurterFx(base);
  } catch {
    out = await erApiFx(base);
  }
  lastLiveOk = Date.now();
  cachePut(key, out, 300000);
  return out;
}

const CRYPTO_PAIRS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BNBUSDT", "ADAUSDT",
  "DOGEUSDT", "AVAXUSDT", "DOTUSDT", "LINKUSDT", "LTCUSDT", "UNIUSDT",
];

// Coinbase Exchange has no BNB; the rest map 1:1
const COINBASE_PAIRS = CRYPTO_PAIRS.filter((p) => p !== "BNBUSDT").map((p) =>
  p.replace(/USDT$/, "-USD")
);

async function binanceCrypto() {
  const url =
    "https://api.binance.com/api/v3/ticker/24hr?symbols=" +
    encodeURIComponent(JSON.stringify(CRYPTO_PAIRS));
  const j = await fetchJson(url, 8000);
  if (!Array.isArray(j) || !j.length) throw new Error("binance: no crypto data");
  return j.map((x) => ({
    symbol: x.symbol.replace(/USDT$/, "-USD"),
    price: Number(x.lastPrice),
    changePct: Number(x.priceChangePercent),
    high: Number(x.highPrice),
    low: Number(x.lowPrice),
    volume: Number(x.quoteVolume),
  }));
}

async function coinbaseCrypto() {
  const results = await Promise.allSettled(
    COINBASE_PAIRS.map(async (pair) => {
      const j = await fetchJson(
        `https://api.exchange.coinbase.com/products/${pair}/stats`,
        6000
      );
      const last = Number(j.last);
      const open = Number(j.open);
      if (!isFinite(last)) throw new Error("bad stats");
      return {
        symbol: pair,
        price: last,
        changePct: open ? round4(((last - open) / open) * 100) : 0,
        high: Number(j.high),
        low: Number(j.low),
        volume: Number(j.volume) * last, // base volume -> quote (USD) volume
      };
    })
  );
  const items = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);
  if (!items.length) throw new Error("coinbase: no crypto data");
  return items;
}

async function liveCrypto() {
  const key = "crypto";
  const hit = cacheGet(key);
  if (hit) return hit;
  let items;
  try {
    items = await binanceCrypto(); // geo-blocked for US IPs -> fall through
  } catch {
    items = await coinbaseCrypto();
  }
  const out = { items, source: "live" };
  lastLiveOk = Date.now();
  cachePut(key, out, 15000);
  return out;
}

function demoCrypto() {
  const items = CRYPTO_PAIRS.map((p) => {
    const sym = p.replace(/USDT$/, "-USD");
    const q = demoQuote(sym);
    return {
      symbol: sym,
      price: q.price,
      changePct: q.changePct,
      high: q.dayHigh,
      low: q.dayLow,
      volume: q.volume * 1000,
    };
  });
  return { items, source: "demo" };
}

/* ------------------------------------------------------------------ */
/* API routing                                                         */
/* ------------------------------------------------------------------ */

async function handleApi(req, res, url) {
  const p = url.pathname;
  try {
    if (p === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        liveRecently: Date.now() - lastLiveOk < 10 * 60000,
        sources: sourceStatus,
        fmpKeyConfigured: Boolean(FMP_KEY),
        now: Date.now(),
      });
    }

    if (p === "/api/quote") {
      const symbols = (url.searchParams.get("symbols") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 150);
      if (!symbols.length) return sendJson(res, 400, { error: "symbols required" });
      const quotes = await pmap(
        symbols,
        async (s) => {
          try {
            return await liveQuote(s);
          } catch (e) {
            // upstream said the symbol does not exist -> report that,
            // anything else (offline, throttled) -> demo fallback
            if (e && e.status === 404) return { symbol: s, error: "not found" };
            return demoQuote(s);
          }
        },
        8
      );
      return sendJson(res, 200, { quotes });
    }

    if (p === "/api/history") {
      const symbol = url.searchParams.get("symbol");
      const range = url.searchParams.get("range") || "1y";
      const interval = url.searchParams.get("interval") || "1d";
      if (!symbol) return sendJson(res, 400, { error: "symbol required" });
      let out;
      try {
        out = await liveHistory(symbol, range, interval);
      } catch (e) {
        if (e && e.status === 404) {
          return sendJson(res, 404, { error: `symbol not found: ${symbol}` });
        }
        out = demoHistory(symbol, range, interval);
      }
      return sendJson(res, 200, out);
    }

    if (p === "/api/search") {
      const q = (url.searchParams.get("q") || "").trim();
      if (!q) return sendJson(res, 400, { error: "q required" });
      let out;
      try {
        out = await liveSearch(q);
      } catch {
        out = { items: [], source: "demo" };
      }
      return sendJson(res, 200, out);
    }

    if (p === "/api/news") {
      const symbol = (url.searchParams.get("symbol") || "").trim() || null;
      let out;
      try {
        out = await liveNews(symbol);
      } catch {
        out = demoNews(symbol);
      }
      return sendJson(res, 200, out);
    }

    if (p === "/api/fx") {
      const base = (url.searchParams.get("base") || "USD").toUpperCase();
      let out;
      try {
        out = await liveFx(base);
      } catch {
        out = demoFx();
      }
      return sendJson(res, 200, out);
    }

    if (p === "/api/crypto") {
      let out;
      try {
        out = await liveCrypto();
      } catch {
        out = demoCrypto();
      }
      return sendJson(res, 200, out);
    }

    return sendJson(res, 404, { error: "unknown api route" });
  } catch (err) {
    return sendJson(res, 500, { error: String((err && err.message) || err) });
  }
}

/* ------------------------------------------------------------------ */
/* Static files                                                        */
/* ------------------------------------------------------------------ */

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/index.html";
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("forbidden");
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("not found");
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) {
    handleApi(req, res, url);
  } else {
    serveStatic(req, res, url);
  }
});

/* ------------------------------------------------------------------ */
/* Startup self-test: which live sources can this machine reach?       */
/* ------------------------------------------------------------------ */

const sourceStatus = {};

async function probeSources() {
  const probes = [
    ["yahoo (quotes/charts)", async () => yahooChart("AAPL", "1d", "1d")],
    ["stooq (EOD fallback)", async () => stooqDaily("AAPL", 10)],
    ["frankfurter (FX)", async () => frankfurterFx("USD")],
    ["er-api (FX fallback)", async () => erApiFx("USD")],
    ["binance (crypto)", async () => binanceCrypto()],
    ["coinbase (crypto fallback)", async () => coinbaseCrypto()],
    ["news feeds", async () => liveNews(null)],
  ];
  if (FMP_KEY) probes.unshift(["fmp (api key)", async () => fmpQuote("AAPL")]);

  console.log("checking live data sources…");
  await Promise.all(
    probes.map(async ([name, fn]) => {
      try {
        await fn();
        sourceStatus[name] = "ok";
        console.log(`  ok    ${name}`);
      } catch (e) {
        sourceStatus[name] = `fail (${(e && e.message) || e})`.slice(0, 120);
        console.log(`  fail  ${name} — ${(e && e.message) || e}`);
      }
    })
  );
  const okCount = Object.values(sourceStatus).filter((v) => v === "ok").length;
  if (okCount === 0) {
    console.log("no live sources reachable — running on synthetic DEMO data");
  } else {
    console.log(`${okCount}/${Object.keys(sourceStatus).length} live sources reachable`);
  }
}

server.listen(PORT, HOST, () => {
  console.log(`BERG terminal  http://localhost:${PORT}`);
  console.log("free & open source - not affiliated with Bloomberg L.P.");
  if (!FMP_KEY) {
    console.log("tip: set FMP_API_KEY=<free key from financialmodelingprep.com> for an extra data source");
  }
  probeSources();
});
