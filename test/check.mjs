
import fs from "node:fs";
import vm from "node:vm";
const ctx = { console, Math, Date, JSON, Object, String, Array, Number };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ["assets/data.js", "assets/core.js"]) vm.runInContext(fs.readFileSync(f, "utf8"), ctx);
const D = ctx.FDR_DATA, C = ctx.FDR_CORE;
console.log("school:", D.school, "dishes:", D.dishes.length, "windows:", D.windows.length);
let bad = [];
for (const d of D.dishes) {
  if (!D.windows.find(w => w.id === d.windowId)) bad.push("no window " + d.id);
  const dist = C.buildDist(d.avg, d.votes);
  const sum = dist.reduce((a,b)=>a+b,0);
  if (sum !== d.votes) bad.push("dist sum " + d.id + " " + sum + "!=" + d.votes);
  if (dist.some(x => x < 0)) bad.push("neg " + d.id);
  const a = C.avgOfDist(dist);
  if (Math.abs(a - d.avg) > 0.35) bad.push("avg drift " + d.id + " " + a.toFixed(2) + " vs " + d.avg);
  const w = C.wilson(dist[3]+dist[4], d.votes);
  if (!(w >= 0 && w <= 1)) bad.push("wilson " + d.id);
  const r = C.riskOf(dist);
  if (!(r >= 0 && r <= 1)) bad.push("risk " + d.id);
  const sc = C.scoreDish(d, { avg: a, wilson: w, votes: d.votes, ray: r, goodRate: (dist[3]+dist[4])/d.votes, canteenWalk: 5, eaten: false, filters: {} });
  if (!(sc.score > 0 && sc.score <= 1)) bad.push("score " + d.id + " " + sc.score);
  const reasons = C.reasonsFor(d, { avg: a, goodRate: (dist[3]+dist[4])/d.votes, ray: r, eaten: false }, sc.parts);
  if (!reasons.length) bad.push("no reasons " + d.id);
}
const sorted = D.dishes.slice().map(d => {
  const dist = C.buildDist(d.avg, d.votes);
  return [d, C.wilson(dist[3]+dist[4], d.votes) * Math.log(1 + d.votes)];
}).sort((x,y)=>y[1]-x[1]);
console.log("top5:", sorted.slice(0,5).map(x=>x[0].name+":"+x[1].toFixed(2)).join(" | "));
console.log("BAD:", bad.length ? bad.slice(0,8) : "none");
