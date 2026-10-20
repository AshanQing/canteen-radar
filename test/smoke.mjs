import fs from "node:fs";
import { JSDOM, VirtualConsole } from "../.tmpdom/node_modules/jsdom/lib/api.js";

let html = fs.readFileSync("index.html", "utf8");
for (const f of ["data.js", "core.js", "store.js", "app.js"]) {
  const code = fs.readFileSync("assets/" + f, "utf8");
  html = html.replace('<script src="assets/' + f + '"></script>', "<script>" + code + "</script>");
}
const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push("jsdomError: " + (e.message || e)));
vc.on("error", (m) => errors.push("console.error: " + m));

const dom = new JSDOM(html, {
  url: "https://ashanqing.github.io/canteen-radar/",
  runScripts: "dangerously",
  pretendToBeVisual: true,
  virtualConsole: vc,
});
const { window } = dom;
const doc = window.document;
const q = (s) => doc.querySelectorAll(s);
const click = (el) => el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

window.addEventListener("error", (e) => console.log("JS ERROR:", e.message, "|", (e.error && e.error.stack || "").split("\n")[1] || ""));
console.log("1 首屏渲染:", q("#app .screen").length === 1, "| rec 卡片:", q(".rec").length, "| 导航:", q(".tab").length);
console.log("1b 引导条:", q(".guide").length, "| 菜品图:", q(".foodimg").length, "| 播报条:", q(".livebar").length, "| 时段文案:", q(".hero h1")[0].textContent);
console.log("1d 托盘标签:", q(".tray-tab").length, "| 当前:", q(".tray-tab.on")[0].textContent, "| 组合卡:", q(".combo").length);
click(q('[data-act="close-guide"]')[0]);
await new Promise((r) => setTimeout(r, 40));
console.log("1c 引导可关闭:", q(".guide").length === 0, "| 已记住:", window.localStorage.getItem("fdr_guide_v1"));

const chip = q('.chip-btn[data-key="cheap"]')[0];
click(chip);
console.log("2 筛选生效:", q('.chip-btn[data-key="cheap"]')[0].classList.contains("on"), "| rec:", q(".rec").length);
const prefs0 = JSON.parse(window.localStorage.getItem("fdr_prefs") || "{}");
console.log("2b 筛选已写入记忆:", prefs0.filters && prefs0.filters.cheap === true, "| 清空按钮:", q('[data-act="clear-filter"]').length);

click(q('[data-act="shuffle"]')[0]);
console.log("3 换一批:", q(".rec").length === 3);

window.location.hash = "#/dish/d1";
await new Promise((r) => setTimeout(r, 60));
console.log("4 菜品详情:", !!doc.querySelector(".dish-hero"), "| 维度条:", q(".dim").length, "| 评价:", q(".review").length);

// 评价筛选 + 实拍
const rvAll = q(".review").length;
console.log("4a 评价筛选按钮:", q(".rvfilter .chip-btn").length, "| 原始评价:", rvAll, "| 配图评价:", q(".rv-pics .rv-pic").length);
click(q('.rvfilter .chip-btn[data-key="bad"]')[0]);
await new Promise((r) => setTimeout(r, 40));
const rvBad = q(".review").length;
console.log("4b 只看差评:", rvBad, "条 | 标题:", q(".section-title small")[3] && q(".section-title small")[3].textContent);
console.log("4c 差评筛选有效:", rvBad <= rvAll);
console.log("4d 同学实拍:", q(".gallery .rv-pic").length, "张 | 评价内配图:", q(".rv-pics .rv-pic").length);
click(q(".gallery .rv-pic")[0]);
await new Promise((r) => setTimeout(r, 40));
console.log("4e 看图浮层:", !!doc.querySelector(".lightbox"));
click(q(".lb-close")[0]);
await new Promise((r) => setTimeout(r, 40));
console.log("4f 浮层关闭:", !doc.querySelector(".lightbox"));

// 自动配菜
const acBefore = Array.from(q(".ac-row")).map((e) => e.querySelector("b").textContent).join(" / ");
console.log("4g 自动配菜行数:", q(".ac-row").length, "|", acBefore);
click(q('[data-act="recombo"]')[0]);
await new Promise((r) => setTimeout(r, 60));
const acAfter = Array.from(q(".ac-row")).map((e) => e.querySelector("b").textContent).join(" / ");
console.log("4h 换一组配菜:", acAfter, "| 变化:", acAfter !== acBefore);

