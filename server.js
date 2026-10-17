// Mayko GPT – הרצה מקומית (npm start). ב-Vercel משתמשים ב-api/chat.js ובתיקייה public/.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleChat, PROVIDER, KEY, AKEY } from "./lib/chat.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(dir, "public");
const PORT = process.env.PORT || 3000;
const types = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/chat") {
    let body = ""; for await (const c of req) body += c;
    try { return await handleChat(JSON.parse(body || "{}"), res); }
    catch (e) { if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain; charset=utf-8" }); return res.end("שגיאת שרת: " + e.message); }
  }
  // מגישים רק קבצים מתוך public – כך .env והקוד לעולם לא נחשפים
  let name = "index.html";
  try { name = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "index.html"; } catch {}
  const file = /^[\w.-]+$/.test(name) && types[path.extname(name)] && path.join(pub, name);
  if (!file || !fs.existsSync(file)) { res.writeHead(404); return res.end("Not found"); }
  res.writeHead(200, { "content-type": types[path.extname(file)] });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`\nMayko GPT רץ ← http://localhost:${PORT}\n` + `ספק: ${PROVIDER} - ` + ((PROVIDER === "anthropic" ? AKEY : KEY) ? "המפתח נטען." : "חסר מפתח ב-.env")));
