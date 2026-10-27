/* UI — строительные блоки страниц: элементы, карточки, задачи, слайдеры, конфетти. */
(function () {
  "use strict";

  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k === "text") el.textContent = v;
      else if (k === "style") el.setAttribute("style", v);
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, ch) {
    if (ch === undefined || ch === null || ch === false) return;
    if (Array.isArray(ch)) { ch.forEach(function (c) { add(el, c); }); return; }
    el.appendChild(typeof ch === "string" || typeof ch === "number" ? document.createTextNode(String(ch)) : ch);
  }

  /* Формула для показа: <span class="m">y = 2x² − 3</span> */
  function m(src) { return '<span class="m">' + Formula.pretty(src) + "</span>"; }

  function fmt(v, digits) {
    if (!isFinite(v)) return "—";
    var d = digits === undefined ? 2 : digits;
    var s = (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toString();
    return s.replace("-", "−").replace(".", ",");
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* Мини-график для вариантов ответа: строка SVG.
     spec — функция, массив функций или {t: [t0, t1], p: t ↦ [x, y]} (кривая параметром) */
  function mini(spec, o) {
    o = o || {};
    var R = o.r || 5, W = 150, H = o.h || 110, sc = W / (2 * R), cy = H / 2;
    var X = function (x) { return W / 2 + x * sc; }, Y = function (y) { return cy - y * sc; };
    var out = '<svg viewBox="0 0 ' + W + " " + H + '" class="mini">';
    var g = "";
    for (var i = -R; i <= R; i++) g += "M" + X(i) + " 0V" + H + "M0 " + Y(i) + "H" + W;
    out += '<path d="' + g + '" stroke="rgba(29, 32, 51, .07)"/>';
    out += '<path d="M0 ' + Y(0) + "H" + W + "M" + X(0) + " 0V" + H + '" stroke="rgba(29, 32, 51, .45)"/>';
    var list = Array.isArray(spec) ? spec : [spec];
    list.forEach(function (sp, k) {
      var d = "", pen = false, n = 240;
      for (var j = 0; j <= n; j++) {
        var pt;
        if (typeof sp === "function") { var x = -R + 2 * R * j / n; pt = [x, sp(x)]; }
        else { var t = sp.t[0] + (sp.t[1] - sp.t[0]) * j / n; pt = sp.p(t); }
        var py = Y(pt[1]);
        if (isNaN(pt[1]) || py < -H || py > 2 * H) { pen = false; continue; }
        d += (pen ? "L" : "M") + X(pt[0]).toFixed(1) + " " + py.toFixed(1); pen = true;
      }
      out += '<path d="' + d + '" fill="none" stroke="' + (o.colors ? o.colors[k] : (o.color || "#d18f00")) + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    });
    if (o.label) out += '<text x="8" y="20" fill="#1d2033" font-weight="800" font-size="16" font-family="Manrope">' + o.label + "</text>";
    return out + "</svg>";
  }

  /* ---------- блоки страницы ---------- */
  function section(title, intro) {
    return h("section", { class: "block" },
      h("h2", { class: "block__title", html: title }),
      intro ? h("p", { class: "block__intro", html: intro }) : null);
  }
  function theory(html) { return h("div", { class: "theory", html: html }); }
  function callout(kind, html) { return h("div", { class: "callout callout--" + kind, html: html }); }

  function plotBox(opts) {
    opts = opts || {};
    var box = h("div", { class: "plot" + (opts.tall ? " plot--tall" : opts.short ? " plot--short" : "") });
    var tools = h("div", { class: "plot__tools" });
    box.appendChild(tools);
    var api = { el: box, tools: tools, plot: null };
    // canvas создаём, когда блок уже в документе — иначе размер нулевой
    api.mount = function () {
      if (api.plot) return api.plot;
      api.plot = new Plot(box, opts);
      box.insertBefore(api.plot.canvas, tools);
      if (opts.zoom || opts.pan) {
        tools.appendChild(h("button", { class: "plot__btn", title: "Вернуть вид", text: "⟲", onclick: function () { api.plot.reset(); } }));
      }
      return api.plot;
    };
    return api;
  }

  /* slider("k", -3, 3, 0.1, 1, fn) */
  function slider(label, min, max, step, value, onInput, opts) {
    opts = opts || {};
    var out = h("output", { class: "slider__val" });
    var input = h("input", { type: "range", min: min, max: max, step: step, value: value });
    var row = h("label", { class: "slider" + (opts.color ? " slider--" + opts.color : "") },
      h("span", { class: "slider__name", html: label }), input, out);
    function upd() { var v = parseFloat(input.value); out.textContent = fmt(v, 2); onInput(v); }
    input.addEventListener("input", upd);
    row.set = function (v) { input.value = v; out.textContent = fmt(parseFloat(input.value), 2); };
    row.get = function () { return parseFloat(input.value); };
    row.set(value);
    return row;
  }

  /* ---------- числа из ответа ---------- */
  function parseNumber(s) {
    s = String(s).trim();
    if (!s) return NaN;
    var r = Formula.tryCompile(s);
    if (r.error || /x/i.test(s.replace(/х/g, "x"))) return NaN;
    return r.f(0);
  }
  function parseNumbers(s) {
    return String(s).split(/;|\sи\s|\s+/).map(function (p) { return p.trim(); })
      .filter(Boolean).map(parseNumber);
  }

  /* ---------- конфетти и тосты ---------- */
  function confetti(anchor) {
    var r = anchor ? anchor.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 3, width: 0 };
    var cv = h("canvas", { class: "confetti" });
    document.body.appendChild(cv);
    var dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    var c = cv.getContext("2d"); c.scale(dpr, dpr);
    var ox = r.left + r.width / 2, oy = r.top + 10, parts = [];
    for (var i = 0; i < 70; i++) parts.push({
      x: ox, y: oy, vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 11 - 3,
      s: 5 + Math.random() * 6, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4,
      col: pick(Plot.PALETTE)
    });
    var t = 0;
    (function frame() {
      c.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach(function (p) {
        p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.a += p.va; p.vx *= 0.99;
        c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.fillStyle = p.col;
        c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore();
      });
      if (++t < 90) requestAnimationFrame(frame); else cv.remove();
    })();
  }

  var toastBox;
  function toast(html, kind) {
    if (!toastBox) { toastBox = h("div", { class: "toasts" }); document.body.appendChild(toastBox); }
    var t = h("div", { class: "toast" + (kind ? " toast--" + kind : ""), html: html });
    toastBox.appendChild(t);
    setTimeout(function () { t.classList.add("is-out"); }, 2600);
    setTimeout(function () { t.remove(); }, 3100);
  }

  var PRAISE = ["Есть! 🔥", "Красота!", "Точно в цель 🎯", "Вот это да!", "Чётко!", "Так держать!", "Огонь!"];
  var OOPS = ["Мимо. Попробуй ещё", "Почти, но нет", "Неа. Глянь подсказку?", "Не то. Ещё разок!"];

  /* ---------- задача ----------
     kind: number | numbers | formula | choice | multi
     answer: число / массив чисел / формула-строка / индекс / массив индексов
     check(value) → true | false | "текст подсказки" — своя проверка */
  function task(o) {
    var solved = App.isDone(o.id), wrong = 0, sawSolution = false;
    var el = h("div", { class: "task" + (solved ? " is-solved" : "") });
    var head = h("div", { class: "task__head" },
      h("span", { class: "task__badge", text: o.badge || "Задача" }),
      o.level ? h("span", { class: "task__lvl", title: "Сложность", text: "★★★".slice(0, o.level) + "☆☆☆".slice(o.level) }) : null,
      h("span", { class: "task__xp", text: "+" + (o.xp || 10) + " XP" }));
    el.appendChild(head);
    el.appendChild(h("div", { class: "task__q", html: o.q }));
    if (o.plot) {
      var pb = plotBox(o.plot);
      el.appendChild(pb.el);
      el._mount = function () { var p = pb.mount(); p.layers = o.plot.layers || []; if (o.plot.setup) o.plot.setup(p); p.draw(); };
    }
    if (o.extra) el.appendChild(o.extra);

    var feedback = h("div", { class: "task__fb" });
    var getValue, form = h("div", { class: "task__form" });
    if (o.kind === "action") {
      // засчитывает сам интерактив: el.complete()
      getValue = function () { return true; };
      el.complete = function () { if (!solved) submit(); };
    } else if (o.kind === "choice" || o.kind === "multi") {
      var chosen = [];
      var opts = h("div", { class: "options" + (o.grid ? " options--grid" : "") });
      o.options.forEach(function (txt, i) {
        var b = h("button", { class: "option", type: "button", html: txt, onclick: function () {
          if (o.kind === "choice") {
            chosen = [i];
            Array.prototype.forEach.call(opts.children, function (c) { c.classList.remove("is-on", "is-wrong"); });
            b.classList.add("is-on");
            if (!o.manual) submit();
          } else {
            var k = chosen.indexOf(i);
            if (k >= 0) chosen.splice(k, 1); else chosen.push(i);
            b.classList.toggle("is-on");
          }
        } });
        opts.appendChild(b);
      });
      form.appendChild(opts);
      getValue = function () { return o.kind === "choice" ? chosen[0] : chosen.slice().sort(); };
      if (o.kind === "multi" || o.manual) form.appendChild(h("button", { class: "btn btn--primary", text: "Проверить", onclick: submit }));
    } else {
      var input = h("input", { class: "task__input", type: "text", autocomplete: "off", spellcheck: "false",
        placeholder: o.placeholder || (o.kind === "formula" ? "например, (x−2)^2+1" : o.kind === "numbers" ? "через точку с запятой: −1; 3" : "ответ"),
        onkeydown: function (e) { if (e.key === "Enter") submit(); } });
      var preview = o.kind === "formula" ? h("div", { class: "task__preview" }) : null;
      if (preview) input.addEventListener("input", function () {
        var r = input.value.trim() ? Formula.tryCompile(input.value) : null;
        preview.innerHTML = !r ? "" : r.error ? '<span class="bad">' + r.error + "</span>" : "y = " + m(input.value.replace(/^\s*y\s*=/i, ""));
      });
      form.appendChild(h("div", { class: "task__row" },
        o.prefix ? h("span", { class: "task__prefix", html: o.prefix }) : null,
        input,
        o.suffix ? h("span", { class: "task__prefix", html: o.suffix }) : null,
        h("button", { class: "btn btn--primary", text: "Проверить", onclick: submit })));
      if (preview) form.appendChild(preview);
      getValue = function () { return input.value; };
    }
    el.appendChild(form);
    el.appendChild(feedback);

    var tools = h("div", { class: "task__tools" });
    var hintI = 0, hintBox = h("div", { class: "task__hints" });
    if (o.hints && o.hints.length) {
      var hb = h("button", { class: "btn btn--ghost btn--sm", text: "💡 Подсказка", onclick: function () {
        hintBox.appendChild(h("div", { class: "hint", html: o.hints[hintI] }));
        hintI++;
        if (hintI >= o.hints.length) hb.remove(); else hb.textContent = "💡 Ещё подсказка";
      } });
      tools.appendChild(hb);
    }
    var solBtn = o.solution ? h("button", { class: "btn btn--ghost btn--sm", text: "👀 Решение", style: solved ? "" : "display:none", onclick: function () {
      sawSolution = true;
      el.appendChild(h("div", { class: "task__solution", html: "<b>Решение.</b> " + o.solution }));
      solBtn.remove();
    } }) : null;
    if (solBtn) tools.appendChild(solBtn);
    el.appendChild(hintBox);
    el.appendChild(tools);
    if (solved) feedback.innerHTML = '<span class="ok">✓ Уже решено. Можешь решить ещё раз для тренировки</span>';

    function verdict(v) {
      if (o.check) return o.check(v);
      if (o.kind === "number") {
        var n = parseNumber(v);
        if (isNaN(n)) return "Нужно число. Дробь можно так: 1/2 или 0,5";
        return Math.abs(n - o.answer) <= (o.tol || 1e-6);
      }
      if (o.kind === "numbers") {
        var arr = parseNumbers(v);
        if (!arr.length || arr.some(isNaN)) return "Напиши числа через точку с запятой: −1; 3";
        var need = o.answer.slice().sort(function (a, b) { return a - b; });
        arr = arr.filter(function (x, i) { return arr.findIndex(function (y) { return Math.abs(x - y) < 1e-6; }) === i; })
          .sort(function (a, b) { return a - b; });
        if (arr.length !== need.length) return arr.length < need.length ? "Ответов должно быть больше" : "Здесь есть лишнее";
        return arr.every(function (x, i) { return Math.abs(x - need[i]) < (o.tol || 1e-6); });
      }
      if (o.kind === "formula") {
        var r = Formula.tryCompile(v);
        if (r.error) return r.error;
        return Formula.same(r.f, Formula.compile(o.answer), o.range);
      }
      if (o.kind === "action") return true;
      if (o.kind === "choice") { if (v === undefined) return "Выбери вариант"; return v === o.answer; }
      if (o.kind === "multi") { if (!v.length) return "Отметь хотя бы один вариант"; return JSON.stringify(v) === JSON.stringify(o.answer.slice().sort()); }
      return false;
    }

    function submit() {
      var v = getValue(), res = verdict(v);
      el.classList.remove("shake");
      if (res === true) {
        feedback.innerHTML = '<span class="ok">' + pick(PRAISE) + "</span>" + (o.after ? '<div class="task__after">' + o.after + "</div>" : "");
        el.classList.add("is-solved");
        if (!solved) {
          App.solve(o.id, sawSolution ? Math.ceil((o.xp || 10) / 2) : (o.xp || 10));
          confetti(el.querySelector(".btn--primary") || el);
        }
        solved = true;
        if (solBtn && !sawSolution) solBtn.style.display = "";
        if (o.onSolve) o.onSolve();
      } else {
        wrong++;
        void el.offsetWidth; el.classList.add("shake");
        feedback.innerHTML = '<span class="bad">' + (typeof res === "string" ? res : pick(OOPS)) + "</span>";
        if (o.kind === "choice" && typeof res !== "string") {
          var b = el.querySelectorAll(".option")[v]; if (b) b.classList.add("is-wrong");
        }
        if (wrong >= 2 && solBtn) solBtn.style.display = "";
      }
    }
    return el;
  }

  /* «Горки»: гладкая функция через вершины, экстремумы ровно в вершинах */
  function smooth(pts) {
    return function (x) {
      if (x < pts[0][0] || x > pts[pts.length - 1][0]) return NaN;
      for (var i = 1; i < pts.length; i++) {
        if (x <= pts[i][0]) {
          var a = pts[i - 1], b = pts[i], t = (x - a[0]) / (b[0] - a[0]);
          return a[1] + (b[1] - a[1]) * (1 - Math.cos(Math.PI * t)) / 2;
        }
      }
      return NaN;
    };
  }

  /* Сколько решений у f(x) = g(x) на [a; b]: смены знака + точные нули (касания) */
  function countCommon(f, g, a, b) {
    var step = 1 / 64, cnt = 0, prev = null, lastZero = -Infinity;
    for (var x = a; x <= b + 1e-9; x += step) {
      var X = Math.round(x * 64) / 64, d = f(X) - g(X);
      if (isNaN(d)) { prev = null; continue; }
      if (Math.abs(d) < 1e-9) { if (X - lastZero > step * 1.5) cnt++; lastZero = X; prev = 0; continue; }
      if (prev !== null && prev !== 0 && prev * d < 0) cnt++;
      prev = d;
    }
    return cnt;
  }

  /* Щуп: горизонтальная прямая y = m, которую тащат за ручку справа */
  function hProbe(f, opts) {
    var pb = plotBox({ x: opts.x, y: opts.y, draggable: true, unitGrid: true });
    var read = h("div", { class: "stat" });
    var handle = { type: "point", x: opts.x[1] - 0.8, y: opts.start, color: "#0a8bd0", draggable: true, snap: 0.25,
      constrain: function (_, y) { return [opts.x[1] - 0.8, y]; } };
    function draw() {
      var mm = handle.y, k = countCommon(f, function () { return mm; }, opts.x[0], opts.x[1]);
      pb.plot.layers = [
        { type: "fn", f: f, color: "#d18f00", width: 3.5 },
        { type: "hline", y: mm, color: "#0a8bd0", dash: false, width: 2 }
      ].concat(opts.extra || []).concat([handle]);
      pb.plot.draw();
      read.innerHTML = "y = <b>" + fmt(mm) + "</b> · общих точек: <b>" + k + "</b>";
    }
    handle.onDrag = draw;
    later(function () { pb.mount(); draw(); });
    return h("div", { class: "sliders" }, pb.el, h("div", { class: "stats" }, read,
      h("span", { class: "muted", style: "font-size:14px;align-self:center", text: "Тащи голубую ручку справа вверх-вниз" })));
  }

  /* Код, которому нужен блок уже в документе (размер canvas): UI.later(fn) */
  var queue = [];
  function later(fn) { queue.push(fn); }
  function mountAll(root) {
    root.querySelectorAll(".task").forEach(function (t) { if (t._mount) t._mount(); });
    var q = queue; queue = [];
    q.forEach(function (fn) { fn(); });
  }

  window.UI = {
    h: h, m: m, mini: mini, fmt: fmt, pick: pick, shuffle: shuffle,
    section: section, theory: theory, callout: callout, plotBox: plotBox, slider: slider,
    task: task, mountAll: mountAll, later: later, confetti: confetti, toast: toast,
    smooth: smooth, countCommon: countCommon, hProbe: hProbe,
    parseNumber: parseNumber, parseNumbers: parseNumbers
  };
})();
