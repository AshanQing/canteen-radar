
import fs from "node:fs"; import vm from "node:vm";
const ctx = { console, Math, Date, JSON, Object, String, Array, Number };
ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ["assets/data.js","assets/core.js"]) vm.runInContext(fs.readFileSync(f,"utf8"), ctx);
const {FDR_DATA:D, FDR_CORE:C} = ctx;
for (const meal of ["breakfast","lunch","dinner","night"]) {
  const pool = D.dishes.map(d => {
    const dist = C.buildDist(d.avg, d.votes);
    const good = dist[3]+dist[4];
    return {...d, dist, avg: C.avgOfDist(dist), wilson: C.wilson(good, d.votes), ray: C.riskOf(dist), goodRate: good/d.votes};
  });
  const byMeal = pool.filter(d => (C.mealAffinity(d)[meal]||0) > 0);
  const list = byMeal.length >= 6 ? byMeal : pool;
  const scored = list.map(d => {
    const r = C.scoreDish(d, { avg: d.avg, wilson: d.wilson, votes: d.votes, ray: d.ray, goodRate: d.goodRate, canteenWalk: 5, eaten: false, filters: {}, meal });
    return { d, s: r.score };
  }).sort((a,b)=>b.s-a.s).slice(0,3);
  console.log(C.MEAL_LABEL[meal] + "（候选 " + list.length + "）：" + scored.map(x=>x.d.name).join(" / "));
}
