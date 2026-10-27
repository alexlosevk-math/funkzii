/* Блок 5. Сдвиги и растяжения: знаешь одну параболу — знаешь все. */
(function () {
  "use strict";
  var h = UI.h, m = UI.m;

  /* Базовые функции: шаблон формулы с местом для «внутренности» */
  var BASES = {
    sq: { name: "x²", tpl: function (i) { return wrap(i) + "^2"; }, f: function (x) { return x * x; } },
    abs: { name: "|x|", tpl: function (i) { return "|" + i + "|"; }, f: Math.abs },
    sqrt: { name: "√x", tpl: function (i) { return "sqrt(" + i + ")"; }, f: function (x) { return x < 0 ? NaN : Math.sqrt(x); } },
    inv: { name: "1/x", tpl: function (i) { return "1/" + wrap(i); }, f: function (x) { return x === 0 ? NaN : 1 / x; } },
    cube: { name: "x³", tpl: function (i) { return wrap(i) + "^3"; }, f: function (x) { return x * x * x; } }
  };
  function wrap(i) { return i === "x" ? "x" : "(" + i + ")"; }
  function n(v) { return String(Math.round(v * 100) / 100); }

  /* y = k·f(x − a) + b → строка формулы */
  function build(baseKey, p) {
    var B = BASES[baseKey];
    var inner = p.a === 0 ? "x" : "x" + (p.a > 0 ? "-" : "+") + n(Math.abs(p.a));
    var core = B.tpl(inner), s;
    if (baseKey === "inv") s = (p.k < 0 ? "-" : "") + n(Math.abs(p.k)) + "/" + wrap(inner);
    else s = p.k === 1 ? core : p.k === -1 ? "-" + core : n(p.k) + core;
    if (p.b) s += (p.b > 0 ? "+" : "-") + n(Math.abs(p.b));
    return s;
  }
  function fnOf(baseKey, p) {
    var f = BASES[baseKey].f;
    return function (x) { return p.k * f(x - p.a) + p.b; };
  }

  /* ---------- карточки движений ---------- */
  var MOVES = [
    { f: "f(x)+b", t: "вверх на b (при b < 0 — вниз)", demo: { a: 0, b: 2, k: 1 } },
    { f: "f(x-a)", t: "вправо на a. Да, минус — вправо!", demo: { a: 3, b: 0, k: 1 } },
    { f: "f(x+a)", t: "влево на a. Плюс — влево", demo: { a: -3, b: 0, k: 1 } },
    { f: "k·f(x)", t: "вытягивает от оси x в k раз (при 0 < k < 1 — сплющивает)", demo: { a: 0, b: 0, k: 2 } },
    { f: "-f(x)", t: "переворачивает вверх ногами: отражение от оси x", demo: { a: 0, b: 0, k: -1 } },
    { f: "f(-x)", t: "зеркалит слева направо: отражение от оси y", demo: { mirror: true } },
    { f: "|f(x)|", t: "всё, что ниже оси x, отражается наверх", demo: { absOut: true } }
  ];

  function movesDemo() {
    var pb = UI.plotBox({ x: [-7, 7], y: [-4.5, 5] });
    // несимметричная база, чтобы было видно отражение f(−x)
    var base = function (x) { return x < -3 ? NaN : Math.sqrt(x + 3) * 1.5 - 2; };
    var cur = null, t = 1, raf = 0;
    var grid = h("div", { class: "moves" });
    var note = h("div", { class: "callout callout--fun", html: "<p>Жми на карточку — увидишь движение. Серый пунктир — исходный график " + m("y=f(x)") + ".</p>" });
    function target(d) {
      if (d.mirror) return function (x) { return base(-x); };
      if (d.absOut) return function (x) { return Math.abs(base(x)); };
      return function (x) { return d.k * base(x - d.a) + d.b; };
    }
    function draw() {
      var P = pb.plot, L = [{ type: "fn", f: base, color: "rgba(29, 32, 51, 0.45)", dash: [6, 6], width: 2.5 }];
      if (cur) {
        var g = target(cur.demo), k = t;
        L.push({ type: "fn", f: function (x) { var a = base(x), b = g(x); return isNaN(a) || isNaN(b) ? (k > 0.5 ? b : a) : a + (b - a) * k; }, color: "#e23468", width: 3.5, glow: true });
      }
      P.layers = L; P.draw();
    }
    MOVES.forEach(function (mv) {
      var b = h("button", { class: "move", html: m("y=" + mv.f) + "<span>" + mv.t + "</span>", onclick: function () {
        grid.querySelectorAll(".is-on").forEach(function (x) { x.classList.remove("is-on"); });
        b.classList.add("is-on"); cur = mv; t = 0;
        cancelAnimationFrame(raf);
        var t0 = performance.now();
        (function step(now) {
          t = Math.min(1, (now - t0) / 900); t = t * t * (3 - 2 * t);
          draw();
          if (t < 1) raf = requestAnimationFrame(step);
        })(t0);
        note.innerHTML = "<p>" + m("y=" + mv.f) + " — " + mv.t + ".</p>";
      } });
      grid.appendChild(b);
    });
    UI.later(function () { pb.mount(); draw(); });
    return h("div", { class: "sliders" }, grid, h("div", { class: "split" }, note, pb.el));
  }

  /* ---------- почему минус вправо ---------- */
  function whyMinus() {
    var pb = UI.plotBox({ x: [-6, 8], y: [-1.5, 7], short: true });
    var a = 3;
    var txt = h("div", { class: "theory" });
    function draw() {
      var P = pb.plot;
      P.layers = [
        { type: "fn", f: function (x) { return x * x; }, color: "rgba(29, 32, 51, 0.4)", dash: [6, 6], width: 2 },
        { type: "fn", f: function (x) { return (x - a) * (x - a); }, color: "#e23468", width: 3.5 },
        { type: "point", x: 0, y: 0, color: "#1d2033", label: "дно x²", labelAlign: "right", labelDx: -10, labelDy: 24 },
        { type: "point", x: a, y: 0, color: "#e23468", label: "новое дно: x = " + UI.fmt(a), labelDy: a ? -10 : -30 }
      ];
      P.draw();
      var s = "y=(x" + (a >= 0 ? "-" : "+") + n(Math.abs(a)) + ")^2";
      txt.innerHTML = "<p>Формула " + m(s) + ". У " + m("x^2") + " дно там, где в скобке 0, то есть при x = 0.</p>" +
        "<p>У новой функции в скобке будет 0, только когда <b>x = " + UI.fmt(a) + "</b>. Значит, дно уехало туда. Минус в скобке «съедает» x — чтобы вернуть ноль, x должен стать на " + UI.fmt(Math.abs(a)) + (a >= 0 ? " больше. Отсюда сдвиг <b>вправо</b>." : " меньше. Отсюда сдвиг <b>влево</b>.") + "</p>";
    }
    var sl = UI.slider(m("a"), -4, 5, 1, a, function (v) { a = v; draw(); }, { color: "pink" });
    UI.later(function () { pb.mount(); draw(); });
    return h("div", { class: "split" }, h("div", { class: "sliders" }, sl, txt), pb.el);
  }

  /* ---------- лаборатория преобразований ---------- */
  function lab() {
    var pb = UI.plotBox({ x: [-8, 8], y: [-6, 6], zoom: true, pan: true });
    var base = "sq", p = { a: 0, b: 0, k: 1 };
    var bar = h("div", { class: "formula-bar" });
    var chips = h("div", { class: "btns" });
    Object.keys(BASES).forEach(function (k, i) {
      var c = h("button", { class: "chip" + (i ? "" : " is-on"), text: "y = " + BASES[k].name, onclick: function () {
        base = k; Array.prototype.forEach.call(chips.children, function (x) { x.classList.remove("is-on"); }); c.classList.add("is-on"); draw();
      } });
      chips.appendChild(c);
    });
    var sA = UI.slider("a →", -6, 6, 0.5, 0, function (v) { p.a = v; draw(); }, { color: "pink" });
    var sB = UI.slider("b ↑", -5, 5, 0.5, 0, function (v) { p.b = v; draw(); }, { color: "cyan" });
    var sK = UI.slider("k ↕", -3, 3, 0.25, 1, function (v) { p.k = v; draw(); }, { color: "yellow" });
    function draw() {
      bar.innerHTML = m("y=" + (p.k === 0 ? (p.b ? n(p.b) : "0") : build(base, p)));
      var P = pb.plot;
      if (!P) return;
      P.layers = [
        { type: "fn", f: BASES[base].f, color: "rgba(29, 32, 51, 0.35)", dash: [6, 6], width: 2 },
        { type: "fn", f: fnOf(base, p), color: "#e23468", width: 3.5, glow: true }
      ];
      if (base === "sq" || base === "abs") P.layers.push({ type: "point", x: p.a, y: p.b, color: "#1d2033", label: "(" + UI.fmt(p.a) + "; " + UI.fmt(p.b) + ")" });
      if (base === "sqrt") P.layers.push({ type: "point", x: p.a, y: p.b, color: "#1d2033", label: "старт (" + UI.fmt(p.a) + "; " + UI.fmt(p.b) + ")" });
      if (base === "inv") { P.layers.push({ type: "vline", x: p.a, color: "rgba(226, 52, 104, 0.5)", width: 1.5 }); P.layers.push({ type: "hline", y: p.b, color: "rgba(226, 52, 104, 0.5)", width: 1.5 }); }
      P.draw();
    }
    UI.later(function () { pb.mount(); draw(); });
    return h("div", { class: "split" },
      h("div", { class: "sliders" }, chips, bar, sA, sB, sK,
        h("button", { class: "btn btn--ghost btn--sm", style: "align-self:flex-start", text: "Сбросить", onclick: function () {
          p = { a: 0, b: 0, k: 1 }; sA.set(0); sB.set(0); sK.set(1); draw();
        } }),
        UI.callout("tip", "<p>Белая точка — «якорь» графика: вершина параболы, угол модуля, начало корня. Она всегда в точке (a; b). Для гиперболы якорь — пересечение пунктирных асимптот.</p>")),
      pb.el);
  }

  /* ---------- игра «Совмести графики» ---------- */
  var LEVELS = [
    { base: "sq", t: { a: 3, b: 0, k: 1 } },
    { base: "sq", t: { a: -2, b: -1, k: 1 } },
    { base: "abs", t: { a: 1, b: 2, k: 1 } },
    { base: "sq", t: { a: 0, b: 3, k: -1 } },
    { base: "sqrt", t: { a: -4, b: -2, k: 1 } },
    { base: "abs", t: { a: 2, b: -3, k: 2 } },
    { base: "inv", t: { a: 1, b: 1, k: 2 } },
    { base: "sq", t: { a: -1, b: 4, k: -0.5 } }
  ];
  function fitGame(onSolve) {
    var pb = UI.plotBox({ x: [-8, 8], y: [-6, 6] });
    var lvl = 0, p, moves, matched;
    var pills = h("div", { class: "fit-level" });
    var status = h("div", { class: "fit-status" });
    var logEl = h("div", { class: "muted" });
    var input = h("input", { class: "task__input", type: "text", placeholder: "формула пунктирного графика", onkeydown: function (e) { if (e.key === "Enter") check(); } });
    var fb = h("div", { class: "task__fb" });
    var formWrap = h("div", { class: "sliders", style: "display:none" },
      h("p", { html: "Совпало! А теперь главное: <b>запиши формулу</b> пунктирного графика. Подсказка — твои ходы выше." }),
      h("div", { class: "task__row" }, h("span", { class: "task__prefix", text: "y =" }), input, h("button", { class: "btn btn--primary", text: "Проверить", onclick: check })), fb);

    function idOf(i) { return "shifts:fit" + (i + 1); }
    function renderPills() {
      pills.innerHTML = "";
      LEVELS.forEach(function (_, i) {
        pills.appendChild(h("button", { class: (i === lvl ? "is-on " : "") + (App.isDone(idOf(i)) ? "is-done" : ""), text: i + 1, onclick: function () { load(i); } }));
      });
    }
    function load(i) {
      lvl = i; p = { a: 0, b: 0, k: 1 }; moves = { r: 0, u: 0, k: [] }; matched = false;
      formWrap.style.display = "none"; fb.innerHTML = ""; input.value = "";
      renderPills(); update();
    }
    function same() { var t = LEVELS[lvl].t; return p.a === t.a && p.b === t.b && Math.abs(p.k - t.k) < 1e-9; }
    function update() {
      var L = LEVELS[lvl], P = pb.plot;
      P.layers = [
        { type: "fn", f: fnOf(L.base, L.t), color: "#d18f00", dash: [9, 7], width: 4, alpha: 0.9 },
        { type: "fn", f: fnOf(L.base, p), color: "#e23468", width: 3.5, glow: true }
      ];
      P.draw();
      var parts = [];
      if (moves.r) parts.push((moves.r > 0 ? "вправо на " : "влево на ") + Math.abs(moves.r));
      if (moves.u) parts.push((moves.u > 0 ? "вверх на " : "вниз на ") + Math.abs(moves.u));
      if (p.k !== 1) parts.push("растяжение k = " + UI.fmt(p.k));
      logEl.textContent = parts.length ? "Твои ходы: " + parts.join(", ") : "Двигай розовый график стрелками (или клавишами ← → ↑ ↓).";
      if (same() && !matched) {
        matched = true; status.innerHTML = '<span class="ok">🎯 Совпало!</span>';
        formWrap.style.display = ""; setTimeout(function () { input.focus(); }, 50);
      } else if (!matched) status.textContent = "Уровень " + (lvl + 1) + " из " + LEVELS.length + ": совмести розовый график с жёлтым пунктиром";
    }
    function move(dx, dy) { if (matched) return; p.a += dx; p.b += dy; moves.r += dx; moves.u += dy; update(); }
    function stretch(f) { if (matched) return; p.k = Math.round(p.k * f * 1000) / 1000; update(); }
    function check() {
      var L = LEVELS[lvl], r = Formula.tryCompile(input.value);
      if (r.error) { fb.innerHTML = '<span class="bad">' + r.error + "</span>"; return; }
      if (Formula.same(r.f, fnOf(L.base, L.t))) {
        fb.innerHTML = '<span class="ok">Точно! ' + m("y=" + build(L.base, L.t)) + "</span>";
        if (!App.isDone(idOf(lvl))) { App.solve(idOf(lvl), 20); UI.confetti(input); }
        renderPills();
        if (onSolve) onSolve();
        if (lvl < LEVELS.length - 1) fb.appendChild(h("button", { class: "btn btn--primary btn--sm", style: "margin-left:12px", text: "Следующий уровень →", onclick: function () { load(lvl + 1); } }));
      } else {
        fb.innerHTML = '<span class="bad">Не совпадает. Помни: сдвиг вправо на a — это (x − a), вверх на b — это + b в конце.</span>';
      }
    }
    var pad = h("div", { class: "pad" },
      h("button", { style: "grid-column:2;grid-row:1", text: "↑", onclick: function () { move(0, 1); } }),
      h("button", { style: "grid-column:1;grid-row:2", text: "←", onclick: function () { move(-1, 0); } }),
      h("span", { class: "pad__c", style: "display:grid;place-items:center", text: "сдвиг" }),
      h("button", { style: "grid-column:3;grid-row:2", text: "→", onclick: function () { move(1, 0); } }),
      h("button", { style: "grid-column:2;grid-row:3", text: "↓", onclick: function () { move(0, -1); } }));
    var stretchBtns = h("div", { class: "btns", style: "flex-direction:column" },
      h("button", { class: "btn btn--ghost btn--sm", text: "↕ вытянуть ×2", onclick: function () { stretch(2); } }),
      h("button", { class: "btn btn--ghost btn--sm", text: "↕ сплющить ÷2", onclick: function () { stretch(0.5); } }),
      h("button", { class: "btn btn--ghost btn--sm", text: "⇅ перевернуть", onclick: function () { stretch(-1); } }),
      h("button", { class: "btn btn--ghost btn--sm", text: "⟲ заново", onclick: function () { load(lvl); } }));
    function onKey(e) {
      if (document.activeElement === input) return;
      var map = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }, d = map[e.key];
      if (!d) return;
      var r = pb.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;     // игра не на экране
      e.preventDefault(); move(d[0], d[1]);
    }
    document.addEventListener("keydown", onKey);
    var prev = App._cleanup;
    App._cleanup = function () { document.removeEventListener("keydown", onKey); if (prev) prev(); };
    UI.later(function () { pb.mount(); load(0); });
    return h("div", { class: "sliders" }, pills, status,
      h("div", { class: "split" },
        h("div", { class: "sliders" }, h("div", { class: "fit-controls" }, pad, stretchBtns), logEl, formWrap),
        pb.el));
  }

  App.register({
    id: "shifts", num: 5, color: "var(--pink)", tasks: 17,
    title: "Сдвиги и растяжения", subtitle: "Знаешь одну параболу — знаешь все",
    render: function (root) {
      var s1 = UI.section("Суперсила этой темы");
      s1.appendChild(UI.theory(
        "<p>Вот " + m("y=(x-3)^2+1") + ". Можно строить по точкам: считать, ставить, мучиться. А можно увидеть, что это обычная " + m("y=x^2") + ", которую просто <b>подвинули</b>: на 3 вправо и на 1 вверх. Нарисовал знакомую параболу — передвинул — готово.</p>" +
        "<p>Таких движений всего несколько. Выучишь их — и любой «страшный» график строится за минуту.</p>"));
      s1.appendChild(movesDemo());
      root.appendChild(s1);

      var s2 = UI.section("Почему минус — вправо?", "Самый частый вопрос в этой теме. Двигай ползунок и следи за дном параболы.");
      s2.appendChild(whyMinus());
      s2.appendChild(UI.callout("warn", "<p><b>Запомни раз и навсегда:</b> то, что <b>внутри</b> (рядом с x), работает наоборот и по горизонтали. То, что <b>снаружи</b>, работает честно и по вертикали.</p>"));
      root.appendChild(s2);

      var s3 = UI.section("Лаборатория", "Формула " + m("y=k·f(x-a)+b") + " — все сдвиги разом. Крути ползунки и смотри, как меняется формула сверху.");
      s3.appendChild(lab());
      root.appendChild(s3);

      var s4 = UI.section("Игра: совмести графики", "Сначала подвинь график руками, потом запиши формулу. 8 уровней, к концу будет непросто.");
      s4.appendChild(fitGame());
      root.appendChild(s4);

      var s5 = UI.section("Задачи по теме");
      var t = h("div", { class: "tasks" });
      t.appendChild(UI.task({
        id: "shifts:t1", level: 1, xp: 10, kind: "formula", prefix: "y =",
        q: "<p>Параболу " + m("y=x^2") + " сдвинули на 3 влево и на 2 вниз. Запиши формулу нового графика.</p>", answer: "(x+3)^2-2",
        hints: ["Влево — это плюс внутри скобки. Вниз — минус снаружи."],
        solution: "Влево на 3: (x + 3)². Вниз на 2: −2 в конце. y = (x + 3)² − 2."
      }));
      t.appendChild(UI.task({
        id: "shifts:t2", level: 1, xp: 10, kind: "choice",
        q: "<p>Что произойдёт с графиком " + m("y=f(x)") + " при переходе к " + m("y=f(x+3)") + "?</p>",
        options: ["Сдвиг на 3 вправо", "Сдвиг на 3 влево", "Сдвиг на 3 вверх", "Растяжение в 3 раза"], answer: 1,
        hints: ["+3 стоит внутри, рядом с x. Внутри всё работает наоборот."],
        solution: "Плюс внутри — сдвиг влево. Проверка: значение, которое у f было при x = 0, у новой функции будет при x + 3 = 0, то есть при x = −3."
      }));
      t.appendChild(UI.task({
        id: "shifts:t3", level: 2, xp: 15, kind: "numbers",
        q: "<p>Найди координаты вершины параболы " + m("y=-2(x-1)^2+5") + ". Запиши через точку с запятой: x; y.</p>",
        check: function (v) {
          var a = UI.parseNumbers(v);
          if (a.length !== 2 || a.some(isNaN)) return "Нужно два числа: x; y";
          if (a[0] === 1 && a[1] === 5) return true;
          if (a[0] === -1) return "По x смотри внимательнее: (x − 1) — это сдвиг вправо";
          return false;
        },
        hints: ["Вершина y = x² в (0; 0). Какие сдвиги здесь видны? Множитель −2 вершину не двигает — он только переворачивает и вытягивает."],
        solution: "(x − 1) — сдвиг на 1 вправо, +5 — на 5 вверх. Вершина (1; 5). Множитель −2 разворачивает ветви вниз и делает параболу уже."
      }));
      t.appendChild(UI.task({
        id: "shifts:t4", level: 2, xp: 15, kind: "choice",
        q: "<p>Как из графика " + m("y=|x|") + " получить график " + m("y=|x+4|-1") + "?</p>",
        options: ["4 вправо, 1 вниз", "4 влево, 1 вниз", "4 влево, 1 вверх", "4 вверх, 1 влево"], answer: 1,
        hints: ["+4 внутри модуля — по горизонтали и наоборот. −1 снаружи — по вертикали и честно."],
        solution: "+4 внутри — на 4 влево, −1 снаружи — на 1 вниз. Угол галочки окажется в точке (−4; −1)."
      }));
      t.appendChild(UI.task({
        id: "shifts:t5", level: 2, xp: 15, kind: "formula", prefix: "y =",
        q: "<p>Запиши формулу параболы по графику. Ветви как у " + m("y=x^2") + ".</p>", answer: "(x-2)^2-4",
        plot: { x: [-4, 7], y: [-5, 5], unitGrid: true, layers: [{ type: "fn", f: function (x) { return (x - 2) * (x - 2) - 4; }, color: "#e23468" }, { type: "point", x: 2, y: -4, color: "#1d2033" }] },
        hints: ["Найди вершину — это и есть сдвиги."],
        solution: "Вершина (2; −4): на 2 вправо и на 4 вниз. y = (x − 2)² − 4. Если раскрыть скобки, получится x² − 4x, это тоже засчитывается."
      }));
      t.appendChild(UI.task({
        id: "shifts:t6", level: 3, xp: 25, kind: "choice",
        q: "<p>Какая область определения у " + m("y=sqrt(x-2)+1") + "?</p>",
        options: ["x ≥ 2", "x ≥ −2", "x ≥ 1", "x ≥ 0"], answer: 0,
        hints: ["График √x начинается в x = 0. Куда его сдвинули по горизонтали?"],
        solution: "√x подвинули на 2 вправо, теперь график начинается в x = 2. Проверка: под корнем x − 2 ≥ 0, x ≥ 2. Сдвиг вверх на 1 на область определения не влияет."
      }));
      t.appendChild(UI.task({
        id: "shifts:t7", level: 3, xp: 30, kind: "formula", prefix: "f(x) =", badge: "Задача со звёздочкой",
        q: "<p>График " + m("y=f(x)") + " сдвинули на 2 вправо и получили график " + m("y=x^2-4x+7") + ". Какой была функция f?</p>",
        answer: "x^2+3",
        hints: ["Чтобы вернуть всё как было, сдвинь полученный график обратно — на 2 влево. Это замена x на (x + 2).", "Подставь (x + 2) вместо каждого x в x² − 4x + 7 и раскрой скобки."],
        solution: "Сдвиг обратно — на 2 влево: f(x) = (x + 2)² − 4(x + 2) + 7 = x² + 4x + 4 − 4x − 8 + 7 = x² + 3. Можно и через вершину: x² − 4x + 7 = (x − 2)² + 3, сдвинули на 2 вправо, значит исходная — x² + 3."
      }));
      t.appendChild(UI.task({
        id: "shifts:t8", level: 2, xp: 15, kind: "formula", prefix: "y =",
        q: "<p>График " + m("y=sqrt(x)") + " сдвинули на 4 влево, а потом отразили относительно оси x. Запиши формулу.</p>", answer: "-sqrt(x+4)",
        hints: ["Влево на 4 — это (x + 4) внутри корня.", "Отражение относительно оси x — минус перед всей функцией."],
        solution: "Сдвиг влево: √(x + 4). Отражение от оси x переворачивает знак y: y = −√(x + 4)."
      }));
      t.appendChild(UI.task({
        id: "shifts:t9", level: 2, xp: 15, kind: "choice",
        q: "<p>Как из графика " + m("y=x^2") + " получить график " + m("y=-x^2+2") + "?</p>",
        options: ["Отразить относительно оси x и поднять на 2", "Поднять на 2 и сдвинуть влево", "Отразить относительно оси y и поднять на 2", "Опустить на 2"], answer: 0,
        hints: ["Минус перед x² переворачивает параболу ветвями вниз. Какая это ось симметрии?"],
        solution: "−x² — отражение относительно оси x (ветви вниз), +2 — подъём на 2. Отражение относительно оси y парабола x² даже не заметит: она чётная."
      }));
      s5.appendChild(t);
      root.appendChild(s5);
    }
  });
})();
