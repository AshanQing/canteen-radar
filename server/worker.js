/**
 * 食堂雷达 · 共享后端（Cloudflare Worker + KV）
 * 部署：见 server/README.md，5 分钟拿到一个 https 地址
 * 接口：
 *   GET  /health
 *   GET  /reviews?room=xxx   -> { reviews: [...] }
 *   POST /reviews            -> { ok: true, count: n }
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    const room = (url.searchParams.get("room") || "main").slice(0, 40);
    const key = "reviews:" + room;

    if (url.pathname === "/health") return json({ ok: true, room }, cors);

    if (url.pathname === "/reviews" && request.method === "GET") {
      const raw = await env.FDR.get(key);
      return json({ reviews: raw ? JSON.parse(raw) : [] }, cors);
    }

    if (url.pathname === "/reviews" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, cors, 400); }
      if (!body || !body.dishId || !body.flowers) return json({ error: "missing fields" }, cors, 400);
      if (String(body.text || "").length > 300) return json({ error: "text too long" }, cors, 400);

      // 每个 IP 每分钟最多 10 条，防手滑刷屏
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const rlKey = "rl:" + ip;
      const used = parseInt((await env.FDR.get(rlKey)) || "0", 10);
      if (used >= 10) return json({ error: "rate limited, 缓一缓" }, cors, 429);
      await env.FDR.put(rlKey, String(used + 1), { expirationTtl: 60 });

      const list = JSON.parse((await env.FDR.get(key)) || "[]");
      list.push({
        id: body.id || crypto.randomUUID(),
        room,
        dishId: String(body.dishId).slice(0, 40),
        authorId: String(body.authorId || "anon").slice(0, 40),
        authorName: String(body.authorName || "匿名").slice(0, 20),
        avatar: String(body.avatar || "🐼").slice(0, 4),
        flowers: Math.max(1, Math.min(5, Number(body.flowers) || 3)),
        tags: Array.isArray(body.tags) ? body.tags.slice(0, 6) : [],
        text: String(body.text || "").slice(0, 300),
        pics: Array.isArray(body.pics) ? body.pics.slice(0, 3) : [],
        createdAt: body.createdAt || new Date().toISOString()
      });
      if (list.length > 2000) list.splice(0, list.length - 2000);
      await env.FDR.put(key, JSON.stringify(list));
      return json({ ok: true, count: list.length }, cors);
    }

    return new Response("not found", { status: 404, headers: cors });
  },
};

function json(obj, cors, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}
