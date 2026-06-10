/**
 * Core terminal functions: HELP, DES, QM, GP/GIP, N, TOP.
 * Each function is { name, aliases, usage, blurb, run(panel, args, ctx) }.
 */

import * as data from "./data.js";
import * as uni from "./universe.js";
import {
  fmtPx, fmtChg, fmtPct, fmtBig, chgClass, fmtDate, ago, escapeHtml,
} from "./data.js";
import { el, fnHead, dataTable, message } from "./ui.js";
import { Chart } from "./chart.js";

/* ------------------------------------------------------------------ */
/* HELP                                                                */
/* ------------------------------------------------------------------ */

export const HELP = {
  name: "HELP",
  aliases: ["?"],
  usage: "HELP",
  blurb: "Directory of all terminal functions",
  run(panel, args, ctx) {
    const head = fnHead("HELP", "function directory");
    head.setSrc("live");
    const grid = el("div", "help-grid");

    const sections = new Map();
    for (const fn of ctx.registry.list()) {
      const cat = fn.category || "GENERAL";
      if (!sections.has(cat)) sections.set(cat, []);
      sections.get(cat).push(fn);
    }
    for (const [cat, fns] of sections) {
      grid.appendChild(el("div", "help-section", escapeHtml(cat)));
      for (const fn of fns) {
        const c = el("div", "hc", escapeHtml(fn.usage));
        c.title = "click to run";
        c.addEventListener("click", () =>
          ctx.run(fn.usage.includes("<sym>") ? fn.name + " AAPL" : fn.name, panel)
        );
        grid.appendChild(c);
        grid.appendChild(el("div", "hd", escapeHtml(fn.blurb)));
      }
    }

    const note = el(
      "div",
      "help-note",
      `COMMAND LINE — type a function code, optionally with a ticker, then press &lt;GO&gt; (Enter).<br>
       Examples:  <span class="amber">AAPL DES</span> · <span class="amber">DES AAPL</span> ·
       <span class="amber">GP NVDA 5Y</span> · <span class="amber">TSLA</span> (bare ticker → quote) ·
       <span class="amber">W ADD MSFT</span><br>
       Suffix-style commands like <span class="amber">AAPL US EQUITY DES</span> also work.<br>
       KEYS — <span class="amber">Ctrl+1..4</span> focus panel · <span class="amber">Ctrl+M</span> zoom panel ·
       <span class="amber">Esc</span> jump to command line · <span class="amber">↑/↓</span> command history.<br><br>
       BERG is free, open-source software (MIT). It is an independent project, not affiliated with,
       endorsed by, or connected to Bloomberg L.P. Data comes from free public sources, is delayed or
       indicative, and is for information/education only — not investment advice.`
    );

    panel.body.textContent = "";
    panel.body.append(head.root, grid, note);
  },
};

/* ------------------------------------------------------------------ */
/* DES — security description                                          */
/* ------------------------------------------------------------------ */

