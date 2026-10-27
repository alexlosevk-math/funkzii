/* Блок 2. График — портрет функции. */
(function () {
  "use strict";
  var h = UI.h, m = UI.m;

  /* Расставь точки по таблице: точки ездят только по вертикали */
  function dotsTask() {
    var f = function (x) { return x * x - 3; }, xs = [-2, -1, 0, 1, 2];
    var pb = UI.plotBox({ x: [-4, 4], y: [-4.5, 4.5], draggable: true, unitGrid: true });
    var cells = {};
    var table = h("table", { class: "vtable" },
      h("tr", null, h("th", { html: m("x") }), xs.map(function (x) { return h("td", { text: UI.fmt(x) }); })),
      h("tr", null, h("th", { html: m("y") }), xs.map(function (x) { cells[x] = h("td", { text: "?" }); return cells[x]; })));
    var pts = xs.map(function (x) {
      return { type: "point", x: x, y: 3, color: "#0a8bd0", draggable: true, snap: 1,
        constrain: function (_, y) { return [x, Math.max(-4, Math.min(4, y))]; },
        onDrag: function () { check(); } };
    });
    var done = false, el;
    function check() {
      var ok = 0;
      pts.forEach(function (p) {
        var good = Math.abs(p.y - f(p.x)) < 1e-9;
        p.color = good ? "#17a34a" : "#0a8bd0";
        cells[p.x].textContent = good ? UI.fmt(p.y) : "?";
        cells[p.x].className = good ? "is-ok" : "";
        if (good) ok++;
      });
      var curve = pb.plot.layers[0];
      curve.hidden = ok < xs.length;
      pb.plot.draw();
      if (ok === xs.length && !done) { done = true; el.complete(); }
    }
    el = UI.task({
      id: "graph:dots", level: 1, xp: 15, kind: "action", badge: "Построй по точкам",
      q: "<p>Функция " + m("y=x^2-3") + ". Посчитай y для каждого x и перетащи точки на нужную высоту. Когда все пять встанут на место, появится график.</p>",
      extra: h("div", { class: "split" }, h("div", { class: "scroll-x" }, table), pb.el),
      hints: ["Например, для x = −2: (−2)² − 3 = 4 − 3 = 1. Значит, точку над −2 тащим на высоту 1."],
      after: "Видишь? График — это просто <b>все</b> точки (x; f(x)) сразу. Мы поставили пять, а их бесконечно много, поэтому получается плавная линия.",
      solution: "y: 1, −2, −3, −2, 1. Заметь симметрию: у x и −x одинаковые y."
    });
    UI.later(function () {
      var p = pb.mount();
      p.layers = [{ type: "fn", f: f, color: "#d18f00", hidden: true, glow: true }].concat(pts);
      p.draw();
    });
    return el;
  }

  /* Поймай точку: кликни по координатам */
  function catchTask() {
    var pb = UI.plotBox({ x: [-7, 7], y: [-5, 5], unitGrid: true, labels: true });
    var target = h("span", { class: "catch__target", text: "—" });
    var score = h("span", { class: "muted" });
    var marks = [], round = 0, hits = 0, cur = null, el, ROUNDS = 6, start = 0;
    function next() {
      if (round >= ROUNDS) {
        var t = ((Date.now() - start) / 1000).toFixed(1);
        target.textContent = "Готово!";
        score.textContent = "Попаданий: " + hits + " из " + ROUNDS + " · время " + t.replace(".", ",") + " с";
        if (hits >= 5) el.complete();
        else score.textContent += ". Нужно хотя бы 5 попаданий — жми «Ещё раз».";
        return;
      }
      do { cur = [Math.round(Math.random() * 12 - 6), Math.round(Math.random() * 8 - 4)]; }
      while (cur[0] === 0 && cur[1] === 0);
      if (round === 1) cur[0] = 0;            // точка на оси — частая ловушка
      target.textContent = "(" + UI.fmt(cur[0]) + "; " + UI.fmt(cur[1]) + ")";
      score.textContent = "Раунд " + (round + 1) + " из " + ROUNDS;
    }
    function restart() { round = 0; hits = 0; marks = []; start = Date.now(); next(); draw(); }
    function draw() { pb.plot.layers = marks.slice(); pb.plot.draw(); }
    el = UI.task({
      id: "graph:catch", level: 1, xp: 10, kind: "action", badge: "Снайпер координат",
      q: "<p>Кликни по точке с указанными координатами. Первое число — по горизонтали (x), второе — по вертикали (y). Нужно 5 попаданий из 6.</p>",
      extra: h("div", { class: "split" },
        h("div", { class: "sliders" },
          h("div", { class: "catch__bar" }, h("span", { text: "Цель:" }), target),
          score,
          h("button", { class: "btn btn--ghost btn--sm", text: "Ещё раз", onclick: restart }),
          UI.callout("tip", "<p>Запомни порядок: <b>сначала x, потом y</b>. Как в кино: сначала идёшь вдоль ряда, потом поднимаешься.</p>")),
        pb.el),
      after: "Координаты — это адрес точки. Дальше будем читать по ним графики."
    });
    UI.later(function () {
      var p = pb.mount();
      p.opts.onDown = function (x, y) {
        if (round >= ROUNDS || !cur) return;
        var good = Math.abs(x - cur[0]) < 0.45 && Math.abs(y - cur[1]) < 0.45;
        if (good) hits++;
        marks.push({ type: "point", x: good ? cur[0] : x, y: good ? cur[1] : y, color: good ? "#17a34a" : "#e23468", r: 6 });
        if (!good) marks.push({ type: "point", x: cur[0], y: cur[1], open: true, color: "#e23468", r: 7, label: "цель была тут" });
        round++; draw(); next();
      };
      restart();
    });
    return el;
  }

  App.register({
    id: "graph", num: 2, color: "var(--cyan)", tasks: 10,
    title: "График — портрет функции", subtitle: "Как формула превращается в картинку",
    render: function (root) {
      var s1 = UI.section("Формула — это рецепт, график — фото блюда");
      s1.appendChild(UI.theory(
        "<p>Формула говорит, <i>как</i> получить y. А график сразу показывает <i>всё</i>, что функция делает: где она растёт, где падает, где ноль.</p>" +
        "<p><b>График функции</b> — все точки с координатами " + m("(x; f(x))") + ". Берёшь x, считаешь y, ставишь точку. И так для всех x сразу.</p>" +
        "<p>Отсюда главное правило, которое решает половину задач:</p>"));
      s1.appendChild(UI.callout("fun", "<p class=\"m-big\">Точка (a; b) лежит на графике ⇔ b = f(a)</p><p>Подставь x точки в формулу. Вышел y точки — лежит. Не вышел — мимо.</p>"));
      root.appendChild(s1);

      var s2 = UI.section("Сначала разомнёмся", "Без координат дальше никуда.");
      s2.appendChild(catchTask());
      root.appendChild(s2);

      var s3 = UI.section("Построй график руками");
      s3.appendChild(dotsTask());
      root.appendChild(s3);

      var s4 = UI.section("Задачи по теме", "Проверь, как работает главное правило.");
      var t = h("div", { class: "tasks" });
      t.appendChild(UI.task({
        id: "graph:t1", level: 1, xp: 10, kind: "choice",
        q: "<p>Какая точка лежит на графике " + m("y=3x-1") + "?</p>",
        options: ["A(2; 6)", "B(−1; −4)", "C(0; 1)", "D(3; 7)"], answer: 1,
        hints: ["Подставь x каждой точки в формулу и сравни результат с y точки."],
        solution: "Для B: 3·(−1) − 1 = −4 — совпало. У остальных: 3·2 − 1 = 5 ≠ 6, 3·0 − 1 = −1 ≠ 1, 3·3 − 1 = 8 ≠ 7."
      }));
      t.appendChild(UI.task({
        id: "graph:t2", level: 2, xp: 15, kind: "number", prefix: "b =",
        q: "<p>График " + m("y=2x+b") + " проходит через точку (3; 4). Найди b.</p>", answer: -2,
        hints: ["Точка лежит на графике — значит, при x = 3 должно получиться y = 4. Подставь и реши уравнение относительно b."],
        solution: "4 = 2·3 + b → 4 = 6 + b → b = −2."
      }));
      t.appendChild(UI.task({
        id: "graph:t3", level: 2, xp: 15, kind: "number",
        q: "<p>По графику найди " + m("f(3)") + ".</p>", answer: 2,
        plot: { x: [-5, 6], y: [-4, 5], unitGrid: true, layers: [{ type: "fn", f: function (x) { return -0.5 * (x - 1) * (x - 1) + 4; }, color: "#d18f00" }] },
        hints: ["Найди x = 3 на горизонтальной оси, поднимись вертикально до графика и посмотри, на какой высоте оказался."],
        solution: "Над x = 3 график на высоте 2: f(3) = 2."
      }));
      t.appendChild(UI.task({
        id: "graph:t4", level: 2, xp: 15, kind: "numbers",
        q: "<p>По тому же графику реши уравнение " + m("f(x)=2") + ". Найди все корни.</p>", answer: [-1, 3],
        plot: { x: [-5, 6], y: [-4, 5], unitGrid: true, layers: [
          { type: "fn", f: function (x) { return -0.5 * (x - 1) * (x - 1) + 4; }, color: "#d18f00" },
          { type: "hline", y: 2, color: "#0a8bd0" }] },
        hints: ["Теперь наоборот: известна высота y = 2 (голубая линия). Ищи, где она пересекает график, и смотри вниз на x."],
        solution: "Голубая прямая y = 2 пересекает график в двух точках: x = −1 и x = 3."
      }));
      t.appendChild(UI.task({
        id: "graph:t5", level: 2, xp: 15, kind: "numbers",
        q: "<p>Где график " + m("y=-2x+6") + " пересекает ось x? А ось y? Напиши два числа: сначала x точки на оси x, потом y точки на оси y. Порядок не важен, проверю оба.</p>",
        answer: [3, 6],
        hints: ["На оси x у любой точки y = 0. Реши −2x + 6 = 0.", "На оси y у любой точки x = 0. Подставь x = 0."],
        solution: "С осью x: −2x + 6 = 0 → x = 3, точка (3; 0). С осью y: y = −2·0 + 6 = 6, точка (0; 6)."
      }));
      t.appendChild(UI.task({
        id: "graph:t6", level: 3, xp: 25, kind: "numbers",
        q: "<p>Найди точку пересечения графиков " + m("y=2x-1") + " и " + m("y=-x+5") + ". Запиши её координаты через точку с запятой: x; y.</p>",
        check: function (v) {
          var a = UI.parseNumbers(v);
          if (a.length !== 2 || a.some(isNaN)) return "Нужно два числа: x; y";
          return Math.abs(a[0] - 2) < 1e-6 && Math.abs(a[1] - 3) < 1e-6 ? true : (Math.abs(a[0] - 3) < 1e-6 && Math.abs(a[1] - 2) < 1e-6 ? "Числа верные, но порядок другой: сначала x, потом y" : false);
        },
        hints: ["В точке пересечения y у обоих графиков одинаковый. Приравняй: 2x − 1 = −x + 5.", "Нашёл x — подставь в любую из формул, чтобы получить y."],
        solution: "2x − 1 = −x + 5 → 3x = 6 → x = 2. y = 2·2 − 1 = 3. Точка (2; 3)."
      }));
      t.appendChild(UI.task({
        id: "graph:t7", level: 2, xp: 15, kind: "multi",
        q: "<p>Отметь <b>все</b> точки, которые лежат на графике " + m("y=x^2-2x") + ".</p>",
        options: ["A(0; 0)", "B(−1; 3)", "C(1; 1)", "D(3; 3)"], answer: [0, 1, 3],
        hints: ["Подставляй x каждой точки и сравнивай с её y. Аккуратно со знаками у B: (−1)² − 2·(−1)."],
        solution: "A: 0 − 0 = 0 ✓. B: 1 + 2 = 3 ✓. C: 1 − 2 = −1 ≠ 1 ✗. D: 9 − 6 = 3 ✓."
      }));
      t.appendChild(UI.task({
        id: "graph:t8", level: 1, xp: 10, kind: "number", prefix: "k =",
        q: "<p>График " + m("y=kx") + " проходит через точку (−2; 8). Найди k.</p>", answer: -4,
        hints: ["Подставь координаты точки: 8 = k·(−2)."],
        solution: "8 = −2k → k = −4. Прямая y = −4x идёт с горки и проходит через начало координат."
      }));
      s4.appendChild(t);
      root.appendChild(s4);
    }
  });
})();
