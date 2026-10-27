/* Блок 3. Свойства функции: читаем график как карту. */
(function () {
  "use strict";
  var h = UI.h, m = UI.m;

  var HILLS_PTS = [[-7, -3], [-5, 3], [-1, -3], [3, 3], [5, 1]];
  var hills = UI.smooth(HILLS_PTS);

  var PRESETS = [
    { name: "Горки", f: hills, D: [-7, 5], ends: [[-7, -3], [5, 1]], view: [[-8, 6], [-4.5, 4.5]],
      Dtext: "[−7; 5]", Etext: "[−3; 3]" },
    { name: "Парабола", f: function (x) { return x * x / 2 - 2; }, view: [[-6, 6], [-4, 5]], Dtext: "все числа", Etext: "[−2; +∞)" },
    { name: "Гипербола", f: function (x) { return x === 0 ? NaN : 4 / x; }, view: [[-7, 7], [-5, 5]], Dtext: "x ≠ 0", Etext: "y ≠ 0" },
    { name: "Корень", f: function (x) { return x < 0 ? NaN : 1.5 * Math.sqrt(x) - 2; }, view: [[-2, 9], [-3, 3]], D: [0, 9], ends: [[0, -2]], Dtext: "x ≥ 0", Etext: "y ≥ −2" }
  ];

  function deriv(f, x) { var e = 1e-4; return (f(x + e) - f(x - e)) / (2 * e); }

  function zerosOf(f, a, b) {
    var res = [], n = 2000, prev = f(a), px = a;
    for (var i = 1; i <= n; i++) {
      var x = a + (b - a) * i / n, y = f(x);
      if (!isNaN(prev) && !isNaN(y) && (prev === 0 || prev * y < 0)) {
        var lo = px, hi = x;
        for (var k = 0; k < 50; k++) { var mid = (lo + hi) / 2; if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid; }
        var z = Math.round((lo + hi) / 2 * 1000) / 1000;
        if (!res.length || Math.abs(res[res.length - 1] - z) > 1e-3) res.push(z);
      }
      prev = y; px = x;
    }
    return res;
  }

  function hillsLayers() {
    return [
      { type: "fn", f: hills, color: "#d18f00", domain: [-7, 5] },
      { type: "point", x: -7, y: -3, color: "#d18f00", r: 5 },
      { type: "point", x: 5, y: 1, color: "#d18f00", r: 5 }
    ];
  }

  function explorer() {
    var pb = UI.plotBox({ x: [-8, 6], y: [-4.5, 4.5] });
    var preset = PRESETS[0];
    var on = { zeros: true, sign: false, mono: false, ext: false, de: false };
    var hover = null;
    var read = h("div", { class: "readout" });
    var LABELS = { zeros: "Нули", sign: "Плюс / минус", mono: "Рост / спад", ext: "Макс / мин", de: "D и E" };
    var toggles = h("div", { class: "btns" });
    Object.keys(LABELS).forEach(function (k) {
      var b = h("button", { class: "chip" + (on[k] ? " is-on" : ""), text: LABELS[k], onclick: function () {
        on[k] = !on[k]; b.classList.toggle("is-on"); draw();
      } });
      toggles.appendChild(b);
    });
    var presets = h("div", { class: "btns" });
    PRESETS.forEach(function (p, i) {
      var b = h("button", { class: "chip" + (i ? "" : " is-on"), text: p.name, onclick: function () {
        preset = p; Array.prototype.forEach.call(presets.children, function (x) { x.classList.remove("is-on"); });
        b.classList.add("is-on"); pb.plot.setView(p.view[0], p.view[1]); draw();
      } });
      presets.appendChild(b);
    });

    function draw() {
      var P = pb.plot, f = preset.f, L = [];
      var a = preset.D ? preset.D[0] : P.xmin(), b = preset.D ? preset.D[1] : P.xmax();
      if (on.sign) {
        L.push({ type: "region", f: f, from: a, to: b, where: function (x, y) { return y > 0; }, color: "rgba(23, 163, 74, 0.28)" });
        L.push({ type: "region", f: f, from: a, to: b, where: function (x, y) { return y < 0; }, color: "rgba(226, 52, 104, 0.28)" });
      }
      if (on.de) {
        L.push({ type: "custom", draw: function (c, P) {
          c.lineWidth = 6; c.lineCap = "round"; c.globalAlpha = 0.85;
          c.strokeStyle = "#7a55f0"; c.beginPath();
          if (preset.name === "Гипербола") { c.moveTo(0, P.Y(0)); c.lineTo(P.X(-0.15), P.Y(0)); c.moveTo(P.X(0.15), P.Y(0)); c.lineTo(P.w, P.Y(0)); }
          else { c.moveTo(P.X(Math.max(a, P.xmin())), P.Y(0)); c.lineTo(P.X(Math.min(b, P.xmax())), P.Y(0)); }
          c.stroke();
          var ys = [], n = 800;
          for (var i = 0; i <= n; i++) { var y = f(a + (b - a) * i / n); if (!isNaN(y)) ys.push(y); }
          var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
          if (preset.name === "Парабола") hi = P.ymax();
          if (preset.name === "Корень") hi = P.ymax();
          c.strokeStyle = "#0a8bd0"; c.beginPath();
          if (preset.name === "Гипербола") { c.moveTo(P.X(0), 0); c.lineTo(P.X(0), P.Y(0.15)); c.moveTo(P.X(0), P.Y(-0.15)); c.lineTo(P.X(0), P.h); }
          else { c.moveTo(P.X(0), P.Y(lo)); c.lineTo(P.X(0), P.Y(hi)); }
          c.stroke();
        } });
      }
      if (on.mono) {
        L.push({ type: "custom", draw: function (c, P) {
          var x0 = Math.max(a, P.xmin()), x1 = Math.min(b, P.xmax()), n = 600, prev = null;
          c.lineWidth = 7; c.lineCap = "round"; c.globalAlpha = 0.55;
          for (var i = 0; i <= n; i++) {
            var x = x0 + (x1 - x0) * i / n, y = f(x);
            if (isNaN(y) || Math.abs(y) > 50) { prev = null; continue; }
            if (prev) {
              c.strokeStyle = y > prev[1] ? "#17a34a" : "#e23468";
              c.beginPath(); c.moveTo(P.X(prev[0]), P.Y(prev[1])); c.lineTo(P.X(x), P.Y(y)); c.stroke();
            }
            prev = [x, y];
          }
        } });
      }
      L.push({ type: "fn", f: f, color: "#d18f00", domain: preset.D });
      (preset.ends || []).forEach(function (e) { L.push({ type: "point", x: e[0], y: e[1], color: "#d18f00", r: 5 }); });
      if (on.zeros) zerosOf(f, a, b).forEach(function (z) { L.push({ type: "point", x: z, y: 0, color: "#1d2033", stroke: "#0a8bd0", r: 6, label: UI.fmt(z), labelColor: "#0a8bd0" }); });
      if (on.ext && preset.name === "Горки") {
        HILLS_PTS.forEach(function (p, i) {
          var max = p[1] === 3, min = p[1] === -3;
          if (max || min) L.push({ type: "point", x: p[0], y: p[1], color: max ? "#17a34a" : "#e23468", r: 7, label: max ? "max = 3" : "min = −3" });
          void i;
        });
      } else if (on.ext && preset.name === "Парабола") {
        L.push({ type: "point", x: 0, y: -2, color: "#e23468", r: 7, label: "min = −2" });
      } else if (on.ext && preset.name === "Корень") {
        L.push({ type: "point", x: 0, y: -2, color: "#e23468", r: 7, label: "min = −2" });
      }
      if (hover && !isNaN(f(hover))) {
        L.push({ type: "vline", x: hover, color: "rgba(29, 32, 51, 0.35)", width: 1 });
        L.push({ type: "point", x: hover, y: f(hover), color: "#1d2033", r: 6 });
      }
      P.layers = L; P.draw();
      var y = hover !== null ? f(hover) : NaN, d = hover !== null ? deriv(f, hover) : NaN;
      read.innerHTML = "";
      [["x", hover === null ? "наведи на график" : UI.fmt(hover)],
       ["f(x)", isNaN(y) ? (hover === null ? "—" : "не определена") : UI.fmt(y)],
       ["знак", isNaN(y) ? "—" : Math.abs(y) < 0.05 ? "ноль!" : y > 0 ? "плюс ↑" : "минус ↓"],
       ["функция", isNaN(d) ? "—" : Math.abs(d) < 0.05 ? "на вершине" : d > 0 ? "растёт ↗" : "убывает ↘"],
       ["D(f)", preset.Dtext], ["E(f)", preset.Etext]
      ].forEach(function (r) { read.appendChild(h("div", null, r[0], h("b", { text: r[1] }))); });
    }
    UI.later(function () {
      var P = pb.mount();
      P.opts.onMove = function (x) { hover = x; draw(); };
      P.opts.onLeave = function () { hover = null; draw(); };
      draw();
    });
    return h("div", { class: "sliders" }, presets, pb.el, toggles, read);
  }

  App.register({
    id: "props", num: 3, color: "var(--green)", tasks: 15,
    title: "Свойства: читаем график", subtitle: "Нули, знаки, рост, максимум — как на карте",
    render: function (root) {
      var s1 = UI.section("График — это карта горной дороги", "Едем слева направо, как по трассе. Всё, что спрашивают про свойства, — это вопросы водителю.");
      var cheat = h("div", { class: "cheat" });
      [
        ["D(f)", "<b>Область определения.</b> По каким x вообще можно ехать — где дорога существует."],
        ["E(f)", "<b>Область значений.</b> На каких высотах побывала машина — от самой низкой до самой высокой."],
        ["f(x)=0", "<b>Нули.</b> Где дорога пересекает «уровень моря» — ось x."],
        ["f(x)>0", "<b>Промежутки знакопостоянства.</b> Где едем выше моря (функция положительна), где ниже (отрицательна)."],
        ["↗ ↘", "<b>Возрастание и убывание.</b> Где в горку, где с горки. Отвечаем промежутками x."],
        ["max, min", "<b>Наибольшее и наименьшее.</b> Самая высокая и самая низкая точка — это значения y."]
      ].forEach(function (c) { cheat.appendChild(h("div", { class: "cheat__item", html: '<span class="m">' + c[0] + "</span>" + c[1] })); });
      s1.appendChild(cheat);
      s1.appendChild(UI.callout("warn", "<p><b>Главная ловушка.</b> Промежутки возрастания и знаков записывают через <b>x</b> (где по горизонтали), а наибольшее значение — это <b>y</b> (на какой высоте). Путают все. Ты теперь не будешь.</p>"));
      root.appendChild(s1);

      var s2 = UI.section("Рентген графика", "Включай подсветку свойств и води мышкой (или пальцем) по графику. Справа внизу — что видит водитель в этой точке.");
      s2.appendChild(explorer());
      root.appendChild(s2);

      var s3 = UI.section("Чётные и нечётные", "Свойство про симметрию графика.");
      s3.appendChild(h("div", { class: "split split--even" },
        UI.theory("<p><b>Чётная</b> функция: " + m("f(-x)=f(x)") + ". График симметричен относительно оси y — сложи лист по оси, половинки совпадут. Пример: " + m("y=x^2") + ", " + m("y=|x|") + ".</p>" +
          "<p><b>Нечётная</b>: " + m("f(-x)=-f(x)") + ". График симметричен относительно начала координат — поверни на 180°, совпадёт. Пример: " + m("y=x^3") + ", " + m("y=1/x") + ".</p>" +
          "<p>Большинство функций ни то ни другое, и это нормально: " + m("y=x+1") + ".</p>"),
        h("div", { class: "options options--grid" },
          h("div", { html: UI.mini(function (x) { return x * x / 3 - 2; }, { label: "чётная" }) }),
          h("div", { html: UI.mini(function (x) { return x * x * x / 12; }, { color: "#0a8bd0", label: "нечётная" }) }))));
      root.appendChild(s3);

      var s35 = UI.section("Ещё три свойства", "Их спрашивают реже, но в 9 классе они есть — и в учебнике, и в контрольных.");
      var more = h("div", { class: "cheat" });
      [
        ["Ограниченность", "<b>Ограничена снизу</b> — у графика есть «пол», ниже которого он не опускается: " + m("y=x^2") + " никогда не меньше 0. <b>Ограничена сверху</b> — есть «потолок». Есть и пол, и потолок — функция просто <b>ограничена</b>."],
        ["Непрерывность", "Функция <b>непрерывна на промежутке</b>, если там её график — сплошная линия: рисуешь, не отрывая карандаш. У " + m("y=1/x") + " при x = 0 график рвётся, поэтому она непрерывна отдельно на (−∞; 0) и на (0; +∞)."],
        ["Выпуклость", "<b>Выпукла вниз</b> — график как чашка, в нём держится вода: " + m("y=x^2") + ". <b>Выпукла вверх</b> — как шапка: " + m("y=-x^2") + ", " + m("y=sqrt(x)") + ". Отрезок между двумя точками чашки лежит выше графика, у шапки — ниже."]
      ].forEach(function (c) { more.appendChild(h("div", { class: "cheat__item", html: "<span class=\"m\">" + c[0] + "</span>" + c[1] })); });
      s35.appendChild(more);
      s35.appendChild(h("div", { class: "options options--grid", style: "max-width:520px" },
        h("div", { html: UI.mini(function (x) { return x * x / 4 - 2; }, { label: "выпукла вниз" }) }),
        h("div", { html: UI.mini(function (x) { return -x * x / 4 + 2; }, { color: "#0a8bd0", label: "выпукла вверх" }) }),
        h("div", { html: UI.mini(function (x) { return 4 / (x * x + 1) - 2; }, { color: "#17a34a", label: "ограничена" }) })));
      s35.appendChild(UI.callout("tip", "<p><b>План: как описать свойства функции.</b> В задании «перечислите свойства» иди строго по списку, тогда ничего не потеряешь:</p>" +
        "<ol style=\"margin:8px 0 0;padding-left:22px\"><li>Область определения D(f).</li><li>Область значений E(f).</li><li>Нули функции.</li><li>Промежутки знакопостоянства: где f(x) > 0 и где f(x) < 0.</li>" +
        "<li>Промежутки возрастания и убывания.</li><li>Наибольшее и наименьшее значения.</li><li>Ограниченность сверху и снизу.</li><li>Непрерывность.</li><li>Выпуклость.</li><li>Чётность или нечётность.</li></ol>"));
      root.appendChild(s35);

      var s4 = UI.section("Задачи по теме", "Задачи 1–6 — про «Горки», это формат задания из ОГЭ. Дальше — про формулы и новые свойства.");
      var t = h("div", { class: "tasks" });
      function plot() { return { x: [-8, 6], y: [-4.5, 4.5], unitGrid: true, layers: hillsLayers() }; }
      t.appendChild(UI.task({
        id: "props:t1", level: 1, xp: 10, kind: "numbers", plot: plot(),
        q: "<p>Найди все нули функции.</p>", answer: [-6, -3, 1],
        hints: ["Нули — где график пересекает ось x. Посмотри, какие x стоят под этими точками."],
        solution: "График пересекает ось x в точках −6, −3 и 1."
      }));
      t.appendChild(UI.task({
        id: "props:t2", level: 1, xp: 10, kind: "number", plot: plot(),
        q: "<p>Найди наибольшее значение функции.</p>", answer: 3,
        hints: ["Значение — это y. Найди самую высокую точку графика и посмотри на её высоту, а не на x."],
        solution: "Самые высокие точки (−5; 3) и (3; 3). Наибольшее значение — 3. Ответ «−5» или «3 при x = 3» — путаница x и y."
      }));
      t.appendChild(UI.task({
        id: "props:t3", level: 2, xp: 15, kind: "choice", plot: plot(),
        q: "<p>Какова область значений " + m("E(f)") + "?</p>",
        options: ["[−3; 3]", "[−7; 5]", "(−3; 3)", "[−6; 1]"], answer: 0,
        hints: ["Область значений — по оси y: от самой низкой точки до самой высокой. Концы входят, если там есть закрашенная точка графика."],
        solution: "Самая низкая точка на высоте −3, самая высокая — 3, и все высоты между ними тоже есть. E(f) = [−3; 3]. А [−7; 5] — это область определения D(f)."
      }));
      t.appendChild(UI.task({
        id: "props:t4", level: 2, xp: 15, kind: "choice", plot: plot(),
        q: "<p>На каких промежутках функция <b>возрастает</b>?</p>",
        options: ["[−7; −5] и [−1; 3]", "[−5; −1] и [3; 5]", "[−3; 3]", "(−6; −3) и (1; 5]"], answer: 0,
        hints: ["Едем слева направо. Отметь участки, где дорога идёт в горку, и запиши их x-ами — от начала подъёма до вершины."],
        solution: "В горку: от x = −7 до −5 и от −1 до 3. Ответ [−7; −5] и [−1; 3]."
      }));
      t.appendChild(UI.task({
        id: "props:t5", level: 2, xp: 15, kind: "choice", plot: plot(),
        q: "<p>При каких x выполняется " + m("f(x)>0") + "?</p>",
        options: ["(−6; −3) и (1; 5]", "[−7; −5] и [−1; 3]", "[−7; −6) и (−3; 1)", "(−5; 3)"], answer: 0,
        hints: ["f(x) > 0 — график выше оси x. Нули не берём: там f(x) = 0, а не больше нуля. Поэтому скобки у нулей круглые."],
        solution: "Выше оси x график между нулями −6 и −3 и от нуля 1 до конца, x = 5 (там f(5) = 1 > 0, конец входит)."
      }));
      t.appendChild(UI.task({
        id: "props:t6", level: 3, xp: 20, kind: "number", plot: plot(),
        q: "<p>Сколько корней у уравнения " + m("f(x)=2") + "?</p>", answer: 4,
        hints: ["Мысленно проведи горизонтальную прямую y = 2. Сколько раз она пересечёт график?", "Не забудь последний участок: от вершины (3; 3) график спускается до (5; 1) и по пути проходит высоту 2."],
        solution: "Прямая y = 2 пересекает каждый из четырёх участков «горок» по одному разу — 4 корня."
      }));
      t.appendChild(UI.task({
        id: "props:t7", level: 2, xp: 15, kind: "choice",
        q: "<p>Какая функция <b>чётная</b>?</p>",
        options: [m("y=x^3"), m("y=x^2+|x|"), m("y=x+1"), m("y=sqrt(x)")], answer: 1,
        hints: ["Подставь −x вместо x. Если формула не изменилась — функция чётная."],
        solution: "(−x)² + |−x| = x² + |x|. Не изменилась — чётная. У x³ знак меняется (нечётная), у √x отрицательных x нет вообще."
      }));
      t.appendChild(UI.task({
        id: "props:t8", level: 3, xp: 20, kind: "choice",
        q: "<p>Найди область определения " + m("y=sqrt(6-2x)") + ".</p>",
        options: ["x ≤ 3", "x ≥ 3", "x < 3", "все числа"], answer: 0,
        hints: ["Корень извлекается только из неотрицательного числа: 6 − 2x ≥ 0.", "При делении неравенства на отрицательное число знак переворачивается."],
        solution: "6 − 2x ≥ 0 → −2x ≥ −6 → x ≤ 3. При x = 3 под корнем 0, а √0 = 0, поэтому 3 входит."
      }));
      t.appendChild(UI.task({
        id: "props:t9", level: 2, xp: 15, kind: "number", plot: plot(),
        q: "<p>Найди наименьшее значение функции на отрезке [1; 5].</p>", answer: 0,
        hints: ["Смотри только на кусок графика между x = 1 и x = 5. Остальное сейчас не существует.", "На этом куске функция сначала растёт, потом убывает. Где самая низкая точка — на вершине или на одном из концов?"],
        solution: "На [1; 5] график стартует с высоты f(1) = 0, поднимается до 3 и спускается до f(5) = 1. Самая низкая точка — левый конец: наименьшее значение 0. Ответ «−3» — ловушка: эта точка вне отрезка."
      }));
      t.appendChild(UI.task({
        id: "props:t10", level: 1, xp: 10, kind: "choice",
        q: "<p>На каком промежутке функция " + m("y=-2x+6") + " принимает положительные значения?</p>",
        options: ["x < 3", "x > 3", "x < −3", "x > 6"], answer: 0,
        hints: ["Реши неравенство −2x + 6 > 0. При делении на отрицательное число знак переворачивается."],
        solution: "−2x + 6 > 0 → −2x > −6 → x < 3. Прямая с горки: левее нуля x = 3 она выше оси x."
      }));
      t.appendChild(UI.task({
        id: "props:t11", level: 1, xp: 10, kind: "number",
        q: "<p>Функция f нечётная, " + m("f(3)=-5") + ". Найди " + m("f(-3)") + ".</p>", answer: 5,
        hints: ["Нечётная: f(−x) = −f(x)."],
        solution: "f(−3) = −f(3) = −(−5) = 5. График симметричен относительно начала координат: точка (3; −5) переходит в (−3; 5)."
      }));
      t.appendChild(UI.task({
        id: "props:t12", level: 2, xp: 15, kind: "choice",
        q: "<p>Какая функция ограничена снизу, но <b>не</b> ограничена сверху?</p>",
        options: [m("y=x^2-1"), m("y=x^3"), m("y=-x^2"), m("y=4/(x^2+1)")], answer: 0,
        hints: ["Представь график каждой: есть ли «пол»? есть ли «потолок»?"],
        solution: "x² − 1 ≥ −1 — пол есть, а вверх ветви уходят бесконечно, потолка нет. x³ не ограничена ни сверху, ни снизу. −x² ограничена только сверху. 4/(x² + 1) ограничена с обеих сторон: 0 < y ≤ 4."
      }));
      t.appendChild(UI.task({
        id: "props:t13", level: 2, xp: 15, kind: "choice",
        q: "<p>График какой функции имеет разрыв?</p>",
        options: [m("y=x^2-1"), m("y=|x-2|"), m("y=3/(x+1)"), m("y=sqrt(x)")], answer: 2,
        hints: ["Разрыв бывает там, где функция вдруг не определена посреди числовой прямой. Где здесь знаменатель?"],
        solution: "У y = 3/(x + 1) при x = −1 знаменатель равен нулю: гипербола рвётся на две ветви. Остальные графики рисуются одной линией. У √x график просто начинается в точке (0; 0) — это не разрыв, а начало."
      }));
      t.appendChild(UI.task({
        id: "props:t14", level: 2, xp: 15, kind: "choice",
        q: "<p>Какая функция выпукла вверх на всей области определения?</p>",
        options: [m("y=x^2+3"), m("y=-x^2+4x"), m("y=|x|"), m("y=2x+1")], answer: 1,
        hints: ["Выпукла вверх — «шапка». У какой параболы ветви вниз?"],
        solution: "y = −x² + 4x — парабола с ветвями вниз, это «шапка». x² + 3 — «чашка» (выпукла вниз). У |x| и прямой выпуклости нет: они составлены из отрезков прямых."
      }));
      t.appendChild(UI.task({
        id: "props:t15", level: 3, xp: 25, kind: "multi", badge: "Опиши функцию",
        q: "<p>Отметь <b>все</b> верные утверждения о функции " + m("y=x^2-4") + ".</p>",
        options: ["D(f) — все числа", "E(f) = [−4; +∞)", "возрастает при x ≥ 0", "ограничена сверху", "нечётная", "выпукла вниз"], answer: [0, 1, 2, 5],
        hints: ["Это y = x², опущенная на 4 вниз. Вершина (0; −4), ветви вверх.", "Чётная или нечётная? Подставь −x."],
        solution: "Верно: D — все числа; E = [−4; +∞) (вершина на высоте −4); справа от вершины возрастает; это «чашка» — выпукла вниз. Неверно: потолка нет, ветви уходят вверх бесконечно; функция чётная, а не нечётная: (−x)² − 4 = x² − 4."
      }));
      s4.appendChild(t);
      root.appendChild(s4);
    }
  });
})();