export const DES = {
  name: "DES",
  usage: "DES <sym>",
  blurb: "Security description & profile",
  category: "SECURITY ANALYSIS",
  needsSymbol: true,
  async run(panel, args, ctx) {
    const sym = args[0];
    if (!sym) return message(panel, "DES requires a ticker, e.g.  DES AAPL", true);
    const rec = uni.lookup(sym);
    const head = fnHead(`${sym} ${rec ? rec.type.toUpperCase() : ""} | DES`, "security description");
    panel.body.textContent = "";
    panel.body.append(head.root, el("div", "fn-msg", "loading…"));
    panel.setTitle(`${sym} | DES`);

    let q;
    try {
      q = await data.quote(sym);
    } catch {
      return message(panel, `no data for ${sym}`, true);
    }
    if (!q || q.error || q.price == null) {
      return message(panel, `unknown security: ${sym} — try the autocomplete or HELP`, true);
    }
    head.setSrc(q.source);

    const name = rec ? rec.name : q.name;
    const mcap =
      rec && rec.shares ? rec.shares * 1e9 * q.price : null;

    const bq = el("div", "big-quote");
    bq.append(
      el("span", `bq-px ${chgClass(q.change)}`, fmtPx(q.price)),
      el(
        "span",
        `bq-chg ${chgClass(q.change)}`,
        `${fmtChg(q.change)}  (${fmtPct(q.changePct)})`
      ),
      el("span", "bq-name", `${escapeHtml(name)}  ·  ${escapeHtml(q.exchange || "")}  ·  ${escapeHtml(q.currency || "")}`)
    );

    const kv = el("div", "kv-grid");
    const add = (k, v) => {
      kv.appendChild(el("span", "k", escapeHtml(k)));
      kv.appendChild(el("span", "v", v));
    };
    add("PREV CLOSE", fmtPx(q.prevClose));
    add("DAY RANGE", q.dayLow != null ? `${fmtPx(q.dayLow)} – ${fmtPx(q.dayHigh)}` : "—");
    add("52W RANGE", q.low52 != null ? `${fmtPx(q.low52)} – ${fmtPx(q.high52)}` : "—");
    add("VOLUME", fmtBig(q.volume));
    if (rec && rec.type === "Equity") {
      add("SECTOR", escapeHtml(rec.sector));
      add("INDUSTRY", escapeHtml(rec.industry));
      add("COUNTRY", escapeHtml(rec.country));
      add("MKT CAP*", mcap ? fmtBig(mcap) + " " + escapeHtml(q.currency || "USD") : "—");
      add("SHARES OUT*", rec.shares ? rec.shares.toFixed(2) + "B" : "—");
    } else if (rec) {
      add("TYPE", escapeHtml(rec.type));
      if (rec.region) add("REGION", escapeHtml(rec.region));
    }
    add("MARKET STATE", escapeHtml(q.marketState || "—"));
    add("AS OF", fmtDate(q.time) + " " + new Date(q.time).toTimeString().slice(0, 8));

    // 52w position bar
    let rangeBar = null;
    if (q.low52 != null && q.high52 > q.low52) {
      rangeBar = el("div", "range-bar");
      const m = el("div", "marker");
      m.style.left =
        (((q.price - q.low52) / (q.high52 - q.low52)) * 100).toFixed(1) + "%";
      rangeBar.appendChild(m);
    }

    const descText =
      rec && rec.desc
        ? rec.desc
        : rec
        ? `${name} — ${rec.type}${rec.sector ? ` in the ${rec.sector} sector (${rec.industry}).` : "."}`
        : `${name}. No profile on file — quote data ${q.source === "live" ? "from public sources" : "is synthetic demo data"}.`;

    const links = el(
      "div",
      "fn-msg",
      `related:  <span class="hc amber" data-c="GP ${escapeHtml(sym)}">GP chart</span>  ·  ` +
        `<span class="hc amber" data-c="GIP ${escapeHtml(sym)}">GIP intraday</span>  ·  ` +
        `<span class="hc amber" data-c="N ${escapeHtml(sym)}">N news</span>  ·  ` +
        `<span class="hc amber" data-c="W ADD ${escapeHtml(sym)}">add to W</span>`
    );
    links.querySelectorAll(".hc").forEach((a) => {
      a.style.cursor = "pointer";
      a.addEventListener("click", () => ctx.run(a.dataset.c, panel));
    });

    panel.body.textContent = "";
    panel.body.append(head.root, bq, kv);
    if (rangeBar) {
      panel.body.append(rangeBar);
      const lbl = el("div", "range-lbl");
      lbl.append(el("span", null, "52W LO " + fmtPx(q.low52)), el("span", null, "52W HI " + fmtPx(q.high52)));
      panel.body.append(lbl);
    }
    panel.body.append(el("div", "desc-text", escapeHtml(descText)), links);
    if (mcap) {
      panel.body.append(
        el("div", "help-note", "* market cap is indicative: built-in approximate share count × last price.")
      );
    }
  },
};

/* ------------------------------------------------------------------ */
/* QM — quote montage (also the default for a bare ticker)             */
/* ------------------------------------------------------------------ */