click(q('[data-act="review"]')[0]);
console.log("5 点评弹层:", !!doc.querySelector(".sheet"), "| 花按钮:", q(".fp").length);

console.log("5b 上传入口:", !!doc.querySelector("#rv-file"), "| 按钮:", !!doc.querySelector(".up-btn"));
window._sheet.pics = ["data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"];
click(q(".fp")[4]);
click(q('.chip-btn[data-t="真香"]')[0]);
doc.querySelector("#rv-text").value = "阿姨今天手真的没抖，肉给得比室友的头发还多";
console.log("DBG sheet:", !!window._sheet, "| flowers:", window._sheet && window._sheet.flowers, "| pics:", window._sheet && window._sheet.pics.length, "| store:", window.Store.reviews.length);
click(q('[data-act="submit"]')[0]);
await new Promise((r) => setTimeout(r, 60));
const persisted = JSON.parse(window.localStorage.getItem("fdr_reviews_v2") || "[]");
console.log("6 提交持久化:", persisted.length === 1, "| 花数:", persisted[0] && persisted[0].flowers, "| 带图:", (persisted[0] && persisted[0].pics || []).length);
click(q('.rvfilter .chip-btn[data-key="all"]')[0]);
await new Promise((r) => setTimeout(r, 60));
console.log("6b 实时评价卡:", q(".review.live").length, "| 实时标记:", q(".live-tag").length, "| 我的署名:", /· 我/.test(doc.body.textContent), "| 实拍区:", q(".gallery .rv-pic").length, "| 均分:", doc.querySelector(".bs-left b").textContent);

window.location.hash = "#/rank";
await new Promise((r) => setTimeout(r, 60));
console.log("7 榜单:", q(".rankrow").length, "行");

window.location.hash = "#/me";
await new Promise((r) => setTimeout(r, 60));
console.log("8 我的页:", !!doc.querySelector(".me-card"), "| 我的点评行:", q(".row").length);
console.log("8d 口味雷达:", q(".radar").length, "| 轴标签:", q(".rd-label").length, "| 说明:", (q(".radar-note")[0] || {}).textContent);
console.log("8b 同步卡:", !!doc.querySelector(".synccard"), "| 模式:", q(".sync-row b")[0] && q(".sync-row b")[0].textContent, "| 房间:", q(".sync-row b")[1] && q(".sync-row b")[1].textContent);
const code = window.Store.exportShare();
window.Store.resetRoom();
const added = window.Store.importShare(code);
console.log("8c 分享码往返:", code.length, "字符 | 重置后导入:", added, "条 | 房间评价数:", window.Store.reviews.length);

window.location.hash = "#/canteens";
await new Promise((r) => setTimeout(r, 60));
console.log("9 食堂列表:", q(".canteen-card").length);

// 干饭日程
window.location.hash = "#/plan";
await new Promise((r) => setTimeout(r, 60));
console.log("9b 日程周条:", q(".daycell").length, "| 空槽:", q(".slot").length, "| 优惠:", q(".promolist .promo").length);
click(q('[data-act="plan-auto"]')[0]);
await new Promise((r) => setTimeout(r, 60));
console.log("9c 帮我排一天:", Array.from(q(".slot")).map(e => e.querySelector("small").textContent).join(" / "));
click(q(".slot")[1]);
await new Promise((r) => setTimeout(r, 40));
console.log("9d 安排弹层:", q(".planrow").length, "条");
click(q(".planrow")[0]);
await new Promise((r) => setTimeout(r, 60));
console.log("9e 选完后槽位:", q(".slot")[1].querySelector("small").textContent);

// 整改公告
window.location.hash = "#/dish/d24";
await new Promise((r) => setTimeout(r, 60));
console.log("9f 整改公告:", !!doc.querySelector(".fixbox"), "|", (doc.querySelector(".fixbox p") || {}).textContent);
console.log("9g 出餐框:", !!doc.querySelector(".waitbox"), "|", (doc.querySelector(".wb-line") || {}).textContent);

