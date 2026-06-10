# BERG Terminal

A **free, open-source, keyboard-driven market terminal** that runs in your
browser. Black screen, amber command line, function codes, four-panel
workspace, scrolling ticker — the classic trading-terminal workflow, built
entirely from free public data sources.

> **Disclaimer.** BERG is an independent open-source project. It is **not
> affiliated with, endorsed by, or connected to Bloomberg L.P.** in any way,
> and it is not a copy of any proprietary product. All data shown is from
> free public sources, may be delayed or indicative, and is provided for
> information and education only — **not investment advice**.

## Quick start

Requires only [Node.js](https://nodejs.org) 18+. No npm install, no API
keys, no accounts, no build step.

```bash
node server.js
# open http://localhost:8787
```

That's it. If the machine has internet access you get live (free, possibly
delayed) market data; if not, every screen still works on clearly labeled
synthetic **DEMO** data.

## Using the terminal

Type a command in the amber command line at the top and press **Enter**
(`<GO>`). Commands run in the **active panel** (amber border). Click a
panel or press `Ctrl+1..4` to choose where the next screen opens.

```
HELP                 function directory
AAPL DES             security description (suffix style works too: DES AAPL)
NVDA                 bare ticker -> quote montage
GP TSLA 5Y           historical chart (line/candles, 1D..MAX)
GIP ^GSPC            intraday chart
TOP                  top market headlines
N AAPL               news for one security
WEI                  world equity indices
FXC                  FX cross-rate matrix
EQS                  equity screener with filters
MOST                 biggest gainers / losers / most active
W ADD MSFT           add to your watchlist;  W  shows it,  W DEL MSFT  removes
ECO                  economic release calendar (approximate schedule)
CRYP                 crypto monitor
```

Old-school suffix commands like `AAPL US EQUITY DES` are accepted — the
market-sector words are tolerated and ignored.

### Keyboard

| Keys        | Action                          |
|-------------|---------------------------------|
| `Enter`     | execute command (`<GO>`)        |
| `Ctrl+1..4` | focus panel 1–4                 |
| `Ctrl+M`    | zoom / unzoom the active panel  |
| `Esc`       | jump back to the command line   |
| `↑` / `↓`   | command history / suggestions   |
| `Tab`       | accept autocomplete suggestion  |

Typing any letter anywhere focuses the command line, so you can drive the
whole terminal without touching the mouse. Hover charts for a crosshair
readout; click table rows to drill into a security; click column headers
to sort.

## Where the data comes from

The bundled server (`server.js`, zero dependencies) proxies and caches
free public sources, then falls back to deterministic synthetic data when
a source is unreachable:

| Data              | Source                                        |
|-------------------|-----------------------------------------------|
| Quotes & charts   | Yahoo Finance public chart endpoints          |
| FX reference rates| ECB rates via frankfurter.app                 |
| Crypto (24h spot) | Binance public ticker API                     |
| News headlines    | Public RSS feeds (MarketWatch, Yahoo Finance) |
| Economic calendar | Built-in recurring schedule rules             |
| Security profiles | Built-in security master (`universe.js`)      |

Every screen shows a **LIVE** or **DEMO DATA** tag so you always know what
you're looking at. Quotes are delayed/indicative — do not trade off them.

## Project layout

```
server.js                      zero-dep Node server: static files + /api/* data proxy + demo fallback
public/
  index.html                   shell: command line, 4 panels, tape, status bar
  css/terminal.css             the look
  js/app.js                    panel manager, routing, keyboard, tape, clocks
  js/cmdline.js                command parsing, autocomplete, history
  js/functions.js              function registry
  js/functions-core.js         HELP DES QM GP GIP TOP N
  js/functions-monitors.js     WEI FXC EQS MOST W ECO CRYP
  js/chart.js                  canvas chart engine (line/candles, volume, crosshair)
  js/data.js                   API client, cache, formatters
  js/ui.js                     shared widgets (headers, sortable tables)
  js/universe.js               built-in security master
tools/smoke.mjs                offline smoke test (node tools/smoke.mjs)
```

## Tests

```bash
node tools/smoke.mjs   # boots the server, checks every route — works offline
```

## Adding a function

Create an object `{ name, usage, blurb, category, run(panel, args, ctx) }`
in one of the `functions-*.js` modules and add it to the list in
`functions.js`. `panel` gives you `body`, `setTitle`, auto-cleaned
`every(fn, ms)` timers and `onCleanup(fn)`; `ctx.run("DES AAPL", panel)`
chains to other screens.

## License

[MIT](LICENSE) — free to use, copy, modify and redistribute.
