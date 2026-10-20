import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const root = process.cwd();
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };
http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p === "/") p = "/index.html";
  fs.readFile(path.join(root, p), (e, buf) => {
    if (e) { res.statusCode = 404; res.end("nf"); return; }
    res.setHeader("Content-Type", types[path.extname(p)] || "application/octet-stream");
    res.end(buf);
  });
}).listen(8123, () => console.log("serving on 8123"));