export const QM = {
  name: "QM",
  aliases: ["Q"],
  usage: "QM <sym>",
  blurb: "Quote montage with mini intraday chart",
  category: "SECURITY ANALYSIS",
  needsSymbol: true,
  async run(panel, args, ctx) {
    const sym = args[0];
    if (!sym) return message(panel, "QM requires a ticker, e.g.  QM NVDA", true);
    panel.setTitle(`${sym} | QM`);
    const head = fnHead(`${sym} | QM`, "quote montage");
    panel.body.textContent = "";
    panel.body.append(head.root, el("div", "fn-msg", "loading…"));

    const bq = el("div", "big-quote");
    const kv = el("div", "kv-grid");
    const holder = el("div");
    holder.style.cssText = "position:relative;height:46%;min-height:160px;border-top:1px solid #2a2a2a";
    const chart = new Chart(holder);
    panel.onCleanup(() => chart.destroy());

    let lastPx = null;

    const refresh = async () => {
      let q;
      try {
        q = await data.quote(sym, 5000);
      } catch {
        return;
      }
      if (!q || q.error || q.price == null) {
        return message(panel, `unknown security: ${sym} — try the autocomplete or HELP`, true);
      }
      head.setSrc(q.source);
      const rec = uni.lookup(sym);
      const dir = lastPx == null ? 0 : Math.sign(q.price - lastPx);
      lastPx = q.price;

      bq.textContent = "";
      const pxEl = el("span", `bq-px ${chgClass(q.change)}`, fmtPx(q.price));
      if (dir) pxEl.classList.add(dir > 0 ? "flash-up" : "flash-down");
      bq.append(
        pxEl,
        el("span", `bq-chg ${chgClass(q.change)}`, `${fmtChg(q.change)}  (${fmtPct(q.changePct)})`),
        el("span", "bq-name", `${escapeHtml(rec ? rec.name : q.name)} · ${escapeHtml(q.exchange || "")} · as of ${new Date(q.time).toTimeString().slice(0, 8)}`)
      );

      kv.textContent = "";
      const add = (k, v) => {
        kv.appendChild(el("span", "k", k));
        kv.appendChild(el("span", "v", v));
      };
      add("OPEN", fmtPx(q.open));
      add("PREV", fmtPx(q.prevClose));
      add("HIGH", fmtPx(q.dayHigh));
      add("LOW", fmtPx(q.dayLow));
      add("VOLUME", fmtBig(q.volume));
      add("52W H/L", q.high52 != null ? `${fmtPx(q.high52)} / ${fmtPx(q.low52)}` : "—");
    };

    await refresh();
    panel.body.textContent = "";
    panel.body.append(head.root, bq, kv, holder);

    try {
      const h = await data.history(sym, "1d", "5m");
      chart.setData({ ...h, intraday: true }, "line");
    } catch {
      /* chart stays in loading state */
    }

    panel.every(refresh, 6000);
  },
};

/* ------------------------------------------------------------------ */
/* GP / GIP — price charts                                             */
/* ------------------------------------------------------------------ */

const RANGES = [
  ["1D", "1d", "5m", true],
  ["5D", "5d", "30m", true],
  ["1M", "1mo", "1d", false],
  ["3M", "3mo", "1d", false],
  ["6M", "6mo", "1d", false],
  ["YTD", "ytd", "1d", false],
  ["1Y", "1y", "1d", false],
  ["5Y", "5y", "1wk", false],
  ["MAX", "max", "1mo", false],
];

