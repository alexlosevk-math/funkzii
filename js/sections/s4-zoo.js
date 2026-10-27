/* Блок 4. Зоопарк функций: восемь видов, которые надо узнавать в лицо. */
(function () {
  "use strict";
  var h = UI.h, m = UI.m;

  var FAMILIES = [
    { name: "Прямая", formula: function (p) { return "y=" + num(p.k, "x") + sign(p.b); },
      params: [["k", -3, 3, 0.1, 1, "yellow"], ["b", -5, 5, 0.5, 1, "cyan"]],
      f: function (p) { return function (x) { return p.k * x + p.b; }; },
      facts: ["Формула " + m("y=kx+b") + ", график — прямая. Строится по двум точкам.",
        "<b>k</b> — наклон: на сколько поднимается прямая при шаге вправо на 1. k > 0 — в горку, k < 0 — с горки, k = 0 — горизонталь.",
        "<b>b</b> — где прямая пересекает ось y: в точке (0; b).",
        "Одинаковые k — прямые параллельны."] },
    { name: "Парабола", formula: function (p) { return "y=" + num(p.a, "x^2"); },
      params: [["a", -3, 3, 0.1, 1, "yellow"]],
      f: function (p) { return function (x) { return p.a * x * x; }; },
      facts: ["Формула " + m("y=ax^2") + ", график — парабола с вершиной в (0; 0).",
        "a > 0 — ветви вверх (улыбка), a < 0 — вниз (грусть).",
        "Чем больше |a|, тем уже парабола. При |a| < 1 она шире стандартной.",
        "Чётная: симметрична относительно оси y."] },
    { name: "Гипербола", formula: function (p) { return "y=" + UI.fmt(p.k, 1) + "/x"; },
      params: [["k", -8, 8, 0.5, 4, "yellow"]],
      f: function (p) { return function (x) { return x === 0 ? NaN : p.k / x; }; },
      facts: ["Формула " + m("y=k/x") + ": обратная пропорциональность. График — гипербола из двух ветвей.",
        "При x = 0 функция не определена: на ноль делить нельзя. Ветви бесконечно приближаются к осям, но не касаются их.",
        "k > 0 — ветви в I и III четвертях, k < 0 — во II и IV.",
        "Чтобы найти k, перемножь координаты любой точки графика: k = x·y."] },
    { name: "Корень", formula: function (p) { return "y=" + num(p.k, "sqrt(x)"); },
      params: [["k", -3, 3, 0.1, 1, "yellow"]],
      f: function (p) { return function (x) { return x < 0 ? NaN : p.k * Math.sqrt(x); }; },
      facts: ["Формула " + m("y=sqrt(x)") + ". Это половинка лежачей параболы.",
        "Определена только при x ≥ 0: из отрицательных корень не извлекают.",
        "Проходит через (0; 0), (1; 1), (4; 2), (9; 3). Удобные точки — полные квадраты.",
        "Растёт, но всё медленнее и медленнее."] },
    { name: "Модуль", formula: function (p) { return "y=" + num(p.k, "|x|"); },
      params: [["k", -3, 3, 0.1, 1, "yellow"]],
      f: function (p) { return function (x) { return p.k * Math.abs(x); }; },
      facts: ["Формула " + m("y=|x|") + ". |x| — расстояние от x до нуля, поэтому оно не бывает отрицательным.",
        "График — галочка: при x ≥ 0 это y = x, при x < 0 это y = −x.",
        "Чётная, как и парабола, но с острым углом вместо круглого дна."] },
    { name: "Куб", formula: function (p) { return "y=" + num(p.a, "x^3"); },
      params: [["a", -2, 2, 0.05, 0.25, "yellow"]],
      f: function (p) { return function (x) { return p.a * x * x * x; }; },
      facts: ["Формула " + m("y=x^3") + ", график — кубическая парабола.",
        "Нечётная: левая половина — правая, повёрнутая на 180°.",
        "Принимает все значения: и сколь угодно большие, и сколь угодно отрицательные."] },
    { name: "Степень xⁿ", formula: function (p) { return p.n === 1 ? "y=x" : "y=x^" + p.n; },
      params: [["n", 1, 6, 1, 4, "pink"]],
      f: function (p) { return function (x) { return Math.pow(x, p.n); }; },
      facts: ["Формула " + m("y=x^n") + ", n — натуральное число. При n = 1 это прямая, при n = 2 — парабола, при n = 3 — кубическая парабола.",
        "<b>n чётное</b> (2, 4, 6): функция чётная, график симметричен относительно оси y. E = [0; +∞). Убывает при x ≤ 0, возрастает при x ≥ 0.",
        "<b>n нечётное</b> (1, 3, 5): функция нечётная, график симметричен относительно начала координат. E — все числа. Возрастает на всей прямой.",
        "Все графики проходят через (0; 0) и (1; 1). Чем больше n, тем сильнее график прижат к оси x на [−1; 1] и тем круче взлетает за его пределами."] },
    { name: "Кубический корень", formula: function (p) { return "y=" + num(p.k, "∛x"); },
      params: [["k", -3, 3, 0.1, 1, "yellow"]],
      f: function (p) { return function (x) { return p.k * Math.cbrt(x); }; },
      facts: ["Формула " + m("y=∛x") + ". ∛x — число, куб которого равен x: ∛8 = 2, ∛(−8) = −2.",
        "В отличие от √x определён при <b>всех</b> x: куб бывает и отрицательным.",
        "Нечётная, возрастает на всей прямой, E — все числа. График — кубическая парабола y = x³, отражённая относительно прямой y = x.",
        "Удобные точки: (0; 0), (1; 1), (8; 2), (−1; −1), (−8; −2)."] }
  ];

  function num(k, tail) {
    if (Math.abs(k) < 1e-9) return "0";
    if (Math.abs(k - 1) < 1e-9) return tail;
    if (Math.abs(k + 1) < 1e-9) return "-" + tail;
    return UI.fmt(k, 2).replace("−", "-").replace(",", ".") + tail;
  }
  function sign(b) {
    if (Math.abs(b) < 1e-9) return "";
    return (b > 0 ? "+" : "-") + UI.fmt(Math.abs(b), 2).replace(",", ".");
  }

  function zoo() {
    var pb = UI.plotBox({ x: [-7, 7], y: [-5, 5], zoom: true, pan: true });
    var fam = FAMILIES[0], p = {};
    var formula = h("div", { class: "formula-bar" });
    var sliders = h("div", { class: "sliders" });
    var facts = h("ul", { class: "zoo-facts" });
    var chips = h("div", { class: "btns" });
    function choose(F) {
      fam = F; p = {}; sliders.innerHTML = "";
      F.params.forEach(function (d) {
        p[d[0]] = d[4];
        sliders.appendChild(UI.slider(m(d[0]), d[1], d[2], d[3], d[4], function (v) { p[d[0]] = v; draw(); }, { color: d[5] }));
      });
      facts.innerHTML = F.facts.map(function (t) { return "<li>" + t + "</li>"; }).join("");
      draw();
    }
    function draw() {
      formula.innerHTML = m(fam.formula(p));
      var P = pb.plot;
      if (!P) return;
      P.layers = [{ type: "fn", f: fam.f(p), color: "#d18f00", width: 3.5, glow: true }];
      if (fam.name === "Прямая") P.layers.push({ type: "point", x: 0, y: p.b, color: "#0a8bd0", label: "(0; " + UI.fmt(p.b) + ")" });
      P.draw();
    }
    FAMILIES.forEach(function (F, i) {
      var b = h("button", { class: "chip" + (i ? "" : " is-on"), text: F.name, onclick: function () {
        Array.prototype.forEach.call(chips.children, function (x) { x.classList.remove("is-on"); });
        b.classList.add("is-on"); choose(F);
      } });
      chips.appendChild(b);
    });
    UI.later(function () { pb.mount(); choose(FAMILIES[0]); });
    return h("div", { class: "sliders" }, chips,
      h("div", { class: "split" }, h("div", { class: "sliders" }, formula, sliders, facts), pb.el));
  }

  /* Найди пару: формула ↔ график */
  var POOL = ["2x-1", "-x+2", "x^2-3", "-x^2+2", "3/x", "-2/x", "sqrt(x)", "|x|-2", "x^3/4", "-|x|+3", "(x-2)^2", "sqrt(x+3)", "0.5x+1"];
  function matchTask() {
    var wrap = h("div"), el, pickF = null, left = 0, errors = 0;
    var status = h("p", { class: "muted" });
    function start() {
      wrap.innerHTML = ""; errors = 0; pickF = null;
      var set = UI.shuffle(POOL).slice(0, 6); left = set.length;
      var fl = h("div", { class: "match__formulas" }), gl = h("div", { class: "match__graphs" });
      UI.shuffle(set).forEach(function (s) {
        var b = h("button", { class: "match__card", html: m("y=" + s) });
        b.dataset.key = s;
        b.onclick = function () {
          if (b.classList.contains("is-done")) return;
          fl.querySelectorAll(".is-on").forEach(function (x) { x.classList.remove("is-on"); });
          b.classList.add("is-on"); pickF = b;
        };
        fl.appendChild(b);
      });
      UI.shuffle(set).forEach(function (s, i) {
        var g = h("button", { class: "match__card", html: UI.mini(Formula.compile(s), { color: Plot.PALETTE[i % 6] }) });
        g.onclick = function () {
          if (!pickF || g.classList.contains("is-done")) return;
          if (pickF.dataset.key === s) {
            pickF.classList.remove("is-on"); pickF.classList.add("is-done"); g.classList.add("is-done");
            pickF = null; left--;
            if (!left) { status.textContent = "Все пары найдены! Ошибок: " + errors + "."; el.complete(); }
          } else {
            errors++;
            [g, pickF].forEach(function (x) { x.classList.remove("is-wrong"); void x.offsetWidth; x.classList.add("is-wrong"); });
            status.textContent = "Ошибок: " + errors;
          }
        };
        gl.appendChild(g);
      });
      wrap.appendChild(h("div", { class: "match" }, fl, gl));
      status.textContent = "Выбери формулу слева, потом её график справа.";
    }
    el = UI.task({
      id: "zoo:match", level: 2, xp: 20, kind: "action", badge: "Найди пару",
      q: "<p>Шесть формул, шесть графиков. Соедини каждую формулу со своим графиком. Пары каждый раз новые — можно играть снова.</p>",
      extra: h("div", { class: "sliders" }, wrap, status, h("button", { class: "btn btn--ghost btn--sm", style: "align-self:flex-start", text: "🔀 Новая раздача", onclick: start })),
      hints: ["Сначала определи вид: прямая, парабола, гипербола, корень, модуль, куб. Потом смотри на детали: куда ветви, где пересекает ось y."]
    });
    start();
    return el;
  }

  App.register({
    id: "zoo", num: 4, color: "var(--purple)", tasks: 11,
    title: "Зоопарк функций", subtitle: "Восемь видов, которые надо узнавать в лицо",
    render: function (root) {
      var s1 = UI.section("Знакомься с обитателями", "Выбери вид и покрути ползунки. Смотри, что каждая буква делает с графиком.");
      s1.appendChild(zoo());
      root.appendChild(s1);

      var s2 = UI.section("Игра: найди пару");
      s2.appendChild(matchTask());
      root.appendChild(s2);

      var s3 = UI.section("Задачи по теме");
      var t = h("div", { class: "tasks" });
      t.appendChild(UI.task({
        id: "zoo:t1", level: 2, xp: 15, kind: "number", prefix: "k =",
        q: "<p>Прямая " + m("y=kx+b") + " проходит через точки (1; 3) и (3; 7). Найди k.</p>", answer: 2,
        hints: ["k — это «на сколько вырос y» делить на «на сколько вырос x»."],
        solution: "x вырос на 3 − 1 = 2, y вырос на 7 − 3 = 4. k = 4 / 2 = 2."
      }));
      t.appendChild(UI.task({
        id: "zoo:t2", level: 1, xp: 10, kind: "choice",
        q: "<p>Какая прямая параллельна " + m("y=-3x+1") + "?</p>",
        options: [m("y=3x+1"), m("y=-3x-5"), m("y=x-3"), m("y=-x/3")], answer: 1,
        hints: ["Параллельные прямые идут с одинаковым наклоном. Какая буква отвечает за наклон?"],
        solution: "У параллельных прямых одинаковый k. У y = −3x − 5 тоже k = −3."
      }));
      t.appendChild(UI.task({
        id: "zoo:t3", level: 2, xp: 15, kind: "number", prefix: "k =",
        q: "<p>Гипербола " + m("y=k/x") + " проходит через точку (−2; 6). Найди k.</p>", answer: -12,
        hints: ["y = k/x, значит k = x·y."],
        solution: "k = x·y = (−2)·6 = −12."
      }));
      var A = UI.mini(function (x) { return -x * x + 1; }, { label: "А" });
      var B = UI.mini(function (x) { return -2 * x + 1; }, { label: "Б", color: "#0a8bd0" });
      var C = UI.mini(function (x) { return x === 0 ? NaN : -2 / x; }, { label: "В", color: "#e23468" });
      t.appendChild(UI.task({
        id: "zoo:t4", level: 2, xp: 20, kind: "choice", badge: "Как в ОГЭ",
        q: "<p>Установи соответствие между графиками и формулами.</p>" +
          '<div class="options options--grid" style="margin:10px 0">' + "<div>" + A + "</div><div>" + B + "</div><div>" + C + "</div></div>" +
          "<p>1) " + m("y=-2x+1") + "&nbsp;&nbsp; 2) " + m("y=-2/x") + "&nbsp;&nbsp; 3) " + m("y=-x^2+1") + "</p>",
        options: ["А1 Б2 В3", "А3 Б1 В2", "А2 Б3 В1", "А3 Б2 В1"], answer: 1,
        hints: ["Сначала узнай вид каждого графика: где парабола, где прямая, где гипербола."],
        solution: "А — парабола, ветви вниз: формула 3. Б — прямая с горки: формула 1. В — гипербола во II и IV четвертях: формула 2."
      }));
      t.appendChild(UI.task({
        id: "zoo:t5", level: 3, xp: 20, kind: "formula", prefix: "y =",
        q: "<p>Запиши формулу прямой по графику.</p>", answer: "0.5x-2",
        plot: { x: [-6, 7], y: [-5, 4], unitGrid: true, layers: [
          { type: "fn", f: function (x) { return 0.5 * x - 2; }, color: "#d18f00" },
          { type: "point", x: 0, y: -2, color: "#1d2033", r: 5 }, { type: "point", x: 4, y: 0, color: "#1d2033", r: 5 }] },
        hints: ["b видно сразу: где прямая пересекает ось y?", "Для k сдвинься от отмеченной точки (0; −2) вправо до (4; 0): x вырос на 4, y — на 2."],
        solution: "b = −2. Шаг вправо на 4 даёт подъём на 2, значит k = 2/4 = 0,5. Ответ: y = 0,5x − 2."
      }));
      t.appendChild(UI.task({
        id: "zoo:t6", level: 3, xp: 20, kind: "numbers",
        q: "<p>Найди абсциссы (x) точек пересечения графиков " + m("y=8/x") + " и " + m("y=2x") + ".</p>", answer: [-2, 2],
        hints: ["Приравняй: 8/x = 2x. Умножь обе части на x (x ≠ 0)."],
        solution: "8/x = 2x → 2x² = 8 → x² = 4 → x = 2 или x = −2. Прямая проходит через обе ветви гиперболы."
      }));
      t.appendChild(UI.task({
        id: "zoo:t7", level: 1, xp: 10, kind: "choice",
        q: "<p>Через какую точку проходит график " + m("y=∛x") + "?</p>",
        options: ["(8; 2)", "(8; 4)", "(−8; 2)", "(9; 3)"], answer: 0,
        hints: ["Какое число в кубе даёт 8? А −8?"],
        solution: "2³ = 8, значит ∛8 = 2 и точка (8; 2) на графике. ∛(−8) = −2, а не 2. (9; 3) лежит на графике √x, а не ∛x."
      }));
      t.appendChild(UI.task({
        id: "zoo:t8", level: 2, xp: 15, kind: "choice",
        q: "<p>Найди область значений функции " + m("y=x^4-3") + ".</p>",
        options: ["[−3; +∞)", "все числа", "[3; +∞)", "(−∞; −3]"], answer: 0,
        hints: ["Степень чётная: x⁴ ≥ 0 при любом x. Какое наименьшее значение у x⁴ − 3?"],
        solution: "x⁴ ≥ 0, значит x⁴ − 3 ≥ −3, и любое значение от −3 и выше достигается. E = [−3; +∞)."
      }));
      t.appendChild(UI.task({
        id: "zoo:t9", level: 2, xp: 15, kind: "choice",
        q: "<p>Гипербола " + m("y=k/x") + " проходит через точку (2; −3). Через какую ещё точку она проходит?</p>",
        options: ["(−2; 3)", "(3; 2)", "(−2; −3)", "(6; 1)"], answer: 0,
        hints: ["Сначала найди k = x·y. Потом проверь у каждой точки, равно ли произведение координат этому k."],
        solution: "k = 2·(−3) = −6. У (−2; 3) произведение −6 ✓. У остальных +6."
      }));
      t.appendChild(UI.task({
        id: "zoo:t10", level: 2, xp: 15, kind: "number", prefix: "b =",
        q: "<p>Прямая " + m("y=kx+b") + " параллельна прямой " + m("y=2x") + " и проходит через точку (1; 5). Найди b.</p>", answer: 3,
        hints: ["Параллельна — значит k такой же: k = 2.", "Подставь точку в y = 2x + b."],
        solution: "k = 2. 5 = 2·1 + b → b = 3. Прямая y = 2x + 3."
      }));
      s3.appendChild(t);
      root.appendChild(s3);
    }
  });
})();
