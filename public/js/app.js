/**
 * BERG terminal application shell: panel manager, command routing,
 * boot splash, ticker tape, clocks and global keyboard shortcuts.
 */

import { registry } from "./functions.js";
import { parseCommand, initCmdline } from "./cmdline.js";
import * as data from "./data.js";
import * as uni from "./universe.js";
import { message } from "./ui.js";

/* ------------------------------------------------------------------ */
/* Panel manager                                                       */
/* ------------------------------------------------------------------ */

class Panel {
  constructor(id, root) {
    this.id = id;
    this.root = root;
    this.body = root.querySelector(".panel-body");
    this.titleEl = root.querySelector(".panel-title");
    this.timers = [];
    this.cleanups = [];
    this.generation = 0;

    root.addEventListener("mousedown", () => setActive(this));
    root.querySelector(".panel-zoom").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleZoom(this);
    });
    root.querySelector(".panel-head").addEventListener("dblclick", () => toggleZoom(this));
  }

  setTitle(t) {
    this.titleEl.textContent = t;
  }

  /** register an interval cleared automatically when the panel reruns */
  every(fn, ms) {
    const gen = this.generation;
    const id = setInterval(() => {
      if (this.generation !== gen) return clearInterval(id);
      // skip refresh while tab is hidden
      if (document.hidden) return;
      fn();
    }, ms);
    this.timers.push(id);
  }

  onCleanup(fn) {
    this.cleanups.push(fn);
  }

  teardown() {
    this.generation++;
    for (const id of this.timers) clearInterval(id);
    this.timers = [];
    for (const fn of this.cleanups) {
      try {
        fn();
      } catch { /* ignore */ }
    }
    this.cleanups = [];
  }
}

const panels = [1, 2, 3, 4].map(
  (n) => new Panel(n, document.getElementById(`panel-${n}`))
);
let active = panels[0];

function setActive(p) {
  active = p;
  for (const x of panels) x.root.classList.toggle("active", x === p);
}

function toggleZoom(p) {
  const ws = document.getElementById("workspace");
  const isZoomed = ws.classList.contains("zoomed") && p.root.classList.contains("zoom");
  ws.classList.remove("zoomed");
  for (const x of panels) x.root.classList.remove("zoom");
  if (!isZoomed) {
    ws.classList.add("zoomed");
    p.root.classList.add("zoom");
    setActive(p);
  }
}

/* ------------------------------------------------------------------ */
/* Command routing                                                     */
/* ------------------------------------------------------------------ */

const hintMsg = document.getElementById("hint-msg");
let hintTimer = null;

function flashHint(text, isError) {
  hintMsg.textContent = text;
  hintMsg.style.color = isError ? "var(--red)" : "var(--cyan)";
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => (hintMsg.textContent = ""), 5000);
}

async function runCommand(text, panel = active) {
  const parsed = parseCommand(text, registry);
  if (!parsed) return;
  if (parsed.error) return flashHint(parsed.error, true);

  const { fn, args, implicit } = parsed;

  // bare unknown token: only treat as a quote if it plausibly is a symbol
  if (implicit && args[0] && !uni.lookup(args[0])) {
    if (!/^[A-Z0-9.^=\-]{1,12}$/.test(args[0])) {
      return flashHint(`unrecognized command: ${text}`, true);
    }
  }

  setActive(panel);
  panel.teardown();
  panel.setTitle(`${fn.name}…`);
  flashHint(`${fn.name} → panel ${panel.id}`);
  try {
    await fn.run(panel, args, ctx);
  } catch (err) {
    console.error(err);
    message(panel, `error running ${fn.name}: ${err.message || err}`, true);
  }
}

const ctx = { run: runCommand, registry };

/* ------------------------------------------------------------------ */
/* Command line + keyboard                                             */
/* ------------------------------------------------------------------ */

const cmdInput = document.getElementById("cmd");

initCmdline({
  input: cmdInput,
  suggestEl: document.getElementById("cmd-suggest"),
  registry,
  onExec: (value) => runCommand(value),
});

document.getElementById("go-btn").addEventListener("click", () => {
  const v = cmdInput.value.trim();
  if (v) {
    cmdInput.value = "";
    runCommand(v);
  }
  cmdInput.focus();
});

