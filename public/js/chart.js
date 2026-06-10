/**
 * Minimal canvas charting engine: line/area and candlestick price
 * panes with a volume strip, right-hand price axis, time axis and a
 * crosshair readout. No dependencies.
 */

const COL = {
  bg: "#050505",
  grid: "#1c1c1c",
  axis: "#8a8a8a",
  line: "#ff9f0a",
  fillTop: "rgba(255,159,10,0.22)",
  fillBot: "rgba(255,159,10,0.0)",
  up: "#00d964",
  down: "#ff3b30",
  vol: "#2c3c55",
  cross: "#666",
  lastUp: "#00d964",
  lastDown: "#ff3b30",
  text: "#e8e8e8",
};

export class Chart {
  /**
   * @param {HTMLElement} holder element the canvas fills
   */
  constructor(holder) {
    this.holder = holder;
    this.canvas = document.createElement("canvas");
    // CSS size must track the holder; pixel size is set per-draw for DPR
    this.canvas.style.cssText = "display:block;width:100%;height:100%";
    holder.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.mode = "line"; // line | candle
    this.data = null; // {t,o,h,l,c,v,prevClose,intraday}
    this.cross = null; // {x,y} css pixels

    this._onMove = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.cross = { x: e.clientX - r.left, y: e.clientY - r.top };
      this.draw();
    };
    this._onLeave = () => {
      this.cross = null;
      this.draw();
    };
    this.canvas.addEventListener("mousemove", this._onMove);
    this.canvas.addEventListener("mouseleave", this._onLeave);

