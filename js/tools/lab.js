/* Лаборатория графиков — свой маленький Desmos.
   Буквы a, b, c, d, k, m, n, p, q сами становятся ползунками.
   Ссылкой «поделиться» можно отправить набор графиков: #/t/lab/<данные>. */
(function () {
  "use strict";
  var h = UI.h;
  var NAMES = ["sqrt", "abs", "sin", "cos", "tan", "sign", "log", "ln", "pi", "x", "e"];
  var PARAMS = "abcdkmnpq";

  /* Разбивает формулу на части и подставляет значения параметров */
  function substitute(src, values, used) {
    var s = String(src).replace(/^\s*y\s*=/i, "");
    return s.replace(/[a-z]+/gi, function (word) {
      word = word.toLowerCase();
      var out = "", i = 0;
      while (i < word.length) {
        var hit = null;
        for (var j = 0; j < NAMES.length; j++) if (word.substr(i, NAMES[j].length) === NAMES[j]) { hit = NAMES[j]; break; }
        if (hit) { out += (out && /[a-z0-9)]$/.test(out) && hit !== "x" ? "*" : "") + hit; i += hit.length; continue; }
        var ch = word[i];
        if (PARAMS.indexOf(ch) >= 0) {
          used[ch] = true;
          out += "(" + (values[ch] !== undefined ? values[ch] : 1) + ")";
        } else out += ch;
        i++;
      }
      return out;
    });
  }

  var PRESETS = [
    { name: "Парабола со сдвигами", rows: ["a(x-b)^2+c"], p: { a: 1, b: 2, c: -1 } },
    { name: "Прямые", rows: ["kx+b", "x"], p: { k: 0.5, b: 1 } },
    { name: "Гипербола", rows: ["k/(x-a)+b"], p: { k: 2, a: 1, b: 1 } },
    { name: "Модуль", rows: ["a|x-b|+c", "|x|"], p: { a: 1, b: 2, c: -2 } },
    { name: "Корень", rows: ["sqrt(x-a)+b", "-sqrt(x-a)+b"], p: { a: -2, b: 1 } },
    { name: "Парабола и прямая", rows: ["x^2-4", "kx+b"], p: { k: 1, b: 2 } }
  ];

  function render(root) {
    var parts = location.hash.split("/");
    var state = { rows: ["a(x-b)^2+c", ""], p: { a: 1, b: 2, c: -1 } };
    if (parts[3]) {
      try { var st = JSON.parse(decodeURIComponent(parts[3])); if (st && st.rows) state = st; } catch (e) { /* битая ссылка */ }
    }
    var rows = [], anims = {}, raf = 0;
    var list = h("div", { class: "lab__list" });
    var sliders = h("div", { class: "sliders" });
    var pb = UI.plotBox({ x: [-10, 10], y: [-7, 7], zoom: true, pan: true });
    var hoverX = null;
    var readout = h("div", { class: "plot__read", style: "display:none" });
    pb.el.appendChild(readout);

    function addRow(text) {
      var color = Plot.PALETTE[rows.length % Plot.PALETTE.length];
      var row = { text: text || "", on: true, color: color };
      var dot = h("button", { class: "lab__dot", style: "border-color:" + color + ";background:" + color, title: "Показать / скрыть" });
      var input = h("input", { type: "text", value: row.text, placeholder: "например, x^2 − 3", spellcheck: "false" });
      var err = h("div", { class: "lab__err" });
      var el = h("div", { class: "lab__row" }, dot, input,
        h("button", { class: "lab__del", title: "Удалить", text: "✕", onclick: function () {
          rows.splice(rows.indexOf(row), 1); el.remove(); refresh();
        } }), err);
      dot.onclick = function () { row.on = !row.on; dot.classList.toggle("is-off", !row.on); dot.style.background = row.on ? color : "transparent"; draw(); };
      input.addEventListener("input", function () { row.text = input.value; refresh(); });
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") { var r = addRow(""); refresh(); r.input.focus(); } });
      row.el = el; row.err = err; row.input = input;
      rows.push(row);
      list.appendChild(el);
      return row;
    }

    function compileAll() {
      var used = {};
      rows.forEach(function (r) {
        r.f = null; r.err.textContent = ""; r.el.classList.remove("is-err");
        if (!r.text.trim()) return;
        var res = Formula.tryCompile(substitute(r.text, state.p, used));
        if (res.error) { r.err.textContent = res.error; r.el.classList.add("is-err"); }
        else r.f = res.f;
      });
      return used;
    }

    function refresh() {
      var used = compileAll();
      sliders.innerHTML = "";
      Object.keys(used).sort().forEach(function (k) {
        if (state.p[k] === undefined) state.p[k] = 1;
        var play = h("button", { class: "plot__btn", title: "Анимировать", text: anims[k] ? "⏸" : "▶" });
        var sl = UI.slider("<span class=\"m\">" + k + "</span>", -10, 10, 0.1, state.p[k], function (v) {
          state.p[k] = v; compileAll(); draw();
        });
        play.onclick = function () {
          if (anims[k]) delete anims[k]; else anims[k] = { dir: 1, sl: sl };
          play.textContent = anims[k] ? "⏸" : "▶";
          tick();
        };
        sl.insertBefore(play, sl.firstChild);
        sl.style.gridTemplateColumns = "34px 40px 1fr 56px";
        if (anims[k]) anims[k].sl = sl;
        sliders.appendChild(sl);
      });
      draw();
    }

    function tick() {
      cancelAnimationFrame(raf);
      if (!Object.keys(anims).length) return;
      var last = performance.now();
      (function step(now) {
        var dt = Math.min(0.05, (now - last) / 1000); last = now;
        Object.keys(anims).forEach(function (k) {
          var A = anims[k], v = state.p[k] + A.dir * dt * 2;
          if (v > 5) { v = 5; A.dir = -1; } if (v < -5) { v = -5; A.dir = 1; }
          state.p[k] = Math.round(v * 100) / 100; A.sl.set(state.p[k]);
        });
        compileAll(); draw();
        raf = requestAnimationFrame(step);
      })(last);
    }

    function draw() {
      var P = pb.plot; if (!P) return;
      var L = [];
      rows.forEach(function (r) { if (r.f && r.on) L.push({ type: "fn", f: r.f, color: r.color, width: 3 }); });
      readout.style.display = "none";
      if (hoverX !== null) {
        var best = null;
        rows.forEach(function (r) { if (r.f && r.on) { var y = r.f(hoverX); if (!isNaN(y) && (!best || Math.abs(P.Y(y) - hoverY) < Math.abs(P.Y(best.y) - hoverY))) best = { y: y, c: r.color }; } });
        if (best && Math.abs(P.Y(best.y) - hoverY) < 60) {
          L.push({ type: "point", x: hoverX, y: best.y, color: best.c, r: 6 });
          readout.style.display = "";
          readout.innerHTML = "(" + UI.fmt(hoverX) + "; " + UI.fmt(best.y) + ")";
        }
      }
      P.layers = L; P.draw();
    }
    var hoverY = 0;

    var presets = h("div", { class: "btns" });
    PRESETS.forEach(function (pr) {
      presets.appendChild(h("button", { class: "chip", text: pr.name, onclick: function () {
        rows.forEach(function (r) { r.el.remove(); }); rows = []; anims = {};
        state.p = Object.assign({}, pr.p);
        pr.rows.forEach(function (t) { addRow(t); }); addRow("");
        refresh();
      } }));
    });

    var share = h("button", { class: "btn btn--ghost btn--sm", text: "🔗 Ссылка на этот набор", onclick: function () {
      var data = { rows: rows.map(function (r) { return r.text; }).filter(Boolean), p: state.p };
      var url = location.href.split("#")[0] + "#/t/lab/" + encodeURIComponent(JSON.stringify(data));
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { UI.toast("Ссылка скопирована — отправь её"); }, function () { prompt("Скопируй ссылку:", url); });
      else prompt("Скопируй ссылку:", url);
    } });

    root.appendChild(h("div", { class: "lab" },
      h("div", { class: "sliders" },
        list,
        h("button", { class: "btn btn--ghost btn--sm", style: "align-self:flex-start", text: "+ Ещё график", onclick: function () { addRow("").input.focus(); } }),
        sliders,
        h("details", { class: "callout" }, h("summary", { text: "Как писать формулы" }),
          h("p", { html: "Степень: <span class=\"kbd\">x^2</span>. Корень: <span class=\"kbd\">sqrt(x)</span>. Модуль: <span class=\"kbd\">|x|</span>. Дробь: <span class=\"kbd\">1/(x-2)</span>. Умножение можно не писать: <span class=\"kbd\">2x</span>, <span class=\"kbd\">3(x+1)</span>. Любая из букв a, b, c, d, k, m, n, p, q превращается в ползунок, а кнопка ▶ рядом с ним запускает анимацию." })),
        h("div", null, h("p", { class: "muted", style: "margin:0 0 8px;font-size:14px", text: "Готовые наборы:" }), presets),
        share),
      pb.el));

    state.rows.forEach(function (t) { addRow(t); });
    if (!rows.length || rows[rows.length - 1].text) addRow("");
    UI.later(function () {
      var P = pb.mount();
      P.opts.onMove = function (x, y) { hoverX = x; hoverY = P.Y(y); draw(); };
      P.opts.onLeave = function () { hoverX = null; draw(); };
      refresh();
    });
    return function () { cancelAnimationFrame(raf); };
  }

  App.tool({
    id: "lab", order: 2, icon: "🧪", color: "var(--cyan)",
    title: "Лаборатория", subtitle: "Свой Desmos: пиши формулы, крути ползунки, делись ссылкой",
    render: render
  });
})();
