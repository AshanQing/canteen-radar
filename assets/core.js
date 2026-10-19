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

  var BASE_W = { taste: 0.20, good: 0.20, fresh: 0.15, wait: 0.15, value: 0.12, walk: 0.08, risk: 0.10 };

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
    if (!ctx.eaten) out.push(d.isNew ? "全校还没几个人吃过，你是先锋" : "你还没吃过，雷达替你排了队");
    if (r.good > 0.82) out.push("老客好评 " + Math.round(ctx.goodRate * 100) + "%，不是刷的");
    if (d.wait <= 5) out.push("现在排队约 " + d.wait + " 分钟，够你吃完再冲教室");
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

  globalThis.FDR_CORE = {
    clamp: clamp, buildDist: buildDist, avgOfDist: avgOfDist, wilson: wilson,
    riskOf: riskOf, scoreDish: scoreDish, reasonsFor: reasonsFor, rankScore: rankScore,
    weightsFor: weightsFor
  };
})();