    this._ro = new ResizeObserver(() => this.draw());
    this._ro.observe(holder);
  }

  destroy() {
    this._ro.disconnect();
    this.canvas.remove();
  }

  setData(data, mode) {
    this.data = data;
    if (mode) this.mode = mode;
    this.draw();
  }

  setMode(mode) {
    this.mode = mode;
    this.draw();
  }

  draw() {
    const holder = this.holder;
    const cssW = holder.clientWidth;
    const cssH = holder.clientHeight;
    if (cssW < 40 || cssH < 40) return;
    const dpr = window.devicePixelRatio || 1;
    if (this.canvas.width !== cssW * dpr || this.canvas.height !== cssH * dpr) {
      this.canvas.width = cssW * dpr;
      this.canvas.height = cssH * dpr;
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, cssW, cssH);

    const d = this.data;
    if (!d || !d.t || d.t.length < 2) {
      ctx.fillStyle = COL.axis;
      ctx.font = "12px monospace";
      ctx.fillText("loading…", 12, 24);
      return;
    }

    // layout
    const padR = 64; // price axis
    const padB = 18; // time axis
    const volH = Math.max(28, Math.floor(cssH * 0.14));
    const priceH = cssH - padB - volH - 4;
    const plotW = cssW - padR;

    // clean series (drop null closes)
    const idx = [];
    for (let i = 0; i < d.t.length; i++) if (d.c[i] != null) idx.push(i);
    if (idx.length < 2) return;

    let lo = Infinity, hi = -Infinity, volMax = 0;
    for (const i of idx) {
      const l = this.mode === "candle" && d.l[i] != null ? d.l[i] : d.c[i];
      const h = this.mode === "candle" && d.h[i] != null ? d.h[i] : d.c[i];
      if (l < lo) lo = l;
      if (h > hi) hi = h;
      if (d.v && d.v[i] > volMax) volMax = d.v[i];
    }
    if (d.prevClose != null) {
      if (d.prevClose < lo) lo = d.prevClose;
      if (d.prevClose > hi) hi = d.prevClose;
    }
    const padPx = (hi - lo) * 0.06 || hi * 0.01 || 1;
    lo -= padPx;
    hi += padPx;

    const xAt = (k) => (k / (idx.length - 1)) * (plotW - 2) + 1;
    const yAt = (p) => priceH - ((p - lo) / (hi - lo)) * priceH;

    // horizontal gridlines + price labels
    ctx.font = "10px monospace";
    const steps = 5;
    for (let s = 0; s <= steps; s++) {
      const p = lo + ((hi - lo) * s) / steps;
      const y = yAt(p);
      ctx.strokeStyle = COL.grid;
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(plotW, y + 0.5);
      ctx.stroke();
      ctx.fillStyle = COL.axis;
      ctx.fillText(fmtAxis(p), plotW + 6, y + 3);
    }

    // time labels
    const ticks = Math.max(2, Math.floor(plotW / 110));
    ctx.fillStyle = COL.axis;
    for (let s = 0; s <= ticks; s++) {
      const k = Math.round(((idx.length - 1) * s) / ticks);
      const ts = d.t[idx[k]] * 1000;
      const lbl = d.intraday ? timeLbl(ts) : dateLbl(ts);
      const x = Math.min(xAt(k), plotW - 50);
      ctx.fillText(lbl, x, cssH - 5);
    }

    // previous close reference line
    if (d.prevClose != null && d.intraday) {
      const y = yAt(d.prevClose);
      ctx.strokeStyle = "#3f3f3f";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(plotW, y + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // volume strip
    if (volMax > 0 && d.v) {
      const vTop = priceH + 4;
      const bw = Math.max(1, (plotW / idx.length) * 0.7);
      for (let k = 0; k < idx.length; k++) {
        const i = idx[k];
        if (!d.v[i]) continue;
        const vh = (d.v[i] / volMax) * volH;
        const up = d.o && d.o[i] != null ? d.c[i] >= d.o[i] : true;
        ctx.fillStyle = up ? "rgba(0,217,100,.35)" : "rgba(255,59,48,.35)";
        ctx.fillRect(xAt(k) - bw / 2, vTop + (volH - vh), bw, vh);
      }
    }

    // price pane
    if (this.mode === "candle") {
      const bw = Math.max(1.5, (plotW / idx.length) * 0.65);
      for (let k = 0; k < idx.length; k++) {
        const i = idx[k];
        const o = d.o[i] ?? d.c[i];
        const c = d.c[i];
        const h = d.h[i] ?? Math.max(o, c);
        const l = d.l[i] ?? Math.min(o, c);
        const x = xAt(k);
        const up = c >= o;
        ctx.strokeStyle = ctx.fillStyle = up ? COL.up : COL.down;
        ctx.beginPath();
        ctx.moveTo(x, yAt(h));
        ctx.lineTo(x, yAt(l));
        ctx.stroke();
        const yo = yAt(o);
        const yc = yAt(c);
        ctx.fillRect(x - bw / 2, Math.min(yo, yc), bw, Math.max(1, Math.abs(yc - yo)));
      }
    } else {
      // area fill
      const grad = ctx.createLinearGradient(0, 0, 0, priceH);
      grad.addColorStop(0, COL.fillTop);
      grad.addColorStop(1, COL.fillBot);
      ctx.beginPath();
      ctx.moveTo(xAt(0), yAt(d.c[idx[0]]));
      for (let k = 1; k < idx.length; k++) ctx.lineTo(xAt(k), yAt(d.c[idx[k]]));
      ctx.lineTo(xAt(idx.length - 1), priceH);
      ctx.lineTo(xAt(0), priceH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      // line
      ctx.beginPath();
      ctx.moveTo(xAt(0), yAt(d.c[idx[0]]));
      for (let k = 1; k < idx.length; k++) ctx.lineTo(xAt(k), yAt(d.c[idx[k]]));
      ctx.strokeStyle = COL.line;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // last price tag
    const last = d.c[idx[idx.length - 1]];
    const ref = d.prevClose != null ? d.prevClose : d.c[idx[0]];
    const lastY = yAt(last);
    const upNow = last >= ref;
    ctx.fillStyle = upNow ? COL.lastUp : COL.lastDown;
    ctx.fillRect(plotW, lastY - 8, padR, 14);
    ctx.fillStyle = "#000";
    ctx.font = "bold 10px monospace";
    ctx.fillText(fmtAxis(last), plotW + 4, lastY + 3);
    ctx.font = "10px monospace";

    // crosshair
    if (this.cross && this.cross.x < plotW && this.cross.y < cssH - padB) {
      const k = Math.max(
        0,
        Math.min(idx.length - 1, Math.round((this.cross.x / plotW) * (idx.length - 1)))
      );
      const i = idx[k];
      const x = xAt(k);
      ctx.strokeStyle = COL.cross;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, cssH - padB);
      ctx.moveTo(0, this.cross.y + 0.5);
      ctx.lineTo(plotW, this.cross.y + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      const ts = d.t[i] * 1000;
      const parts = [
        d.intraday ? `${dateLbl(ts)} ${timeLbl(ts)}` : dateLbl(ts),
        `C ${fmtAxis(d.c[i])}`,
      ];
      if (this.mode === "candle" && d.o[i] != null) {
        parts.splice(1, 0, `O ${fmtAxis(d.o[i])}`, `H ${fmtAxis(d.h[i])}`, `L ${fmtAxis(d.l[i])}`);
      }
      if (d.v && d.v[i]) parts.push(`V ${fmtVol(d.v[i])}`);
      const text = parts.join("  ");
      ctx.font = "11px monospace";
      const tw = ctx.measureText(text).width + 12;
      const bx = Math.min(Math.max(4, x - tw / 2), plotW - tw - 4);
      ctx.fillStyle = "rgba(10,10,10,.92)";
      ctx.fillRect(bx, 4, tw, 18);
      ctx.strokeStyle = "#444";
      ctx.strokeRect(bx + 0.5, 4.5, tw, 18);
      ctx.fillStyle = COL.text;
      ctx.fillText(text, bx + 6, 17);
    }
  }
}

function fmtAxis(p) {
  const a = Math.abs(p);
  if (a >= 10000) return Math.round(p).toLocaleString("en-US");
  if (a >= 100) return p.toFixed(1);
  if (a >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

function fmtVol(v) {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(0) + "K";
  return String(v);
}

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function dateLbl(ts) {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}${MONTHS[d.getMonth()]}${String(d.getFullYear()).slice(2)}`;
}

function timeLbl(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
