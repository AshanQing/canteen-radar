import fs from "node:fs";

const base = fs.readFileSync("index.html", "utf8");
const seed = (theme) => `
<script>
(function () {
  var now = new Date();
  var iso = function (m) { return new Date(now.getTime() - m * 60000).toISOString(); };
  var dayKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  var mk = function (id, dishId, flowers, text, tags, m) {
    return { id: id, room: "main", dishId: dishId, authorId: "uSEED0001", authorName: "干饭人·7F2A",
      avatar: "🐼", flowers: flowers, tags: tags || [], text: text, pics: [], createdAt: iso(m) };
  };
  localStorage.setItem("fdr_author_v1", JSON.stringify({ id: "uSEED0001", name: "干饭人·7F2A" }));
  localStorage.setItem("fdr_guide_v1", "1");
  localStorage.setItem("fdr_sim_off", "1");
  localStorage.setItem("fdr_theme", "${theme || "light"}");
  localStorage.setItem("fdr_reviews_v2", JSON.stringify([
    mk("s1", "d1", 5, "阿姨今天手没抖，肉给得实在。", ["超值"], 2),
    mk("s2", "d9", 4, "锅气拉满，辣到怀疑人生但停不下来。", ["真香"], 6),
    mk("s3", "d16", 5, "爆辣星人认证，普通人一口升天。", ["真香"], 11),
    mk("s4", "d25", 5, "外脆里嫩，快乐无需解释。", ["超值"], 17),
    mk("s5", "d45", 4, "皮脆肉嫩，撒料给得够豪爽。", ["会二刷"], 25),
    mk("s6", "d29", 3, "减脂人的精神图腾，吃完依旧很饿。", [], 33),
    mk("s7", "d36", 5, "加料自由，宿舍局必备。", ["超值"], 41),
    mk("s8", "d42", 4, "宿舍公敌，个人天堂。", ["真香"], 50)
  ]));
  localStorage.setItem("fdr_plan_v1", JSON.stringify({}));
  localStorage.getItem("fdr_plan_v1");
})();
</script>
`;

const pages = [
  { file: "01-home-light", hash: "#/today", theme: "light" },
  { file: "02-home-dark", hash: "#/today", theme: "dark" },
  { file: "03-dish-detail", hash: "#/dish/d1", theme: "light", after: "window.scrollTo(0,430);" },
  { file: "04-dish-bad", hash: "#/dish/d1", theme: "light",
    after: "var b=document.querySelector('[data-act=rvfilter][data-key=bad]'); if(b) b.click(); setTimeout(function(){window.scrollTo(0,860);},120);" },
  { file: "05-rank", hash: "#/rank", theme: "light" },
  { file: "06-plan", hash: "#/plan", theme: "light",
    after: "var a=document.querySelector('[data-act=plan-auto]'); if(a) a.click();" },
  { file: "07-me", hash: "#/me", theme: "light" },
  { file: "08-canteen", hash: "#/canteen/c4", theme: "light" },
  { file: "09-live", hash: "#/today", theme: "light",
    after: "var l=document.getElementById('livebar'); if(l) l.click();" }
];

fs.mkdirSync("tools/shot-pages", { recursive: true });
for (const p of pages) {
  let html = base.replace("<head>", "<head>\n<base href=\"/\">");
  html = html.replace('<script>\n  // 先把主题定下来', '<script>\n  // 先把主题定下来');
  // 种子脚本插在主题脚本之后、资源加载之前
  html = html.replace("</head>", seed(p.theme) + "</head>");
  if (p.after) {
    html = html.replace("</body>", "<script>window.addEventListener('load',function(){setTimeout(function(){" + p.after + "},250);});</script></body>");
  }
  html = html.replace('href="assets/styles.css"', 'href="assets/styles.css"');
  fs.writeFileSync("tools/shot-pages/" + p.file + ".html", html);
}
console.log("generated", pages.length, "shot pages");
