import fs from "node:fs";
const shots = [
  ["01-home-light", "01-home-light", "#/today"],
  ["02-home-dark", "02-home-dark", "#/today"],
  ["03-dish-detail", "03-dish-detail", "#/dish/d1"],
  ["04-dish-bad", "04-dish-bad", "#/dish/d1"],
  ["05-rank", "05-rank", "#/rank"],
  ["06-plan", "06-plan", "#/plan"],
  ["07-me", "07-me", "#/me"],
  ["08-canteen", "08-canteen", "#/canteen/c4"],
  ["09-live", "09-live", "#/today"]
];
fs.mkdirSync("tools/frames", { recursive: true });
for (const [name, page, hash] of shots) {
  const html = `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;width:390px;height:844px;overflow:hidden;background:#fff}
  iframe{display:block;width:390px;height:844px;border:0}
</style>
<iframe src="../shot-pages/${page}.html${hash}"></iframe>
`;
  fs.writeFileSync("tools/frames/" + name + ".html", html);
}
console.log("frames:", shots.length);
