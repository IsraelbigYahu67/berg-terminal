/**
 * Small DOM helpers shared by the terminal function screens.
 */

import { escapeHtml } from "./data.js";

/** create an element with a class and optional html */
export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

/** standard amber function header bar; returns {root, setSrc, setSub} */
export function fnHead(name, sub) {
  const root = el("div", "fn-head");
  const nameEl = el("span", "fn-name", escapeHtml(name));
  const subEl = el("span", "fn-sub", escapeHtml(sub || ""));
  const srcEl = el("span", "src-tag", "");
  root.append(nameEl, subEl, srcEl);
  return {
    root,
    setSub(s) {
      subEl.textContent = s;
    },
    setSrc(src) {
      srcEl.textContent = src === "live" ? "LIVE" : "DEMO DATA";
      srcEl.className = `src-tag ${src === "live" ? "live" : "demo"}`;
    },
  };
}

/**
 * Sortable data table.
 * cols: [{key, label, num?, cls?(row), fmt?(val,row)}]
 * onRow: optional click handler(row)
 */
export function dataTable(cols, onRow) {
  const table = el("table", "grid");
  const thead = el("thead");
  const hr = el("tr");
  let sortKey = null;
  let sortDir = -1;
  let rows = [];

  for (const c of cols) {
    const th = el("th", null, escapeHtml(c.label));
    th.addEventListener("click", () => {
      if (sortKey === c.key) sortDir = -sortDir;
      else {
        sortKey = c.key;
        sortDir = c.num ? -1 : 1;
      }
      render();
    });
    hr.appendChild(th);
  }
  thead.appendChild(hr);
  const tbody = el("tbody");
  table.append(thead, tbody);

  function render() {
    let view = rows;
    if (sortKey) {
      view = [...rows].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === "number" && typeof bv === "number")
          return (av - bv) * sortDir;
        return String(av).localeCompare(String(bv)) * sortDir;
      });
    }
    tbody.textContent = "";
    for (const row of view) {
      if (row.__section) {
        const tr = el("tr", "sec-head");
        const td = el("td", null, escapeHtml(row.__section));
        td.colSpan = cols.length;
        tr.appendChild(td);
        tbody.appendChild(tr);
        continue;
      }
      const tr = el("tr", onRow ? "clickable" : "");
      for (const c of cols) {
        const raw = row[c.key];
        const td = el("td");
        td.innerHTML = c.fmt ? c.fmt(raw, row) : escapeHtml(raw ?? "—");
        if (c.cls) td.className = c.cls(row) || "";
        tr.appendChild(td);
      }
      if (onRow) tr.addEventListener("click", () => onRow(row));
      // flash on tick
      if (row.__flash) {
        tr.classList.add(row.__flash > 0 ? "flash-up" : "flash-down");
        row.__flash = 0;
      }
      tbody.appendChild(tr);
    }
  }

  return {
    table,
    setRows(r) {
      rows = r;
      render();
    },
    getRows() {
      return rows;
    },
  };
}

export function message(panel, text, isError) {
  panel.body.textContent = "";
  panel.body.appendChild(el("div", isError ? "fn-err" : "fn-msg", escapeHtml(text)));
}
