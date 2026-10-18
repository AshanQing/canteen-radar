import fs from "node:fs";
import { JSDOM, VirtualConsole } from "../.tmpdom/node_modules/jsdom/lib/api.js";

let html = fs.readFileSync("index.html", "utf8");
for (const f of ["data.js", "core.js", "app.js"]) {
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

console.log("1 首屏渲染:", q("#app .screen").length === 1, "| rec 卡片:", q(".rec").length, "| 导航:", q(".tab").length);

const chip = q('.chip-btn[data-key="cheap"]')[0];
click(chip);
console.log("2 筛选生效:", q('.chip-btn[data-key="cheap"]')[0].classList.contains("on"), "| rec:", q(".rec").length);

click(q('[data-act="shuffle"]')[0]);
console.log("3 换一批:", q(".rec").length === 3);

window.location.hash = "#/dish/d1";
await new Promise((r) => setTimeout(r, 60));
console.log("4 菜品详情:", !!doc.querySelector(".dish-hero"), "| 维度条:", q(".dim").length, "| 评价:", q(".review").length);

click(q('[data-act="review"]')[0]);
console.log("5 点评弹层:", !!doc.querySelector(".sheet"), "| 花按钮:", q(".fp").length);

click(q(".fp")[4]);
click(q('.chip-btn[data-t="真香"]')[0]);
doc.querySelector("#rv-text").value = "阿姨今天手真的没抖，肉给得比室友的头发还多";
click(q('[data-act="submit"]')[0]);
await new Promise((r) => setTimeout(r, 60));
const saved = JSON.parse(window.localStorage.getItem("fdr_me_v1") || "{}");
console.log("6 提交持久化:", (saved.reviews || []).length === 1, "| 花数:", saved.reviews && saved.reviews[0] && saved.reviews[0].flowers);

window.location.hash = "#/rank";
await new Promise((r) => setTimeout(r, 60));
console.log("7 榜单:", q(".rankrow").length, "行");

window.location.hash = "#/me";
await new Promise((r) => setTimeout(r, 60));
console.log("8 我的页:", !!doc.querySelector(".me-card"), "| 我的点评行:", q(".row").length);

window.location.hash = "#/canteens";
await new Promise((r) => setTimeout(r, 60));
console.log("9 食堂列表:", q(".canteen-card").length);

window.location.hash = "#/canteen/c2";
await new Promise((r) => setTimeout(r, 60));
console.log("10 食堂详情窗口:", q(".winblock").length);

window.location.hash = "#/today";
await new Promise((r) => setTimeout(r, 60));
console.log("11 首屏推荐理由条数:", q(".why li").length);

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
console.log("12 运行错误:", errors.length ? errors.slice(0, 5) : "无");
