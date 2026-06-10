/**
 * Front-end data client. All market data flows through the local
 * server's /api/* routes; this module adds a small TTL cache, source
 * tracking (live vs demo) and shared number/time formatters.
 */

const cache = new Map();

let lastSource = "demo";
const sourceListeners = new Set();

export function onSourceChange(fn) {
  sourceListeners.add(fn);
}

function noteSource(src) {
  if (src && src !== lastSource) {
    lastSource = src;
    for (const fn of sourceListeners) fn(src);
  }
}

export function currentSource() {
  return lastSource;
}

async function getJson(url, ttlMs = 0) {
  if (ttlMs > 0) {
    const hit = cache.get(url);
    if (hit && hit.exp > Date.now()) return hit.val;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`api ${res.status}`);
  const val = await res.json();
  if (ttlMs > 0) {
    if (cache.size > 300) cache.clear();
    cache.set(url, { exp: Date.now() + ttlMs, val });
  }
  return val;
}

/** Quotes for one or more symbols. Returns array in request order. */
export async function quotes(symbols, ttlMs = 10000) {
  const list = Array.isArray(symbols) ? symbols : [symbols];
  if (!list.length) return [];
  const j = await getJson(
    `/api/quote?symbols=${encodeURIComponent(list.join(","))}`,
    ttlMs
  );
  const qs = j.quotes || [];
  if (qs.length) noteSource(qs[0].source);
  return qs;
}

export async function quote(symbol, ttlMs = 10000) {
  const qs = await quotes([symbol], ttlMs);
  return qs[0] || null;
}

export async function history(symbol, range = "1y", interval = "1d") {
  const j = await getJson(
    `/api/history?symbol=${encodeURIComponent(symbol)}` +
      `&range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`,
    30000
  );
  noteSource(j.source);
  return j;
}

export async function search(q) {
  const j = await getJson(`/api/search?q=${encodeURIComponent(q)}`, 120000);
  return j.items || [];
}

export async function news(symbol = null) {
  const url = symbol
    ? `/api/news?symbol=${encodeURIComponent(symbol)}`
    : "/api/news";
  const j = await getJson(url, 90000);
  noteSource(j.source);
  return j;
}

export async function fx(base = "USD") {
  const j = await getJson(`/api/fx?base=${encodeURIComponent(base)}`, 120000);
  noteSource(j.source);
  return j;
}

export async function crypto() {
  const j = await getJson("/api/crypto", 12000);
  noteSource(j.source);
  return j;
}

/* ------------------------------------------------------------------ */
/* Formatters                                                          */
/* ------------------------------------------------------------------ */

export function fmtPx(x, ccy) {
  if (x == null || !isFinite(x)) return "—";
  const abs = Math.abs(x);
  let dp;
  if (abs >= 10000) dp = 0;
  else if (abs >= 100) dp = 2;
  else if (abs >= 1) dp = 2;
  else if (abs >= 0.01) dp = 4;
  else dp = 6;
  // FX convention: 4 decimals for typical pairs
  if (ccy === "FX" && abs < 50) dp = 4;
  return x.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

export function fmtChg(x) {
  if (x == null || !isFinite(x)) return "—";
  const s = fmtPx(x);
  return x > 0 ? `+${s}` : s;
}

export function fmtPct(x) {
  if (x == null || !isFinite(x)) return "—";
  const s = x.toFixed(2);
  return (x > 0 ? `+${s}` : s) + "%";
}

export function fmtBig(x) {
  if (x == null || !isFinite(x)) return "—";
  const abs = Math.abs(x);
  if (abs >= 1e12) return (x / 1e12).toFixed(2) + "T";
  if (abs >= 1e9) return (x / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return (x / 1e6).toFixed(1) + "M";
  if (abs >= 1e3) return (x / 1e3).toFixed(1) + "K";
  return String(Math.round(x));
}

export function chgClass(x) {
  if (x == null || !isFinite(x) || x === 0) return "flat";
  return x > 0 ? "up" : "down";
}

export function fmtTimeHM(ts) {
  const d = new Date(ts);
  return (
    String(d.getHours()).padStart(2, "0") +
    ":" +
    String(d.getMinutes()).padStart(2, "0")
  );
}

export function fmtDate(ts) {
  const d = new Date(ts);
  const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  return `${String(d.getDate()).padStart(2, "0")}-${mon}-${String(d.getFullYear()).slice(2)}`;
}

export function ago(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 90) return `${Math.round(s)}s`;
  if (s < 5400) return `${Math.round(s / 60)}m`;
  if (s < 172800) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
