/* Блок 6. Парабола под микроскопом: y = ax² + bx + c. */
(function () {
  "use strict";
  var h = UI.h, m = UI.m;

  function n(v) { return String(Math.round(v * 100) / 100); }
  function abc(a, b, c) {
    var s = (a === 1 ? "" : a === -1 ? "-" : n(a)) + "x^2";
    if (b) s += (b > 0 ? "+" : "-") + (Math.abs(b) === 1 ? "" : n(Math.abs(b))) + "x";
    if (c) s += (c > 0 ? "+" : "-") + n(Math.abs(c));
    return s;
  }

  function lab() {
    var pb = UI.plotBox({ x: [-8, 8], y: [-6, 7], zoom: true, pan: true });
    var p = { a: 1, b: -2, c: -3 };
    var bar = h("div", { class: "formula-bar" });
    var vform = h("div", { class: "muted", style: "text-align:center" });
    var read = h("div", { class: "readout" });
    function draw() {
      var a = p.a, b = p.b, c = p.c;
      bar.innerHTML = a === 0 ? m("y=" + (b ? n(b) + "x" : "") + (c ? (c > 0 && b ? "+" : "") + n(c) : (b ? "" : "0"))) + " — это уже не парабола!" : m("y=" + abc(a, b, c));
      var P = pb.plot; if (!P) return;
      var f = function (x) { return a * x * x + b * x + c; };
      var L = [{ type: "fn", f: f, color: "#ec7a0c", width: 3.5, glow: true },
        { type: "point", x: 0, y: c, color: "#0a8bd0", label: "c = " + UI.fmt(c), labelColor: "#0a8bd0" }];
      read.innerHTML = "";
      var rows = [];
      if (a !== 0) {
        var x0 = -b / (2 * a), y0 = f(x0), D = b * b - 4 * a * c;
        L.unshift({ type: "vline", x: x0, color: "rgba(236, 122, 12, 0.45)", width: 1.5 });
        L.push({ type: "point", x: x0, y: y0, color: "#1d2033", label: "вершина" });
        var roots = D < 0 ? [] : D === 0 ? [x0] : [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)];
        roots.forEach(function (r) { L.push({ type: "point", x: r, y: 0, color: "#17a34a", r: 6 }); });
        vform.innerHTML = "Через вершину: " + m("y=" + (a === 1 ? "" : a === -1 ? "-" : n(a)) + "(x" + (x0 > 0 ? "-" : "+") + n(Math.abs(x0)) + ")^2" + (y0 >= 0 ? "+" : "-") + n(Math.abs(y0)));
        rows = [["ветви", a > 0 ? "вверх ∪" : "вниз ∩"], ["вершина", "(" + UI.fmt(x0) + "; " + UI.fmt(y0) + ")"],
          ["D = b² − 4ac", UI.fmt(D)], ["корни", roots.length ? roots.map(function (r) { return UI.fmt(r); }).join(" и ") : "нет"],
          [a > 0 ? "наименьшее" : "наибольшее", UI.fmt(y0)]];
      } else { vform.textContent = ""; rows = [["a = 0", "получилась прямая"]]; }
      rows.forEach(function (r) { read.appendChild(h("div", null, r[0], h("b", { text: r[1] }))); });
      P.layers = L; P.draw();
    }
    var sA = UI.slider(m("a"), -3, 3, 0.25, p.a, function (v) { p.a = v; draw(); }, { color: "yellow" });
    var sB = UI.slider(m("b"), -6, 6, 0.5, p.b, function (v) { p.b = v; draw(); }, { color: "pink" });
    var sC = UI.slider(m("c"), -6, 6, 0.5, p.c, function (v) { p.c = v; draw(); }, { color: "cyan" });
    UI.later(function () { pb.mount(); draw(); });
    return h("div", { class: "split" }, h("div", { class: "sliders" }, bar, vform, sA, sB, sC, read), pb.el);
  }

  /* Знаки коэффициентов по графику — задание из ОГЭ */
  function signsTask() {
    var ROUNDS = 6, NEED = 5, round, ok, cur, el;
    var pb = UI.plotBox({ x: [-7, 7], y: [-6, 6] });
    var choice = {};
    var dots = h("div", { class: "round-dots" });
    var msg = h("div", { class: "task__fb" });
    var groups = {};
    var signs = h("div", { class: "signs" });
    ["a", "b", "c"].forEach(function (k) {
      var set = h("div", { class: "signs__set" });
      ["+", "−"].forEach(function (s) {
        var b = h("button", { class: "chip", text: k + (s === "+" ? " > 0" : " < 0"), onclick: function () {
          choice[k] = s; Array.prototype.forEach.call(set.children, function (x) { x.classList.remove("is-on"); }); b.classList.add("is-on");
        } });
        set.appendChild(b);
      });
      groups[k] = set;
      signs.appendChild(h("span", { html: m(k) })); signs.appendChild(set); signs.appendChild(h("span"));
    });
    var btn = h("button", { class: "btn btn--primary", text: "Проверить", onclick: check });
    function gen() {
      var a, x0, y0, c;
      do {
        a = UI.pick([-1.5, -1, -0.5, 0.5, 1, 1.5]); x0 = UI.pick([-3, -2, -1, 1, 2, 3]);
        y0 = Math.round(Math.random() * 8 - 4); c = a * x0 * x0 + y0;
      } while (Math.abs(c) < 0.5 || Math.abs(c) > 5.5);
      return { a: a, b: -2 * a * x0, c: c, x0: x0, y0: y0 };
    }
    function next() {
      cur = gen(); choice = {};
      Object.keys(groups).forEach(function (k) { Array.prototype.forEach.call(groups[k].children, function (x) { x.classList.remove("is-on"); }); });
      var P = pb.plot;
      P.layers = [{ type: "fn", f: function (x) { return cur.a * x * x + cur.b * x + cur.c; }, color: "#ec7a0c", width: 3.5 }];
      P.draw();
      btn.textContent = "Проверить"; btn.onclick = check;
    }
    function restart() {
      round = 0; ok = 0; dots.innerHTML = "";
      for (var i = 0; i < ROUNDS; i++) dots.appendChild(h("span"));
      msg.innerHTML = ""; next();
    }
    function check() {
      if (!choice.a || !choice.b || !choice.c) { msg.innerHTML = '<span class="bad">Выбери знак для всех трёх букв</span>'; return; }
      var real = { a: cur.a > 0 ? "+" : "−", b: cur.b > 0 ? "+" : "−", c: cur.c > 0 ? "+" : "−" };
      var good = real.a === choice.a && real.b === choice.b && real.c === choice.c;
      dots.children[round].className = good ? "is-ok" : "is-bad";
      if (good) ok++;
      round++;
      var why = "a " + (cur.a > 0 ? "> 0: ветви вверх" : "< 0: ветви вниз") + "; c " + (cur.c > 0 ? "> 0: пересекает ось y выше нуля" : "< 0: пересекает ось y ниже нуля") +
        "; вершина " + (cur.x0 > 0 ? "справа" : "слева") + ", значит a и b " + (cur.x0 > 0 ? "разных знаков" : "одного знака") + ": b " + (cur.b > 0 ? "> 0" : "< 0") + ".";
      msg.innerHTML = (good ? '<span class="ok">Верно!</span> ' : '<span class="bad">Не совсем.</span> ') + '<span class="muted">' + why + "</span>";
      var P = pb.plot;
      P.layers.push({ type: "point", x: 0, y: cur.c, color: "#0a8bd0", label: "c" });
      P.layers.push({ type: "point", x: cur.x0, y: cur.y0, color: "#1d2033", label: "вершина" });
      P.draw();
      if (round >= ROUNDS) {
        if (ok >= NEED) { el.complete(); btn.textContent = "Сыграть ещё"; }
        else { msg.innerHTML += '<br><span class="bad">' + ok + " из " + ROUNDS + ". Нужно " + NEED + ". Давай ещё раунд!</span>"; btn.textContent = "Заново"; }
        btn.onclick = restart;
      } else { btn.textContent = "Дальше →"; btn.onclick = next; }
    }
    el = UI.task({
      id: "parabola:signs", level: 2, xp: 25, kind: "action", badge: "Знаки коэффициентов",
      q: "<p>Смотри на параболу и определи знаки a, b и c. Шесть раундов, нужно " + NEED + " верных. Это задание бывает в ОГЭ почти каждый год.</p>",
      extra: h("div", { class: "split" }, h("div", { class: "sliders" }, dots, signs, btn, msg), pb.el),
      hints: ["a — по ветвям, c — по точке пересечения с осью y. Остаётся b.", "Вершина в x₀ = −b / (2a). Вершина справа (x₀ > 0) — значит, −b/(2a) > 0, и у a и b разные знаки. Вершина слева — одинаковые."]
    });
    UI.later(function () { pb.mount(); restart(); });
    return el;
  }

  /* Построй параболу двумя точками: вершина + ещё одна */
  function buildTask() {
    var pb = UI.plotBox({ x: [-5, 6], y: [-5, 6], draggable: true, unitGrid: true });
    var target = function (x) { return -x * x + 2 * x + 3; };
    var V = { type: "point", x: -2, y: -3, color: "#1d2033", draggable: true, snap: 1, label: "вершина" };
    var Q = { type: "point", x: 0, y: -1, color: "#ec7a0c", draggable: true, snap: 1, label: "точка" };
    var status = h("div", { class: "muted" });
    var el, done = false;
    function cur() {
      if (Q.x === V.x) return null;
      var a = (Q.y - V.y) / Math.pow(Q.x - V.x, 2);
      return function (x) { return a * (x - V.x) * (x - V.x) + V.y; };
    }
    function draw() {
      var f = cur(), P = pb.plot;
      P.layers = [f ? { type: "fn", f: f, color: "#ec7a0c", width: 3.5 } : null, V, Q];
      P.draw();
      if (!f) { status.textContent = "Поставь точки на разные вертикали."; return; }
      var good = Formula.same(f, target);
      status.innerHTML = good ? '<span class="ok">Построено точно!</span>' : "Вершина (" + UI.fmt(V.x) + "; " + UI.fmt(V.y) + "). Пока не та парабола.";
      if (good && !done) { done = true; el.complete(); }
    }
    V.onDrag = draw; Q.onDrag = draw;
    el = UI.task({
      id: "parabola:build", level: 2, xp: 20, kind: "action", badge: "Построй",
      q: "<p>Построй график " + m("y=-x^2+2x+3") + ". Перетащи белую точку в вершину, а оранжевую — в любую другую точку графика.</p>",
      extra: h("div", { class: "split" }, h("div", { class: "sliders" }, status,
        UI.callout("tip", "<p>Алгоритм: 1) x₀ = −b / (2a); 2) y₀ — подставь x₀ в формулу; 3) ещё одна точка — проще всего (0; c).</p>")), pb.el),
      hints: ["a = −1, b = 2. x₀ = −2 / (2·(−1)) = 1.", "y₀ = −1 + 2 + 3 = 4. Вершина (1; 4). А при x = 0 получается y = 3."],
      after: "Две точки — и вся парабола у тебя в руках. Вторую точку проще всего брать на оси y: там x = 0 и y = c."
    });
    UI.later(function () { pb.mount(); draw(); });
    return el;
  }

  App.register({
    id: "parabola", num: 6, color: "var(--orange)", tasks: 11,
    title: "Парабола под микроскопом", subtitle: "y = ax² + bx + c: что делает каждая буква",
    render: function (root) {
      var s1 = UI.section("Три буквы — три рычага");
      s1.appendChild(h("div", { class: "cheat" },
        h("div", { class: "cheat__item", html: '<span class="m">a</span><b>Ветви и ширина.</b> a > 0 — вверх, a < 0 — вниз. Чем больше |a|, тем уже.' }),
        h("div", { class: "cheat__item", html: '<span class="m">c</span><b>Точка на оси y.</b> Подставь x = 0: останется c. Парабола всегда проходит через (0; c).' }),
        h("div", { class: "cheat__item", html: '<span class="m">b</span><b>Двигает вершину вбок.</b> Сама по себе мало что говорит, работает в паре с a: x₀ = −b/(2a).' }),
        h("div", { class: "cheat__item", html: '<span class="m">D = b² − 4ac</span><b>Сколько раз касается оси x.</b> D > 0 — два корня, D = 0 — один (вершина на оси), D < 0 — ни одного.' })));
      s1.appendChild(UI.callout("fun", "<p><b>Связь со сдвигами.</b> Любую параболу можно переписать в виде " + m("y=a(x-x_0)^2+y_0").replace("x_0", "x₀").replace("y_0", "y₀") + ". Это та же " + m("y=ax^2") + ", сдвинутая так, чтобы вершина попала в (x₀; y₀). Всё, что ты делал в прошлом блоке, работает и здесь.</p>"));
      root.appendChild(s1);

      var s2 = UI.section("Пульт управления параболой", "Крути a, b и c по очереди. Попробуй поймать момент, когда парабола касается оси x — посмотри, чему равен D.");
      s2.appendChild(lab());
      root.appendChild(s2);

      var s3 = UI.section("Игра: угадай знаки");
      s3.appendChild(signsTask());
      root.appendChild(s3);

      var s4 = UI.section("Построй руками");
      s4.appendChild(buildTask());
      root.appendChild(s4);

      var s5 = UI.section("Задачи по теме", "Тут уже уровень ОГЭ.");
      var t = h("div", { class: "tasks" });
      t.appendChild(UI.task({
        id: "parabola:t1", level: 1, xp: 15, kind: "numbers",
        q: "<p>Найди координаты вершины параболы " + m("y=x^2-6x+5") + ". Через точку с запятой: x; y.</p>",
        check: function (v) {
          var a = UI.parseNumbers(v);
          if (a.length !== 2 || a.some(isNaN)) return "Нужно два числа: x; y";
          if (a[0] === 3 && a[1] === -4) return true;
          if (a[0] === -3) return "x₀ = −b / (2a). Здесь b = −6, значит −b = +6";
          if (a[0] === 3) return "x₀ верный! Теперь подставь 3 в формулу, чтобы найти y₀";
          return false;
        },
        hints: ["x₀ = −b / (2a) = 6 / 2.", "Подставь x₀ в формулу: 3² − 6·3 + 5."],
        solution: "x₀ = −(−6) / (2·1) = 3. y₀ = 9 − 18 + 5 = −4. Вершина (3; −4)."
      }));
      t.appendChild(UI.task({
        id: "parabola:t2", level: 2, xp: 15, kind: "number",
        q: "<p>Найди наименьшее значение функции " + m("y=2x^2-8x+3") + ".</p>", answer: -5,
        hints: ["Ветви вверх (a = 2 > 0), значит наименьшее значение — в вершине. Это y₀, а не x₀."],
        solution: "x₀ = 8 / 4 = 2, y₀ = 2·4 − 16 + 3 = −5. Наименьшее значение −5."
      }));
      t.appendChild(UI.task({
        id: "parabola:t3", level: 1, xp: 10, kind: "numbers",
        q: "<p>Найди нули функции " + m("y=x^2-x-6") + ".</p>", answer: [-2, 3],
        hints: ["Нули — где y = 0: реши x² − x − 6 = 0. Через D или по теореме Виета: сумма корней 1, произведение −6."],
        solution: "D = 1 + 24 = 25, x = (1 ± 5) / 2 → x = 3 и x = −2."
      }));
      t.appendChild(UI.task({
        id: "parabola:t4", level: 2, xp: 20, kind: "number", prefix: "c =",
        q: "<p>При каком c парабола " + m("y=x^2+4x+c") + " касается оси x ровно в одной точке?</p>", answer: 4,
        hints: ["Одна общая точка с осью x — это один корень, то есть D = 0."],
        solution: "D = 16 − 4c = 0 → c = 4. Тогда y = x² + 4x + 4 = (x + 2)², вершина (−2; 0) лежит на оси."
      }));
      t.appendChild(UI.task({
        id: "parabola:t5", level: 2, xp: 20, kind: "choice",
        q: "<p>Найди область значений функции " + m("y=-x^2-2x+8") + ".</p>",
        options: ["(−∞; 9]", "[9; +∞)", "(−∞; 8]", "(−∞; −1]"], answer: 0,
        hints: ["Ветви вниз, значит выше вершины график не поднимается. Найди y₀."],
        solution: "x₀ = −(−2) / (2·(−1)) = −1, y₀ = −1 + 2 + 8 = 9. Ветви вниз, поэтому E = (−∞; 9]."
      }));
      t.appendChild(UI.task({
        id: "parabola:t6", level: 3, xp: 25, kind: "formula", prefix: "y =",
        q: "<p>Парабола проходит через точки (1; 0), (3; 0) и (0; 3). Запиши её формулу.</p>", answer: "x^2-4x+3",
        hints: ["Нули 1 и 3 уже известны, поэтому формула имеет вид y = a(x − 1)(x − 3).", "Подставь точку (0; 3), чтобы найти a."],
        solution: "y = a(x − 1)(x − 3). При x = 0: 3 = a·(−1)(−3) = 3a → a = 1. y = (x − 1)(x − 3) = x² − 4x + 3."
      }));
      t.appendChild(UI.task({
        id: "parabola:t7", level: 3, xp: 30, kind: "number", badge: "Ловушка",
        q: "<p>Найди наибольшее значение функции " + m("y=-x^2+6x-4") + " на отрезке [0; 2].</p>", answer: 4,
        hints: ["Где вершина? Попадает ли она в отрезок [0; 2]?", "Вершина при x = 3 — за пределами отрезка. Слева от вершины парабола с ветвями вниз только растёт."],
        solution: "x₀ = 3 не входит в [0; 2]. На отрезке функция возрастает, поэтому наибольшее значение — на правом конце: y(2) = −4 + 12 − 4 = 4. Ответ «5» (значение в вершине) — ловушка."
      }));
      t.appendChild(UI.task({
        id: "parabola:t8", level: 2, xp: 15, kind: "choice",
        q: "<p>Найди промежуток возрастания функции " + m("y=x^2-4x+1") + ".</p>",
        options: ["[2; +∞)", "(−∞; 2]", "[−2; +∞)", "[1; +∞)"], answer: 0,
        hints: ["Ветви вверх: до вершины парабола спускается, после — поднимается. Найди x₀ = −b / (2a)."],
        solution: "x₀ = 4 / 2 = 2. Ветви вверх, поэтому справа от вершины функция возрастает: [2; +∞)."
      }));
      t.appendChild(UI.task({
        id: "parabola:t9", level: 3, xp: 20, kind: "choice", badge: "Неравенство по параболе",
        q: "<p>Реши неравенство " + m("x^2-2x-3<0") + ", представив параболу " + m("y=x^2-2x-3") + ".</p>",
        options: ["(−1; 3)", "(−∞; −1) ∪ (3; +∞)", "[−1; 3]", "(−3; 1)"], answer: 0,
        plot: { x: [-4, 6], y: [-5, 5], unitGrid: true, layers: [{ type: "fn", f: function (x) { return x * x - 2 * x - 3; }, color: "#ec7a0c" }] },
        hints: ["Найди нули: x² − 2x − 3 = 0.", "«< 0» — где парабола ниже оси x. У параболы с ветвями вверх это промежуток между нулями. Нули не входят: там y = 0."],
        solution: "Нули −1 и 3. Ветви вверх, ниже оси x парабола между нулями. Неравенство строгое, поэтому скобки круглые: (−1; 3)."
      }));
      s5.appendChild(t);
      root.appendChild(s5);
    }
  });
})();
