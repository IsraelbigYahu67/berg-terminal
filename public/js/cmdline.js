/**
 * Command line: parsing, autocomplete and history.
 *
 * Accepted forms (case-insensitive):
 *   HELP                      bare function
 *   DES AAPL                  function + args
 *   AAPL DES                  symbol + function (suffix style)
 *   AAPL US EQUITY DES        with market-sector words (ignored)
 *   NVDA                      bare symbol -> QM
 *   GP NVDA 5Y                function + symbol + params
 */

import * as uni from "./universe.js";
import { escapeHtml } from "./data.js";

// market-sector words tolerated (and ignored) in suffix-style commands
const SECTOR_WORDS = new Set([
  "EQUITY", "INDEX", "CURNCY", "CURRENCY", "COMDTY", "CRYPTO",
  "GOVT", "CORP", "US", "LN", "GY", "JP", "FP", "HK",
]);

export function parseCommand(input, registry) {
  const raw = input.trim();
  if (!raw) return null;
  const tokens = raw.toUpperCase().split(/\s+/);

  // 1) leading function code:  DES AAPL / HELP / GP NVDA 5Y
  const lead = registry.find(tokens[0]);
  if (lead) return { fn: lead, args: tokens.slice(1) };

  // 2) trailing function code:  AAPL DES / AAPL US EQUITY DES
  const tailFn = registry.find(tokens[tokens.length - 1]);
  if (tailFn && tokens.length > 1) {
    const args = tokens.slice(0, -1).filter((t) => !SECTOR_WORDS.has(t) || uni.lookup(t));
    return { fn: tailFn, args };
  }

  // 3) bare symbol -> quote montage
  if (tokens.length <= 2) {
    return { fn: registry.find("QM"), args: [tokens[0]], implicit: true };
  }
  return { error: `unrecognized command: ${raw}` };
}

/* ------------------------------------------------------------------ */
/* Autocomplete + history wiring                                       */
/* ------------------------------------------------------------------ */

export function initCmdline({ input, suggestEl, registry, onExec }) {
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem("berg.cmdhist") || "[]");
  } catch { /* ignore */ }
  let histPos = history.length;
  let items = []; // current suggestions [{text, desc}]
  let sel = -1;

  function saveHistory() {
    localStorage.setItem("berg.cmdhist", JSON.stringify(history.slice(-100)));
  }

  function hide() {
    suggestEl.classList.add("hidden");
    items = [];
    sel = -1;
  }

  function renderSuggest() {
    if (!items.length) return hide();
    suggestEl.textContent = "";
    items.forEach((it, i) => {
      const row = document.createElement("div");
      row.className = "sug-row" + (i === sel ? " sel" : "");
      row.innerHTML =
        `<span class="sug-cmd">${escapeHtml(it.text)}</span>` +
        `<span class="sug-desc">${escapeHtml(it.desc)}</span>`;
      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
        input.value = it.text;
        hide();
        exec();
      });
      suggestEl.appendChild(row);
    });
    suggestEl.classList.remove("hidden");
  }

  function updateSuggest() {
    const v = input.value.trim().toUpperCase();
    if (!v) return hide();
    const parts = v.split(/\s+/);
    items = [];

    if (parts.length === 1) {
      // function codes
      for (const fn of registry.list()) {
        if (fn.name.startsWith(v) && fn.name !== v) {
          items.push({ text: fn.needsSymbol ? fn.name + " " : fn.name, desc: fn.blurb });
        }
      }
      // securities
      for (const rec of uni.matches(v, 6)) {
        items.push({ text: rec.sym, desc: `${rec.name} · ${rec.type}` });
      }
    } else {
      // completing the argument of a function: DES AA<...>
      const fn = registry.find(parts[0]);
      const last = parts[parts.length - 1];
      if (fn && fn.needsSymbol && last.length >= 1) {
        for (const rec of uni.matches(last, 8)) {
          items.push({
            text: [...parts.slice(0, -1), rec.sym].join(" "),
            desc: `${rec.name} · ${rec.type}`,
          });
        }
      }
    }
    items = items.slice(0, 10);
    sel = -1;
    renderSuggest();
  }

  function exec() {
    const value = input.value.trim();
    if (!value) return;
    hide();
    history.push(value.toUpperCase());
    histPos = history.length;
    saveHistory();
    input.value = "";
    onExec(value);
  }

  input.addEventListener("input", updateSuggest);

  input.addEventListener("keydown", (e) => {
    if (!suggestEl.classList.contains("hidden") && items.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        sel = (sel + 1) % items.length;
        return renderSuggest();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        sel = (sel - 1 + items.length) % items.length;
        return renderSuggest();
      }
      if (e.key === "Tab") {
        e.preventDefault();
        input.value = items[Math.max(0, sel)].text;
        return updateSuggest();
      }
      if (e.key === "Enter" && sel >= 0) {
        e.preventDefault();
        input.value = items[sel].text;
        return exec();
      }
      if (e.key === "Escape") {
        e.stopPropagation();
        return hide();
      }
    } else {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (histPos > 0) input.value = history[--histPos] || "";
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (histPos < history.length) input.value = history[++histPos] || "";
        return;
      }
    }
    if (e.key === "Enter") {
      e.preventDefault();
      exec();
    }
  });

  input.addEventListener("blur", () => setTimeout(hide, 150));

  return { exec };
}