window.location.hash = "#/canteen/c2";
await new Promise((r) => setTimeout(r, 60));
console.log("10 食堂详情窗口:", q(".winblock").length);

window.location.hash = "#/today";
await new Promise((r) => setTimeout(r, 60));
console.log("11 首屏推荐理由:", q(".why-line").length, "条 | 示例:", (q(".why-line")[0] || {}).textContent);
console.log("11c2 推荐卡排队:", q(".rec-meta span")[1] && q(".rec-meta span")[1].textContent);
console.log("11z 文案检查 · 出现「穷鬼」:", /穷鬼/.test(doc.body.textContent), "| 搭配名:", q(".combo b")[0].textContent);
console.log("11y 横向滚动绑定:", !!q(".combos")[0]._wh, "| 箭头按钮:", q(".sec-arrow").length);

// 搭配推荐
console.log("11a 搭配卡片:", q(".combo").length, "| 组合菜品按钮:", q(".combo-dish").length);
console.log("11b 搭配价格:", q(".combo-price")[0] && q(".combo-price")[0].textContent);
const n0 = q(".combo")[0].querySelector("b").textContent;
click(q('[data-act="combo-rand"]')[0]);
await new Promise((r) => setTimeout(r, 40));
const n1 = q(".combo")[0].querySelector("b").textContent;
console.log("11c 帮我配一套轮换:", n0, "→", n1, "| 变化:", n0 !== n1);

// 主题
const before = doc.documentElement.getAttribute("data-theme");
click(q(".themebtn")[0]);
await new Promise((r) => setTimeout(r, 40));
const after = doc.documentElement.getAttribute("data-theme");
console.log("11d 主题切换:", before, "→", after, "| 持久化:", window.localStorage.getItem("fdr_theme"));
console.log("11e 图标已更新:", q(".themebtn")[0].textContent);
click(q(".themebtn")[0]);
await new Promise((r) => setTimeout(r, 40));
console.log("11f 切回:", doc.documentElement.getAttribute("data-theme"));
const simBefore = window.Store.reviews.length;
window.FDR_SIM.run();
window.FDR_SIM.run();
console.log("12a 演示注入:", simBefore, "→", window.Store.reviews.length, "| 模拟作者:", window.Store.reviews.filter(r => /^sim-/.test(r.authorId)).length);
console.log("12b 注入后仍可用:", q(".rec").length === 3, "| 播报条:", q(".livebar").length, "| 文案:", (doc.querySelector("#lb-text") || {}).textContent);

// 复现你遇到的场景：刚打开、地址栏没有 #/today
window.location.hash = "";
await new Promise((r) => setTimeout(r, 60));
const txtBefore = (doc.querySelector("#lb-text") || {}).textContent;
window.FDR_SIM.run();
await new Promise((r) => setTimeout(r, 60));
const txtAfter = (doc.querySelector("#lb-text") || {}).textContent;
console.log("12c 空 hash 场景:", JSON.stringify(window.location.hash), "| 播报更新:", txtBefore !== txtAfter, "|", txtAfter);
// 播报回溯
window.location.hash = "#/today";
await new Promise((r) => setTimeout(r, 60));
console.log("12d 播报角标:", q(".lb-count").length, "|", q(".lb-count")[0] && q(".lb-count")[0].textContent);
click(q(".livebar")[0]);
await new Promise((r) => setTimeout(r, 40));
console.log("12e 回溯面板:", !!doc.querySelector(".live-sheet"), "| 条数:", q(".lrow").length, "| 新标:", q(".lrow-new").length);
click(q(".lrow")[0]);
await new Promise((r) => setTimeout(r, 60));
console.log("12f 点条目跳转:", window.location.hash, "| 面板已关:", !doc.querySelector(".live-sheet"));
window.location.hash = "#/today";
await new Promise((r) => setTimeout(r, 60));
console.log("12g 已读后角标:", q(".lb-count").length === 0, "| 再看面板新标:", (click(q(".livebar")[0]), await new Promise(r => setTimeout(r, 40)), q(".lrow-new").length));

console.log("12 运行错误:", errors.length ? errors.slice(0, 5) : "无");
window.close();
process.exit(0);
