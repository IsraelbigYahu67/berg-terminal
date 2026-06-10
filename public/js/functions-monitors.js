/**
 * Monitor-style terminal functions: WEI, FXC, EQS, MOST, W, ECO, CRYP.
 */

import * as data from "./data.js";
import * as uni from "./universe.js";
import {
  fmtPx, fmtPct, fmtChg, fmtBig, chgClass, escapeHtml,
} from "./data.js";
import { el, fnHead, dataTable, message } from "./ui.js";

function pctCell(v) {
  return `<span class="${chgClass(v)}">${fmtPct(v)}</span>`;
}
function chgCell(v) {
  return `<span class="${chgClass(v)}">${fmtChg(v)}</span>`;
}

/* ------------------------------------------------------------------ */
/* WEI — world equity indices                                          */
/* ------------------------------------------------------------------ */

export const WEI = {
  name: "WEI",
  usage: "WEI",
  blurb: "World equity index monitor",
  category: "MARKET MONITORS",
  async run(panel, args, ctx) {
    panel.setTitle("WEI | WORLD INDICES");
    const head = fnHead("WEI", "world equity indices");
    const tbl = dataTable(
      [
        { key: "sym", label: "INDEX", fmt: (v) => `<span class="cell-sym">${escapeHtml(v)}</span>` },
        { key: "name", label: "NAME", fmt: (v) => `<span class="cell-name">${escapeHtml(v)}</span>` },
        { key: "price", label: "LAST", num: true, fmt: (v) => fmtPx(v) },
        { key: "change", label: "CHG", num: true, fmt: chgCell },
        { key: "changePct", label: "%CHG", num: true, fmt: pctCell },
      ],
      (row) => ctx.run(`GP ${row.sym}`, panel)
    );
    panel.body.textContent = "";
    panel.body.append(head.root, tbl.table);

    const groups = ["Americas", "EMEA", "APAC"];
    const prev = new Map();

    const load = async () => {
      let qs;
      try {
        qs = await data.quotes(uni.INDICES.map((i) => i[0]), 12000);
      } catch {
        return;
      }
      if (qs.length) head.setSrc(qs[0].source);
      const bySym = new Map(qs.map((q) => [q.symbol, q]));
      const rows = [];
      for (const g of groups) {
        rows.push({ __section: g.toUpperCase() });
        for (const [sym, name, region] of uni.INDICES) {
          if (region !== g) continue;
          const q = bySym.get(sym);
          if (!q) continue;
          const was = prev.get(sym);
          rows.push({
            sym,
            name,
            price: q.price,
            change: q.change,
            changePct: q.changePct,
            __flash: was != null && q.price !== was ? Math.sign(q.price - was) : 0,
          });
          prev.set(sym, q.price);
        }
      }
      tbl.setRows(rows);
    };
    await load();
    panel.every(load, 15000);
  },
};

/* ------------------------------------------------------------------ */
/* FXC — FX cross-rate matrix                                          */
/* ------------------------------------------------------------------ */

const FXC_CCYS = ["EUR", "JPY", "GBP", "CHF", "CAD", "AUD", "NZD", "CNY"];

