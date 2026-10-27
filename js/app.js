/* App — роутер, прогресс (localStorage), опыт и уровни. */
(function () {
  "use strict";
  var KEY = "funkcii9-progress";
  var state = load();

  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.done) return s; } catch (e) { /* приватный режим */ }
    return { xp: 0, done: {}, flags: {} };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ничего */ } }

  var RANKS = [
    [0, "Новичок с калькулятором"], [60, "Знаток осей"], [150, "Повелитель точек"],
    [280, "Сдвигатель графиков"], [450, "Укротитель парабол"], [650, "Снайпер функций"],
    [900, "Гроссмейстер графиков"], [1200, "Легенда 9 класса"]
  ];
  function rank(xp) {
    var r = RANKS[0], next = null;
    for (var i = 0; i < RANKS.length; i++) { if (xp >= RANKS[i][0]) r = RANKS[i]; else { next = RANKS[i]; break; } }
    return { name: r[1], from: r[0], next: next ? next[0] : null, nextName: next ? next[1] : null, level: RANKS.indexOf(r) + 1 };
  }

  var sections = [], tools = [];
  var App = {
    sections: sections, tools: tools,
    register: function (s) { sections.push(s); sections.sort(function (a, b) { return a.num - b.num; }); },
    tool: function (t) { tools.push(t); tools.sort(function (a, b) { return (a.order || 9) - (b.order || 9); }); },
    isDone: function (id) { return !!state.done[id]; },
    flag: function (k, v) { if (v === undefined) return state.flags[k]; state.flags[k] = v; save(); },
    xp: function () { return state.xp; },
    addXp: function (n, why) {
      var before = rank(state.xp);
      state.xp += n; save(); renderHud();
      var after = rank(state.xp);
      if (after.level > before.level) UI.toast("🏆 Новое звание: <b>" + after.name + "</b>", "rank");
      else if (why) UI.toast("+" + n + " XP · " + why);
    },
    solve: function (id, xp) {
      if (state.done[id]) return;
      state.done[id] = Date.now();
      this.addXp(xp);
      var sec = sections.filter(function (s) { return id.indexOf(s.id + ":") === 0; })[0];
      if (sec) {
        var st = this.stats(sec);
        if (st.done === st.total) UI.toast("⭐ Блок «" + sec.title + "» пройден целиком!", "rank");
      }
    },
    stats: function (sec) {
      var done = Object.keys(state.done).filter(function (k) { return k.indexOf(sec.id + ":") === 0; }).length;
      return { done: Math.min(done, sec.tasks), total: sec.tasks };
    },
    reset: function () { state = { xp: 0, done: {}, flags: {} }; save(); renderHud(); route(); }
  };
  window.App = App;

  /* ---------- шапка ---------- */
  function renderHud() {
    var hud = document.getElementById("hud");
    if (!hud) return;
    var r = rank(state.xp);
    var pct = r.next ? Math.round((state.xp - r.from) / (r.next - r.from) * 100) : 100;
    hud.innerHTML = "";
    hud.appendChild(UI.h("div", { class: "hud__rank", title: r.next ? "До звания «" + r.nextName + "» — " + (r.next - state.xp) + " XP" : "Максимальное звание" },
      UI.h("span", { class: "hud__lvl", text: r.level }),
      UI.h("span", { class: "hud__name", text: r.name }),
      UI.h("span", { class: "hud__bar" }, UI.h("span", { style: "width:" + pct + "%" }))));
    hud.appendChild(UI.h("div", { class: "hud__xp", html: "<b>" + state.xp + "</b> XP" }));
  }

  /* ---------- маршруты ---------- */
  function route() {
    var hash = location.hash.replace(/^#\/?/, "");
    var root = document.getElementById("app");
    root.innerHTML = "";
    window.scrollTo(0, 0);
    if (App._cleanup) { App._cleanup(); App._cleanup = null; }
    var parts = hash.split("/");
    if (parts[0] === "s") {
      var sec = sections.filter(function (s) { return s.id === parts[1]; })[0];
      if (sec) return renderSection(root, sec);
    }
    if (parts[0] === "t") {
      var t = tools.filter(function (s) { return s.id === parts[1]; })[0];
      if (t) return renderTool(root, t);
    }
    renderHome(root);
  }

  function renderHome(root) {
    var h = UI.h;
    document.title = "Функции · 9 класс";
    root.appendChild(h("div", { class: "hero" },
      h("div", { class: "hero__text" },
        h("h1", { html: "Функции —<br>это не страшно" }),
        h("p", { html: "Графики, которые двигаются от твоих рук. Пушки, которые стреляют параболами. Задачи, после которых ОГЭ покажется лёгким. Иди по блокам сверху вниз — или сразу <a href=\"#/t/duel\">в бой</a>." })),
      h("div", { class: "hero__art", html: heroSvg() })));

    root.appendChild(h("h2", { class: "home__h", text: "Маршрут" }));
    var grid = h("div", { class: "map" });
    sections.forEach(function (s) {
      var st = App.stats(s), pct = st.total ? st.done / st.total : 0;
      grid.appendChild(h("a", { class: "map__card", href: "#/s/" + s.id, style: "--c:" + s.color },
        h("div", { class: "map__num", text: s.num }),
        h("div", { class: "map__body" },
          h("div", { class: "map__title", text: s.title }),
          h("div", { class: "map__sub", text: s.subtitle })),
        h("div", { class: "map__ring", style: "--p:" + pct, title: st.done + " из " + st.total + " заданий" },
          h("span", { text: pct === 1 ? "★" : st.done + "/" + st.total }))));
    });
    root.appendChild(grid);

    root.appendChild(h("h2", { class: "home__h", text: "Игры и инструменты" }));
    var tg = h("div", { class: "tools" });
    tools.forEach(function (t) {
      tg.appendChild(h("a", { class: "tool", href: "#/t/" + t.id, style: "--c:" + t.color },
        h("div", { class: "tool__icon", text: t.icon }),
        h("div", { class: "tool__title", text: t.title }),
        h("div", { class: "tool__sub", text: t.subtitle })));
    });
    root.appendChild(tg);
    root.appendChild(h("p", { class: "home__foot" },
      "Прогресс хранится в этом браузере. ",
      h("button", { class: "linkbtn", text: "Сбросить прогресс", onclick: function () {
        if (confirm("Точно стереть весь прогресс и XP?")) App.reset();
      } })));
  }

  function pageHead(root, title, sub, color, num) {
    var h = UI.h;
    root.appendChild(h("div", { class: "page-head", style: "--c:" + color },
      h("a", { class: "back", href: "#/", text: "← Маршрут" }),
      h("div", { class: "page-head__row" },
        num ? h("div", { class: "page-head__num", text: num }) : null,
        h("div", null, h("h1", { text: title }), sub ? h("p", { text: sub }) : null))));
  }

  function renderSection(root, sec) {
    document.title = sec.title + " · Функции";
    pageHead(root, sec.title, sec.subtitle, sec.color, sec.num);
    var body = UI.h("div", { class: "page" });
    root.appendChild(body);
    sec.render(body);
    UI.mountAll(body);
    if (sec.mounted) sec.mounted(body);
    var i = sections.indexOf(sec), next = sections[i + 1], prev = sections[i - 1];
    root.appendChild(UI.h("nav", { class: "pager" },
      prev ? UI.h("a", { class: "btn btn--ghost", href: "#/s/" + prev.id, text: "← " + prev.title }) : UI.h("span"),
      next ? UI.h("a", { class: "btn btn--primary", href: "#/s/" + next.id, text: next.title + " →" })
           : UI.h("a", { class: "btn btn--primary", href: "#/t/duel", text: "В бой: Дуэль графиков →" })));
  }

  function renderTool(root, t) {
    document.title = t.title + " · Функции";
    pageHead(root, t.title, t.subtitle, t.color);
    var body = UI.h("div", { class: "page page--tool" });
    root.appendChild(body);
    var cleanup = t.render(body);
    UI.mountAll(body);
    if (typeof cleanup === "function") App._cleanup = cleanup;
  }

  function heroSvg() {
    return '<svg viewBox="0 0 320 240" aria-hidden="true">' +
      '<defs><pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="rgba(29, 32, 51, .07)"/></pattern></defs>' +
      '<rect width="320" height="240" rx="24" fill="url(#g)"/>' +
      '<path d="M0 120H320M160 0V240" stroke="rgba(29, 32, 51, .35)" stroke-width="1.5"/>' +
      '<path class="hero__curve hero__curve--1" d="M60 10 Q160 330 260 10" fill="none" stroke="#d18f00" stroke-width="5" stroke-linecap="round"/>' +
      '<path class="hero__curve hero__curve--2" d="M20 220 L300 40" fill="none" stroke="#0a8bd0" stroke-width="5" stroke-linecap="round"/>' +
      '<path class="hero__curve hero__curve--3" d="M30 60 Q150 240 210 160 T310 200" fill="none" stroke="#e23468" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="160" cy="170" r="9" fill="#17a34a"/>' +
      '<circle r="6" fill="#1d2033"><animateMotion dur="3s" begin="2s" repeatCount="indefinite" path="M30 60 Q150 240 210 160 T310 200"/></circle>' +
      "</svg>";
  }

  window.addEventListener("hashchange", route);
  window.addEventListener("DOMContentLoaded", function () { renderHud(); route(); });
})();
