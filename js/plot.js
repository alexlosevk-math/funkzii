/* Plot — координатная плоскость на canvas.
   var p = new Plot(container, { x: [-10, 10], y: [-7, 7], pan: true, zoom: true });
   p.layers = [ { type: "fn", f: fn, color: "#d18f00" }, { type: "point", x: 1, y: 2 } ];
   p.draw();
   Типы слоёв: fn, point, hline, vline, segment, region, label, custom.
   Точку с draggable: true можно таскать: onDrag(x, y) получает мировые координаты. */
(function () {
  "use strict";

  var COLORS = {
    bg: "#ffffff", grid: "rgba(29, 32, 51, 0.05)", grid2: "rgba(29, 32, 51, 0.11)",
    axis: "rgba(29, 32, 51, 0.55)", text: "rgba(29, 32, 51, 0.55)"
  };
  var PALETTE = ["#d18f00", "#0a8bd0", "#e23468", "#17a34a", "#7a55f0", "#ec7a0c"];

  function niceStep(raw) {
    var p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }
  function fmtNum(v, step) {
    var d = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
    var s = v.toFixed(Math.min(d, 4));
    return s.replace("-", "−").replace(".", ",");
  }

  function Plot(container, opts) {
    opts = opts || {};
    this.opts = opts;
    this.el = container;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "plot-canvas";
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.layers = [];
    this.home = { x: opts.x || [-10, 10], y: opts.y || [-7, 7] };
    this.w = 0; this.h = 0;
    this.labels = opts.labels !== false;
    this.resize();
    this.fit(this.home.x, this.home.y);
    var self = this;
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        var c = self.center();
        self.resize(); self.fitKeep(c); self.draw();
      }).observe(container);
    }
    this.bindPointer();
  }

  Plot.PALETTE = PALETTE;
  Plot.COLORS = COLORS;

  Plot.prototype.resize = function () {
    var r = this.el.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    this.w = Math.max(50, r.width); this.h = Math.max(50, r.height);
    this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
    this.canvas.style.width = this.w + "px"; this.canvas.style.height = this.h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  // Масштаб одинаковый по осям: клетка — квадрат
  Plot.prototype.fit = function (xr, yr) {
    this.sx = Math.min(this.w / (xr[1] - xr[0]), this.h / (yr[1] - yr[0]));
    this.cx = (xr[0] + xr[1]) / 2; this.cy = (yr[0] + yr[1]) / 2;
    this.fitRanges = [xr, yr];
  };
  Plot.prototype.center = function () { return { cx: this.cx, cy: this.cy }; };
  Plot.prototype.fitKeep = function (c) {
    var xr = this.fitRanges[0], yr = this.fitRanges[1];
    var span = (xr[1] - xr[0]) / (this.userZoom || 1), spanY = (yr[1] - yr[0]) / (this.userZoom || 1);
    this.sx = Math.min(this.w / span, this.h / spanY);
    this.cx = c.cx; this.cy = c.cy;
  };
  Plot.prototype.reset = function () { this.userZoom = 1; this.fit(this.home.x, this.home.y); this.draw(); };
  Plot.prototype.setView = function (xr, yr) { this.home = { x: xr, y: yr }; this.userZoom = 1; this.fit(xr, yr); this.draw(); };

  Plot.prototype.X = function (x) { return this.w / 2 + (x - this.cx) * this.sx; };
  Plot.prototype.Y = function (y) { return this.h / 2 - (y - this.cy) * this.sx; };
  Plot.prototype.wx = function (px) { return this.cx + (px - this.w / 2) / this.sx; };
  Plot.prototype.wy = function (py) { return this.cy - (py - this.h / 2) / this.sx; };
  Plot.prototype.xmin = function () { return this.wx(0); };
  Plot.prototype.xmax = function () { return this.wx(this.w); };
  Plot.prototype.ymin = function () { return this.wy(this.h); };
  Plot.prototype.ymax = function () { return this.wy(0); };

  Plot.prototype.draw = function () {
    if (this._raf) return;
    var self = this;
    this._raf = requestAnimationFrame(function () { self._raf = 0; self.render(); });
  };

  Plot.prototype.render = function () {
    var c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);
    c.fillStyle = COLORS.bg; c.fillRect(0, 0, this.w, this.h);
    if (this.opts.grid !== false) this.drawGrid();
    var self = this;
    this.layers.forEach(function (L, i) {
      if (!L || L.hidden) return;
      c.save();
      try { self["draw_" + L.type](L, i); } catch (e) { console.warn(e); }
      c.restore();
    });
  };

  Plot.prototype.drawGrid = function () {
    var c = this.ctx, step = niceStep(60 / this.sx), minor = step / (step / niceStep(15 / this.sx) >= 4 ? 5 : 2);
    if (this.opts.unitGrid && this.sx >= 14) { minor = 1; step = Math.max(1, step); }
    var x0 = this.xmin(), x1 = this.xmax(), y0 = this.ymin(), y1 = this.ymax(), v;
    c.lineWidth = 1;
    c.strokeStyle = COLORS.grid; c.beginPath();
    for (v = Math.ceil(x0 / minor) * minor; v <= x1; v += minor) { var px = Math.round(this.X(v)) + 0.5; c.moveTo(px, 0); c.lineTo(px, this.h); }
    for (v = Math.ceil(y0 / minor) * minor; v <= y1; v += minor) { var py = Math.round(this.Y(v)) + 0.5; c.moveTo(0, py); c.lineTo(this.w, py); }
    c.stroke();
    c.strokeStyle = COLORS.grid2; c.beginPath();
    for (v = Math.ceil(x0 / step) * step; v <= x1; v += step) { px = Math.round(this.X(v)) + 0.5; c.moveTo(px, 0); c.lineTo(px, this.h); }
    for (v = Math.ceil(y0 / step) * step; v <= y1; v += step) { py = Math.round(this.Y(v)) + 0.5; c.moveTo(0, py); c.lineTo(this.w, py); }
    c.stroke();
    // оси со стрелками
    var ax = Math.round(this.X(0)) + 0.5, ay = Math.round(this.Y(0)) + 0.5;
    c.strokeStyle = COLORS.axis; c.fillStyle = COLORS.axis; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, ay); c.lineTo(this.w, ay); c.moveTo(ax, 0); c.lineTo(ax, this.h); c.stroke();
    c.beginPath(); c.moveTo(this.w, ay); c.lineTo(this.w - 9, ay - 4); c.lineTo(this.w - 9, ay + 4); c.fill();
    c.beginPath(); c.moveTo(ax, 0); c.lineTo(ax - 4, 9); c.lineTo(ax + 4, 9); c.fill();
    if (!this.labels) return;
    c.font = "12px Manrope, system-ui, sans-serif"; c.fillStyle = COLORS.text;
    var ly = Math.min(Math.max(ay + 15, 14), this.h - 4);
    c.textAlign = "center";
    for (v = Math.ceil(x0 / step) * step; v <= x1; v += step) {
      if (Math.abs(v) < step / 2) continue;
      c.fillText(fmtNum(v, step), this.X(v), ly);
    }
    c.textAlign = "right";
    var lx = Math.min(Math.max(ax - 6, 30), this.w - 4);
    for (v = Math.ceil(y0 / step) * step; v <= y1; v += step) {
      if (Math.abs(v) < step / 2) continue;
      c.fillText(fmtNum(v, step), lx, this.Y(v) + 4);
    }
    c.fillText("0", ax - 5, ay + 15);
    c.font = "italic 15px Georgia, serif"; c.fillStyle = "rgba(29, 32, 51, 0.8)";
    c.textAlign = "right"; c.fillText("x", this.w - 6, ay - 8);
    c.textAlign = "left"; c.fillText("y", ax + 8, 14);
  };

  /* Проход по графику: callback получает куски-полилинии без разрывов */
  Plot.prototype.trace = function (f, a, b, cb) {
    var x0 = Math.max(this.xmin(), a !== undefined ? a : -Infinity);
    var x1 = Math.min(this.xmax(), b !== undefined ? b : Infinity);
    if (x1 <= x0) return;
    var n = Math.ceil((this.X(x1) - this.X(x0)) * 2) + 1, piece = [], prev = null;
    var span = (this.ymax() - this.ymin());
    for (var i = 0; i <= n; i++) {
      var x = x0 + (x1 - x0) * i / n, y = f(x);
      if (isNaN(y)) { if (piece.length) cb(piece); piece = []; prev = null; continue; }
      if (prev !== null && Math.abs(y - prev) > span * 1.5) {
        // скачок (асимптота): проверим середину, чтобы не рвать крутые, но гладкие куски
        var ym = f(x - (x1 - x0) / n / 2);
        if (isNaN(ym) || Math.abs(ym - prev) > Math.abs(y - prev) * 0.9 || Math.abs(ym - y) > Math.abs(y - prev) * 0.9) {
          if (piece.length) cb(piece); piece = [];
        }
      }
      piece.push([x, y]); prev = y;
    }
    if (piece.length) cb(piece);
  };

  Plot.prototype.clampY = function (y) {
    var lim = 4 * this.h;
    var py = this.Y(y);
    return py < -lim ? -lim : py > lim ? lim : py;
  };

  Plot.prototype.draw_fn = function (L, i) {
    var c = this.ctx, self = this;
    c.strokeStyle = L.color || PALETTE[i % PALETTE.length];
    c.lineWidth = L.width || 3; c.lineJoin = "round"; c.lineCap = "round";
    if (L.dash) c.setLineDash(L.dash);
    if (L.alpha !== undefined) c.globalAlpha = L.alpha;
    if (L.glow) { c.shadowColor = c.strokeStyle; c.shadowBlur = 12; }
    var a = L.domain ? L.domain[0] : undefined, b = L.domain ? L.domain[1] : undefined;
    this.trace(L.f, a, b, function (piece) {
      c.beginPath();
      piece.forEach(function (p, k) {
        var X = self.X(p[0]), Y = self.clampY(p[1]);
        if (k) c.lineTo(X, Y); else c.moveTo(X, Y);
      });
      c.stroke();
    });
    // выколотые концы области
    if (L.ends) L.ends.forEach(function (e) {
      var y = e.y !== undefined ? e.y : L.f(e.x);
      self.dot(e.x, y, 5, e.open ? null : c.strokeStyle, c.strokeStyle);
    });
  };

  /* Заливка между графиком и осью x там, где where(x, y) истинно */
  Plot.prototype.draw_region = function (L) {
    var c = this.ctx, self = this;
    c.fillStyle = L.color || "rgba(23, 163, 74, 0.25)";
    this.trace(L.f, L.from, L.to, function (piece) {
      var run = [];
      function flush() {
        if (run.length > 1) {
          c.beginPath(); c.moveTo(self.X(run[0][0]), self.Y(0));
          run.forEach(function (p) { c.lineTo(self.X(p[0]), self.clampY(L.toY ? L.toY(p[0]) : p[1])); });
          c.lineTo(self.X(run[run.length - 1][0]), self.Y(0)); c.closePath(); c.fill();
        }
        run = [];
      }
      piece.forEach(function (p) { if (L.where(p[0], p[1])) run.push(p); else flush(); });
      flush();
    });
  };

  Plot.prototype.dot = function (x, y, r, fill, stroke) {
    var c = this.ctx;
    c.beginPath(); c.arc(this.X(x), this.Y(y), r, 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); } else { c.fillStyle = COLORS.bg; c.fill(); }
    if (stroke) { c.lineWidth = 2.5; c.strokeStyle = stroke; c.stroke(); }
  };

  Plot.prototype.draw_point = function (L) {
    var c = this.ctx, r = L.r || (L.draggable ? 8 : 6);
    if (L.draggable) {
      c.beginPath(); c.arc(this.X(L.x), this.Y(L.y), r + 7, 0, Math.PI * 2);
      c.fillStyle = "rgba(29, 32, 51, 0.08)"; c.fill();
    }
    this.dot(L.x, L.y, r, L.open ? null : (L.color || "#1d2033"), L.stroke || L.color || "#1d2033");
    if (L.label) this.text(L.label, L.x, L.y, { color: L.labelColor || L.color, dx: L.labelDx !== undefined ? L.labelDx : 10, dy: L.labelDy !== undefined ? L.labelDy : -10, align: L.labelAlign, size: L.size });
  };

  Plot.prototype.text = function (s, x, y, o) {
    o = o || {};
    var c = this.ctx;
    c.font = (o.weight || "700") + " " + (o.size || 14) + "px Manrope, system-ui, sans-serif";
    c.textAlign = o.align || "left";
    var X = this.X(x) + (o.dx || 0), Y = this.Y(y) + (o.dy || 0);
    c.lineWidth = 4; c.strokeStyle = COLORS.bg; c.strokeText(s, X, Y);
    c.fillStyle = o.color || "#1d2033"; c.fillText(s, X, Y);
  };
  Plot.prototype.draw_label = function (L) { this.text(L.text, L.x, L.y, L); };

  Plot.prototype.draw_hline = function (L) {
    var c = this.ctx, y = Math.round(this.Y(L.y)) + 0.5;
    c.strokeStyle = L.color || "#1d2033"; c.lineWidth = L.width || 2; if (L.dash !== false) c.setLineDash(L.dash || [7, 6]);
    c.beginPath(); c.moveTo(0, y); c.lineTo(this.w, y); c.stroke();
  };
  Plot.prototype.draw_vline = function (L) {
    var c = this.ctx, x = Math.round(this.X(L.x)) + 0.5;
    c.strokeStyle = L.color || "#1d2033"; c.lineWidth = L.width || 2; if (L.dash !== false) c.setLineDash(L.dash || [7, 6]);
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x, this.h); c.stroke();
  };
  Plot.prototype.draw_segment = function (L) {
    var c = this.ctx;
    c.strokeStyle = L.color || "#1d2033"; c.lineWidth = L.width || 3; c.lineCap = "round";
    if (L.dash) c.setLineDash(L.dash);
    c.beginPath(); c.moveTo(this.X(L.x1), this.Y(L.y1)); c.lineTo(this.X(L.x2), this.Y(L.y2)); c.stroke();
    if (L.arrow) {
      var a = Math.atan2(this.Y(L.y2) - this.Y(L.y1), this.X(L.x2) - this.X(L.x1)), X = this.X(L.x2), Y = this.Y(L.y2);
      c.setLineDash([]); c.fillStyle = c.strokeStyle; c.beginPath();
      c.moveTo(X, Y); c.lineTo(X - 12 * Math.cos(a - 0.45), Y - 12 * Math.sin(a - 0.45));
      c.lineTo(X - 12 * Math.cos(a + 0.45), Y - 12 * Math.sin(a + 0.45)); c.fill();
    }
  };
  Plot.prototype.draw_custom = function (L) { L.draw(this.ctx, this); };

  /* ---------- мышь / палец ---------- */
  Plot.prototype.bindPointer = function () {
    var self = this, cv = this.canvas, drag = null, pinch = {};
    cv.style.touchAction = (this.opts.pan || this.hasDraggable()) ? "none" : "pan-y";
    function pos(e) { var r = cv.getBoundingClientRect(); return { px: e.clientX - r.left, py: e.clientY - r.top }; }
    function hit(p) {
      for (var i = self.layers.length - 1; i >= 0; i--) {
        var L = self.layers[i];
        if (L && L.draggable && !L.hidden && Math.hypot(self.X(L.x) - p.px, self.Y(L.y) - p.py) < 22) return L;
      }
      return null;
    }
    cv.addEventListener("pointerdown", function (e) {
      var p = pos(e);
      pinch[e.pointerId] = p;
      if (Object.keys(pinch).length === 2) { drag = { kind: "pinch", d: null }; return; }
      var L = hit(p);
      cv.setPointerCapture(e.pointerId);
      if (L) drag = { kind: "point", L: L };
      else if (self.opts.pan) drag = { kind: "pan", px: p.px, py: p.py, cx: self.cx, cy: self.cy };
      if (self.opts.onDown) self.opts.onDown(self.wx(p.px), self.wy(p.py), e);
    });
    cv.addEventListener("pointermove", function (e) {
      var p = pos(e);
      if (pinch[e.pointerId]) pinch[e.pointerId] = p;
      if (drag && drag.kind === "pinch") {
        var ids = Object.keys(pinch); if (ids.length < 2) return;
        var a = pinch[ids[0]], b = pinch[ids[1]], d = Math.hypot(a.px - b.px, a.py - b.py);
        if (drag.d) self.zoomAt((a.px + b.px) / 2, (a.py + b.py) / 2, d / drag.d);
        drag.d = d; return;
      }
      if (drag && drag.kind === "point") {
        var x = self.wx(p.px), y = self.wy(p.py), L = drag.L;
        if (L.snap) { x = Math.round(x / L.snap) * L.snap; y = Math.round(y / L.snap) * L.snap; }
        if (L.constrain) { var cc = L.constrain(x, y); x = cc[0]; y = cc[1]; }
        L.x = x; L.y = y;
        if (L.onDrag) L.onDrag(x, y);
        self.draw();
      } else if (drag && drag.kind === "pan") {
        self.cx = drag.cx - (p.px - drag.px) / self.sx;
        self.cy = drag.cy + (p.py - drag.py) / self.sx;
        self.draw();
      } else {
        cv.style.cursor = hit(p) ? "grab" : (self.opts.pan ? "move" : "crosshair");
      }
      if (self.opts.onMove) self.opts.onMove(self.wx(p.px), self.wy(p.py), e);
    });
    function up(e) {
      delete pinch[e.pointerId];
      if (drag && drag.kind === "point" && drag.L.onDrop) drag.L.onDrop(drag.L.x, drag.L.y);
      drag = null;
    }
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    cv.addEventListener("pointerleave", function (e) { if (self.opts.onLeave) self.opts.onLeave(e); });
    if (this.opts.zoom) {
      cv.addEventListener("wheel", function (e) {
        e.preventDefault();
        var p = pos(e);
        self.zoomAt(p.px, p.py, Math.exp(-e.deltaY * 0.0015));
      }, { passive: false });
    }
  };
  Plot.prototype.hasDraggable = function () { return !!this.opts.draggable; };
  Plot.prototype.zoomAt = function (px, py, k) {
    var wx = this.wx(px), wy = this.wy(py);
    this.sx = Math.min(400, Math.max(4, this.sx * k));
    this.userZoom = (this.userZoom || 1) * k;
    this.cx = wx - (px - this.w / 2) / this.sx;
    this.cy = wy + (py - this.h / 2) / this.sx;
    this.draw();
  };

  window.Plot = Plot;
})();