export const FXC = {
  name: "FXC",
  aliases: ["FX"],
  usage: "FXC",
  blurb: "Currency cross-rate matrix (ECB reference rates)",
  category: "MARKET MONITORS",
  async run(panel, args, ctx) {
    panel.setTitle("FXC | FX RATES");
    const head = fnHead("FXC", "cross-rate matrix · base row / quote column");
    panel.body.textContent = "";
    panel.body.append(head.root, el("div", "fn-msg", "loading rates…"));

    const load = async () => {
      let fxd;
      try {
        fxd = await data.fx("USD");
      } catch {
        return message(panel, "fx data unavailable", true);
      }
      head.setSrc(fxd.source);
      const usd = { USD: 1, ...fxd.rates }; // units of CCY per USD
      const ccys = ["USD", ...FXC_CCYS.filter((c) => usd[c] != null)];

      const table = el("table", "grid");
      const thead = el("thead");
      const hr = el("tr");
      hr.appendChild(el("th", null, ""));
      for (const c of ccys) hr.appendChild(el("th", null, escapeHtml(c)));
      thead.appendChild(hr);
      const tbody = el("tbody");
      for (const base of ccys) {
        const tr = el("tr");
        tr.appendChild(el("td", "cell-sym", escapeHtml(base)));
        for (const qc of ccys) {
          if (base === qc) {
            tr.appendChild(el("td", "dim", "—"));
            continue;
          }
          // cross rate: 1 base = ? quote
          const rate = usd[qc] / usd[base];
          const td = el("td", null, fmtPx(rate, "FX"));
          td.style.cursor = "pointer";
          td.title = `${base}${qc} — click for chart`;
          td.addEventListener("click", () => ctx.run(`GP ${base}${qc}=X`, panel));
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.append(thead, tbody);

      const note = el(
        "div",
        "help-note",
        `reference date ${escapeHtml(fxd.date)} · rates are indicative daily reference rates · ` +
          `cell = 1 unit of row currency in column currency · click a cell for the pair chart`
      );
      panel.body.textContent = "";
      panel.body.append(head.root, table, note);
    };
    await load();
    panel.every(load, 120000);
  },
};

/* ------------------------------------------------------------------ */
/* EQS — equity screener over the built-in universe                    */
/* ------------------------------------------------------------------ */

export const EQS = {
  name: "EQS",
  usage: "EQS",
  blurb: "Equity screener (built-in large-cap universe)",
  category: "MARKET MONITORS",
  async run(panel, args, ctx) {
    panel.setTitle("EQS | SCREENER");
    const head = fnHead("EQS", `equity screener · ${uni.EQUITIES.length} names`);

    const bar = el("div", "filter-bar");
    const sectorSel = el("select");
    sectorSel.appendChild(el("option", null, "ALL SECTORS"));
    for (const s of uni.sectors()) {
      const o = el("option", null, escapeHtml(s));
      o.value = s;
      sectorSel.appendChild(o);
    }
    const minPx = el("input");
    minPx.placeholder = "min px";
    const maxPx = el("input");
    maxPx.placeholder = "max px";
    const minChg = el("input");
    minChg.placeholder = "min %chg";
    const maxChg = el("input");
    maxChg.placeholder = "max %chg";
    const minCap = el("input");
    minCap.placeholder = "min cap $B";
    bar.append(
      el("label", null, "SECTOR"), sectorSel,
      el("label", null, "PX"), minPx, maxPx,
      el("label", null, "%CHG"), minChg, maxChg,
      el("label", null, "CAP"), minCap
    );
    const count = el("label");
    bar.append(count);

    const tbl = dataTable(
      [
        { key: "sym", label: "TICKER", fmt: (v) => `<span class="cell-sym">${escapeHtml(v)}</span>` },
        { key: "name", label: "NAME", fmt: (v) => `<span class="cell-name">${escapeHtml(v)}</span>` },
        { key: "sector", label: "SECTOR" },
        { key: "price", label: "LAST", num: true, fmt: (v) => fmtPx(v) },
        { key: "changePct", label: "%CHG", num: true, fmt: pctCell },
        { key: "volume", label: "VOLUME", num: true, fmt: (v) => fmtBig(v) },
        { key: "mcap", label: "MKT CAP*", num: true, fmt: (v) => fmtBig(v) },
      ],
      (row) => ctx.run(`DES ${row.sym}`, panel)
    );

    panel.body.textContent = "";
    panel.body.append(head.root, bar, tbl.table, el("div", "fn-msg", "loading universe…"));

    let all = [];

    const applyFilters = () => {
      const sec = sectorSel.value;
      const lo = parseFloat(minPx.value);
      const hi = parseFloat(maxPx.value);
      const clo = parseFloat(minChg.value);
      const chi = parseFloat(maxChg.value);
      const cap = parseFloat(minCap.value);
      const rows = all.filter((r) => {
        if (sec && sec !== "ALL SECTORS" && r.sector !== sec) return false;
        if (!isNaN(lo) && r.price < lo) return false;
        if (!isNaN(hi) && r.price > hi) return false;
        if (!isNaN(clo) && r.changePct < clo) return false;
        if (!isNaN(chi) && r.changePct > chi) return false;
        if (!isNaN(cap) && (r.mcap == null || r.mcap < cap * 1e9)) return false;
        return true;
      });
      tbl.setRows(rows);
      count.textContent = `→ ${rows.length} match`;
    };

    for (const elx of [sectorSel, minPx, maxPx, minChg, maxChg, minCap]) {
      elx.addEventListener("input", applyFilters);
    }

    const symbols = uni.EQUITIES.map((e) => e[0]);
    // load in chunks so rows appear progressively
    const chunks = [];
    for (let i = 0; i < symbols.length; i += 20) chunks.push(symbols.slice(i, i + 20));
    all = [];
    for (const chunk of chunks) {
      if (!panel.body.contains(tbl.table)) return; // panel replaced
      let qs;
      try {
        qs = await data.quotes(chunk, 30000);
      } catch {
        continue;
      }
      if (qs.length) head.setSrc(qs[0].source);
      for (const q of qs) {
        const rec = uni.lookup(q.symbol);
        if (!rec) continue;
        all.push({
          sym: q.symbol,
          name: rec.name,
          sector: rec.sector,
          price: q.price,
          changePct: q.changePct,
          volume: q.volume,
          mcap: rec.shares ? rec.shares * 1e9 * q.price : null,
        });
      }
      applyFilters();
    }
    const msg = panel.body.querySelector(".fn-msg");
    if (msg) msg.remove();
  },
};

/* ------------------------------------------------------------------ */
/* MOST — biggest movers in the universe                               */
/* ------------------------------------------------------------------ */

export const MOST = {
  name: "MOST",
  aliases: ["MOV"],
  usage: "MOST",
  blurb: "Biggest movers in the built-in universe",
  category: "MARKET MONITORS",
  async run(panel, args, ctx) {
    panel.setTitle("MOST | MOVERS");
    const head = fnHead("MOST", "gainers · losers · volume");
    const tbl = dataTable(
      [
        { key: "sym", label: "TICKER", fmt: (v) => `<span class="cell-sym">${escapeHtml(v)}</span>` },
        { key: "name", label: "NAME", fmt: (v) => `<span class="cell-name">${escapeHtml(v)}</span>` },
        { key: "price", label: "LAST", num: true, fmt: (v) => fmtPx(v) },
        { key: "changePct", label: "%CHG", num: true, fmt: pctCell },
        { key: "volume", label: "VOLUME", num: true, fmt: (v) => fmtBig(v) },
      ],
      (row) => ctx.run(`DES ${row.sym}`, panel)
    );
    panel.body.textContent = "";
    panel.body.append(head.root, tbl.table, el("div", "fn-msg", "scanning universe…"));

    const symbols = uni.EQUITIES.map((e) => e[0]);
    const collected = [];
    for (let i = 0; i < symbols.length; i += 20) {
      if (!panel.body.contains(tbl.table)) return;
      try {
        const qs = await data.quotes(symbols.slice(i, i + 20), 30000);
        if (qs.length) head.setSrc(qs[0].source);
        collected.push(...qs);
      } catch {
        /* skip failed chunk */
      }
    }
    const msg = panel.body.querySelector(".fn-msg");
    if (msg) msg.remove();

    const decorate = (q) => {
      const rec = uni.lookup(q.symbol);
      return {
        sym: q.symbol,
        name: rec ? rec.name : q.name,
        price: q.price,
        changePct: q.changePct,
        volume: q.volume,
      };
    };
    const sorted = [...collected].sort((a, b) => b.changePct - a.changePct);
    const byVol = [...collected].sort((a, b) => (b.volume || 0) - (a.volume || 0));
    const rows = [
      { __section: "TOP GAINERS" },
      ...sorted.slice(0, 10).map(decorate),
      { __section: "TOP LOSERS" },
      ...sorted.slice(-10).reverse().map(decorate),
      { __section: "MOST ACTIVE (VOLUME)" },
      ...byVol.slice(0, 10).map(decorate),
    ];
    tbl.setRows(rows);
  },
};

/* ------------------------------------------------------------------ */
/* W — watchlist (persisted in localStorage)                           */
/* ------------------------------------------------------------------ */

const W_KEY = "berg.watchlist";

function loadWatchlist() {
  try {
    const v = JSON.parse(localStorage.getItem(W_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function saveWatchlist(list) {
  localStorage.setItem(W_KEY, JSON.stringify(list));
}

export const W = {
  name: "W",
  aliases: ["WATC", "PORT"],
  usage: "W [ADD|DEL <sym>]",
  blurb: "Personal watchlist monitor (saved locally)",
  category: "MARKET MONITORS",
  async run(panel, args, ctx) {
    let list = loadWatchlist();
    const verb = (args[0] || "").toUpperCase();
    const sym = (args[1] || "").toUpperCase();
    if (verb === "ADD" && sym) {
      if (!list.includes(sym)) list.push(sym);
      saveWatchlist(list);
    } else if ((verb === "DEL" || verb === "DELETE" || verb === "RM") && sym) {
      list = list.filter((s) => s !== sym);
      saveWatchlist(list);
    } else if (verb === "CLEAR") {
      list = [];
      saveWatchlist(list);
    }

    panel.setTitle("W | WATCHLIST");
    const head = fnHead("W", "watchlist · W ADD <sym> · W DEL <sym>");

    if (!list.length) {
      panel.body.textContent = "";
      panel.body.append(
        head.root,
        el(
          "div",
          "fn-msg",
          "watchlist is empty — add a security with  W ADD AAPL  (stored in your browser only)"
        )
      );
      return;
    }

    const prev = new Map();
    const tbl = dataTable(
      [
        { key: "sym", label: "TICKER", fmt: (v) => `<span class="cell-sym">${escapeHtml(v)}</span>` },
        { key: "name", label: "NAME", fmt: (v) => `<span class="cell-name">${escapeHtml(v)}</span>` },
        { key: "price", label: "LAST", num: true, fmt: (v) => fmtPx(v) },
        { key: "change", label: "CHG", num: true, fmt: chgCell },
        { key: "changePct", label: "%CHG", num: true, fmt: pctCell },
        { key: "volume", label: "VOLUME", num: true, fmt: (v) => fmtBig(v) },
        {
          key: "sym",
          label: "",
          fmt: (v) => `<span class="down" style="cursor:pointer" data-del="${escapeHtml(v)}">✕</span>`,
        },
      ],
      (row) => ctx.run(`QM ${row.sym}`, panel)
    );
    tbl.table.addEventListener("click", (e) => {
      const del = e.target.getAttribute && e.target.getAttribute("data-del");
      if (del) {
        e.stopPropagation();
        ctx.run(`W DEL ${del}`, panel);
      }
    });

    panel.body.textContent = "";
    panel.body.append(head.root, tbl.table);

    const load = async () => {
      let qs;
      try {
        qs = await data.quotes(list, 8000);
      } catch {
        return;
      }
      if (qs.length) head.setSrc(qs[0].source);
      tbl.setRows(
        qs.map((q) => {
          const rec = uni.lookup(q.symbol);
          const was = prev.get(q.symbol);
          prev.set(q.symbol, q.price);
          return {
            sym: q.symbol,
            name: rec ? rec.name : q.name,
            price: q.price,
            change: q.change,
            changePct: q.changePct,
            volume: q.volume,
            __flash: was != null && q.price !== was ? Math.sign(q.price - was) : 0,
          };
        })
      );
    };
    await load();
    panel.every(load, 10000);
  },
};

/* ------------------------------------------------------------------ */
/* ECO — economic release calendar (recurring schedule)                */
/* ------------------------------------------------------------------ */

// rule helpers compute the next occurrence of recurring US/EU releases
function nextNthWeekday(from, nth, weekday, hour, minute) {
  const d = new Date(from.getFullYear(), from.getMonth(), 1);
  for (let m = 0; m < 14; m++) {
    const first = new Date(d.getFullYear(), d.getMonth() + m, 1);
    let count = 0;
    for (let day = 1; day <= 28; day++) {
      const t = new Date(first.getFullYear(), first.getMonth(), day, hour, minute);
      if (t.getDay() === weekday) {
        count++;
        if (count === nth) {
          if (t > from) return t;
          break;
        }
      }
    }
  }
  return null;
}

function nextMonthDay(from, day, hour, minute) {
  for (let m = 0; m < 14; m++) {
    const t = new Date(from.getFullYear(), from.getMonth() + m, day, hour, minute);
    if (t > from) return t;
  }
  return null;
}

function nextWeekday(from, weekday, hour, minute) {
  const t = new Date(from);
  t.setHours(hour, minute, 0, 0);
  while (t <= from || t.getDay() !== weekday) t.setDate(t.getDate() + 1);
  return t;
}

const ECO_RULES = [
  ["US", "Nonfarm Payrolls (Employment Situation)", "HIGH", (f) => nextNthWeekday(f, 1, 5, 8, 30)],
  ["US", "CPI — Consumer Price Index", "HIGH", (f) => nextMonthDay(f, 12, 8, 30)],
  ["US", "PPI — Producer Price Index", "MED", (f) => nextMonthDay(f, 14, 8, 30)],
  ["US", "Retail Sales", "MED", (f) => nextMonthDay(f, 16, 8, 30)],
  ["US", "Initial Jobless Claims", "MED", (f) => nextWeekday(f, 4, 8, 30)],
  ["US", "ISM Manufacturing PMI", "MED", (f) => nextMonthDay(f, 1, 10, 0)],
  ["US", "ISM Services PMI", "MED", (f) => nextMonthDay(f, 3, 10, 0)],
  ["US", "PCE Price Index (Fed's preferred gauge)", "HIGH", (f) => nextMonthDay(f, 26, 8, 30)],
  ["US", "GDP (advance/2nd/3rd estimate)", "MED", (f) => nextMonthDay(f, 28, 8, 30)],
  ["US", "Consumer Confidence (Conference Board)", "LOW", (f) => nextNthWeekday(f, 4, 2, 10, 0)],
  ["US", "U. of Michigan Sentiment (prelim)", "LOW", (f) => nextNthWeekday(f, 2, 5, 10, 0)],
  ["US", "EIA Crude Oil Inventories", "LOW", (f) => nextWeekday(f, 3, 10, 30)],
  ["EU", "ECB Rate Decision (typical cycle)", "HIGH", (f) => nextNthWeekday(f, 2, 4, 8, 15)],
  ["EU", "Euro Area Flash CPI", "MED", (f) => nextMonthDay(f, 31, 5, 0)],
  ["US", "FOMC Rate Decision (8 meetings/yr, approx)", "HIGH", (f) => nextNthWeekday(f, 3, 3, 14, 0)],
];

export const ECO = {
  name: "ECO",
  usage: "ECO",
  blurb: "Economic release calendar (recurring schedule, approximate)",
  category: "MARKET MONITORS",
  run(panel, args, ctx) {
    panel.setTitle("ECO | CALENDAR");
    const head = fnHead("ECO", "upcoming economic releases · local time");
    head.setSrc("live");
    const now = new Date();
    const events = ECO_RULES
      .map(([region, name, imp, fn]) => ({ region, name, imp, t: fn(now) }))
      .filter((e) => e.t)
      .sort((a, b) => a.t - b.t);

    const tbl = dataTable([
      {
        key: "t",
        label: "DATE/TIME",
        fmt: (v) =>
          `<span class="cell-sym">${v.toDateString().toUpperCase().slice(0, 10)} ${String(v.getHours()).padStart(2, "0")}:${String(v.getMinutes()).padStart(2, "0")}</span>`,
      },
      { key: "region", label: "RGN" },
      { key: "name", label: "RELEASE", fmt: (v) => `<span class="cell-name">${escapeHtml(v)}</span>` },
      {
        key: "imp",
        label: "IMPACT",
        fmt: (v) =>
          `<span class="${v === "HIGH" ? "down" : v === "MED" ? "amber" : "dim"}">${v}</span>`,
      },
      { key: "in", label: "IN" },
    ]);
    tbl.setRows(
      events.map((e) => ({
        ...e,
        in: humanIn(e.t - now),
      }))
    );
    const note = el(
      "div",
      "help-note",
      "schedule is rule-based and approximate (typical release patterns); always confirm exact dates with official sources."
    );
    panel.body.textContent = "";
    panel.body.append(head.root, tbl.table, note);
  },
};

function humanIn(ms) {
  const h = ms / 3600000;
  if (h < 24) return `${Math.max(1, Math.round(h))}h`;
  return `${Math.round(h / 24)}d`;
}

/* ------------------------------------------------------------------ */
/* CRYP — crypto monitor                                               */
/* ------------------------------------------------------------------ */

export const CRYP = {
  name: "CRYP",
  usage: "CRYP",
  blurb: "Cryptocurrency monitor (24h)",
  category: "MARKET MONITORS",
  async run(panel, args, ctx) {
    panel.setTitle("CRYP | CRYPTO");
    const head = fnHead("CRYP", "24h spot · vs USD");
    const prev = new Map();
    const tbl = dataTable(
      [
        { key: "symbol", label: "PAIR", fmt: (v) => `<span class="cell-sym">${escapeHtml(v)}</span>` },
        { key: "name", label: "NAME", fmt: (v) => `<span class="cell-name">${escapeHtml(v)}</span>` },
        { key: "price", label: "LAST", num: true, fmt: (v) => fmtPx(v) },
        { key: "changePct", label: "%24H", num: true, fmt: pctCell },
        { key: "high", label: "24H HI", num: true, fmt: (v) => fmtPx(v) },
        { key: "low", label: "24H LO", num: true, fmt: (v) => fmtPx(v) },
        { key: "volume", label: "VOL($)", num: true, fmt: (v) => fmtBig(v) },
      ],
      (row) => ctx.run(`GP ${row.symbol}`, panel)
    );
    panel.body.textContent = "";
    panel.body.append(head.root, tbl.table);

    const load = async () => {
      let c;
      try {
        c = await data.crypto();
      } catch {
        return;
      }
      head.setSrc(c.source);
      tbl.setRows(
        c.items.map((it) => {
          const rec = uni.lookup(it.symbol);
          const was = prev.get(it.symbol);
          prev.set(it.symbol, it.price);
          return {
            ...it,
            name: rec ? rec.name : "",
            __flash: was != null && it.price !== was ? Math.sign(it.price - was) : 0,
          };
        })
      );
    };
    await load();
    panel.every(load, 10000);
  },
};
