import fs from "node:fs";
const tok = fs.readFileSync(process.argv[2], "utf8").trim();
const H = { Authorization: "Bearer " + tok, "User-Agent": "fdr-push", Accept: "application/vnd.github+json" };
const OWNER = "AshanQing", REPO = "canteen-radar";
const api = "https://api.github.com";
const call = async (path, method = "GET", body) => {
  const r = await fetch(api + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch (e) {}
  if (!r.ok) throw new Error(method + " " + path + " -> " + r.status + " " + text.slice(0, 200));
  return json;
};

const files = fs.readFileSync(".tmpdom/files.txt", "utf8").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
const ref = await call("/repos/" + OWNER + "/" + REPO + "/git/ref/heads/main");
const baseCommit = await call("/repos/" + OWNER + "/" + REPO + "/git/commits/" + ref.object.sha);
console.log("base:", baseCommit.sha.slice(0, 8), "files:", files.length);

const tree = [];
for (const f of files) {
  const buf = fs.readFileSync(f);
  const blob = await call("/repos/" + OWNER + "/" + REPO + "/git/blobs", "POST", {
    content: buf.toString("base64"), encoding: "base64"
  });
  tree.push({ path: f, mode: "100644", type: "blob", sha: blob.sha });
}
const newTree = await call("/repos/" + OWNER + "/" + REPO + "/git/trees", "POST", {
  base_tree: baseCommit.tree.sha, tree
});
const commit = await call("/repos/" + OWNER + "/" + REPO + "/git/commits", "POST", {
  message: "feat: 存储层抽离，支持本地/联网双模式 + 分享码 + 共享后端",
  tree: newTree.sha,
  parents: [baseCommit.sha]
});
await call("/repos/" + OWNER + "/" + REPO + "/git/refs/heads/main", "PATCH", { sha: commit.sha, force: false });
console.log("pushed commit:", commit.sha.slice(0, 8));
