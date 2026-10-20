import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const puppeteer = require("../.tmpdom/node_modules/puppeteer-core");

const root = process.cwd();
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p === "/") p = "/index.html";
  fs.readFile(path.join(root, p), (e, buf) => {
    if (e) { res.statusCode = 404; res.end("nf"); return; }
    res.setHeader("Content-Type", types[path.extname(p)] || "application/octet-stream");
    res.end(buf);
  });
});
await new Promise((r) => server.listen(8123, r));

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--hide-scrollbars", "--no-first-run", "--no-default-browser-check", "--disable-features=Translate", "--font-render-hinting=none"]
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

const seed = () => {
  const today = new Date();
  const iso = (off) => { const d = new Date(today.getTime() - off * 86400000); return d.toISOString(); };
  const dayKey = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  const mk = (dishId, flowers, text, tags, n) => ({
    id: "seed" + n, room: "main", dishId, authorId: "uSEED0001", authorName: "干饭人·7F2A",
    avatar: "🐼", flowers, tags: tags || [], text, pics: [], createdAt: iso(n * 0.02)
  });
  localStorage.setItem("fdr_author_v1", JSON.stringify({ id: "uSEED0001", name: "干饭人·7F2A" }));
  localStorage.setItem("fdr_guide_v1", "1");
  localStorage.setItem("fdr_theme", "light");
  localStorage.setItem("fdr_sim_off", "1");
  localStorage.setItem("fdr_reviews_v2", JSON.stringify([
    mk("d1", 5, "阿姨今天手没抖，肉给得实在。", ["超值"], 1),
    mk("d9", 4, "锅气拉满，辣到怀疑人生但停不下来。", ["真香"], 2),
    mk("d16", 5, "爆辣星人认证，普通人一口升天。", ["真香"], 3),
    mk("d25", 5, "外脆里嫩，快乐无需解释。", ["超值"], 4),
    mk("d45", 4, "皮脆肉嫩，撒料给得豪爽。", ["会二刷"], 5),
    mk("d29", 3, "减脂人的精神图腾，吃完依旧很饿。", [], 6),
    mk("d36", 5, "加料自由，宿舍局必备。", ["超值"], 7),
    mk("d42", 4, "宿舍公敌，个人天堂。", ["真香"], 8)
  ]));
  localStorage.setItem("fdr_plan_v1", JSON.stringify({ [dayKey]: { breakfast: "d8", lunch: "d1", dinner: "d6" } }));
};

await page.evaluateOnNewDocument(seed);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => { await page.screenshot({ path: "docs/shots/" + name + ".png" }); console.log("shot", name); };
const go = async (hash, ms) => { await page.goto("http://localhost:8123/" + hash, { waitUntil: "networkidle0" }); await wait(ms || 600); };

fs.mkdirSync("docs/shots", { recursive: true });

await go("", 900);
await shot("01-home-light");

await page.click(".themebtn");
await wait(400);
await shot("02-home-dark");
await page.click(".themebtn");
await wait(300);

await go("#/dish/d1", 900);
await page.evaluate(() => window.scrollTo(0, 430));
await wait(400);
await shot("03-dish-detail");

await page.click('[data-act="rvfilter"][data-key="bad"]');
await wait(400);
await page.evaluate(() => window.scrollTo(0, 900));
await wait(300);
await shot("04-dish-bad-reviews");

await go("#/rank", 800);
await shot("05-rank");

await go("#/plan", 800);
await page.click('[data-act="plan-auto"]').catch(() => {});
await wait(500);
await shot("06-plan");

await go("#/me", 900);
await shot("07-me-radar");

await go("#/canteen/c4", 800);
await shot("08-canteen");

await go("", 1100);
await page.click("#livebar");
await wait(500);
await shot("09-live-panel");

await browser.close();
server.close();
console.log("done");