document.addEventListener("keydown", (e) => {
  // Ctrl+1..4 -> focus panel
  if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key >= "1" && e.key <= "4") {
    e.preventDefault();
    setActive(panels[Number(e.key) - 1]);
    return;
  }
  // Ctrl+M -> zoom active panel
  if (e.ctrlKey && (e.key === "m" || e.key === "M")) {
    e.preventDefault();
    toggleZoom(active);
    return;
  }
  // Esc -> jump to command line
  if (e.key === "Escape") {
    cmdInput.focus();
    cmdInput.select();
    return;
  }
  // start typing anywhere -> route to command line
  if (
    document.activeElement !== cmdInput &&
    !e.ctrlKey && !e.metaKey && !e.altKey &&
    e.key.length === 1 &&
    /[a-zA-Z0-9]/.test(e.key) &&
    !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)
  ) {
    cmdInput.focus();
  }
});

/* ------------------------------------------------------------------ */
/* Connection badge                                                    */
/* ------------------------------------------------------------------ */

const connBadge = document.getElementById("conn-badge");
const statusSrc = document.getElementById("status-src");

function setSourceBadge(src) {
  const live = src === "live";
  connBadge.textContent = live ? "LIVE" : "DEMO";
  connBadge.className = `badge ${live ? "live" : "demo"}`;
  statusSrc.textContent = live
    ? "DATA: LIVE (free public sources, may be delayed)"
    : "DATA: DEMO (synthetic — upstream sources unreachable)";
  statusSrc.style.color = live ? "var(--green)" : "var(--yellow)";
}

data.onSourceChange(setSourceBadge);
setSourceBadge("demo");

/* ------------------------------------------------------------------ */
/* Clocks                                                              */
/* ------------------------------------------------------------------ */

const CLOCKS = [
  ["clock-ny", "NY", "America/New_York"],
  ["clock-ldn", "LDN", "Europe/London"],
  ["clock-tyo", "TYO", "Asia/Tokyo"],
];

function tickClocks() {
  const now = new Date();
  for (const [id, label, tz] of CLOCKS) {
    const t = now.toLocaleTimeString("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    document.getElementById(id).textContent = `${label} ${t}`;
  }
}
tickClocks();
setInterval(tickClocks, 1000);

/* ------------------------------------------------------------------ */
/* Ticker tape                                                         */
/* ------------------------------------------------------------------ */

const TAPE_SYMBOLS = [
  "^GSPC", "^DJI", "^IXIC", "^VIX", "AAPL", "MSFT", "NVDA", "AMZN",
  "GOOGL", "META", "TSLA", "JPM", "EURUSD=X", "USDJPY=X", "GC=F",
  "CL=F", "BTC-USD", "ETH-USD",
];

async function refreshTape() {
  let qs;
  try {
    qs = await data.quotes(TAPE_SYMBOLS, 30000);
  } catch {
    return;
  }
  const html = qs
    .map((q) => {
      const cls = q.change > 0 ? "up" : q.change < 0 ? "down" : "flat";
      const arrow = q.change > 0 ? "▲" : q.change < 0 ? "▼" : "·";
      const sym = q.symbol.replace(/=X$/, "").replace(/=F$/, "");
      return (
        `<span class="tape-item"><span class="tape-sym">${sym}</span>` +
        `<span class="tape-px">${data.fmtPx(q.price)}</span>` +
        `<span class="${cls}">${arrow} ${data.fmtPct(q.changePct)}</span></span>`
      );
    })
    .join("");
  // duplicate content so the -50% translate loops seamlessly
  document.getElementById("tape-track").innerHTML = html + html;
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

async function boot() {
  const splash = document.getElementById("splash");
  const splashStatus = document.getElementById("splash-status");

  splashStatus.textContent = "CONNECTING TO DATA SOURCES…";
  refreshTape();
  setInterval(() => {
    if (!document.hidden) refreshTape();
  }, 60000);

  // default workspace
  splashStatus.textContent = "LOADING WORKSPACE…";
  runCommand("WEI", panels[0]);
  runCommand("TOP", panels[1]);
  runCommand("GIP ^GSPC", panels[2]);
  runCommand("FXC", panels[3]);
  setActive(panels[0]);

  setTimeout(() => {
    splash.classList.add("fade");
    setTimeout(() => splash.remove(), 500);
    cmdInput.focus();
  }, 900);
}

boot();
