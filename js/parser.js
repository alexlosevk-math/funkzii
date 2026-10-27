/* Разбор формул без eval.
   Понимает: числа (2, 0.5, 0,5), x, pi, e, + - * / ^, скобки, |x|,
   sqrt/√, abs, sin, cos, неявное умножение (2x, 3(x+1), (x-1)(x+2)),
   ² и ³, префикс «y =» / «f(x) =».
   Formula.compile("2x^2-3") → функция x ↦ число (NaN, если не определена). */
(function () {
  "use strict";

  var FUNCS = {
    sqrt: Math.sqrt, abs: Math.abs, sin: Math.sin, cos: Math.cos, tan: Math.tan,
    ln: Math.log, log: function (v) { return Math.log10(v); }, sign: Math.sign
  };
  var CONSTS = { pi: Math.PI, "π": Math.PI, e: Math.E };

  function FormulaError(msg, pos) { this.message = msg; this.pos = pos; }
  FormulaError.prototype = Object.create(Error.prototype);

  function normalize(src) {
    var s = String(src).trim().toLowerCase();
    s = s.replace(/^\s*(y|f\s*\(\s*x\s*\))\s*=\s*/, "");
    s = s.replace(/[−–—]/g, "-").replace(/[·×]/g, "*").replace(/÷/g, "/");
    s = s.replace(/²/g, "^2").replace(/³/g, "^3");
    s = s.replace(/(\d),(\d)/g, "$1.$2");       // 0,5 → 0.5
    s = s.replace(/х/g, "x");                    // кириллическая «х»
    s = s.replace(/корень/g, "sqrt").replace(/√/g, "sqrt");
    return s;
  }

  function tokenize(s) {
    var out = [], i = 0;
    while (i < s.length) {
      var c = s[i];
      if (c === " " || c === "\t") { i++; continue; }
      if (/[0-9.]/.test(c)) {
        var j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++;
        var num = s.slice(i, j);
        if ((num.match(/\./g) || []).length > 1 || num === ".") throw new FormulaError("Странное число «" + num + "»", i);
        out.push({ t: "num", v: parseFloat(num), p: i }); i = j; continue;
      }
      if (/[a-zπ]/.test(c)) {
        var k = i; while (k < s.length && /[a-zπ]/.test(s[k])) k++;
        var word = s.slice(i, k);
        // разбиваем слитно написанное: «xsqrt», «pix», «2xx»
        var p = 0;
        while (p < word.length) {
          var hit = null;
          ["sqrt", "abs", "sin", "cos", "tan", "sign", "log", "ln", "pi", "π", "x", "e"].some(function (n) {
            if (word.substr(p, n.length) === n) { hit = n; return true; }
            return false;
          });
          if (!hit) throw new FormulaError("Не знаю, что такое «" + word.slice(p) + "». Переменная тут одна — x", i + p);
          if (hit === "x") out.push({ t: "x", p: i + p });
          else if (CONSTS[hit] !== undefined) out.push({ t: "num", v: CONSTS[hit], p: i + p });
          else out.push({ t: "fn", v: hit, p: i + p });
          p += hit.length;
        }
        i = k; continue;
      }
      if ("+-*/^()|".indexOf(c) >= 0) { out.push({ t: c, p: i }); i++; continue; }
      if (c === "[" || c === "{") { out.push({ t: "(", p: i }); i++; continue; }
      if (c === "]" || c === "}") { out.push({ t: ")", p: i }); i++; continue; }
      throw new FormulaError("Лишний символ «" + c + "»", i);
    }
    return out;
  }

  // Узлы дерева — замыкания (x) => число
  function Parser(tokens) { this.tk = tokens; this.i = 0; this.abs = 0; }
  Parser.prototype.peek = function () { return this.tk[this.i]; };
  Parser.prototype.next = function () { return this.tk[this.i++]; };
  Parser.prototype.expect = function (t) {
    var tok = this.next();
    if (!tok || tok.t !== t) throw new FormulaError(t === ")" ? "Не хватает закрывающей скобки" : t === "|" ? "Не закрыт модуль |…|" : "Ожидал «" + t + "»", tok ? tok.p : -1);
  };
  // начало значения — для неявного умножения
  Parser.prototype.startsValue = function (tok) {
    if (!tok) return false;
    if (tok.t === "|") return this.abs === 0;
    return tok.t === "num" || tok.t === "x" || tok.t === "fn" || tok.t === "(";
  };
  Parser.prototype.expr = function () {
    var left = this.term();
    for (;;) {
      var tok = this.peek();
      if (tok && (tok.t === "+" || tok.t === "-")) {
        this.next();
        left = tok.t === "+" ? add(left, this.term()) : sub(left, this.term());
      } else return left;
    }
  };
  Parser.prototype.term = function () {
    var left = this.unary();
    for (;;) {
      var tok = this.peek();
      if (tok && (tok.t === "*" || tok.t === "/")) {
        this.next();
        left = tok.t === "*" ? mul(left, this.unary()) : div(left, this.unary());
      } else if (this.startsValue(tok)) {
        left = mul(left, this.power());
      } else return left;
    }
  };
  function add(l, r) { return function (x) { return l(x) + r(x); }; }
  function sub(l, r) { return function (x) { return l(x) - r(x); }; }
  function mul(l, r) { return function (x) { return l(x) * r(x); }; }
  function div(l, r) { return function (x) { return l(x) / r(x); }; }
  Parser.prototype.unary = function () {
    var tok = this.peek();
    if (tok && tok.t === "-") { this.next(); var a = this.unary(); return function (x) { return -a(x); }; }
    if (tok && tok.t === "+") { this.next(); return this.unary(); }
    return this.power();
  };
  Parser.prototype.power = function () {
    var base = this.primary();
    var tok = this.peek();
    if (tok && tok.t === "^") {
      this.next();
      var ex = this.unary();          // правоассоциативно: 2^3^2 = 2^9
      return function (x) { return pow(base(x), ex(x)); };
    }
    return base;
  };
  function pow(a, b) {
    // (-8)^(1/3) = -2, как ждут школьники
    if (a < 0 && !Number.isInteger(b)) {
      var inv = 1 / b, n = Math.round(inv);
      if (Math.abs(inv - n) < 1e-9 && n % 2 !== 0) return -Math.pow(-a, b);
      return NaN;
    }
    return Math.pow(a, b);
  }
  Parser.prototype.primary = function () {
    var tok = this.next();
    if (!tok) throw new FormulaError("Формула оборвалась", -1);
    if (tok.t === "num") { var v = tok.v; return function () { return v; }; }
    if (tok.t === "x") return function (x) { return x; };
    if (tok.t === "(") { var e = this.expr(); this.expect(")"); return e; }
    if (tok.t === "|") {
      this.abs++; var inner = this.expr(); this.abs--; this.expect("|");
      return function (x) { return Math.abs(inner(x)); };
    }
    if (tok.t === "fn") {
      var fn = FUNCS[tok.v], arg;
      var nx = this.peek();
      if (nx && nx.t === "(") { this.next(); arg = this.expr(); this.expect(")"); }
      else arg = this.power();          // √x, sqrt x, sin x
      if (tok.v === "sqrt") return function (x) { var a = arg(x); return a < 0 ? NaN : Math.sqrt(a); };
      return function (x) { return fn(arg(x)); };
    }
    if (tok.t === ")") throw new FormulaError("Лишняя закрывающая скобка", tok.p);
    throw new FormulaError("Не ожидал «" + tok.t + "» здесь", tok.p);
  };

  function compile(src) {
    var s = normalize(src);
    if (!s) throw new FormulaError("Пустая формула", 0);
    var p = new Parser(tokenize(s));
    var f = p.expr();
    if (p.i < p.tk.length) {
      var t = p.tk[p.i];
      throw new FormulaError(t.t === ")" ? "Лишняя закрывающая скобка" : "Не понял, что делать с «" + t.t + "»", t.p);
    }
    return function (x) {
      var y = f(x);
      return (typeof y === "number" && isFinite(y)) ? y : NaN;
    };
  }

  function tryCompile(src) {
    try { return { f: compile(src) }; }
    catch (e) { return { error: e.message || "Не получилось прочитать формулу" }; }
  }

  /* Совпадают ли две функции: сравниваем значения в куче точек.
     Учитываем и область определения: где одна есть, а другой нет — разные. */
  function same(f, g, opts) {
    opts = opts || {};
    var lo = opts.min !== undefined ? opts.min : -9, hi = opts.max !== undefined ? opts.max : 9;
    var n = 61, both = 0;
    for (var i = 0; i < n; i++) {
      var x = lo + (hi - lo) * (i + 0.37) / n;      // смещение, чтобы не попадать в «красивые» точки
      var a = f(x), b = g(x);
      if (isNaN(a) !== isNaN(b)) return false;
      if (isNaN(a)) continue;
      both++;
      if (Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(b))) return false;
    }
    return both > 3;
  }

  /* Красивая запись формулы для показа: x^2 → x², x^n → xⁿ, * → ·, sqrt(x) → √x */
  function pretty(src) {
    var s = String(src).replace(/\s+/g, "");
    s = s.replace(/\^([0-9n])(?![0-9.])/g, function (_, d) { return d === "n" ? "ⁿ" : "⁰¹²³⁴⁵⁶⁷⁸⁹".charAt(+d); });
    s = s.replace(/(\d)\*(?=[a-z(|√])/g, "$1").replace(/\*/g, "·").replace(/-/g, "−");
    s = s.replace(/sqrt\(([^()]*)\)/g, "√($1)").replace(/√\(([a-z0-9.]+)\)/g, "√$1");
    s = s.replace(/([^\s(|])([+−=])/g, "$1 $2 ").replace(/  +/g, " ");
    s = s.replace(/([a-z0-9)²³])\|([+−])/g, "$1| $2 ");      // после закрывающего модуля
    s = s.replace(/(\d)\.(\d)/g, "$1,$2");
    return s;
  }

  window.Formula = { compile: compile, tryCompile: tryCompile, same: same, pretty: pretty };
})();
