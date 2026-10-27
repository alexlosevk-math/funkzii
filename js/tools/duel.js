/* Дуэль графиков — по мотивам Graphwar.
   Снаряд летит из солдата по графику y = f(x) + сдвиг: сдвиг подбирается сам,
   чтобы график начинался ровно в солдате.
   Движок (DuelEngine) без DOM — его можно гонять в node. */
(function () {
  "use strict";

  var W = 25, H = 15;              // поле: x ∈ [−25; 25], y ∈ [−15; 15]
  var R = 0.9;                      // радиус солдата
  var HOLE = 1.3;                   // радиус дыры в скале
  var STEP = 0.05;                  // шаг по длине дуги

  /* ---------- движок ---------- */
  function inRock(world, x, y) {
    for (var i = 0; i < world.rocks.length; i++) {
      var r = world.rocks[i];
      if ((x - r.x) * (x - r.x) + (y - r.y) * (y - r.y) < r.r * r.r) {
        for (var j = 0; j < world.holes.length; j++) {
          var h = world.holes[j];
          if ((x - h.x) * (x - h.x) + (y - h.y) * (y - h.y) < h.r * h.r) return false;
        }
        return true;
      }
    }
    return false;
  }

  /* Траектория выстрела. Возвращает точки, причину остановки и попадания. */
  function simulate(world, shooter, f) {
    var x0 = shooter.x, y0 = shooter.y, f0 = f(x0);
    if (isNaN(f0)) return { error: "undef" };
    var shift = y0 - f0, dir = shooter.side === 0 ? 1 : -1;
    var F = function (x) { return f(x) + shift; };
    var pts = [[x0, y0]], hits = [], near = {}, x = x0, y = y0, h = STEP, end = "out";
    world.soldiers.forEach(function (s) { near[s.id] = Infinity; });
    for (var it = 0; it < 30000; it++) {
      var nx = x + dir * h, ny = F(nx), d = Math.hypot(nx - x, ny - y);
      while ((isNaN(ny) || d > STEP * 1.2) && h > 1e-5) {
        h /= 2; nx = x + dir * h; ny = F(nx); d = Math.hypot(nx - x, ny - y);
      }
      if (isNaN(ny) || d > 0.6) { end = "break"; break; }
      x = nx; y = ny;
      if (d < STEP * 0.5) h = Math.min(STEP, h * 2);
      if (Math.abs(x) > W || Math.abs(y) > H) {
        pts.push([Math.max(-W, Math.min(W, x)), Math.max(-H, Math.min(H, y))]);
        end = "out"; break;
      }
      pts.push([x, y]);
      for (var k = 0; k < world.soldiers.length; k++) {
        var s = world.soldiers[k];
        if (!s.alive || s === shooter) continue;
        var dist = Math.hypot(x - s.x, y - s.y);
        if (dist < near[s.id]) near[s.id] = dist;
        if (dist < R && hits.every(function (q) { return q.s !== s; })) hits.push({ s: s, i: pts.length - 1 });
      }
      if (inRock(world, x, y)) { end = "rock"; break; }
    }
    return { pts: pts, end: end, hits: hits, shift: shift, near: near, last: pts[pts.length - 1] };
  }

  /* Мягкая проверка семейства функций */
  function family(kind, f, src) {
    if (!kind) return true;
    var s = String(src).toLowerCase();
    if (kind === "abs") return /\||abs/.test(s);
    if (kind === "sqrt") return /sqrt|√|корень/.test(s);
    if (kind === "hyper") return /\/[^/]*x/.test(s);
    var v = [];
    for (var x = -6; x <= 6; x++) { var y = f(x); if (isNaN(y)) return false; v.push(y); }
    var d2 = [], d3 = [];
    for (var i = 0; i + 2 < v.length; i++) d2.push(v[i + 2] - 2 * v[i + 1] + v[i]);
    for (i = 0; i + 1 < d2.length; i++) d3.push(d2[i + 1] - d2[i]);
    var zero = function (a) { return a.every(function (q) { return Math.abs(q) < 1e-7; }); };
    if (kind === "const") return v.every(function (q) { return Math.abs(q - v[0]) < 1e-9; });
    if (kind === "linear") return zero(d2);
    if (kind === "quad" || kind === "quadUp" || kind === "quadDown") {
      if (!zero(d3) || zero(d2)) return false;
      return kind === "quad" || (kind === "quadUp" ? d2[0] > 0 : d2[0] < 0);
    }
    return true;
  }

  /* ---------- бот ----------
     Только функции 9 класса. Каждая формула проходит через солдата бота
     (сдвиг почти нулевой), коэффициенты «круглые» — школьник может прочитать,
     как бот целился. */
  function rnd(v, d) { var p = Math.pow(10, d); return Math.round(v * p) / p; }
  function sgnTerm(v, body, first) {
    // слагаемое со знаком: +0.5x, −x, +3; нулевые выкидываем, «1x» → «x»
    if (v === 0) return "";
    var a = Math.abs(v), coef = body && a === 1 ? "" : String(a);
    var sign = v < 0 ? (first ? "-" : " - ") : (first ? "" : " + ");
    return sign + coef + body;
  }
  function join(terms) {
    var out = "";
    terms.forEach(function (t) { out += sgnTerm(t[0], t[1], !out); });
    return out || "0";
  }
  function shiftX(m) { m = rnd(m, 1); return m === 0 ? "x" : m > 0 ? "(x - " + m + ")" : "(x + " + (-m) + ")"; }

  var A_PAR = [0.02, 0.03, 0.04, 0.05, 0.1, 0.15, 0.2, 0.25];
  var A_ABS = [0.25, 0.4, 0.5, 0.6, 0.75, 1, 1.5, 2];

  function candidates(s, t) {
    var dx = t.x - s.x, dy = t.y - s.y, out = [], lo = Math.min(s.x, t.x), hi = Math.max(s.x, t.x);
    // прямая kx + b
    var k = rnd(dy / dx, 2);
    out.push(join([[k, "x"], [rnd(s.y - k * s.x, 1), ""]]));
    // парабола a(x − m)² + n: m подбираем, чтобы попасть в цель
    A_PAR.forEach(function (a0) {
      [a0, -a0].forEach(function (a) {
        var m = rnd((t.x + s.x - dy / (a * dx)) / 2, 1);
        if (m < -W || m > W) return;
        var n = rnd(s.y - a * (s.x - m) * (s.x - m), 1);
        out.push(join([[a, shiftX(m) === "x" ? "x^2" : shiftX(m) + "^2"], [n, ""]]));
      });
    });
    // уголок a|x − m| + n, вершина между солдатом и целью
    A_ABS.forEach(function (a0) {
      [a0, -a0].forEach(function (a) {
        var m = s.x < t.x ? (t.x + s.x - dy / a) / 2 : (dy / a + t.x + s.x) / 2;
        m = rnd(m, 1);
        if (m <= lo || m >= hi) return;
        var n = rnd(s.y - a * Math.abs(s.x - m), 1);
        var inner = m === 0 ? "|x|" : m > 0 ? "|x - " + m + "|" : "|x + " + (-m) + "|";
        out.push(join([[a, inner], [n, ""]]));
      });
    });
    // корень: растёт от солдата в сторону цели
    var kr = rnd(dy / Math.sqrt(Math.abs(dx)), 2);
    if (kr) {
      var root = dx > 0 ? (s.x === 0 ? "sqrt(x)" : s.x > 0 ? "sqrt(x - " + s.x + ")" : "sqrt(x + " + (-s.x) + ")")
                        : (s.x === 0 ? "sqrt(-x)" : "sqrt(" + s.x + " - x)");
      out.push(join([[kr, root], [rnd(s.y, 1), ""]]));
    }
    return out;
  }

  /* Выбор хода бота: miss — вероятность намеренно промахнуться */
  function botAim(world, shooter, miss, rnd01) {
    rnd01 = rnd01 || Math.random;
    var enemies = world.soldiers.filter(function (q) { return q.alive && q.side !== shooter.side; });
    function test(src) {
      var r = simulate(world, shooter, Formula.compile(src));
      if (r.error) return null;
      return {
        src: src,
        friendly: r.hits.some(function (q) { return q.s.side === shooter.side; }),
        kills: r.hits.filter(function (q) { return q.s.side !== shooter.side; }).length
      };
    }
    var good = [];
    enemies.forEach(function (t) {
      candidates(shooter, t).forEach(function (src) {
        var r = test(src);
        if (r && r.kills && !r.friendly) good.push(r);
      });
    });
    if (good.length && rnd01() >= miss) {
      var best = Math.max.apply(null, good.map(function (g) { return g.kills; }));
      var top = good.filter(function (g) { return g.kills === best; });
      return top[Math.floor(rnd01() * top.length)].src;
    }
    // промах «по-человечески»: целимся в точку на 2–4 клетки выше или ниже врага
    var near = [];
    enemies.forEach(function (t) {
      [-4, -3, -2, 2, 3, 4].forEach(function (off) {
        candidates(shooter, { x: t.x, y: t.y + off }).forEach(function (src) {
          var r = test(src);
          if (r && !r.kills && !r.friendly) near.push(src);
        });
      });
    });
    if (near.length) return near[Math.floor(rnd01() * near.length)];
    return good.length ? good[0].src : "0";
  }

  /* ---------- миссии ---------- */
  var MISSIONS = [
    { title: "Прямой наводкой", fam: "const", famText: "только y = число",
      text: "Враг стоит на той же высоте, что и ты. Выстрели горизонтально.",
      hint: "Напиши просто <b>0</b>. График y = 0 — горизонтальная прямая, а сдвиг сам поднимет её до твоего солдата.",
      me: [-18, -3], foes: [[15, -3]], rocks: [[0, 6, 4], [-2, -11, 3]], sol: "0" },
    { title: "Под углом", fam: "linear", famText: "только прямые kx + b",
      text: "Враг выше тебя. Горизонтально не выйдет — нужна наклонная прямая.",
      hint: "Наклон k = (на сколько поднялись) / (на сколько сдвинулись вправо). Наведи мышь на врага и посчитай: Δy / Δx.",
      me: [-18, -8], foes: [[14, 8]], rocks: [[-4, 8, 4], [4, -8, 4]], sol: "0.5x" },
    { title: "Мимо скалы", fam: "linear", famText: "только прямые kx + b",
      text: "Скала прямо на линии горизонта. Подбери наклон так, чтобы пройти над ней и попасть во врага.",
      hint: "Δx = 40, Δy = 10. Значит, k = 10 / 40.",
      me: [-20, 0], foes: [[20, 10]], rocks: [[0, -1, 4], [12, -6, 4]], sol: "0.25x" },
    { title: "Ложка", fam: "quadUp", famText: "только параболы, ветви вверх",
      text: "Над вами висит скала. Пройди под ней дугой — параболой с ветвями вверх.",
      hint: "Ты и враг стоите симметрично относительно x = 0. Значит, вершина параболы — на оси y. Попробуй <b>0.05x^2</b>.",
      me: [-18, 10], foes: [[18, 10]], rocks: [[0, 10, 6]], sol: "0.05x^2" },
    { title: "Через гору", fam: "quadDown", famText: "только параболы, ветви вниз",
      text: "Между вами гора. Перекинь снаряд через неё — ветви параболы вниз.",
      hint: "Ты в x = −20, враг в x = 16. Середина — x = −2, там и будет вершина: −0.05(x + 2)^2.",
      me: [-20, -12], foes: [[16, -12]], rocks: [[-2, -12, 7]], sol: "-0.05(x+2)^2" },
    { title: "Уголок", fam: "abs", famText: "нужен модуль |…|",
      text: "Сверху скала. Нырни под неё уголком — графиком модуля.",
      hint: "Уголок должен быть посередине между тобой (x = −20) и врагом (x = 10), то есть в x = −5. Это |x + 5|. Наклон подбери: 0.6|x + 5|.",
      me: [-20, 8], foes: [[10, 8]], rocks: [[-5, 10, 6]], sol: "0.6|x+5|" },
    { title: "Горка", fam: "hyper", famText: "нужна гипербола k / x",
      text: "Ты стоишь у самой оси. Скатись по гиперболе — прямая упрётся в скалу.",
      hint: "y = k/x + b. От x = 2 до x = 20 высота падает на 18: k·(1/2 − 1/20) = 18, отсюда k = 40.",
      me: [2, 12], foes: [[20, -6]], rocks: [[11, 4, 3.5]], sol: "40/x" },
    { title: "Двое на одной линии", fam: "", famText: "любая функция",
      text: "Два врага. Убери обоих одним выстрелом — так звёзд больше.",
      hint: "Проверь: вдруг оба стоят на одной прямой с тобой? Посчитай наклон до каждого.",
      me: [-20, -12], foes: [[-4, -4], [16, 6]], rocks: [[0, 8, 4], [6, -9, 4]], sol: "0.5x" },
    { title: "Корень из засады", fam: "sqrt", famText: "нужен корень √",
      text: "Сначала резко вверх, потом полого. Так летит график корня.",
      hint: "√(x + 20) начинается ровно у тебя (x = −20). В точке врага x + 20 = 36, √36 = 6, а подняться надо на 12. Значит, множитель 2.",
      me: [-20, -12], foes: [[16, 0]], rocks: [[-2, -7.5, 2.5]], sol: "2sqrt(x+20)" },
    { title: "Финал", fam: "", famText: "любая функция",
      text: "Два врага, скалы, никаких ограничений. Покажи всё, чему научился.",
      hint: "Можно двумя прямыми за два выстрела. А можно одной параболой через три точки — это на три звезды.",
      me: [-22, -2], foes: [[0, -10], [20, 8]], rocks: [[-11, -1, 3], [10, 4, 3], [-6, 9, 4]], sol: "0.0301x^2+0.2984x" }
  ];

  function missionWorld(m) {
    var w = { soldiers: [], rocks: [], holes: [] };
    w.soldiers.push({ id: "me", side: 0, x: m.me[0], y: m.me[1], alive: true });
    m.foes.forEach(function (p, i) { w.soldiers.push({ id: "t" + i, side: 1, x: p[0], y: p[1], alive: true }); });
    m.rocks.forEach(function (r) { w.rocks.push({ x: r[0], y: r[1], r: r[2] }); });
    return w;
  }

  function randomWorld(rnd) {
    rnd = rnd || Math.random;
    var ri = function (a, b) { return a + Math.floor(rnd() * (b - a + 1)); };
    var w = { soldiers: [], rocks: [], holes: [] }, names = ["А", "Б", "В", "Г"];
    [0, 1].forEach(function (side) {
      for (var n = 0; n < 2; n++) {
        var x, y, tries = 0;
        do {
          x = side === 0 ? ri(-23, -10) : ri(10, 23); y = ri(-12, 12); tries++;
        } while (tries < 50 && w.soldiers.some(function (s) { return Math.hypot(s.x - x, s.y - y) < 6; }));
        w.soldiers.push({ id: "s" + side + n, name: names[side * 2 + n], side: side, x: x, y: y, alive: true });
      }
    });
    var count = ri(6, 9), guard = 0;
    while (w.rocks.length < count && guard++ < 400) {
      var r = { x: ri(-15, 15) + rnd(), y: ri(-13, 13) + rnd(), r: 2 + rnd() * 3 };
      if (w.soldiers.some(function (s) { return Math.hypot(s.x - r.x, s.y - r.y) < r.r + 2.5; })) continue;
      w.rocks.push(r);
    }
    return w;
  }

  window.DuelEngine = { simulate: simulate, family: family, botAim: botAim, candidates: candidates,
    missions: MISSIONS, missionWorld: missionWorld, randomWorld: randomWorld, inRock: inRock };

  if (!window.App || !window.UI) return;

  /* ---------- интерфейс ---------- */
  var COL = { 0: "#d18f00", 1: "#e23468" };
  var DIFF = {
    easy: { name: "Лёгкий", miss: 0.55, xp: 30 },
    normal: { name: "Нормальный", miss: 0.3, xp: 50 },
    hard: { name: "Жёсткий", miss: 0.08, xp: 80 }
  };

  App.tool({
    id: "duel", order: 1, icon: "🎯", title: "Дуэль графиков",
    subtitle: "Стреляй функциями: парабола огибает гору, прямая бьёт в упор",
    color: "var(--pink)",
    render: function (root) {
      var h = UI.h;
      var g = { mode: "bot", diff: "normal", world: null, side: 0, idx: [0, 0], busy: false,
        anim: null, trails: {}, preview: null, previewUsed: false, parts: [], hover: null,
        hist: { 0: [], 1: [] }, mission: null, shots: 0, over: false };
      var raf = 0, timer = 0, rockLayer = null, cw = 0, chh = 0, sc = 1, dpr = 1;

      /* --- разметка --- */
      var modeBar = h("div", { class: "btns duel-modes" });
      [["bot", "🤖 Против бота"], ["duo", "👥 Вдвоём"], ["missions", "🗺️ Миссии"]].forEach(function (m) {
        modeBar.appendChild(h("button", { class: "chip", "data-mode": m[0], text: m[1], onclick: function () { setMode(m[0]); } }));
      });
      var diffBar = h("div", { class: "btns duel-diff" }, h("span", { class: "muted", text: "Бот:" }));
      Object.keys(DIFF).forEach(function (k) {
        diffBar.appendChild(h("button", { class: "chip chip--sm", "data-diff": k, text: DIFF[k].name, onclick: function () {
          g.diff = k; newGame();
        } }));
      });
      var missionBox = h("div", { class: "duel-missions" });
      var turnLine = h("div", { class: "duel-turn" });
      var field = h("div", { class: "duel-field" });
      var canvas = h("canvas", { class: "duel-canvas" });
      var readout = h("div", { class: "duel-read" });
      var overlay = h("div", { class: "duel-over", style: "display:none" });
      field.appendChild(canvas); field.appendChild(readout); field.appendChild(overlay);

      var input = h("input", { class: "big-input duel-input", type: "text", autocomplete: "off", spellcheck: "false",
        placeholder: "например, 0.5x или −0.05(x+2)^2",
        onkeydown: function (e) { if (e.key === "Enter") fire(); } });
      var fireBtn = h("button", { class: "btn btn--primary", text: "Огонь! 💥", onclick: function () { fire(); } });
      var tryBtn = h("button", { class: "btn btn--ghost", text: "Примерка", title: "Показать траекторию пунктиром", onclick: function () { tryOn(); } });
      var preview = h("div", { class: "duel-preview" });
      var msg = h("div", { class: "duel-msg" });
      var botLine = h("div", { class: "duel-bot" });
      var histBox = h("div", { class: "duel-hist" });
      input.addEventListener("input", function () {
        var v = input.value.trim(), r = v ? Formula.tryCompile(v) : null;
        preview.innerHTML = !r ? "" : r.error ? '<span class="bad">' + r.error + "</span>" : "y = " + UI.m(v.replace(/^\s*y\s*=/i, ""));
        g.preview = null;
      });

      var controls = h("div", { class: "duel-controls" },
        h("div", { class: "duel-row" }, h("span", { class: "duel-y", text: "y =" }), input, fireBtn, tryBtn),
        preview, botLine, msg, histBox);

      var how = h("details", { class: "duel-how" },
        h("summary", { text: "Как играть" }),
        h("ul", { html:
          "<li><b>Твой солдат — точка старта.</b> Пишешь любую f(x), а игра сама сдвигает график вверх или вниз, чтобы он начинался в солдате. Это тот самый сдвиг y = f(x) + b.</li>" +
          "<li><b>y = 0</b> — выстрел горизонтально. <b>0.5x</b> — вверх под углом, <b>−0.5x</b> — вниз.</li>" +
          "<li>Скала мешает? Перекинь через неё параболу с ветвями вниз: <span class='m'>−0,1(x − a)(x − b)</span>, где a — твой x, b — x врага.</li>" +
          "<li>Наведи мышь (или ткни пальцем) на врага — увидишь его координаты. Дальше чистая математика.</li>" +
          "<li>Каждый удар выбивает в скале ямку. Несколькими выстрелами в одно место можно пробить проход — но проще обойти.</li>" }));

      root.appendChild(h("section", { class: "block duel" },
        modeBar, diffBar, missionBox, turnLine, field, controls, how));

      /* --- координаты --- */
      function X(x) { return (x + W) * sc; }
      function Y(y) { return (H - y) * sc; }

      function resize() {
        dpr = window.devicePixelRatio || 1;
        cw = field.clientWidth; chh = cw * (2 * H) / (2 * W); sc = cw / (2 * W);
        canvas.width = Math.round(cw * dpr); canvas.height = Math.round(chh * dpr);
        canvas.style.width = cw + "px"; canvas.style.height = chh + "px";
        field.style.height = chh + "px";
        buildRocks();
      }

      /* скалы рисуем в отдельный слой: дыры вырезаются destination-out */
      function buildRocks() {
        if (!g.world) return;
        rockLayer = rockLayer || document.createElement("canvas");
        rockLayer.width = canvas.width; rockLayer.height = canvas.height;
        var c = rockLayer.getContext("2d");
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, cw, chh);
        g.world.rocks.forEach(function (r) {
          var gr = c.createRadialGradient(X(r.x) - r.r * sc * 0.3, Y(r.y) - r.r * sc * 0.3, r.r * sc * 0.1, X(r.x), Y(r.y), r.r * sc);
          gr.addColorStop(0, "#c9c3dd"); gr.addColorStop(1, "#9d96b8");
          c.fillStyle = gr; c.beginPath(); c.arc(X(r.x), Y(r.y), r.r * sc, 0, Math.PI * 2); c.fill();
          c.strokeStyle = "rgba(29, 32, 51, 0.12)"; c.lineWidth = 2; c.stroke();
        });
        c.globalCompositeOperation = "destination-out";
        g.world.holes.forEach(function (o) { c.beginPath(); c.arc(X(o.x), Y(o.y), o.r * sc, 0, Math.PI * 2); c.fill(); });
        c.globalCompositeOperation = "source-over";
      }

      /* --- отрисовка --- */
      function render(t) {
        raf = requestAnimationFrame(render);
        if (!cw) return;
        var c = canvas.getContext("2d");
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.fillStyle = "#ffffff"; c.fillRect(0, 0, cw, chh);
        grid(c);
        if (rockLayer) c.drawImage(rockLayer, 0, 0, cw, chh);
        Object.keys(g.trails).forEach(function (side) {
          var tr = g.trails[side]; if (!tr) return;
          path(c, tr, tr.length, COL[side], 0.3, 2);
        });
        if (g.preview) {
          c.setLineDash([6, 6]); path(c, g.preview, g.preview.length, "#1d2033", 0.7, 2); c.setLineDash([]);
        }
        if (g.anim) stepAnim(c);
        soldiers(c, t || 0);
        particles(c);
        hover(c);
      }

      function grid(c) {
        c.lineWidth = 1;
        for (var v = -W; v <= W; v++) {
          c.strokeStyle = v % 5 ? "rgba(29, 32, 51, 0.035)" : "rgba(29, 32, 51, 0.1)";
          c.beginPath(); c.moveTo(Math.round(X(v)) + 0.5, 0); c.lineTo(Math.round(X(v)) + 0.5, chh); c.stroke();
        }
        for (v = -H; v <= H; v++) {
          c.strokeStyle = v % 5 ? "rgba(29, 32, 51, 0.035)" : "rgba(29, 32, 51, 0.1)";
          c.beginPath(); c.moveTo(0, Math.round(Y(v)) + 0.5); c.lineTo(cw, Math.round(Y(v)) + 0.5); c.stroke();
        }
        c.strokeStyle = "rgba(29, 32, 51, 0.45)"; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(0, Y(0)); c.lineTo(cw, Y(0)); c.moveTo(X(0), 0); c.lineTo(X(0), chh); c.stroke();
        c.fillStyle = "rgba(29, 32, 51, 0.45)"; c.font = Math.max(10, Math.round(sc * 0.55)) + "px Manrope, sans-serif";
        c.textAlign = "center";
        for (v = -20; v <= 20; v += 5) if (v) c.fillText(String(v).replace("-", "−"), X(v), Y(0) + sc * 0.9);
        c.textAlign = "right";
        for (v = -10; v <= 10; v += 5) if (v) c.fillText(String(v).replace("-", "−"), X(0) - sc * 0.3, Y(v) + 4);
      }

      function path(c, pts, n, color, alpha, width) {
        if (!pts || n < 2) return;
        c.save(); c.globalAlpha = alpha; c.strokeStyle = color; c.lineWidth = width;
        c.lineJoin = "round"; c.lineCap = "round";
        c.beginPath(); c.moveTo(X(pts[0][0]), Y(pts[0][1]));
        for (var i = 1; i < n; i++) c.lineTo(X(pts[i][0]), Y(pts[i][1]));
        c.stroke(); c.restore();
      }

      function stepAnim(c) {
        var a = g.anim, r = a.res;
        a.i = Math.min(r.pts.length, a.i + 14);
        c.save(); c.shadowColor = COL[a.side]; c.shadowBlur = 14;
        path(c, r.pts, a.i, COL[a.side], 1, 3.5);
        c.restore();
        var head = r.pts[a.i - 1];
        c.fillStyle = "#1d2033"; c.beginPath(); c.arc(X(head[0]), Y(head[1]), Math.max(4, sc * 0.3), 0, Math.PI * 2); c.fill();
        r.hits.forEach(function (q) {
          if (!q.done && q.i < a.i) { q.done = true; q.s.alive = false; boom(q.s.x, q.s.y, COL[q.s.side], 40); }
        });
        if (a.i >= r.pts.length) { g.anim = null; a.done(); }
      }

      function soldiers(c, t) {
        var shooter = current();
        g.world.soldiers.forEach(function (s) {
          var x = X(s.x), y = Y(s.y), rr = R * sc;
          if (!s.alive) {
            c.strokeStyle = "rgba(29, 32, 51, 0.25)"; c.lineWidth = 3;
            c.beginPath(); c.moveTo(x - rr * 0.6, y - rr * 0.6); c.lineTo(x + rr * 0.6, y + rr * 0.6);
            c.moveTo(x + rr * 0.6, y - rr * 0.6); c.lineTo(x - rr * 0.6, y + rr * 0.6); c.stroke();
            return;
          }
          if (s === shooter && !g.over) {
            c.strokeStyle = COL[s.side]; c.globalAlpha = 0.5 + 0.4 * Math.sin(t / 200); c.lineWidth = 2;
            c.beginPath(); c.arc(x, y, rr * 1.7, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
          }
          c.fillStyle = COL[s.side]; c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.fill();
          c.strokeStyle = "rgba(0,0,0,0.35)"; c.lineWidth = 2; c.stroke();
          var look = s.side === 0 ? 1 : -1;
          c.fillStyle = "#1d2033";
          c.beginPath(); c.arc(x + look * rr * 0.15, y - rr * 0.2, rr * 0.16, 0, Math.PI * 2);
          c.arc(x + look * rr * 0.55, y - rr * 0.2, rr * 0.16, 0, Math.PI * 2); c.fill();
          if (s.name) {
            c.fillStyle = "rgba(29, 32, 51, 0.7)"; c.font = "700 " + Math.max(10, Math.round(sc * 0.6)) + "px Manrope, sans-serif";
            c.textAlign = "center"; c.fillText(s.name, x, y - rr * 1.9);
          }
        });
      }

      function boom(x, y, col, n) {
        for (var i = 0; i < n; i++) {
          var a = Math.random() * Math.PI * 2, v = 0.05 + Math.random() * 0.3;
          g.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 40 + Math.random() * 30, col: col });
        }
      }
      function particles(c) {
        g.parts = g.parts.filter(function (p) { return p.life > 0; });
        g.parts.forEach(function (p) {
          p.x += p.vx; p.y += p.vy; p.vy -= 0.006; p.life--;
          c.globalAlpha = Math.min(1, p.life / 30); c.fillStyle = p.col;
          c.fillRect(X(p.x) - 2, Y(p.y) - 2, 4, 4);
        });
        c.globalAlpha = 1;
      }

      function hover(c) {
        var hv = g.hover; if (!hv) { readout.textContent = ""; return; }
        var snap = null;
        g.world.soldiers.forEach(function (s) { if (Math.hypot(s.x - hv.x, s.y - hv.y) < R * 1.8) snap = s; });
        var x = snap ? snap.x : Math.round(hv.x * 2) / 2, y = snap ? snap.y : Math.round(hv.y * 2) / 2;
        c.strokeStyle = "rgba(29, 32, 51, 0.25)"; c.lineWidth = 1; c.setLineDash([4, 4]);
        c.beginPath(); c.moveTo(X(x), 0); c.lineTo(X(x), chh); c.moveTo(0, Y(y)); c.lineTo(cw, Y(y)); c.stroke();
        c.setLineDash([]);
        var who = !snap ? "" : snap.side === current().side ? (snap === current() ? "Ты: " : "Свой: ") : (g.mode === "missions" ? "Цель: " : "Враг: ");
        readout.innerHTML = who + "(" + UI.fmt(x, 1) + "; " + UI.fmt(y, 1) + ")";
      }

      function pointer(e) {
        var r = canvas.getBoundingClientRect();
        g.hover = { x: (e.clientX - r.left) / sc - W, y: H - (e.clientY - r.top) / sc };
      }
      canvas.addEventListener("pointermove", pointer);
      canvas.addEventListener("pointerdown", pointer);
      canvas.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") g.hover = null; });

      /* --- ход игры --- */
      function aliveOf(side) { return g.world.soldiers.filter(function (s) { return s.alive && s.side === side; }); }
      function current() {
        var list = aliveOf(g.side);
        return list.length ? list[g.idx[g.side] % list.length] : g.world.soldiers[0];
      }
      function sideName(side) {
        if (g.mode === "bot") return side === 0 ? "Твой ход" : "Ход бота";
        if (g.mode === "duo") return side === 0 ? "Ходит Игрок 1 (жёлтый)" : "Ходит Игрок 2 (розовый)";
        return "Твой выстрел";
      }

      function setBusy(b) {
        g.busy = b;
        input.disabled = fireBtn.disabled = b;
        tryBtn.disabled = b || !canTry();
      }
      function canTry() {
        if (g.mode === "missions") return true;
        if (g.mode === "bot") return g.diff === "easy" && g.side === 0 && !g.previewUsed;
        return false;
      }

      function startTurn() {
        if (checkOver()) return;
        g.preview = null; g.previewUsed = false;
        var s = current();
        var dirNote = g.mode === "duo" && g.side === 1 ? ' <span class="muted">Ты стреляешь влево. Ось x всё равно смотрит вправо — снаряд просто летит в другую сторону.</span>' : "";
        turnLine.innerHTML = '<span class="duel-dot" style="background:' + COL[g.side] + '"></span><b>' + sideName(g.side) + "</b>" +
          (s.name ? " · солдат " + s.name : "") + " · стоит в (" + UI.fmt(s.x, 1) + "; " + UI.fmt(s.y, 1) + ")" + dirNote;
        renderHist();
        if (g.mode === "bot" && g.side === 1) {
          setBusy(true);
          input.value = ""; preview.innerHTML = "";
          botLine.innerHTML = '<span class="muted">Бот целится…</span>';
          timer = setTimeout(function () {
            var src = botAim(g.world, s, DIFF[g.diff].miss);
            botLine.innerHTML = "🤖 Бот (солдат " + s.name + ") стреляет: " + UI.m("y = " + src);
            timer = setTimeout(function () { shoot(src, Formula.compile(src)); }, 700);
          }, 900);
        } else {
          setBusy(false);
          if (g.mode !== "bot" || g.side === 0) { input.value = ""; preview.innerHTML = ""; }
          input.focus({ preventScroll: true });
        }
      }

      function parse() {
        var v = input.value.trim();
        if (!v) { msg.innerHTML = '<span class="bad">Сначала напиши функцию</span>'; return null; }
        var r = Formula.tryCompile(v);
        if (r.error) { msg.innerHTML = '<span class="bad">' + r.error + "</span>"; return null; }
        var m = g.mission;
        if (m && m.fam && !family(m.fam, r.f, v)) {
          msg.innerHTML = '<span class="bad">В этой миссии ' + m.famText + ". Такая формула не подходит.</span>";
          return null;
        }
        if (isNaN(r.f(current().x))) {
          msg.innerHTML = '<span class="bad">В точке солдата (x = ' + UI.fmt(current().x, 1) + ") функция не определена. Снаряду неоткуда вылететь.</span>";
          return null;
        }
        return { src: v, f: r.f };
      }

      function tryOn() {
        if (g.busy || !canTry()) return;
        var p = parse(); if (!p) return;
        var r = simulate(g.world, current(), p.f);
        g.preview = r.pts; g.previewUsed = true;
        msg.innerHTML = '<span class="muted">Пунктир — куда полетит снаряд.' + (g.mode === "missions" ? " Примерка снимает одну звезду." : " Больше примерок в этом ходу нет.") + "</span>";
        tryBtn.disabled = !canTry();
      }

      function fire() {
        if (g.busy || g.over) return;
        var p = parse(); if (!p) return;
        shoot(p.src, p.f);
      }

      function shoot(src, f) {
        var s = current(), r = simulate(g.world, s, f);
        if (r.error) return;
        setBusy(true);
        g.preview = null;
        g.shots++;
        var h = g.hist[s.side];
        if (h[0] !== src) { h.unshift(src); if (h.length > 6) h.pop(); }
        g.anim = { res: r, i: 1, side: s.side, done: function () { landed(s, src, r); } };
      }

      function shiftText(src, shift) {
        if (Math.abs(shift) < 0.005) return "Сдвиг не понадобился: график и так проходил через солдата.";
        var v = UI.fmt(Math.abs(shift), 2);
        return "График сдвинут на " + v + (shift > 0 ? " вверх" : " вниз") + ": летел по " +
          UI.m("y = " + (/[+\-]/.test(src.replace(/^-/, "")) ? "(" + src + ")" : src) + (shift > 0 ? " + " : " - ") + v.replace("−", ""));
      }

      function landed(s, src, r) {
        g.trails[s.side] = r.pts;
        var kills = r.hits.filter(function (q) { return q.s.side !== s.side; }).length;
        var own = r.hits.filter(function (q) { return q.s.side === s.side; }).length;
        var end = { rock: "Бум — в скалу. Там теперь дыра.", out: "Улетел за край поля.", "break": "График оборвался — функция тут не определена или прыгает, снаряд упал." }[r.end];
        if (r.end === "rock") { g.world.holes.push({ x: r.last[0], y: r.last[1], r: HOLE }); buildRocks(); boom(r.last[0], r.last[1], "#8b84b0", 18); }
        var head = kills ? '<b class="ok">' + (kills > 1 ? "Двойное попадание! 🔥" : "Попадание! 🎯") + "</b> " : own ? '<b class="bad">Ой, это был свой 😬</b> ' : "<b>Мимо.</b> " + end + " ";
        msg.innerHTML = head + '<span class="muted">' + shiftText(src, r.shift) + "</span>";
        if (g.mode === "missions") { missionAfter(); return; }
        g.idx[g.side]++;
        g.side = 1 - g.side;
        timer = setTimeout(startTurn, g.mode === "bot" && g.side === 0 ? 900 : 500);
      }

      function checkOver() {
        if (g.mode === "missions") return false;
        var a = aliveOf(0).length, b = aliveOf(1).length;
        if (a && b) return false;
        g.over = true; setBusy(true);
        var text;
        if (g.mode === "bot") {
          if (a) {
            var d = DIFF[g.diff], first = !App.flag("duel-win-" + g.diff);
            App.flag("duel-win-" + g.diff, true);
            App.addXp(first ? d.xp : 10, "победа над ботом");
            UI.confetti(field);
            text = "<h3>Победа! 🏆</h3><p>Бот (" + d.name.toLowerCase() + ") повержен." + (first ? "" : " Повторная победа — +10 XP.") + "</p>";
          } else text = "<h3>Бот победил 🤖</h3><p>Реванш? Наведи мышь на врага, посчитай наклон — и он твой.</p>";
        } else {
          text = "<h3>" + (a ? "Игрок 1" : "Игрок 2") + " победил! 🏆</h3>";
          UI.confetti(field);
        }
        overlay.innerHTML = text;
        overlay.appendChild(h("button", { class: "btn btn--primary", text: "Ещё раз", onclick: newGame }));
        overlay.style.display = "";
        turnLine.innerHTML = "<b>Игра окончена</b>";
        return true;
      }

      function renderHist() {
        histBox.innerHTML = "";
        var list = g.mode === "bot" && g.side === 1 ? [] : g.hist[g.side];
        if (!list.length) return;
        histBox.appendChild(h("span", { class: "muted", text: "Прошлые выстрелы:" }));
        list.forEach(function (src) {
          histBox.appendChild(h("button", { class: "chip chip--sm", html: Formula.pretty(src), onclick: function () {
            if (g.busy) return;
            input.value = src; input.dispatchEvent(new Event("input")); input.focus();
          } }));
        });
      }

      /* --- миссии --- */
      function missionStars() { return App.flag("duel-missions") || {}; }
      function renderMissionList() {
        missionBox.innerHTML = "";
        if (g.mode !== "missions") return;
        var stars = missionStars(), list = h("div", { class: "duel-mlist" });
        MISSIONS.forEach(function (m, i) {
          var n = i + 1, open = n === 1 || stars[n - 1], st = stars[n] || 0;
          list.appendChild(h("button", {
            class: "duel-mbtn" + (g.mission === m ? " is-on" : "") + (st ? " is-done" : ""),
            disabled: !open, title: m.title,
            onclick: function () { startMission(i); }
          }, h("b", { text: open ? n : "🔒" }), h("span", { text: open ? "★★★".slice(0, st) + "☆☆☆".slice(st) : "" })));
        });
        missionBox.appendChild(list);
        if (g.mission) {
          var m = g.mission, n = MISSIONS.indexOf(m) + 1;
          missionBox.appendChild(h("div", { class: "duel-mcard" },
            h("h3", { text: "Миссия " + n + ". " + m.title }),
            h("p", { html: m.text }),
            h("div", { class: "duel-tags" },
              h("span", { class: "duel-tag", text: m.famText }),
              h("span", { class: "duel-tag duel-tag--muted", text: "3★ — с одного выстрела без примерки" })),
            h("details", { class: "duel-hint" }, h("summary", { text: "💡 Подсказка" }), h("p", { html: m.hint })),
            h("button", { class: "btn btn--ghost btn--sm", text: "↺ Заново", onclick: function () { startMission(n - 1); } })));
        }
      }

      function startMission(i) {
        var m = MISSIONS[i];
        g.mission = m; g.world = missionWorld(m); g.side = 0; g.idx = [0, 0]; g.shots = 0;
        g.trails = {}; g.preview = null; g.parts = []; g.over = false; g.totalPreview = false;
        g.hist = { 0: [], 1: [] };
        overlay.style.display = "none";
        msg.innerHTML = ""; botLine.innerHTML = ""; input.value = ""; preview.innerHTML = "";
        renderMissionList(); buildRocks(); startTurn();
      }

      function missionAfter() {
        if (g.previewUsed) g.totalPreview = true;
        if (aliveOf(1).length) {
          g.previewUsed = false; g.preview = null;
          setBusy(false); renderHist();
          return;
        }
        var n = MISSIONS.indexOf(g.mission) + 1;
        var st = g.shots === 1 ? 3 : g.shots <= 3 ? 2 : 1;
        if (g.totalPreview) st = Math.max(1, st - 1);
        var all = missionStars();
        all[n] = Math.max(all[n] || 0, st);
        App.flag("duel-missions", all);
        if (!App.flag("duel-m" + n)) { App.flag("duel-m" + n, true); App.addXp(20, "миссия " + n); }
        UI.confetti(field);
        g.over = true; setBusy(true);
        overlay.innerHTML = "<h3>Миссия " + n + " пройдена!</h3><p class='duel-stars'>" + "★★★".slice(0, st) + "<span>" + "☆☆☆".slice(st) + "</span></p><p>Выстрелов: " + g.shots + "</p>";
        var btns = h("div", { class: "btns" },
          h("button", { class: "btn btn--ghost", text: "Ещё раз", onclick: function () { startMission(n - 1); } }));
        if (n < MISSIONS.length) btns.appendChild(h("button", { class: "btn btn--primary", text: "Следующая →", onclick: function () { startMission(n); } }));
        overlay.appendChild(btns);
        overlay.style.display = "";
        renderMissionList();
      }

      /* --- режимы --- */
      function setMode(mode) {
        g.mode = mode;
        Array.prototype.forEach.call(modeBar.children, function (b) { b.classList.toggle("is-on", b.getAttribute("data-mode") === mode); });
        diffBar.style.display = mode === "bot" ? "" : "none";
        tryBtn.style.display = mode === "duo" ? "none" : "";
        if (mode === "missions") {
          var stars = missionStars(), i = 0;
          while (i < MISSIONS.length - 1 && stars[i + 1]) i++;
          startMission(i);
        } else { g.mission = null; renderMissionList(); newGame(); }
      }

      function newGame() {
        if (g.mode === "missions") { startMission(MISSIONS.indexOf(g.mission)); return; }
        clearTimeout(timer);
        Array.prototype.forEach.call(diffBar.querySelectorAll("[data-diff]"), function (b) { b.classList.toggle("is-on", b.getAttribute("data-diff") === g.diff); });
        g.world = randomWorld(); g.side = 0; g.idx = [0, 0]; g.trails = {}; g.preview = null;
        g.parts = []; g.over = false; g.anim = null; g.hist = { 0: [], 1: [] };
        overlay.style.display = "none"; msg.innerHTML = ""; botLine.innerHTML = "";
        buildRocks(); startTurn();
      }

      window.addEventListener("resize", resize);
      UI.later(function () {
        resize();
        setMode("bot");
        raf = requestAnimationFrame(render);
      });

      return function () {
        cancelAnimationFrame(raf); clearTimeout(timer);
        window.removeEventListener("resize", resize);
      };
    }
  });
})();
