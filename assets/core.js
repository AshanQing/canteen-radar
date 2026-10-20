/* 食堂雷达 · 纯算法层（无 DOM，可被 node 直接测试） */
(function () {
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  // 由均分与票数反推 1~5 朵花的分布（确定性，保证每次刷新一致）
  function buildDist(avg, votes) {
    var w = [1, 2, 3, 4, 5].map(function (k) {
      var d = k - avg; return Math.exp(-(d * d) / (2 * 0.62 * 0.62));
    });
    var s = w.reduce(function (a, b) { return a + b; }, 0);
    var raw = w.map(function (x) { return (x / s) * votes; });
    var ints = raw.map(Math.floor);
    var rem = votes - ints.reduce(function (a, b) { return a + b; }, 0);
    var order = raw.map(function (x, i) { return [x - Math.floor(x), i]; })
      .sort(function (a, b) { return b[0] - a[0]; });
    for (var i = 0; i < rem; i++) ints[order[i % 5][1]] += 1;
    // 真实世界里再好吃的窗口也会有人给一星，保证差评筛选永远有内容
    if (votes >= 60) {
      for (var s = 0; s < 2; s++) {
        if (ints[s] === 0) {
          var maxI = 0;
          for (var j = 1; j < 5; j++) if (ints[j] > ints[maxI]) maxI = j;
          ints[maxI] -= 1; ints[s] += 1;
        }
      }
    }
    return ints; // [1花,2花,3花,4花,5花]
  }

  function avgOfDist(dist) {
    var t = dist.reduce(function (a, b) { return a + b; }, 0) || 1;
    var s = 0;
    for (var i = 0; i < 5; i++) s += (i + 1) * dist[i];
    return s / t;
  }

  var Z = 1.96;
  // Wilson 置信下限：票少的好评不配上榜
  function wilson(good, total) {
    if (!total) return 0;
    var p = good / total;
    var den = 1 + (Z * Z) / total;
    var centre = p + (Z * Z) / (2 * total);
    var margin = Z * Math.sqrt((p * (1 - p)) / total + (Z * Z) / (4 * total * total));
    return clamp((centre - margin) / den, 0, 1);
  }

  function riskOf(dist) {
    var t = dist.reduce(function (a, b) { return a + b; }, 0) || 1;
    return clamp((dist[0] + dist[1] * 0.8 + dist[2] * 0.15) / t, 0, 1);
  }

  var BASE_W = { meal: 0.16, taste: 0.17, good: 0.19, fresh: 0.13, wait: 0.13, value: 0.10, walk: 0.06, risk: 0.06 };

  function weightsFor(filters) {
    var w = Object.assign({}, BASE_W);
    if (filters.cheap) { w.value = 0.30; w.taste = 0.14; w.good = 0.14; }
    if (filters.nowait) { w.wait = 0.32; w.value = 0.08; }
    if (filters.spicy) { w.taste = 0.28; w.good = 0.18; }
    if (filters.fresh) { w.fresh = 0.30; }
    if (filters.light) { w.risk = 0.16; w.taste = 0.16; }
    if (filters.protein) { w.good = 0.22; }
    var sum = Object.keys(w).reduce(function (a, k) { return a + w[k]; }, 0);
    Object.keys(w).forEach(function (k) { w[k] = w[k] / sum; });
    return w;
  }

  // 打分：返回 {score, parts, reasons}
  function scoreDish(d, ctx) {
    var filters = ctx.filters || {};
    var w = weightsFor(filters);
    var avg = ctx.avg;
    var parts = {
      meal: mealScore(d, ctx.meal || "lunch"),
      taste: clamp(avg / 5, 0, 1),
      good: ctx.wilson,
      fresh: ctx.eaten ? 0.1 : (d.isNew ? 1 : 0.85),
      wait: clamp(1 - d.wait / 20, 0, 1),
      value: clamp(1.25 - d.price / 14, 0, 1),
      walk: clamp(1 - ctx.canteenWalk / 16, 0, 1),
      risk: clamp(1 - ctx.ray * 2, 0, 1)
    };
    var score = 0;
    Object.keys(w).forEach(function (k) { score += w[k] * parts[k]; });
    return { score: score, parts: parts, weights: w };
  }

  function reasonsFor(d, ctx, r) {
    var out = [];
    if ((r.meal || 0) > 0.85 && ctx.mealLabel) out.push(ctx.mealLabel + "就该吃这个，不折腾");
    if (!ctx.eaten) out.push(d.isNew ? "全校还没几个人吃过，你是先锋" : "你还没吃过，雷达替你排了队");
    if (r.good > 0.82) out.push("老客好评 " + Math.round(ctx.goodRate * 100) + "%，不是刷的");
    var wm = ctx.waitMins != null ? ctx.waitMins : d.wait;
    if (wm <= 5) out.push("现在排队约 " + wm + " 分钟，够你吃完再冲教室");
    if (d.price <= 10) out.push("¥" + d.price + "，月底干饭人不心疼");
    if (r.taste > 0.85) out.push("口味分 " + ctx.avg.toFixed(1) + "，属于宿舍群里会被 @ 的那种");
    if (ctx.ray < 0.08) out.push("雷率仅 " + Math.round(ctx.ray * 100) + "%，踩雷概率很低");
    if (d.repeat > 0.6) out.push("二刷率 " + Math.round(d.repeat * 100) + "%，吃完还想吃");
    if (!out.length) out.push("数据一般，但今天开门的就它最靠谱");
    return out.slice(0, 2);
  }

  function rankScore(ctx) {
    return ctx.wilson * Math.log(1 + ctx.votes) * (ctx.decay == null ? 1 : ctx.decay);
  }


  /* ---------- 出餐 / 排队时间预测 ---------- */
  function seasonOf(date) {
    var m = (date || new Date()).getMonth() + 1;
    if (m >= 3 && m <= 5) return "spring";
    if (m >= 6 && m <= 8) return "summer";
    if (m >= 9 && m <= 11) return "autumn";
    return "winter";
  }

  function peakFactor(hour) {
    if ((hour >= 7.3 && hour <= 8.5) || (hour >= 11.6 && hour <= 12.7) || (hour >= 17.6 && hour <= 18.7)) return 1.22;
    if ((hour >= 6.5 && hour < 7.3) || (hour > 8.5 && hour <= 9.6) ||
        (hour >= 11.0 && hour < 11.6) || (hour > 12.7 && hour <= 13.6) ||
        (hour >= 17.0 && hour < 17.6) || (hour > 18.7 && hour <= 19.6)) return 1.0;
    if (hour >= 21 || hour < 6) return 0.55;
    return 0.82;
  }

  function predictWait(d, opts) {
    opts = opts || {};
    var date = opts.date || new Date();
    var hour = date.getHours() + date.getMinutes() / 60;
    var peak = peakFactor(hour);
    var workday = opts.workday != null ? opts.workday : (date.getDay() >= 1 && date.getDay() <= 5);
    var weekend = workday ? 1 : 0.78;
    var seasonF = { spring: 1.0, summer: 0.96, autumn: 1.0, winter: 1.08 }[seasonOf(date)];
    var complexity = /现炒|铁板|拉面|拉条|香锅|烧烤/.test(d.name) ? 1.12
      : /包子|粥|茶叶蛋|盖饭|蛋炒饭/.test(d.name) ? 0.88 : 1;
    var crowd = (d.win && d.win.crowd) || 0.6;
    var base = d.wait || 8;
    var factor = function (h) { return peakFactor(h) * weekend * seasonF * complexity * (0.9 + crowd * 0.2); };
    var mins = Math.max(2, Math.round(base * factor(hour)));

    // 错峰建议：10 分钟后再看一次
    var later = new Date(date.getTime() + 10 * 60000);
    var laterHour = later.getHours() + later.getMinutes() / 60;
    var laterMins = Math.max(2, Math.round(base * factor(laterHour)));
    var tip = "";
    if (mins >= 8 && laterMins <= mins - 3) {
      tip = "再等 10 分钟过去，大概只要 " + laterMins + " 分钟";
    } else if (mins <= 4) {
      tip = "现在是空档，冲";
    } else if (peak > 1.4) {
      tip = "正在高峰，建议先占座再点单";
    }
    return {
      mins: mins,
      laterMins: laterMins,
      peak: peak >= 1.2 ? "拥挤" : peak >= 0.9 ? "正常" : "空档",
      season: seasonOf(date),
      tip: tip
    };
  }

  /* ---------- 用餐时段 ---------- */
  var MEAL_LABEL = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", night: "夜宵" };

  function mealOf(date) {
    var h = (date || new Date()).getHours();
    if (h >= 5 && h < 10) return "breakfast";
    if (h >= 10 && h < 15) return "lunch";
    if (h >= 15 && h < 21) return "dinner";
    return "night";
  }

  // 一道菜在各个时段的适配度（没归一化，只是相对权重）
  function mealAffinity(d) {
    var n = d.name, t = d.tags;
    var s = { breakfast: 0, lunch: 0, dinner: 0, night: 0 };
    if (/包子|粥|茶叶蛋|豆沙包|馒头|饼|蛋羹|油条|豆浆|卷/.test(n)) s.breakfast += 1;
    if (t.indexOf("早餐") >= 0) s.breakfast += 1;
    if (/盖饭|炒饭|炒面|香锅|拉面|拉条|黄焖|河粉|螺蛳粉|馒头/.test(n) || t.indexOf("面食") >= 0) s.lunch += 1;
    if (t.indexOf("顶") >= 0 || t.indexOf("肉食") >= 0) s.lunch += 0.6;
    if (/粥|饼|蒸|汤/.test(n) || t.indexOf("清淡") >= 0 || t.indexOf("蒸菜") >= 0) s.dinner += 1;
    if (t.indexOf("轻食") >= 0) s.dinner += 0.5;
    if (/烤|炒面|河粉|螺蛳粉|关东煮|炸/.test(n) || t.indexOf("夜宵") >= 0 || t.indexOf("烧烤") >= 0) s.night += 1;
    // 早餐不该出现的重口：辣、臭、油炸
    if (t.indexOf("辣") >= 0 || t.indexOf("臭味") >= 0) s.breakfast -= 0.8;
    if (t.indexOf("炸物") >= 0) s.breakfast -= 0.5;
    return s;
  }

  function mealScore(d, meal) {
    var a = mealAffinity(d)[meal] || 0;
    return clamp(0.45 + a * 0.55, 0, 1);
  }

  /* ---------- 按主菜自动配菜 ---------- */
  function roleOf(d) {
    var t = d.tags, n = d.name;
    var staple = /饭|面|包|粥|卷|粉|条|馍|饺/.test(n) || t.indexOf("面食") >= 0 || t.indexOf("早餐") >= 0;
    var protein = t.indexOf("肉食") >= 0 || t.indexOf("炸物") >= 0 || t.indexOf("高蛋白") >= 0 ||
      t.indexOf("烧烤") >= 0 || /鸡|牛|肉|鱼|排骨|蛋|虾|排/.test(n);
    var veg = t.indexOf("素") >= 0 || t.indexOf("清淡") >= 0 || t.indexOf("轻食") >= 0 || t.indexOf("蒸菜") >= 0;
    var sweet = t.indexOf("甜品") >= 0 || t.indexOf("小食") >= 0;
    if (sweet && !protein && !staple) return "sweet";
    if (protein) return "protein";
    if (staple) return "staple";
    if (veg) return "veg";
    return "other";
  }

  // 已经是一份盖饭/面的，就不要再配一份主食了
  function planFor(main) {
    var r = roleOf(main);
    var full = /饭|面|河|粉|条|馍|卷|饼/.test(main.name) || roleOf(main) === "staple";
    if (r === "protein" && full) return ["veg", "sweet"];
    if (r === "protein") return ["staple", "veg"];
    if (r === "staple") return ["protein", "veg"];
    if (r === "veg") return ["staple", "protein"];
    if (r === "sweet") return ["protein", "veg"];
    return ["protein", "veg"];
  }

  function pickSide(main, pool, role, variant, used) {
    var cands = pool.filter(function (d) {
      return d.id !== main.id && used.indexOf(d.id) < 0 && roleOf(d) === role;
    });
    if (role === "sweet") {
      var sweetOnly = cands.filter(function (d) { return d.tags.indexOf("甜品") >= 0; });
      if (sweetOnly.length) cands = sweetOnly;
    }
    if (role === "staple") {
      var solid = cands.filter(function (d) { return !/粥/.test(d.name); });
      if (solid.length) cands = solid;
    }
    if (!cands.length) return null;
    var scored = cands.map(function (d) {
      var same = d.canteen && main.canteen && d.canteen.id === main.canteen.id ? 1 : 0;
      var s = 0.32 * (d.avg / 5) + 0.24 * (1 - d.ray) + 0.14 * Math.max(0, 1 - d.price / 22) +
        0.18 * same + 0.12 * Math.max(0, 1 - d.wait / 22);
      return { d: d, s: s };
    }).sort(function (a, b) { return b.s - a.s; });
    // 在头部候选里轮换，「换一组」才会真的换
    var top = Math.min(6, scored.length);
    return scored[variant % top].d;
  }

  // 返回 {main, sides, price, kcal, shape, note}
  function buildCombo(main, pool, variant) {
    variant = variant || 0;
    var roles = planFor(main);
    var used = [main.id], sides = [];
    roles.forEach(function (r) {
      var pick = pickSide(main, pool, r, variant, used);
      if (pick) { sides.push(pick); used.push(pick.id); }
    });
    var all = [main].concat(sides);
    var price = all.reduce(function (a, d) { return a + d.price; }, 0);
    var kcal = all.reduce(function (a, d) { return a + d.kcal; }, 0);
    var shape = sides.map(function (d) {
      var r = roleOf(d);
      return r === "protein" ? "补蛋白" : r === "staple" ? "补主食" : r === "veg" ? "补青菜" : "补甜口";
    }).join(" + ");
    var sameWin = sides.filter(function (d) { return d.canteen.id === main.canteen.id; }).length;
    var note = sameWin === sides.length && sides.length
      ? "配菜都在同一个食堂，少走一趟"
      : sameWin ? "有一道在隔壁食堂，愿意走两步更划算" : "配菜在别的食堂，看你想不想动";
    return { main: main, sides: sides, price: price, kcal: kcal, shape: shape, note: note };
  }

  globalThis.FDR_CORE = {
    mealOf: mealOf, mealAffinity: mealAffinity, mealScore: mealScore, MEAL_LABEL: MEAL_LABEL,
    predictWait: predictWait, seasonOf: seasonOf,
    roleOf: roleOf, buildCombo: buildCombo,
    clamp: clamp, buildDist: buildDist, avgOfDist: avgOfDist, wilson: wilson,
    riskOf: riskOf, scoreDish: scoreDish, reasonsFor: reasonsFor, rankScore: rankScore,
    weightsFor: weightsFor
  };
})();
