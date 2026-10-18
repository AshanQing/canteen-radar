import fs from "node:fs";
const cmd = process.argv[2];
const tokFile = process.argv[3];
const tok = fs.readFileSync(tokFile, "utf8").trim();
const OWNER = "AshanQing", REPO = "canteen-radar";
const H = { Authorization: "Bearer " + tok, "User-Agent": "fdr-deploy", Accept: "application/vnd.github+json" };
const api = "https://api.github.com";

async function call(path, method = "GET", body) {
  const r = await fetch(api + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  let j = null;
  try { j = await r.json(); } catch (e) {}
  return { status: r.status, json: j };
}

if (cmd === "create") {
  const r = await call("/user/repos", "POST", {
    name: REPO,
    description: "食堂雷达 · 胆子肥嘟嘟大学校园食堂点评推荐 demo",
    homepage: "https://ashanqing.github.io/canteen-radar/",
    private: false, has_issues: true, has_wiki: false
  });
  console.log("create:", r.status, r.status === 201 ? "created" : JSON.stringify(r.json).slice(0, 200));
}
if (cmd === "pages") {
  let r = await call("/repos/" + OWNER + "/" + REPO + "/pages", "POST", { source: { branch: "main", path: "/" } });
  console.log("pages create:", r.status, JSON.stringify(r.json).slice(0, 200));
  if (r.status === 409) {
    r = await call("/repos/" + OWNER + "/" + REPO + "/pages", "PUT", { source: { branch: "main", path: "/" } });
    console.log("pages update:", r.status);
  }
}
if (cmd === "status") {
  const r = await call("/repos/" + OWNER + "/" + REPO + "/pages");
  console.log("pages:", r.status, JSON.stringify(r.json).slice(0, 300));
  const b = await call("/repos/" + OWNER + "/" + REPO + "/pages/builds/latest");
  console.log("build:", b.status, JSON.stringify(b.json && { status: b.json.status, duration: b.json.duration, error: b.json.error && b.json.error.message }).slice(0, 300));
}
if (cmd === "verify") {
  const base = "https://" + OWNER.toLowerCase() + ".github.io/" + REPO + "/";
  for (const p of ["", "assets/styles.css", "assets/app.js", "assets/data.js", "assets/core.js"]) {
    try {
      const r = await fetch(base + p, { cache: "no-store" });
      const t = await r.text();
      console.log(p || "index", r.status, t.length, p === "" ? (t.includes("食堂雷达") ? "HAS_TITLE" : "NO_TITLE") : "");
    } catch (e) { console.log(p, "ERR", e.message); }
  }
}
