
import fs from "node:fs"; import vm from "node:vm";
const ctx = { console, Math, Date, JSON, Object, String, Array, Number };
ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ["assets/data.js","assets/core.js"]) vm.runInContext(fs.readFileSync(f,"utf8"), ctx);
const {FDR_DATA:D, FDR_CORE:C} = ctx;
const win = {}; D.windows.forEach(w=>win[w.id]=w);
const pool = D.dishes.map(d => ({...d, win: win[d.windowId]}));
function at(h,m,day){ const dt=new Date(2026,9,day||21,h,m); return dt; }
for (const [h,m,label] of [[7,40,"早高峰"],[12,10,"午高峰"],[12,45,"午尾"],[15,30,"下午"],[21,40,"夜宵"]]) {
  const d = pool.find(x=>x.name==="黄焖鸡米饭") ;
  const d2 = pool.find(x=>x.name==="肉包子");
  const a = C.predictWait(d,{date:at(h,m)});
  const b = C.predictWait(d2,{date:at(h,m)});
  console.log(label.padEnd(4), "黄焖鸡", a.mins+"分", a.peak, "|", a.tip, "|| 肉包子", b.mins+"分");
}
const s = C.predictWait(pool[0],{date:at(12,10,26)});
console.log("周末午高峰:", s.mins, "分 | 季节", s.season);