function chartFunction(name, blurb, defaultRange) {
  return {
    name,
    usage: `${name} <sym> [1D|5D|1M|3M|6M|YTD|1Y|5Y|MAX]`,
    blurb,
    category: "CHARTS",
    needsSymbol: true,
    async run(panel, args, ctx) {
      const sym = args[0];
      if (!sym) return message(panel, `${name} requires a ticker, e.g.  ${name} AAPL`, true);
      let rangeLbl = (args[1] || defaultRange).toUpperCase();
      if (!RANGES.some((r) => r[0] === rangeLbl)) rangeLbl = defaultRange;
      let mode = "line";

      panel.setTitle(`${sym} | ${name}`);
      const head = fnHead(`${sym} | ${name}`, blurb.toLowerCase());

      const toolbar = el("div", "chart-toolbar");
      const holder = el("div", "chart-holder");
      const chart = new Chart(holder);
      panel.onCleanup(() => chart.destroy());

      const statsEl = el("span", "fn-sub");
      const buttons = new Map();

      const load = async () => {
        const [, range, interval, intraday] = RANGES.find((r) => r[0] === rangeLbl);
        for (const [lbl, btn] of buttons) btn.classList.toggle("on", lbl === rangeLbl);
        try {
          const h = await data.history(sym, range, interval);
          head.setSrc(h.source);
          chart.setData({ ...h, intraday }, mode);
          const cs = h.c.filter((x) => x != null);
          if (cs.length > 1) {
            const chg = ((cs[cs.length - 1] - cs[0]) / cs[0]) * 100;
            statsEl.textContent = `${rangeLbl}: ${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%  ·  H ${fmtPx(Math.max(...cs))}  L ${fmtPx(Math.min(...cs))}`;
            statsEl.className = `fn-sub ${chgClass(chg)}`;
          }
        } catch {
          message(panel, `no chart data for ${sym}`, true);
        }
      };

      for (const [lbl] of RANGES) {
        const b = el("button", "tb-btn", lbl);
        b.addEventListener("click", () => {
          rangeLbl = lbl;
          load();
        });
        buttons.set(lbl, b);
        toolbar.appendChild(b);
      }
      toolbar.appendChild(el("span", null, "&nbsp;&nbsp;"));
      const lineBtn = el("button", "tb-btn on", "LINE");
      const candleBtn = el("button", "tb-btn", "CNDL");
      lineBtn.addEventListener("click", () => {
        mode = "line";
        lineBtn.classList.add("on");
        candleBtn.classList.remove("on");
        chart.setMode(mode);
      });
      candleBtn.addEventListener("click", () => {
        mode = "candle";
        candleBtn.classList.add("on");
        lineBtn.classList.remove("on");
        chart.setMode(mode);
      });
      toolbar.append(lineBtn, candleBtn, statsEl);

      panel.body.textContent = "";
      panel.body.append(head.root, toolbar, holder);
      await load();
      // refresh intraday views periodically
      panel.every(() => {
        if (rangeLbl === "1D" || rangeLbl === "5D") load();
      }, 30000);
    },
  };
}

export const GP = chartFunction("GP", "Historical price chart", "1Y");
export const GIP = chartFunction("GIP", "Intraday price chart", "1D");

/* ------------------------------------------------------------------ */
/* TOP / N — news                                                      */
/* ------------------------------------------------------------------ */

function renderNews(panel, head, items) {
  const list = el("div");
  for (const it of items) {
    const row = el("div", "news-row");
    row.append(
      el("span", "news-time", ago(it.time)),
      el("span", "news-src", escapeHtml(it.source || "")),
      el("span", "news-title", escapeHtml(it.title))
    );
    if (it.link) {
      row.title = it.link;
      row.addEventListener("click", () => {
        row.classList.add("read");
        window.open(it.link, "_blank", "noopener");
      });
    }
    list.appendChild(row);
  }
  panel.body.textContent = "";
  panel.body.append(head.root, list);
}

export const TOP = {
  name: "TOP",
  usage: "TOP",
  blurb: "Top market news headlines",
  category: "NEWS",
  async run(panel, args, ctx) {
    panel.setTitle("TOP | NEWS");
    const head = fnHead("TOP", "top market headlines");
    panel.body.textContent = "";
    panel.body.append(head.root, el("div", "fn-msg", "loading headlines…"));
    const load = async () => {
      try {
        const n = await data.news();
        head.setSrc(n.source);
        renderNews(panel, head, n.items);
      } catch {
        message(panel, "news unavailable", true);
      }
    };
    await load();
    panel.every(load, 120000);
  },
};

export const N = {
  name: "N",
  aliases: ["CN"],
  usage: "N <sym>",
  blurb: "News for a specific security",
  category: "NEWS",
  needsSymbol: true,
  async run(panel, args, ctx) {
    const sym = args[0];
    if (!sym) return TOP.run(panel, args, ctx);
    panel.setTitle(`${sym} | N`);
    const head = fnHead(`${sym} | N`, "company news");
    panel.body.textContent = "";
    panel.body.append(head.root, el("div", "fn-msg", "loading headlines…"));
    try {
      const n = await data.news(sym);
      head.setSrc(n.source);
      renderNews(panel, head, n.items);
    } catch {
      message(panel, `no news for ${sym}`, true);
    }
  },
};
