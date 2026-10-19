
import fs from "node:fs"; import vm from "node:vm";
const ctx = { console, Math, Date, JSON, Object, String, Array, Number };
ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ["assets/data.js","assets/core.js"]) vm.runInContext(fs.readFileSync(f,"utf8"), ctx);
const {FDR_DATA:D, FDR_CORE:C} = ctx;
const pool = D.dishes.map(d => ({...d, canteen: {id: D.windows.find(w=>w.id===d.windowId).canteenId}}));
let bad=[];
for (const d of pool) {
  const c = C.buildCombo(d, pool, 0);
  if (c.price <= 0) bad.push("price "+d.id);
  if (c.sides.length === 0) bad.push("noside "+d.id);
  if (new Set([c.main.id, ...c.sides.map(s=>s.id)]).size !== c.sides.length+1) bad.push("dup "+d.id);
  if (!c.shape) bad.push("shape "+d.id);
}
const sample = ["d1","d9","d29","d36","d39"].map(id => {
  const d = pool.find(x=>x.id===id);
  const c = C.buildCombo(d, pool, 0);
  return d.name + " → " + c.sides.map(s=>s.name).join(" + ") + " [" + c.price + "元/" + c.kcal + "kcal] " + c.note;
});
console.log("roles:", ["d1","d9","d29","d36","d3"].map(id=>pool.find(x=>x.id===id).name+":"+C.roleOf(pool.find(x=>x.id===id))).join(" | "));
console.log(sample.join("\n"));
const v1 = C.buildCombo(pool[0], pool, 1);
console.log("variant 换一组:", v1.sides.map(s=>s.name).join("+"));
console.log("BAD:", bad.length ? bad.slice(0,5) : "none");
