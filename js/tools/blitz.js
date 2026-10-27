/* Блиц: 60 секунд, «верно / неверно» про графики. Стрелки ← → на клавиатуре. */
(function () {
  "use strict";
  var h = UI.h, m = UI.m;
  function r(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function nz(a, b) { var v; do { v = r(a, b); } while (!v); return v; }
  function coin() { return Math.random() < 0.5; }
  function sg(v) { return v < 0 ? "−" + -v : String(v); }
  function lin(k, b) { return (k === 1 ? "" : k === -1 ? "-" : k) + "x" + (b ? (b > 0 ? "+" : "-") + Math.abs(b) : ""); }

  /* Каждый генератор: { html, truth, why } */
  var GEN = [
    function () {
      var a = nz(-5, 5), lie = coin(), dir = (a > 0) !== lie ? "вправо" : "влево";
      return { html: "График " + m("y=(x" + (a > 0 ? "-" : "+") + Math.abs(a) + ")^2") + " — это " + m("y=x^2") + ", сдвинутая " + dir + " на " + Math.abs(a),
        truth: !lie, why: (a > 0 ? "Минус" : "Плюс") + " внутри скобки — сдвиг " + (a > 0 ? "вправо" : "влево") + "." };
    },
    function () {
      var k = nz(-3, 3), b = r(-5, 5), x = r(-3, 3), y = k * x + b, lie = coin();
      if (lie) y += UI.pick([-2, -1, 1, 2]);
      return { html: "Точка (" + sg(x) + "; " + sg(y) + ") лежит на графике " + m("y=" + lin(k, b)), truth: !lie,
        why: "При x = " + sg(x) + " получается y = " + sg(k * x + b) + "." };
    },
    function () {
      var a = nz(-4, 4), b = nz(-4, 4), lie = coin();
      var vx = lie && coin() ? a : -a, vy = lie && vx === -a ? -b : b;
      if (lie && vx === -a && vy === b) vy = -b;
      return { html: "Вершина параболы " + m("y=(x" + (a > 0 ? "+" : "-") + Math.abs(a) + ")^2" + (b > 0 ? "+" : "-") + Math.abs(b)) + " — точка (" + sg(vx) + "; " + sg(vy) + ")",
        truth: vx === -a && vy === b, why: "Вершина (" + sg(-a) + "; " + sg(b) + "): знак внутри меняется, снаружи — нет." };
    },
    function () {
      var a = UI.pick([-1, -0.5, 0.5, 1]), x0 = nz(-3, 3), y0 = r(-3, 3), b = -2 * a * x0, c = a * x0 * x0 + y0;
      if (!c) c = 1;
      var which = UI.pick(["a", "b", "c"]), val = { a: a, b: b, c: c }[which], claim = coin();
      return { mini: function (x) { return a * x * x + b * x + c; },
        html: "У этой параболы " + m(which) + (claim ? " > 0" : " < 0"), truth: (val > 0) === claim,
        why: which === "a" ? "Ветви " + (a > 0 ? "вверх — a > 0." : "вниз — a < 0.") : which === "c" ? "Ось y пересекается " + (c > 0 ? "выше нуля — c > 0." : "ниже нуля — c < 0.") : "Вершина " + (x0 > 0 ? "справа" : "слева") + ", значит a и b " + (x0 > 0 ? "разных знаков" : "одного знака") + "." };
    },
    function () {
      var k = nz(-6, 6), lie = coin(), q = (k > 0) !== lie ? "I и III" : "II и IV";
      return { html: "Ветви гиперболы " + m("y=" + k + "/x") + " лежат в " + q + " четвертях", truth: !lie,
        why: "k " + (k > 0 ? "> 0 — I и III четверти." : "< 0 — II и IV четверти.") };
    },
    function () {
      var k = nz(-4, 4), b = r(-5, 5), claim = coin();
      return { html: "Функция " + m("y=" + lin(k, b)) + (claim ? " возрастает" : " убывает"), truth: (k > 0) === claim,
        why: "Всё решает k = " + sg(k) + ": " + (k > 0 ? "k > 0 — возрастает." : "k < 0 — убывает.") };
    },
    function () {
      var x = r(-3, 3), a = nz(-3, 3), val = x * x + a * x, lie = coin(), shown = lie ? val + UI.pick([-2, 2, -x * 2 || 3]) : val;
      return { html: "Если " + m("f(x)=x^2" + (a > 0 ? "+" : "-") + (Math.abs(a) === 1 ? "" : Math.abs(a)) + "x") + ", то " + m("f(" + sg(x) + ")=" + sg(shown)),
        truth: shown === val, why: "f(" + sg(x) + ") = " + sg(x * x) + (a * x >= 0 ? " + " : " − ") + Math.abs(a * x) + " = " + sg(val) + "." };
    },
    function () {
      var list = [["x^4-x^2", true, "(−x)⁴ − (−x)² = x⁴ − x²"], ["x^3+x", false, "(−x)³ + (−x) = −(x³ + x) — она нечётная"],
        ["|x|+3", true, "|−x| = |x|"], ["x^2+x", false, "(−x)² + (−x) = x² − x — уже другая"], ["5", true, "константа не зависит от x"],
        ["(x-1)^2", false, "график симметричен относительно x = 1, а не оси y"]];
      var it = UI.pick(list);
      return { html: "Функция " + m("y=" + it[0]) + " чётная", truth: it[1], why: it[2] + "." };
    },
    function () {
      var b = nz(-5, 5), lie = coin(), d = (b > 0) !== lie ? "вверх" : "вниз";
      return { html: m("y=sqrt(x)" + (b > 0 ? "+" : "-") + Math.abs(b)) + " — это " + m("y=sqrt(x)") + ", сдвинутая " + d + " на " + Math.abs(b), truth: !lie,
        why: "Снаружи всё честно: " + (b > 0 ? "+ — вверх." : "− — вниз.") };
    },
    function () {
      var a = nz(-4, 4), lie = coin(), claim = lie ? -a : a;
      return { html: "Область определения " + m("y=sqrt(x" + (a > 0 ? "-" : "+") + Math.abs(a) + ")") + ": x ≥ " + sg(claim), truth: !lie,
        why: "Под корнем x " + (a > 0 ? "−" : "+") + " " + Math.abs(a) + " ≥ 0, значит x ≥ " + sg(a) + "." };
    }
  ];

  function render(root) {
    var DURATION = 60, timer = 0, left, score, streak, best = App.flag("blitz-best") || 0, cur, busy = false, mistakes;
    var screen = h("div", { class: "blitz" });
    root.appendChild(screen);

    function intro() {
      screen.innerHTML = "";
      screen.appendChild(h("div", { class: "blitz__card" },
        h("div", { style: "font-size:48px", text: "⚡" }),
        h("div", { html: "<b>60 секунд.</b> Утверждения про функции и графики. Верно или неверно — решай быстро." }),
        h("div", { class: "muted", style: "font-size:16px", html: "Клавиши: <span class=\"kbd\">←</span> неверно, <span class=\"kbd\">→</span> верно. Три верных подряд — комбо ×2." }),
        best ? h("div", { class: "muted", style: "font-size:16px", text: "Твой рекорд: " + best }) : null));
      screen.appendChild(h("button", { class: "btn btn--primary", style: "padding:18px;font-size:20px", text: "Погнали!", onclick: start }));
    }

    var card, timeBar, scoreEl, streakEl, whyEl;
    function start() {
      left = DURATION; score = 0; streak = 0; mistakes = [];
      screen.innerHTML = "";
      scoreEl = h("span"); streakEl = h("span", { style: "color:var(--yellow)" });
      timeBar = h("span", { style: "width:100%" });
      card = h("div", { class: "blitz__card" });
      whyEl = h("div", { class: "muted", style: "min-height:1.6em;font-size:15px" });
      screen.appendChild(h("div", { class: "blitz__top" }, scoreEl, streakEl));
      screen.appendChild(h("div", { class: "blitz__time" }, timeBar));
      screen.appendChild(card);
      screen.appendChild(h("div", { class: "blitz__btns" },
        h("button", { class: "btn btn--no", text: "← Неверно", onclick: function () { answer(false); } }),
        h("button", { class: "btn btn--yes", text: "Верно →", onclick: function () { answer(true); } })));
      screen.appendChild(whyEl);
      var t0 = Date.now();
      clearInterval(timer);
      timer = setInterval(function () {
        left = DURATION - (Date.now() - t0) / 1000;
        timeBar.style.width = Math.max(0, left / DURATION * 100) + "%";
        if (left <= 0) finish();
      }, 100);
      next(); hud();
    }
    function hud() {
      scoreEl.textContent = "Очки: " + score;
      streakEl.textContent = streak >= 3 ? "🔥 комбо ×2" : streak ? "серия " + streak : "";
    }
    function next() {
      cur = UI.pick(GEN)();
      card.className = "blitz__card";
      card.innerHTML = (cur.mini ? UI.mini(cur.mini, { color: "#ec7a0c" }) : "") + "<div>" + cur.html + "</div>";
      busy = false;
    }
    function answer(v) {
      if (busy || left <= 0) return;
      busy = true;
      var good = v === cur.truth;
      if (good) { streak++; score += streak >= 3 ? 2 : 1; whyEl.textContent = ""; }
      else { streak = 0; mistakes.push(cur); whyEl.innerHTML = '<span class="bad">Ошибка:</span> ' + cur.why; }
      card.classList.add(good ? "is-ok" : "is-bad");
      hud();
      setTimeout(next, good ? 250 : 900);
    }
    function finish() {
      clearInterval(timer); timer = 0;
      var record = score > best;
      if (record) { best = score; App.flag("blitz-best", best); }
      screen.innerHTML = "";
      screen.appendChild(h("div", { class: "blitz__card" },
        h("div", { style: "font-size:48px", text: score >= 25 ? "🏆" : score >= 15 ? "🔥" : "💪" }),
        h("div", { html: "Очки: <b>" + score + "</b>" + (record ? " — новый рекорд!" : " · рекорд " + best) })));
      if (score >= 5) { App.addXp(Math.min(25, score), "блиц"); if (record) UI.confetti(screen); }
      if (mistakes.length) {
        screen.appendChild(h("div", { class: "callout", style: "text-align:left" },
          h("p", { html: "<b>Разбор ошибок</b>" }),
          mistakes.slice(0, 8).map(function (q) {
            return h("p", { style: "margin-top:8px", html: q.html + " — <b>" + (q.truth ? "верно" : "неверно") + "</b>. " + q.why });
          })));
      }
      screen.appendChild(h("button", { class: "btn btn--primary", style: "padding:18px;font-size:20px", text: "Ещё раз", onclick: start }));
    }
    function onKey(e) {
      if (!timer) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); answer(false); }
      if (e.key === "ArrowRight") { e.preventDefault(); answer(true); }
    }
    document.addEventListener("keydown", onKey);
    intro();
    return function () { clearInterval(timer); document.removeEventListener("keydown", onKey); };
  }

  App.tool({
    id: "blitz", order: 3, icon: "⚡", color: "var(--yellow)",
    title: "Блиц", subtitle: "60 секунд: верно или неверно. Побей свой рекорд",
    render: render
  });
})();
