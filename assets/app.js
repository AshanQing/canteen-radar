/* 食堂雷达 · 界面层（无框架、无依赖） */
(function () {
  var D = window.FDR_DATA, C = window.FDR_CORE;
  var cById = {}, wById = {};
  D.canteens.forEach(function (c) { cById[c.id] = c; });
  D.windows.forEach(function (w) { wById[w.id] = w; });

  var DISHES = D.dishes.map(function (d) {
    var dist = C.buildDist(d.avg, d.votes);
    var good = dist[3] + dist[4];
    var win = wById[d.windowId];
    var o = {
      id: d.id, name: d.name, price: d.price, kcal: d.kcal, spicy: d.spicy,
      tags: d.tags.slice(), desc: d.desc, votes: d.votes, repeat: d.repeat,
      wait: d.wait, emoji: d.emoji, isNew: d.isNew, win: win,
      canteen: cById[win.canteenId], dist: dist,
      avg: C.avgOfDist(dist), good: good, goodRate: good / d.votes,
      wilson: C.wilson(good, d.votes), ray: C.riskOf(dist)
    };
    return o;
  });
  var dById = {};
  DISHES.forEach(function (d) { dById[d.id] = d; });

  var ME_KEY = "fdr_me_v1";
  var ME = (function () {
    try {
      var raw = JSON.parse(localStorage.getItem(ME_KEY));
      if (raw && raw.reviews) return raw;
    } catch (e) {}
    return { reviews: [], favs: [], hates: [] };
  })();
  function save() { try { localStorage.setItem(ME_KEY, JSON.stringify(ME)); } catch (e) {} }

  var S = { filters: {}, order: 0, rank: "flower", q: "", comboOrder: 0, rvFilter: "all", dishId: "" };
  var THEME_KEY = "fdr_theme";
  function curTheme() { return document.documentElement.getAttribute("data-theme") || "light"; }
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    Array.prototype.forEach.call(document.querySelectorAll(".themebtn"), function (b) {
      b.textContent = t === "dark" ? "☀️" : "🌙";
      b.setAttribute("aria-label", t === "dark" ? "切换到日间模式" : "切换到夜间模式");
    });
  }
  (function initTheme() {
    var t = null;
    try { t = localStorage.getItem(THEME_KEY); } catch (e) {}
    if (!t) t = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", t);
  })();

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }
  function money(n) { return "¥" + (n % 1 === 0 ? n : n.toFixed(1)); }
  function pct(x) { return Math.round(x * 100) + "%"; }
  function eaten(id) { return ME.reviews.some(function (r) { return r.dishId === id; }); }
  function myReview(id) {
    var mine = ME.reviews.filter(function (r) { return r.dishId === id; });
    return mine.length ? mine[mine.length - 1] : null;
  }
  function ctxOf(d) {
    return {
      avg: d.avg, wilson: d.wilson, votes: d.votes, ray: d.ray,
      goodRate: d.goodRate, canteenWalk: d.canteen.walk, eaten: eaten(d.id),
      filters: S.filters
    };
  }
  function hash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
    return h;
  }

  var NAMES = ["隔壁老王", "干饭不眨眼", "三食堂常驻NPC", "减肥失败第9天", "早八战神",
    "夜宵侦察兵", "阿姨的干儿子", "一碗不够", "图书馆难民", "ddl战士",
    "宿舍长本人", "卡路里不重要", "今天也在排队", "第二碗能免费吗", "大胃王预选赛冠军"];
  var AVATARS = ["🐷", "🐱", "🐼", "🐸", "🐹", "🦊", "🐻", "🐨", "🐧", "🦉"];

  function flawOf(d) {
    var t = d.tags;
    if (t.indexOf("臭味") >= 0) return "味道太上头，室友差点把我连人带碗扔出宿舍";
    if (t.indexOf("轻食") >= 0) return "量少得像试吃，吃完更饿了";
    if (t.indexOf("炸物") >= 0) return "太油，吃完一嘴油光";
    if (t.indexOf("面食") >= 0) return "坨了，面全粘成一团";
    if (t.indexOf("辣") >= 0 || d.spicy >= 2) return "太辣，当晚胃疼到怀疑人生";
    if (t.indexOf("蒸菜") >= 0 || t.indexOf("清淡") >= 0) return "没什么味，像在吃白开水";
    if (t.indexOf("肉食") >= 0) return "肥肉给太多，腻到吃不下第二口";
    return "菜是凉的，阿姨的手也抖了一下";
  }
  var T5 = ["今天这顿值了，{n}真顶。", "阿姨今天手没抖，给的实在。", "连吃三天了，救救我。（但好吃）", "{p}吃到这个，不允许还有人没吃过。"];
  var T4 = ["可以，明天还来。", "{n}稳，不惊艳但从不翻车。", "排了 {w} 分钟，值。", "分量对得起价格，好评。"];
  var T3 = ["能吃，也就那样。", "今天有点咸，下次再说。", "等了 {w} 分钟，等到我烦躁。", "就……很食堂。"];
  var T2 = ["凉了。{f}，避雷。", "{f}，不推荐。", "今天的{n}不是昨天的{n}。"];
  var T1 = ["别点了，{f}，我的钱。", "{f}，直接劝退，冲的兄弟收手。", "吃完 emo 了，不理解好评哪来的。"];

  var PIC_COUNTS = [2, 1, 0, 2, 1, 0, 1];

  function toneOf(d, n) { return (hash(d.id) + n * 37) % 5; }
  function picTile(d, n, cls) {
    return '<button class="rv-pic tone-' + toneOf(d, n) + (cls ? " " + cls : "") + '" data-act="pic" data-id="' + d.id + '" data-n="' + n + '" aria-label="查看' + esc(d.name) + '的学生实拍图"><span>' + d.emoji + '</span></button>';
  }
  function pictureCount(d) { return 5; }

  function reviewsOf(d) {
    var pool = { "1": T1, "2": T2, "3": T3, "4": T4, "5": T5 };
    var out = [], seed = hash(d.id);
    var total = d.votes;
    // 按分布抽样，保证差评菜真的能看到差评
    var bucket = [];
    for (var star = 1; star <= 5; star++) {
      var c = Math.min(d.dist[star - 1], 24);
      for (var i = 0; i < c; i++) bucket.push(star);
    }
    var picks = [];
    for (var k = 0; k < 7; k++) picks.push(bucket[(seed + k * 37) % bucket.length]);
    // 确保高分菜至少一条好评、低分菜至少一条差评
    var avg = d.avg;
    if (avg >= 4.4 && picks.indexOf(5) < 0) picks[0] = 5;
    if (avg <= 3.8 && picks.indexOf(1) < 0 && picks.indexOf(2) < 0) picks[1] = 2;
    // 有一星就展示一星：差评筛选不能是摆设
    if (d.dist[0] > 0 && picks.indexOf(1) < 0) picks[picks.length - 1] = 1;
    if (d.dist[1] > 0 && picks.indexOf(2) < 0) picks[picks.length - 2] = 2;
    picks.forEach(function (star, idx) {
      var tpl = pool[String(star)][(seed + idx * 7) % pool[String(star)].length];
      var text = tpl.replace("{n}", d.name).replace("{p}", money(d.price))
        .replace("{w}", String(d.wait)).replace("{f}", flawOf(d));
      var days = ((seed + idx * 13) % 9) + 1;
      out.push({
        star: star, text: text,
        who: NAMES[(seed + idx * 3) % NAMES.length],
        avatar: AVATARS[(seed + idx * 5) % AVATARS.length],
        when: days === 1 ? "今天" : (days + " 天前"),
        likes: ((seed + idx * 17) % 40) + 1,
        tags: star <= 2 ? [flawOf(d).slice(0, 4)] : d.tags.slice(0, 2),
        pics: PIC_COUNTS[idx % PIC_COUNTS.length]
      });
    });
    return out;
  }

  function flowers(n) {
    var s = "";
    for (var i = 0; i < 5; i++) s += i < n ? "🌸" : "🤍";
    return s;
  }
  function riskChip(d) {
    if (d.ray >= 0.3) return '<span class="chip chip-danger">⚡ 雷区 ' + pct(d.ray) + '</span>';
    if (d.ray >= 0.18) return '<span class="chip chip-warn">⚠ 偶有翻车</span>';
    return '<span class="chip chip-ok">🛡 稳</span>';
  }

  function scored(list) {
    return list.map(function (d) {
      var c = ctxOf(d);
      var r = C.scoreDish(d, c);
      return { d: d, score: r.score, parts: r.parts, reasons: C.reasonsFor(d, c, r.parts), ctx: c };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  function filtered() {
    var f = S.filters;
    return DISHES.filter(function (d) {
      if (f.cheap && d.price > 10) return false;
      if (f.nowait && d.wait > 6) return false;
      if (f.spicy && !(d.spicy >= 2 || d.tags.indexOf("辣") >= 0)) return false;
      if (f.light && !(d.tags.indexOf("清淡") >= 0 || d.tags.indexOf("轻食") >= 0 || d.tags.indexOf("蒸菜") >= 0)) return false;
      if (f.protein && d.tags.indexOf("高蛋白") < 0) return false;
      if (f.fresh && eaten(d.id)) return false;
      return true;
    });
  }

  function combos() {
    var list = (D.combos || []).map(function (c) {
      var ds = c.dishIds.map(function (id) { return dById[id]; }).filter(Boolean);
      var price = ds.reduce(function (a, d) { return a + d.price; }, 0);
      var kcal = ds.reduce(function (a, d) { return a + d.kcal; }, 0);
      var avg = ds.reduce(function (a, d) { return a + d.avg; }, 0) / (ds.length || 1);
      var meat = ds.filter(function (d) { return d.tags.indexOf("肉食") >= 0 || d.tags.indexOf("炸物") >= 0 || d.tags.indexOf("烧烤") >= 0; }).length;
      var veg = ds.filter(function (d) { return ["素", "清淡", "轻食", "蒸菜", "甜品"].some(function (t) { return d.tags.indexOf(t) >= 0; }); }).length;
      var staple = ds.filter(function (d) { return /饭|面|包|粥|卷|粉|条|馍/.test(d.name); }).length;
      var shape = ["主食×" + staple, meat ? "荤×" + meat : "", veg ? "素/清×" + veg : ""].filter(Boolean).join(" + ");
      return { c: c, ds: ds, price: price, kcal: kcal, avg: avg, shape: shape };
    });
    var f = S.filters;
    if (f.cheap) list.sort(function (a, b) { return a.price - b.price; });
    else if (f.light) list.sort(function (a, b) {
      var s = function (k) { return k.ds.filter(function (d) { return d.tags.indexOf("轻食") >= 0 || d.tags.indexOf("清淡") >= 0; }).length; };
      return s(b) - s(a);
    });
    else if (f.protein) list.sort(function (a, b) {
      var s = function (k) { return k.ds.filter(function (d) { return d.tags.indexOf("高蛋白") >= 0; }).length; };
      return s(b) - s(a);
    });
    var n = S.comboOrder % list.length;
    return list.slice(n).concat(list.slice(0, n));
  }

  /* ---------------- 视图 ---------------- */
  function period() {
    var h = new Date().getHours();
    if (h < 10) return { t: "早八刚下课", s: "胃和脑子都还没开机？先来点热的。", icon: "🌅" };
    if (h < 14) return { t: "午间高峰", s: "食堂正在上演抢菜大逃杀，雷达帮你绕开人堆。", icon: "🔥" };
    if (h < 17) return { t: "下午摸鱼时间", s: "现在吃等于加餐，晚上可能会后悔，但先吃。", icon: "🍵" };
    if (h < 21) return { t: "晚饭点", s: "一天最纠结的时刻，交给我。", icon: "🌇" };
    return { t: "夜宵时间", s: "四食堂还亮着灯，罪恶感先放一边。", icon: "🌙" };
  }

  function viewToday() {
    var p = period();
    var list = filtered();
    var empty = list.length === 0;
    if (empty) list = DISHES.slice();
    var ranked = scored(list);
    var picks = [];
    for (var i = 0; i < 3; i++) picks.push(ranked[(S.order * 3 + i) % ranked.length]);
    var newOnes = DISHES.filter(function (d) { return d.isNew; });
    var danger = DISHES.slice().sort(function (a, b) { return b.ray - a.ray; })[0];

    var h = [];
    h.push('<header class="topbar"><div class="brand"><span class="brand-mark">🍚</span><div><b>食堂雷达</b><small>' + D.school + '</small></div></div><a class="ghost-btn" href="#/about">这是啥</a></header>');
    h.push('<section class="hero"><div class="hero-icon">' + p.icon + '</div><div><h1>' + p.t + '，今天吃这个</h1><p>' + p.s + '</p></div></section>');

    var chips = [["cheap", "💸 10 块内"], ["nowait", "🏃 不排队"], ["spicy", "🌶️ 想吃辣"], ["light", "🥬 清淡点"], ["protein", "💪 高蛋白"], ["fresh", "🆕 没吃过"]];
    h.push('<div class="chips hscroll">');
    chips.forEach(function (c) {
      h.push('<button class="chip-btn' + (S.filters[c[0]] ? " on" : "") + '" data-act="filter" data-key="' + c[0] + '">' + c[1] + '</button>');
    });
    h.push('</div>');
    if (empty) h.push('<p class="hint">这组条件太苛刻了，全校都凑不出一盘，先给你看全部。</p>');

    h.push('<div class="section-title"><span>雷达选出来的 3 个</span><small>按你现在的条件算的</small></div>');
    h.push('<div class="cards">');
    picks.forEach(function (x) {
      var d = x.d;
      h.push('<article class="card rec" data-act="go" data-href="#/dish/' + d.id + '">' +
        '<div class="rec-head"><div class="rec-emoji">' + d.emoji + '</div>' +
        '<div class="rec-main"><h3>' + esc(d.name) + (d.isNew ? ' <span class="tag-new">新</span>' : '') + '</h3>' +
        '<p class="rec-sub">' + d.canteen.name + ' · ' + d.win.name + ' · ' + money(d.price) + '</p></div>' +
        '<div class="rec-score"><b>' + d.avg.toFixed(1) + '</b><span>🌸</span></div></div>' +
        '<div class="rec-meta"><span>🌸 ' + d.votes + ' 朵小红花</span><span>⏱ ' + d.wait + ' 分钟</span>' + riskChip(d) + '</div>' +
        '<ul class="why">');
      x.reasons.forEach(function (r) { h.push('<li>' + esc(r) + '</li>'); });
      h.push('</ul><div class="rec-foot"><span class="why-label">为什么是它</span><span class="go">看有几个人吐槽 →</span></div></article>');
    });
    h.push('</div>');
    h.push('<button class="shuffle" data-act="shuffle">🎲 再来一批，我还能纠结</button>');

    // 搭配推荐：主食 + 蛋白 + 蔬菜
    h.push('<div class="section-title"><span>搭配推荐 · 一个人也要好好吃饭</span><span class="sec-actions"><button class="sec-arrow" data-act="scroll" data-target=".combos" data-dir="-1" aria-label="上一组搭配">‹</button><button class="sec-arrow" data-act="scroll" data-target=".combos" data-dir="1" aria-label="下一组搭配">›</button><button class="sec-act" data-act="combo-rand">🎲 配一套</button></span></div>');
    h.push('<div class="combos hscroll">');
    combos().forEach(function (k) {
      h.push('<article class="combo" data-act="combo" data-id="' + k.c.id + '"><div class="combo-head"><span class="combo-emoji">' + k.c.emoji + '</span><div><b>' + esc(k.c.name) + '</b><small>' + k.ds.length + ' 道 · ' + k.shape + '</small></div></div><div class="combo-dishes">');
      k.ds.forEach(function (d) {
        h.push('<button class="combo-dish" data-act="go" data-href="#/dish/' + d.id + '"><span>' + d.emoji + '</span><span>' + esc(d.name) + '</span><em>' + money(d.price) + '</em></button>');
      });
      h.push('</div><p class="combo-tagline">' + esc(k.c.tagline) + '</p><div class="combo-foot"><span class="combo-price">' + money(k.price) + '</span><span>' + k.kcal + ' kcal · 均分 ' + k.avg.toFixed(1) + ' 🌸</span></div></article>');
    });
    h.push('</div>');

    h.push('<div class="section-title"><span>今日上新 · 试吃官已就位</span><small>新菜先让雷达的同学试毒</small></div>');
    h.push('<div class="hstrip hscroll">');
    newOnes.forEach(function (d) {
      h.push('<a class="mini" href="#/dish/' + d.id + '"><div class="mini-emoji">' + d.emoji + '</div><b>' + esc(d.name) + '</b><span>' + money(d.price) + ' · 🌸' + d.avg.toFixed(1) + '</span><span class="mini-note">' + d.votes + ' 人试过</span></a>');
    });
    h.push('</div>');

    h.push('<div class="alert"><div class="alert-ico">⚡</div><div><b>踩雷预警：' + esc(danger.name) + '</b><p>雷率 ' + pct(danger.ray) + '，最近有人说「' + esc(flawOf(danger)) + '」。</p></div><a href="#/dish/' + danger.id + '">围观</a></div>');
    h.push('<div class="proof">👀 你宿舍楼今天有 <b>' + (3 + (S.order % 4)) + '</b> 个人吃了「' + esc(picks[0].d.name) + '」，目前没人喊退钱。</div>');
    return h.join('');
  }

  function rankList(kind) {
    var arr = DISHES.slice();
    if (kind === "flower") {
      return arr.sort(function (a, b) { return C.rankScore(b) - C.rankScore(a); }).slice(0, 12)
        .map(function (d, i) { return { d: d, n: i + 1, val: d.avg.toFixed(1) + " 🌸", note: d.votes + " 朵，好评 " + pct(d.goodRate) }; });
    }
    if (kind === "value") {
      return arr.filter(function (d) { return d.votes >= 60; })
        .sort(function (a, b) { return (b.avg / b.price) - (a.avg / a.price); }).slice(0, 12)
        .map(function (d, i) { return { d: d, n: i + 1, val: money(d.price), note: "口味 " + d.avg.toFixed(1) + "，每块钱买到 " + (d.avg / d.price).toFixed(2) + " 分" }; });
    }
    if (kind === "new") {
      return arr.filter(function (d) { return d.isNew; })
        .sort(function (a, b) { return b.avg - a.avg; })
        .map(function (d, i) { return { d: d, n: i + 1, val: d.avg.toFixed(1) + " 🌸", note: d.votes + " 个试吃官已打分" }; });
    }
    if (kind === "ray") {
      return arr.filter(function (d) { return d.ray >= 0.15; })
        .sort(function (a, b) { return b.ray - a.ray; }).slice(0, 12)
        .map(function (d, i) { return { d: d, n: i + 1, val: "⚡ " + pct(d.ray), note: "主要问题：" + flawOf(d).slice(0, 14) }; });
    }
    // 窗口榜
    var byWin = {};
    DISHES.forEach(function (d) {
      var k = d.win.id;
      if (!byWin[k]) byWin[k] = { win: d.win, sum: 0, n: 0, bad: 0 };
      byWin[k].sum += d.avg; byWin[k].n++; byWin[k].bad += d.ray;
    });
    return Object.keys(byWin).map(function (k) {
      var w = byWin[k];
      return { win: w.win, avg: w.sum / w.n, ray: w.bad / w.n };
    }).sort(function (a, b) { return b.avg - a.avg; }).map(function (w, i) {
      return { n: i + 1, win: w.win, val: w.avg.toFixed(1) + " 🌸", note: "雷率 " + pct(w.ray) + " · " + cById[w.win.canteenId].name };
    });
  }

  function viewRank() {
    var tabs = [["flower", "🌸 小红花榜"], ["value", "💸 性价比"], ["new", "🆕 新菜"], ["ray", "⚡ 雷区"], ["window", "🏪 窗口"]];
    var h = [];
    h.push('<header class="topbar"><div class="brand"><span class="brand-mark">🏆</span><div><b>榜单</b><small>全部由小红花投票算的，不接受公关</small></div></div></header>');
    h.push('<div class="chips scroll hscroll">');
    tabs.forEach(function (t) {
      h.push('<button class="chip-btn' + (S.rank === t[0] ? " on" : "") + '" data-act="rank" data-key="' + t[0] + '">' + t[1] + '</button>');
    });
    h.push('</div>');
    var rows = rankList(S.rank);
    h.push('<ol class="ranklist">');
    rows.forEach(function (r) {
      if (S.rank === "window") {
        h.push('<li class="rankrow" data-act="go" data-href="#/canteen/' + r.win.canteenId + '"><span class="rankno">' + r.n + '</span><div class="rankmain"><b>' + esc(r.win.name) + '</b><small>' + esc(r.note) + '</small></div><span class="rankval">' + r.val + '</span></li>');
      } else {
        var d = r.d;
        h.push('<li class="rankrow" data-act="go" data-href="#/dish/' + d.id + '"><span class="rankno">' + r.n + '</span>' +
          '<span class="rankemoji">' + d.emoji + '</span><div class="rankmain"><b>' + esc(d.name) + '</b><small>' + esc(r.note) + '</small></div><span class="rankval">' + r.val + '</span></li>');
      }
    });
    h.push('</ol>');
    h.push('<div class="algo"><b>榜单怎么算的</b><p>小红花榜 = 好评置信下限（Wilson） × 评价量 × 时间衰减。票少的菜哪怕全五星也上不去，防止「1 条好评 100% 好评率」这种笑话。</p><p>雷区榜单独算：只看踩雷比例，不看好评，专门用来劝退。</p></div>');
    return h.join('');
  }

  function viewCanteens() {
    var h = [];
    h.push('<header class="topbar"><div class="brand"><span class="brand-mark">🏫</span><div><b>食堂</b><small>' + D.canteens.length + ' 个食堂 · ' + D.windows.length + ' 个窗口 · ' + DISHES.length + ' 道菜</small></div></div></header>');
    h.push('<input id="q" class="search" placeholder="搜菜名 / 窗口 / 口味，比如「螺蛳粉」" value="' + esc(S.q) + '">');
    if (S.q) {
      var q = S.q;
      var hit = DISHES.filter(function (d) {
        return (d.name + d.win.name + d.tags.join("")).indexOf(q) >= 0;
      });
      h.push('<div class="section-title"><span>搜到 ' + hit.length + ' 道</span></div><div class="list">');
      hit.forEach(function (d) {
        h.push('<div class="row" data-act="go" data-href="#/dish/' + d.id + '"><span class="row-emoji">' + d.emoji + '</span><div class="row-main"><b>' + esc(d.name) + '</b><small>' + d.canteen.name + ' · ' + d.win.name + '</small></div><span class="row-val">' + money(d.price) + '</span></div>');
      });
      if (!hit.length) h.push('<p class="hint">雷达扫不到这道菜，可能被阿姨收走了。</p>');
      h.push('</div>');
      return h.join('');
    }
    h.push('<div class="canteens">');
    D.canteens.forEach(function (c) {
      var n = DISHES.filter(function (d) { return d.canteen.id === c.id; }).length;
      var crowd = c.crowd >= 0.8 ? "爆满" : c.crowd >= 0.6 ? "还行" : "有空位";
      h.push('<a class="canteen-card" href="#/canteen/' + c.id + '"><div class="cc-head"><span class="cc-emoji">' + c.emoji + '</span><div><b>' + c.name + ' · ' + c.nick + '</b><small>' + c.desc + '</small></div></div>' +
        '<div class="cc-meta"><span>🚶 ' + c.walk + ' 分钟</span><span>👥 ' + crowd + '</span><span>🍽 ' + n + ' 道</span></div>' +
        '<div class="cc-bar"><i style="width:' + Math.round(c.crowd * 100) + '%"></i></div>' +
        '<p class="cc-sign">招牌：' + c.signature + '</p></a>');
    });
    h.push('</div>');
    return h.join('');
  }

  function viewCanteen(id) {
    var c = cById[id];
    if (!c) return viewCanteens();
    var wins = D.windows.filter(function (w) { return w.canteenId === id; });
    var h = ['<header class="topbar"><a class="ghost-btn" href="#/canteens">← 返回</a><div class="brand"><span class="brand-mark">' + c.emoji + '</span><div><b>' + c.name + ' · ' + c.nick + '</b><small>' + c.desc + '</small></div></div></header>'];
    h.push('<div class="canteen-hero"><div class="ch-stats"><div><b>' + c.walk + '</b><span>分钟路程</span></div><div><b>' + (c.crowd >= 0.8 ? "爆满" : c.crowd >= 0.6 ? "还行" : "有空位") + '</b><span>当前拥挤</span></div><div><b>' + wins.length + '</b><span>窗口数</span></div></div></div>');
    wins.forEach(function (w) {
      var ds = DISHES.filter(function (d) { return d.win.id === w.id; }).sort(function (a, b) { return b.avg - a.avg; });
      h.push('<section class="winblock"><div class="win-head"><div><b>' + esc(w.name) + '</b><small>' + w.floor + ' · ' + w.tagline + '</small></div><span class="win-tag">' + ds.length + ' 道</span></div>');
      h.push('<div class="list">');
      ds.forEach(function (d) {
        h.push('<div class="row" data-act="go" data-href="#/dish/' + d.id + '"><span class="row-emoji">' + d.emoji + '</span><div class="row-main"><b>' + esc(d.name) + (d.isNew ? ' <span class="tag-new">新</span>' : '') + '</b><small>🌸 ' + d.avg.toFixed(1) + ' · ' + d.votes + ' 朵 · ⏱ ' + d.wait + ' 分</small></div><span class="row-val">' + money(d.price) + '</span></div>');
      });
      h.push('</div></section>');
    });
    return h.join('');
  }

  function dims(d) {
    // 五维由均分与标签推导，保证展示稳定
    var s = hash(d.id);
    function jit(n) { return (n - 0.5) * 0.24; }
    return [
      ["口味", C.clamp(d.avg + jit(((s % 10) / 10)), 1, 5)],
      ["分量", C.clamp(d.avg + (d.price > 12 ? 0.12 : -0.06) + jit(((s >> 2) % 10) / 10), 1, 5)],
      ["性价比", C.clamp(1.7 - d.price / 16 + 3.1 + jit(((s >> 3) % 10) / 10) - 0.2, 1, 5)],
      ["等待", C.clamp(5.2 - d.wait / 5 + jit(((s >> 4) % 10) / 10), 1, 5)],
      ["温度", C.clamp(d.avg + (d.tags.indexOf("炸物") >= 0 ? -0.2 : 0.05) + jit(((s >> 5) % 10) / 10), 1, 5)]
    ];
  }

  function viewDish(id) {
    var d = dById[id];
    if (!d) return viewToday();
    var mine = myReview(d.id);
    var fav = ME.favs.indexOf(d.id) >= 0;
    var hated = ME.hates.indexOf(d.id) >= 0;
    var rs = reviewsOf(d);
    var total = d.dist.reduce(function (a, b) { return a + b; }, 0);
    var h = ['<header class="topbar"><a class="ghost-btn" href="javascript:history.back()">← 返回</a><div class="brand"><div><b>' + esc(d.name) + '</b><small>' + d.canteen.name + ' · ' + d.win.name + '</small></div></div></header>'];
    h.push('<section class="dish-hero"><div class="dish-emoji">' + d.emoji + '</div><div><div class="dish-price">' + money(d.price) + ' <small>/ ' + d.kcal + ' kcal</small></div><p class="dish-desc">' + esc(d.desc) + '</p>' +
      '<div class="dish-tags">' + d.tags.map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('') + riskChip(d) + '</div></div></section>');
    h.push('<div class="bigscore"><div class="bs-left"><b>' + d.avg.toFixed(1) + '</b><span>🌸 均分</span></div><div class="bs-right"><div class="bs-line">' + d.votes + ' 朵小红花 · 好评率 ' + pct(d.goodRate) + '</div><div class="bs-line">二刷率 ' + pct(d.repeat) + ' · 现在排队约 ' + d.wait + ' 分钟</div><div class="dist">');
    d.dist.forEach(function (c, i) {
      h.push('<div class="dist-row"><span>' + (i + 1) + '🌸</span><i style="width:' + Math.round((c / total) * 100) + '%"></i><em>' + c + '</em></div>');
    });
    h.push('</div></div></div>');

    if (d.ray >= 0.18) {
      h.push('<div class="alert in-dish"><div class="alert-ico">⚡</div><div><b>踩雷预警 · 雷率 ' + pct(d.ray) + '</b><p>差评集中在「' + esc(flawOf(d)) + '」。头铁可以冲，赶时间建议换一家。</p></div></div>');
    }

    h.push('<div class="section-title"><span>五个维度</span><small>来自 ' + d.votes + ' 朵小红花</small></div><div class="dims">');
    dims(d).forEach(function (x) {
      h.push('<div class="dim"><span>' + x[0] + '</span><div class="dim-bar"><i style="width:' + Math.round((x[1] / 5) * 100) + '%"></i></div><b>' + x[1].toFixed(1) + '</b></div>');
    });
    h.push('</div>');

    h.push('<div class="acts">');
    h.push('<button class="btn primary" data-act="review" data-id="' + d.id + '">' + (mine ? "改一下我的小红花" : "🌺 给它戴小红花") + '</button>');
    h.push('<button class="btn ghost" data-act="fav" data-id="' + d.id + '">' + (fav ? "★ 已收藏" : "☆ 收藏") + '</button>');
    h.push('<button class="btn ghost" data-act="hate" data-id="' + d.id + '">' + (hated ? "🚫 已在避雷清单" : "🚫 避雷") + '</button>');
    h.push('</div>');
    if (mine) {
      h.push('<div class="mine-note">你给过 ' + mine.flowers + ' 朵：' + esc(mine.text || "（没写字，但花是真心的）") + '</div>');
    }

    var rf = S.rvFilter || "all";
    var cnt = { good: 0, mid: 0, bad: 0, pic: 0 };
    rs.forEach(function (r) {
      if (r.star >= 4) cnt.good++;
      if (r.star === 3) cnt.mid++;
      if (r.star <= 2) cnt.bad++;
      if (r.pics > 0) cnt.pic++;
    });
    var shown = rs.filter(function (r) {
      if (rf === "good") return r.star >= 4;
      if (rf === "mid") return r.star === 3;
      if (rf === "bad") return r.star <= 2;
      if (rf === "pic") return r.pics > 0;
      return true;
    });
    h.push('<div class="section-title"><span>同学们怎么说</span><small>' + (rf === "all" ? "按时间倒序 · " + rs.length + " 条" : "筛选后 " + shown.length + " 条") + '</small></div>');
    h.push('<div class="rvfilter">');
    [["all", "全部 " + rs.length], ["good", "👍 好评 " + cnt.good], ["mid", "😐 中评 " + cnt.mid], ["bad", "👎 只看差评 " + cnt.bad], ["pic", "📷 有图 " + cnt.pic]].forEach(function (t) {
      h.push('<button class="chip-btn sm' + (rf === t[0] ? " on" : "") + '" data-act="rvfilter" data-key="' + t[0] + '">' + t[1] + '</button>');
    });
    h.push('</div><div class="reviews">');
    if (!shown.length) {
      h.push('<p class="hint">' + (rf === "bad"
        ? "这道菜目前 0 条差评，雷率只有 " + pct(d.ray) + "，属于真的稳。想找坑可以去「榜单 → 雷区」。"
        : rf === "pic" ? "还没有人带图，欢迎你去拍一张（虽然是演示，但你也可以假装拍了）。"
        : "这个筛选下还没有人发言，换个条件看看。") + '</p>');
    }
    shown.forEach(function (r, idx) {
      var pics = "";
      if (r.pics > 0) {
        pics = '<div class="rv-pics">';
        for (var j = 0; j < r.pics; j++) pics += picTile(d, idx * 3 + j, "sm");
        pics += '</div>';
      }
      h.push('<div class="review"><div class="rv-head"><span class="rv-ava">' + r.avatar + '</span><b>' + r.who + '</b><span class="rv-flower">' + flowers(r.star) + '</span></div>' +
        '<p class="rv-text">' + esc(r.text) + '</p>' + pics +
        '<div class="rv-foot">' + r.tags.map(function (t) { return '<span class="tag sm">' + t + '</span>'; }).join('') + '<span class="rv-when">' + r.when + ' · 有用 ' + r.likes + '</span></div></div>');
    });
    h.push('</div>');

    h.push('<div class="section-title"><span>同学实拍</span><small>' + pictureCount(d) + ' 张 · 点开看大图（演示示意）</small></div><div class="gallery">');
    for (var pi = 0; pi < pictureCount(d); pi++) h.push(picTile(d, pi));
    h.push('</div>');

    var sim = DISHES.filter(function (x) { return x.id !== d.id && x.tags.some(function (t) { return d.tags.indexOf(t) >= 0; }); })
      .sort(function (a, b) { return b.avg - a.avg; }).slice(0, 3);
    h.push('<div class="section-title"><span>如果这盘不保险</span><small>同类里更稳的</small></div><div class="hstrip">');
    sim.forEach(function (x) {
      h.push('<a class="mini" href="#/dish/' + x.id + '"><div class="mini-emoji">' + x.emoji + '</div><b>' + esc(x.name) + '</b><span>🌸 ' + x.avg.toFixed(1) + ' · ' + money(x.price) + '</span><span class="mini-note">雷率 ' + pct(x.ray) + '</span></a>');
    });
    h.push('</div>');
    return h.join('');
  }

  function viewMe() {
    var reviews = ME.reviews.slice().reverse();
    var sp = reviews.length ? reviews.reduce(function (a, r) { return a + r.flowers; }, 0) / reviews.length : 0;
    var favs = ME.favs.map(function (id) { return dById[id]; }).filter(Boolean);
    var hates = ME.hates.map(function (id) { return dById[id]; }).filter(Boolean);
    var spicy = reviews.length ? "待统计" : "还没开口";
    var h = ['<header class="topbar"><div class="brand"><span class="brand-mark">🐷</span><div><b>我的干饭档案</b><small>数据只存在你这台设备上</small></div></div></header>'];
    h.push('<div class="me-card"><div class="me-top"><span class="me-ava">🐼</span><div><b>匿名干饭人</b><small>已验证学生 · 胆子肥嘟嘟大学</small></div></div>' +
      '<div class="me-stats"><div><b>' + reviews.length + '</b><span>点评</span></div><div><b>' + favs.length + '</b><span>收藏</span></div><div><b>' + hates.length + '</b><span>避雷</span></div><div><b>' + (sp ? sp.toFixed(1) : "-") + '</b><span>平均给花</span></div></div></div>');

    h.push('<div class="section-title"><span>我的口味画像</span><small>根据你的小红花算的</small></div>');
    var tags = {};
    reviews.forEach(function (r) {
      var d = dById[r.dishId];
      if (!d) return;
      d.tags.forEach(function (t) { tags[t] = (tags[t] || 0) + 1; });
    });
    var top = Object.keys(tags).sort(function (a, b) { return tags[b] - tags[a]; }).slice(0, 4);
    h.push('<div class="persona"><b>' + (top.length ? top[0] + "爱好者" : "神秘兮兮的新人") + '</b><p>' + (top.length ? "你给小林花最多的标签是：" + top.join(" / ") + "。" : "先给几道菜戴小红花，雷达才能记住你的口味。") + '</p></div>');

    h.push('<div class="section-title"><span>我的点评</span><small>' + reviews.length + ' 条</small></div>');
    if (!reviews.length) h.push('<p class="hint">还没点评过。去「此刻」随便点开一道菜，给它戴朵花。</p>');
    else {
      h.push('<div class="list">');
      reviews.forEach(function (r) {
        var d = dById[r.dishId];
        if (!d) return;
        h.push('<div class="row" data-act="go" data-href="#/dish/' + d.id + '"><span class="row-emoji">' + d.emoji + '</span><div class="row-main"><b>' + esc(d.name) + ' ' + flowers(r.flowers) + '</b><small>' + esc(r.text || "（没写字）") + '</small></div></div>');
      });
      h.push('</div>');
    }
    [["收藏", favs, "还没收藏，看到想吃的记得点☆"], ["避雷清单", hates, "避雷清单是空的，看来你运气不错"]].forEach(function (g) {
      h.push('<div class="section-title"><span>' + g[0] + '</span><small>' + g[1].length + ' 道</small></div>');
      if (!g[1].length) { h.push('<p class="hint">' + g[2] + '</p>'); return; }
      h.push('<div class="list">');
      g[1].forEach(function (d) {
        h.push('<div class="row" data-act="go" data-href="#/dish/' + d.id + '"><span class="row-emoji">' + d.emoji + '</span><div class="row-main"><b>' + esc(d.name) + '</b><small>' + d.canteen.name + ' · ' + money(d.price) + '</small></div><span class="row-val">' + d.avg.toFixed(1) + ' 🌸</span></div>');
      });
      h.push('</div>');
    });
    h.push('<a class="about-link" href="#/about">关于食堂雷达 / 数据说明 →</a>');
    return h.join('');
  }

  function viewAbout() {
    return ['<header class="topbar"><a class="ghost-btn" href="#/today">← 回去吃饭</a><div class="brand"><div><b>关于食堂雷达</b><small>一个学生自己做的干饭工具</small></div></div></header>',
      '<div class="prose"><h2>它解决什么</h2><p>胆子肥嘟嘟大学有 4 个食堂、15 个窗口、51 道菜。每天中午最难的不是排队，是「吃什么」。食堂雷达把点评的颗粒度从「店」拆到「菜」，再用你现在的条件（预算、时间、胃口、吃没吃过）算出一份可解释的推荐。</p>',
      '<h2>小红花是怎么来的</h2><p>一餐一票，最多五朵。菜品均分不是简单平均，而是用 Wilson 置信下限做保守估计：只有 3 朵花的菜，就算全是五星，也不会骑在 400 朵花的招牌菜头上。</p>',
      '<h2>为什么单设一个雷区榜</h2><p>好评可以被凑，差评不会。雷区榜只看踩雷比例，专门用来劝退。任何一条差评都不会被好评「抵消」——这也是我们和某些平台的分歧所在。</p>',
      '<h2>关于数据</h2><p>本作品是求职作品 demo：学校「胆子肥嘟嘟大学」、食堂窗口、菜品、评价全部虚构，仅用于演示产品结构与交互。你的收藏和点评只存在浏览器本地（localStorage），不会上传。</p>',
      '<h2>接下来想做的</h2><p>食堂实时拥挤度、课表联动（下课就推最近的窗口）、宿舍楼拼单、以及让食堂经理真的能看到差评并且回一句「已整改」。</p></div>'].join('');
  }

  /* ---------------- 交互 ---------------- */
  var ROUTES = { today: viewToday, rank: viewRank, canteens: viewCanteens, me: viewMe, about: viewAbout };

  function route() {
    var hashv = (location.hash || "#/today").replace(/^#/, "");
    if (hashv.charAt(0) === "/") hashv = hashv.slice(1);
    var parts = hashv.split("/");
    var name = parts[0] || "today";
    if (name === "dish" && S.dishId !== parts[1]) { S.dishId = parts[1]; S.rvFilter = "all"; }
    var html;
    if (name === "dish") html = viewDish(parts[1]);
    else if (name === "canteen") html = viewCanteen(parts[1]);
    else html = (ROUTES[name] || viewToday)();
    var app = document.getElementById("app");
    app.innerHTML = '<main class="screen">' + html + '</main>' + nav(name);
    app.className = "route-" + name;
    var bar = app.querySelector(".topbar");
    if (bar) {
      var tb = document.createElement("button");
      tb.className = "themebtn";
      tb.setAttribute("data-act", "theme");
      tb.textContent = curTheme() === "dark" ? "☀️" : "🌙";
      tb.setAttribute("aria-label", curTheme() === "dark" ? "切换到日间模式" : "切换到夜间模式");
      bar.appendChild(tb);
    }
    bindWheel();
    window.scrollTo(0, 0);
    var q = document.getElementById("q");
    if (q) {
      q.addEventListener("input", function (e) { S.q = e.target.value; render(true); });
    }
  }

  function nav(active) {
    var items = [["today", "🍚", "此刻"], ["rank", "🏆", "榜单"], ["canteens", "🏫", "食堂"], ["me", "🐷", "我的"]];
    var h = ['<nav class="tabbar">'];
    items.forEach(function (it) {
      h.push('<a class="tab' + (active === it[0] ? " on" : "") + '" href="#/' + it[0] + '"><span>' + it[1] + '</span><small>' + it[2] + '</small></a>');
    });
    h.push('</nav>');
    return h.join('');
  }

  // 横向容器：支持鼠标滚轮直接滑（不用按 Shift）
  function bindWheel() {
    Array.prototype.forEach.call(document.querySelectorAll(".hscroll, .chips, .combos"), function (el) {
      if (el._wh) return;
      el._wh = true;
      el.addEventListener("wheel", function (e) {
        if (el.scrollWidth <= el.clientWidth + 4) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          el.scrollLeft += e.deltaY;
          e.preventDefault();
        }
      }, { passive: false });
    });
  }

  function openPic(d, n) {
    document.getElementById("sheet-root").innerHTML =
      '<div class="sheet-mask" data-act="close-pic"></div><div class="lightbox"><button class="lb-close" data-act="close-pic" aria-label="关闭">✕</button>' +
      '<div class="lb-tile tone-' + toneOf(d, n) + '"><span>' + d.emoji + '</span></div>' +
      '<div class="lb-cap"><b>' + esc(d.name) + '</b><small>' + d.canteen.name + ' · ' + d.win.name + ' · 学生实拍（演示示意）</small></div></div>';
    document.body.classList.add("lock");
  }

  var lastQFocus = false;
  function render(keepScroll) {
    var y = window.scrollY;
    route();
    if (keepScroll) {
      window.scrollTo(0, y);
      var q = document.getElementById("q");
      if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
    }
  }

  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.hidden = false;
    t.classList.add("show");
    clearTimeout(t._tm);
    t._tm = setTimeout(function () { t.classList.remove("show"); t.hidden = true; }, 2200);
  }

  function openSheet(d) {
    var mine = myReview(d.id);
    var tags = ["太咸", "太油", "凉了", "量少", "排队久", "超值", "出餐快", "真香", "会二刷"];
    var h = ['<div class="sheet-mask" data-act="close-sheet"></div><div class="sheet"><div class="sheet-head"><b>给「' + esc(d.name) + '」戴小红花</b><span class="sheet-close" data-act="close-sheet">✕</span></div>',
      '<p class="sheet-sub">点几朵就是几分。1 朵 = 别点了，5 朵 = 明天还来。</p>',
      '<div class="flower-picker" id="flowers">'];
    for (var i = 1; i <= 5; i++) {
      h.push('<button class="fp' + (mine && mine.flowers >= i ? " on" : "") + '" data-act="pick" data-n="' + i + '">' + (mine && mine.flowers >= i ? "🌸" : "🤍") + '</button>');
    }
    h.push('</div><p class="fp-label" id="fp-label">' + (mine ? "你上次给了 " + mine.flowers + " 朵" : "还没选，随便点一朵试试") + '</p>');
    h.push('<div class="chipwrap" id="tagwrap">');
    tags.forEach(function (t) {
      var on = mine && (mine.tags || []).indexOf(t) >= 0;
      h.push('<button class="chip-btn sm' + (on ? " on" : "") + '" data-act="tag" data-t="' + t + '">' + t + '</button>');
    });
    h.push('</div><textarea id="rv-text" placeholder="一句话吐槽或安利，别太认真（140 字以内）" maxlength="140">' + (mine ? esc(mine.text || "") : "") + '</textarea>');
    h.push('<button class="btn primary wide" data-act="submit" data-id="' + d.id + '">发布点评</button>');
    h.push('<p class="sheet-note">点评只存在你的浏览器里；同一道菜重复评会按时间衰减计入均分。</p></div>');
    document.getElementById("sheet-root").innerHTML = h.join("");
    document.body.classList.add("lock");
    window._sheet = { dish: d, flowers: mine ? mine.flowers : 0, tags: mine ? (mine.tags || []).slice() : [] };
  }

  function closeSheet() {
    document.getElementById("sheet-root").innerHTML = "";
    document.body.classList.remove("lock");
    window._sheet = null;
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]");
    if (!el) return;
    var act = el.getAttribute("data-act");
    if (act === "go") { location.hash = el.getAttribute("data-href"); return; }
    if (act === "filter") {
      var k = el.getAttribute("data-key");
      S.filters[k] = !S.filters[k];
      S.order = 0;
      render();
      return;
    }
    if (act === "shuffle") {
      S.order++;
      var cards = document.querySelectorAll(".rec");
      cards.forEach(function (c, i) {
        c.style.animation = "none";
        setTimeout(function () { c.style.animation = "flipIn .45s " + (i * 0.07) + "s both"; }, 10);
      });
      render();
      toast("换了一批，这次不满意就自己下楼看");
      return;
    }
    if (act === "rank") { S.rank = el.getAttribute("data-key"); render(); return; }
    if (act === "theme") {
      var next = curTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      toast(next === "dark" ? "🌙 夜间模式：适合躺床上边刷边愧疚" : "☀️ 日间模式：适合在食堂门口纠结");
      return;
    }
    if (act === "scroll") {
      var tgt = document.querySelector(el.getAttribute("data-target"));
      if (tgt) tgt.scrollBy({ left: (+el.getAttribute("data-dir")) * 300, behavior: "smooth" });
      return;
    }
    if (act === "rvfilter") { S.rvFilter = el.getAttribute("data-key"); render(true); return; }
    if (act === "pic") { openPic(dById[el.getAttribute("data-id")], +el.getAttribute("data-n")); return; }
    if (act === "close-pic") {
      document.getElementById("sheet-root").innerHTML = "";
      document.body.classList.remove("lock");
      return;
    }
    if (act === "combo") {
      var cid = el.getAttribute("data-id");
      var k = combos().filter(function (x) { return x.c.id === cid; })[0];
      if (k) toast("这套 " + money(k.price) + " · " + k.kcal + " kcal，去晚了就没了");
      return;
    }
    if (act === "combo-rand") {
      S.comboOrder = (S.comboOrder + 1) % (D.combos || []).length;
      var pick = combos()[0];
      render(true);
      toast("🎲 已配好：" + pick.c.name + " · " + money(pick.price) + " · " + pick.kcal + " kcal");
      return;
    }
    if (act === "review") { openSheet(dById[el.getAttribute("data-id")]); return; }
    if (act === "close-sheet") { closeSheet(); return; }
    if (act === "fav" || act === "hate") {
      var id = el.getAttribute("data-id");
      var arr = act === "fav" ? ME.favs : ME.hates;
      var i = arr.indexOf(id);
      if (i >= 0) { arr.splice(i, 1); toast(act === "fav" ? "已取消收藏" : "已移出避雷清单"); }
      else { arr.push(id); toast(act === "fav" ? "收藏了，等你想吃的时候再点开" : "已记进避雷清单，下次雷达会提醒你"); }
      save(); render(true); return;
    }
    if (act === "pick") {
      var n = +el.getAttribute("data-n");
      window._sheet.flowers = n;
      var btns = document.querySelectorAll("#flowers .fp");
      btns.forEach(function (b, idx) { b.classList.toggle("on", idx < n); b.textContent = idx < n ? "🌸" : "🤍"; });
      var label = document.getElementById("fp-label");
      var words = { 1: "1 朵：别点了，我的钱", 2: "2 朵：阿姨今天手抖了", 3: "3 朵：能吃，但不惊艳", 4: "4 朵：可以，明天还来", 5: "5 朵：给它戴小红花！" };
      label.textContent = words[n] || "";
      return;
    }
    if (act === "tag") {
      var t = el.getAttribute("data-t");
      var idx = window._sheet.tags.indexOf(t);
      if (idx >= 0) window._sheet.tags.splice(idx, 1); else window._sheet.tags.push(t);
      el.classList.toggle("on");
      return;
    }
    if (act === "submit") {
      if (!window._sheet.flowers) { toast("先点几朵小红花吧，一朵也行"); return; }
      var d = window._sheet.dish;
      var text = (document.getElementById("rv-text").value || "").trim();
      ME.reviews.push({
        dishId: d.id, flowers: window._sheet.flowers, tags: window._sheet.tags.slice(),
        text: text, ts: Date.now()
      });
      save(); closeSheet(); render(true);
      toast("🌺 小红花已戴好，阿姨会看到的（大概）");
    }
  });

  window.addEventListener("hashchange", function () { route(); });
  route();
})();
