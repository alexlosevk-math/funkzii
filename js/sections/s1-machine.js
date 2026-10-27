/* Блок 1. Функция — это машинка: вход → правило → выход. */
(function () {
  "use strict";
  var h = UI.h, m = UI.m;

  var RULES = ["2x+1", "x^2", "10-x", "|x|", "x/2+3"];

  /* Пул «чёрных ящиков»: по раунду на уровень */
  var BOXES = [
    ["x+5", "x-3", "2x", "x+10"],
    ["3x-1", "2x+3", "5-x", "4x-2"],
    ["x^2+1", "x^2-2", "2x^2", "(x+1)^2"]
  ];

  function machine() {
    var rule = RULES[0], f = Formula.compile(rule);
    var log = h("div", { class: "machine__log" });
    var out = h("div", { class: "machine__out", text: "?" });
    var inp = h("input", { class: "machine__in", type: "text", value: "3", inputmode: "decimal",
      onkeydown: function (e) { if (e.key === "Enter") run(); } });
    var body = h("div", { class: "machine__body" },
      h("div", { class: "machine__label", text: "правило" }),
      h("div", { class: "machine__rule", html: m(rule) }));
    var chips = h("div", { class: "btns" });
    RULES.forEach(function (r, i) {
      var c = h("button", { class: "chip" + (i ? "" : " is-on"), html: m("y=" + r), onclick: function () {
        rule = r; f = Formula.compile(r);
        Array.prototype.forEach.call(chips.children, function (x) { x.classList.remove("is-on"); });
        c.classList.add("is-on");
        body.querySelector(".machine__rule").innerHTML = m(r);
        log.innerHTML = ""; out.textContent = "?";
      } });
      chips.appendChild(c);
    });
    function run() {
      var x = UI.parseNumber(inp.value);
      if (isNaN(x)) { out.textContent = "🤔"; return; }
      var y = f(x);
      body.classList.remove("is-working"); void body.offsetWidth; body.classList.add("is-working");
      out.textContent = "…";
      setTimeout(function () {
        out.textContent = UI.fmt(y, 3);
        log.insertBefore(h("div", { class: "machine__row", html: "x = <b>" + UI.fmt(x, 3) + "</b> → y = <b>" + UI.fmt(y, 3) + "</b>" }), log.firstChild);
        while (log.children.length > 5) log.lastChild.remove();
      }, 450);
    }
    return h("div", { class: "machine-wrap" }, chips,
      h("div", { class: "machine" },
        h("div", { class: "machine__slot" }, h("div", { class: "machine__label", text: "вход x" }), inp,
          h("button", { class: "btn btn--primary btn--sm", text: "Закинуть ▶", onclick: run })),
        body,
        h("div", { class: "machine__slot" }, h("div", { class: "machine__label", text: "выход y" }), out)),
      log);
  }

  /* Чёрный ящик: правило спрятано, можно задать до 5 вопросов, потом угадать формулу */
  function blackBox(level) {
    var rule = UI.pick(BOXES[level]), f = Formula.compile(rule), asked = 0, LIMIT = 5;
    var rows = h("div", { class: "box__rows" });
    var left = h("span", { class: "muted" });
    var inp = h("input", { class: "task__input", type: "text", placeholder: "число x", inputmode: "decimal",
      onkeydown: function (e) { if (e.key === "Enter") ask(); } });
    function upd() { left.textContent = "Вопросов осталось: " + (LIMIT - asked); }
    function ask() {
      if (asked >= LIMIT) return;
      var x = UI.parseNumber(inp.value);
      if (isNaN(x)) return;
      asked++; upd();
      rows.appendChild(h("div", { class: "box__row" }, h("span", { text: "f(" + UI.fmt(x, 3) + ")" }), h("b", { text: UI.fmt(f(x), 3) })));
      inp.value = ""; inp.focus();
      if (asked >= LIMIT) inp.disabled = true;
    }
    upd();
    var extra = h("div", { class: "box" },
      h("div", { class: "box__machine", text: "⬛ ящик №" + (level + 1) }),
      h("div", { class: "task__row" }, inp, h("button", { class: "btn btn--ghost", text: "Спросить", onclick: ask }), left),
      rows);
    return UI.task({
      id: "machine:box" + (level + 1), badge: "Чёрный ящик " + (level + 1), level: level + 1, xp: 15 + level * 5,
      q: "<p>Внутри ящика спрятано правило. Скармливай ему числа и смотри, что выходит. Потом запиши правило формулой.</p>",
      extra: extra, kind: "formula", prefix: "y =",
      answer: rule,
      hints: [
        "Начни с x = 0 и x = 1. По ним многое видно: что выходит из нуля и на сколько растёт y, когда x увеличивается на 1.",
        level === 2 ? "Попробуй x = 2 и x = −2. Если ответы одинаковые, внутри, скорее всего, есть x²." : "Если y растёт на одно и то же число при шаге x на 1 — это прямая y = kx + b. k — шаг, b — то, что выходит из нуля."
      ],
      solution: "Здесь было правило " + m("y=" + rule) + ". Проверь на своих числах из таблицы."
    });
  }

  /* Тест вертикальной прямой */
  var CURVES = [
    { name: "Парабола", fn: function (x) { return x * x / 2 - 2; }, ok: true },
    { name: "Окружность", p: function (t) { return [3 * Math.cos(t), 3 * Math.sin(t)]; }, ys: function (x) { return Math.abs(x) <= 3 ? [Math.sqrt(9 - x * x), -Math.sqrt(9 - x * x)] : []; }, ok: false },
    { name: "Лежачая парабола", p: function (t) { return [t * t / 2 - 3, t]; }, t: [-5, 5], ys: function (x) { return x >= -3 ? [Math.sqrt(2 * (x + 3)), -Math.sqrt(2 * (x + 3))] : []; }, ok: false },
    { name: "Волна", fn: function (x) { return 2 * Math.sin(x); }, ok: true },
    { name: "Петля", p: function (t) { return [3 * Math.sin(2 * t), 3 * Math.sin(t)]; }, ys: null, ok: false }
  ];

  function vlineDemo() {
    var pb = UI.plotBox({ x: [-6, 6], y: [-5, 5], draggable: true });
    var cur = CURVES[0];
    var info = h("div", { class: "callout" });
    var chips = h("div", { class: "btns" });
    var line = { type: "point", x: 1.5, y: 0, color: "#0a8bd0", draggable: true, label: "тащи меня ↔",
      constrain: function (x) { return [x, 0]; } };
    function ys(x) {
      if (cur.fn) { var y = cur.fn(x); return isNaN(y) ? [] : [y]; }
      if (cur.ys) return cur.ys(x);
      // петля: ищем пересечения численно по параметру
      var res = [], n = 2000, prev = null;
      for (var i = 0; i <= n; i++) {
        var t = -Math.PI + 2 * Math.PI * i / n, pt = cur.p(t), d = pt[0] - x;
        if (prev !== null && prev[0] * d <= 0) res.push(pt[1]);
        prev = [d];
      }
      return res.filter(function (y, k) { return res.findIndex(function (z) { return Math.abs(z - y) < 0.05; }) === k; });
    }
    function redraw() {
      var p = pb.plot, list = ys(line.x);
      var curveLayer = cur.fn ? { type: "fn", f: cur.fn, color: "#d18f00" }
        : { type: "custom", draw: function (c, P) {
          var tt = cur.t || [-Math.PI, Math.PI];
          c.strokeStyle = "#d18f00"; c.lineWidth = 3; c.beginPath();
          for (var i = 0; i <= 400; i++) { var pt = cur.p(tt[0] + (tt[1] - tt[0]) * i / 400); if (i) c.lineTo(P.X(pt[0]), P.Y(pt[1])); else c.moveTo(P.X(pt[0]), P.Y(pt[1])); }
          c.stroke();
        } };
      p.layers = [curveLayer, { type: "vline", x: line.x, color: "#0a8bd0", dash: false, width: 2 }]
        .concat(list.map(function (y) { return { type: "point", x: line.x, y: y, color: list.length > 1 ? "#e23468" : "#17a34a", r: 7 }; }))
        .concat([line]);
      p.draw();
      info.innerHTML = list.length > 1
        ? "<p>Прямая пересекла кривую <b class=\"hl-p\">" + list.length + " раза</b>. Одному x достались " + list.length + " разных y — <b>это не функция</b>.</p>"
        : list.length === 1 ? "<p>Одна точка пересечения: этому x соответствует ровно один y. Пока всё честно.</p>"
          : "<p>Здесь кривой нет: при таком x функция не определена.</p>";
    }
    line.onDrag = redraw;
    CURVES.forEach(function (c, i) {
      var b = h("button", { class: "chip" + (i ? "" : " is-on"), text: c.name, onclick: function () {
        cur = c; Array.prototype.forEach.call(chips.children, function (x) { x.classList.remove("is-on"); });
        b.classList.add("is-on"); redraw();
      } });
      chips.appendChild(b);
    });
    UI.later(function () { pb.mount(); redraw(); });
    return h("div", { class: "split" },
      h("div", { class: "sliders" }, chips, info,
        UI.callout("tip", "<p><b>Тест вертикальной прямой.</b> Води вертикальную линию по графику. Если хоть где-то она задевает кривую дважды — это не график функции.</p>")),
      pb.el);
  }

  App.register({
    id: "machine", num: 1, color: "var(--yellow)", tasks: 12,
    title: "Функция — это машинка", subtitle: "Что такое функция и почему один x — один y",
    render: function (root) {
      var s1 = UI.section("Представь автомат с газировкой");
      s1.appendChild(UI.theory(
        "<p>Нажимаешь кнопку <b>3</b> — выпадает кола. Снова нажимаешь <b>3</b> — снова кола. Автомат честный: одна кнопка — один результат.</p>" +
        "<p><b>Функция</b> — такой же честный автомат. Ты закидываешь число <span class=\"m\">x</span>, внутри срабатывает правило, и выпадает ровно одно число <span class=\"m\">y</span>.</p>" +
        "<ul><li><span class=\"m\">x</span> — то, что закидываешь. Называется <b>аргумент</b>.</li>" +
        "<li><span class=\"m\">y</span> — то, что выпало. Это <b>значение функции</b>.</li>" +
        "<li>Запись " + m("f(3)=7") + " читается «эф от трёх равно семи» и значит: закинули 3, выпало 7.</li></ul>"));
      s1.appendChild(UI.callout("warn", "<p>Если автомат на одну и ту же кнопку иногда даёт колу, а иногда воду — он сломан. Это <b>не функция</b>. А вот если две разные кнопки дают колу — нормально: " + m("f(2)=f(−2)=4") + " у " + m("y=x^2") + " никого не смущает.</p>"));
      s1.appendChild(UI.theory("<p><b>Как можно задать функцию.</b> Правило не обязательно записывать формулой. Главное — чтобы по каждому x можно было узнать его y.</p>"));
      var ways = h("div", { class: "cheat" });
      [
        ["Формулой", m("y=x^2-1") + " — подставил x, посчитал y. Самый частый способ."],
        ["Таблицей", "x: 1, 2, 3 → y: 5, 8, 11. Удобно, когда значений немного — например, в расписании или прайсе."],
        ["Графиком", "Смотришь на картинку: над x поднимаешься до линии и читаешь высоту y."],
        ["Словами", "«Каждому числу ставим в соответствие его квадрат, уменьшенный на 1». Это та же " + m("y=x^2-1") + "."]
      ].forEach(function (c) { ways.appendChild(h("div", { class: "cheat__item", html: "<b>" + c[0] + ".</b> " + c[1] })); });
      s1.appendChild(ways);
      root.appendChild(s1);

      var s2 = UI.section("Покрути машинку", "Выбери правило, закинь число и посмотри, что выпадет. Попробуй отрицательные числа и дроби.");
      s2.appendChild(machine());
      root.appendChild(s2);

      var s3 = UI.section("Взломай чёрный ящик", "Теперь наоборот: правило спрятано. У тебя пять вопросов на каждый ящик. Задавай с умом.");
      var t3 = h("div", { class: "tasks" });
      [0, 1, 2].forEach(function (l) { t3.appendChild(blackBox(l)); });
      s3.appendChild(t3);
      root.appendChild(s3);

      var s4 = UI.section("Функция или подделка?", "У графика функции каждая вертикальная линия задевает его не больше одного раза.");
      s4.appendChild(vlineDemo());
      var opts = [0, 1, 2, 3].map(function (i) {
        var c = [CURVES[3], CURVES[1], { fn: function (x) { return Math.abs(x) - 2; } }, CURVES[2]][i];
        return UI.mini(c.fn || { t: c.t || [-Math.PI, Math.PI], p: c.p }, { color: Plot.PALETTE[i] });
      });
      s4.appendChild(UI.task({
        id: "machine:vline", level: 1, xp: 10, kind: "multi", grid: true, options: opts, answer: [0, 2],
        q: "<p>Отметь <b>все</b> графики функций.</p>",
        hints: ["Мысленно проведи вертикальные линии. Где они задевают кривую дважды?"],
        solution: "Функции — волна и уголок: любая вертикаль задевает их один раз. Окружность и лежачая парабола — нет: например, прямая x = 0 пересекает их в двух точках."
      }));
      root.appendChild(s4);

      var s5 = UI.section("Задачи по теме", "Подставить, найти x по y, узнать функцию по таблице.");
      var t5 = h("div", { class: "tasks" });
      t5.appendChild(UI.task({
        id: "machine:t1", level: 1, xp: 10, kind: "number",
        q: "<p>" + m("f(x)=x^2-3x") + ". Найди " + m("f(-2)") + ".</p>", answer: 10,
        hints: ["Подставь −2 вместо каждого x. Минус на минус даёт плюс: (−2)² = 4, а −3·(−2) = +6."],
        solution: "f(−2) = (−2)² − 3·(−2) = 4 + 6 = 10."
      }));
      t5.appendChild(UI.task({
        id: "machine:t2", level: 1, xp: 10, kind: "number",
        q: "<p>" + m("f(x)=2x+1") + ". При каком x выходит " + m("f(x)=-7") + "?</p>", answer: -4,
        hints: ["Это машинка наоборот: известен выход, ищем вход. Реши уравнение 2x + 1 = −7."],
        solution: "2x + 1 = −7 → 2x = −8 → x = −4."
      }));
      t5.appendChild(UI.task({
        id: "machine:t3", level: 2, xp: 15, kind: "numbers",
        q: "<p>" + m("f(x)=x^2-5") + ". Найди все x, при которых " + m("f(x)=4") + ".</p>", answer: [-3, 3],
        hints: ["x² − 5 = 4 → x² = 9. Сколько чисел в квадрате дают 9?"],
        solution: "x² = 9, значит x = 3 или x = −3. Вот тот случай, когда два разных входа дают один выход — и это нормально."
      }));
      t5.appendChild(UI.task({
        id: "machine:t4", level: 2, xp: 15, kind: "choice",
        q: "<p>Какая таблица <b>не</b> может задавать функцию?</p>",
        options: [
          "x: 1, 2, 3 → y: 5, 5, 5",
          "x: 1, 2, 1 → y: 4, 6, 7",
          "x: −1, 0, 1 → y: 1, 0, 1",
          "x: 0, 1, 2 → y: 3, 2, 1"
        ], answer: 1,
        hints: ["Ищи, где один и тот же x встречается дважды с разными y."],
        solution: "Во второй таблице x = 1 даёт то 4, то 7. Сломанный автомат. В первой все y одинаковые — это можно: функция-константа y = 5."
      }));
      t5.appendChild(UI.task({
        id: "machine:t5", level: 1, xp: 10, kind: "number",
        q: "<p>Функция задана словами: «каждому числу ставится в соответствие его квадрат, уменьшенный на 1». Найди её значение при x = −3.</p>", answer: 8,
        hints: ["Запиши правило формулой: y = x² − 1. Теперь подставь −3."],
        solution: "y = x² − 1, y(−3) = 9 − 1 = 8."
      }));
      t5.appendChild(UI.task({
        id: "machine:t6", level: 1, xp: 10, kind: "number", prefix: "x =",
        q: "<p>При каком x функция " + m("f(x)=(x+2)/(x-3)") + " не определена?</p>", answer: 3,
        hints: ["Делить на ноль нельзя. При каком x знаменатель равен нулю?"],
        solution: "Знаменатель x − 3 = 0 при x = 3. Машинка ломается: число 3 в неё закидывать нельзя. Числитель может быть каким угодно, при x = −2 функция просто равна нулю."
      }));
      t5.appendChild(UI.task({
        id: "machine:t7", level: 2, xp: 15, kind: "number",
        q: "<p>" + m("f(x)=2x-5") + ". Найди " + m("f(f(3))") + ".</p>", answer: -3,
        hints: ["Сначала посчитай внутреннее: f(3). Потом закинь результат в машинку ещё раз."],
        solution: "f(3) = 2·3 − 5 = 1. f(1) = 2·1 − 5 = −3. Ответ −3."
      }));
      t5.appendChild(UI.task({
        id: "machine:t8", level: 2, xp: 15, kind: "choice",
        q: "<p>Функция задана таблицей. Какой формулой её можно записать?</p>" +
          '<div class="scroll-x"><table class="vtable" style="margin:8px 0"><tr><th>x</th><td>−2</td><td>−1</td><td>0</td><td>1</td><td>2</td></tr><tr><th>y</th><td>7</td><td>4</td><td>3</td><td>4</td><td>7</td></tr></table></div>',
        options: [m("y=x^2+3"), m("y=2x+3"), m("y=x^2-3"), m("y=|x|+3")], answer: 0,
        hints: ["Начни с x = 0: какой y получается у каждой формулы? Потом проверь x = 2.", "У |x| + 3 при x = 2 выходит 5, а в таблице 7."],
        solution: "При x = 0 нужно 3 — подходят x² + 3, 2x + 3 и |x| + 3. При x = 2 нужно 7: x² + 3 = 7 ✓, 2x + 3 = 7 ✓, |x| + 3 = 5 ✗. При x = −2 нужно 7: x² + 3 = 7 ✓, а 2x + 3 = −1 ✗. Ответ y = x² + 3."
      }));
      s5.appendChild(t5);
      root.appendChild(s5);
    }
  });
})();
