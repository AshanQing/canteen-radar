import fs from "node:fs";
import { JSDOM } from "../.tmpdom/node_modules/jsdom/lib/api.js";
let html = fs.readFileSync("index.html", "utf8");
for (const f of ["data.js","core.js","store.js","app.js"]) {
  html = html.replace('<script src="assets/' + f + '"></script>', "<script>" + fs.readFileSync("assets/" + f, "utf8") + "</script>");
}
const dom = new JSDOM(html, { url: "https://x.test/", runScripts: "dangerously", pretendToBeVisual: true });
const w = dom.window;
await new Promise(r => setTimeout(r, 120));
const picks = ["d1","d9","d16","d25","d45","d29","d36","d42"];
for (const id of picks) { w.Store.add({ dishId: id, flowers: 4, tags: [], text: "测试", pics: [] }); }
w.location.hash = "#/me";
await new Promise(r => setTimeout(r, 120));
const svg = w.document.querySelector(".radar").outerHTML
  .replace(/var\(--line\)/g, "#EFE0D1").replace(/var\(--brand\)/g, "#FF6B35");
fs.writeFileSync(".tmpdom/radar.svg", svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" '));
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = require("../.tmpdom/node_modules/sharp");
await sharp(".tmpdom/radar.svg").png().toFile("preview/radar.png");
console.log("ok", w.document.querySelector(".radar-note").textContent);
process.exit(0);
