/**
 * Smoke test: boots the server on a scratch port and verifies every
 * API route and the static front-end respond with sane payloads.
 * Works fully offline (routes fall back to demo data).
 *
 * Run:  node tools/smoke.mjs
 */

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = 18787;
const BASE = `http://127.0.0.1:${PORT}`;

let failures = 0;

function check(label, cond) {
  if (cond) {
    console.log(`  ok   ${label}`);
  } else {
    failures++;
    console.error(`  FAIL ${label}`);
  }
}

async function getJson(p) {
  const res = await fetch(BASE + p);
  check(`${p} -> ${res.status}`, res.ok);
  return res.json();
}

const server = spawn(process.execPath, [path.join(root, "server.js")], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stderr.on("data", (d) => process.stderr.write(d));

try {
  // wait for the server to accept connections
  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    try {
      const r = await fetch(BASE + "/api/health");
      up = r.ok;
    } catch {
      await sleep(250);
    }
  }
  if (!up) throw new Error("server did not start");
  console.log("server up");

  const idx = await fetch(BASE + "/");
  check("/ serves index.html", idx.ok && (await idx.text()).includes("BERG"));

  const css = await fetch(BASE + "/css/terminal.css");
  check("/css/terminal.css", css.ok);
  for (const f of [
    "app.js", "cmdline.js", "chart.js", "data.js", "ui.js",
    "universe.js", "functions.js", "functions-core.js", "functions-monitors.js",
  ]) {
    const r = await fetch(`${BASE}/js/${f}`);
    check(`/js/${f}`, r.ok);
  }

  const q = await getJson("/api/quote?symbols=AAPL,MSFT,%5EGSPC");
  check("quote count = 3", q.quotes && q.quotes.length === 3);
  check("quote has price", typeof q.quotes[0].price === "number" && q.quotes[0].price > 0);
  check("quote has source", ["live", "demo"].includes(q.quotes[0].source));

  const h = await getJson("/api/history?symbol=AAPL&range=1mo&interval=1d");
  check("history has bars", Array.isArray(h.t) && h.t.length > 5);
  check("history c aligns t", h.c.length === h.t.length);

  const hi = await getJson("/api/history?symbol=AAPL&range=1d&interval=5m");
  check("intraday has bars", Array.isArray(hi.t) && hi.t.length > 5);

  const n = await getJson("/api/news");
  check("news has items", Array.isArray(n.items) && n.items.length > 3);
  check("news item shape", typeof n.items[0].title === "string" && typeof n.items[0].time === "number");

  const fx = await getJson("/api/fx?base=USD");
  check("fx has EUR rate", fx.rates && typeof fx.rates.EUR === "number");

  const c = await getJson("/api/crypto");
  check("crypto has items", Array.isArray(c.items) && c.items.length > 3);
  check("crypto item shape", typeof c.items[0].price === "number");

  const s = await getJson("/api/search?q=apple");
  check("search returns array", Array.isArray(s.items));

  const traversal = await fetch(BASE + "/..%2f..%2fserver.js");
  check("path traversal blocked", traversal.status === 403 || traversal.status === 404);

  console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL SMOKE TESTS PASSED");
} catch (err) {
  failures++;
  console.error("smoke test error:", err.message || err);
} finally {
  server.kill();
}
process.exit(failures ? 1 : 0);
