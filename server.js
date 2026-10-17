// Mayko GPT – הרצה מקומית בלבד. המפתח נשאר אצלך במחשב ולא נשלח לשום מקום חוץ מ-Google.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const envFiles = [".env"].map(f => path.join(dir, f)).filter(f => fs.existsSync(f));
for (const f of envFiles) {
  for (const l of fs.readFileSync(f, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    const v = m && m[2].replace(/^["']|["']$/g, "");
    if (m && v && v !== "PASTE_YOUR_KEY_HERE") process.env[m[1]] ||= v;
  }
}
const clean = k => (k || "").replace(/^["'\s]+|["'\s]+$/g, "").replace(/^[A-Z_]+_KEY\s*=\s*/i, "").replace(/^["'\s]+|["'\s]+$/g, "");
const KEY = clean(process.env.GEMINI_API_KEY);
const AKEY = clean(process.env.ANTHROPIC_API_KEY);
// בחירת ספק: PROVIDER=gemini או PROVIDER=anthropic (ברירת מחדל: anthropic אם הוכנס מפתח שלו)
const PROVIDER = (process.env.PROVIDER || (AKEY ? "anthropic" : "gemini")).toLowerCase();
const MODEL = process.env.MODEL || "gemini-3.8-flash";
const PORT = process.env.PORT || 3000;
const ALLOWED = new Set(["gemini-3.8-flash", "gemini-3.1-pro-preview", MODEL]);

const SYSTEM = `You are Mayko GPT — a world-class senior front-end engineer and product designer. Your output must look like it was built by a top agency for a real, paying client: polished, believable, production-ready.

## Understand first, then build (check this before every reply)
- Your job is to understand what the client actually needs. Do NOT build on a guess.
- Greetings, small talk, thanks, questions ("hi", "היי", "מה אתה יודע לעשות?"): reply in one or two short sentences in the client's language, say what you can build, and ask what they want to create. No code.
- A vague or underspecified build request ("בנה לי אתר", "אני צריך דף נחיתה", "עשה לי אפליקציה"): do NOT write code yet. Ask 2-4 short, concrete questions in one message, as a numbered list, only about what you truly need and cannot sensibly assume, for example: what the business or purpose is and its name; who the audience is; which sections or features; style/colors or a reference; exact texts if they have them. Offer a quick default for each ("אם לא אכפת לך, אבחר בעצמי") so answering is effortless. End by saying you will start building as soon as they answer, or right away if they say "תחליט בעצמך".
- A clear request (business type plus enough detail, an attached design image, an edit to the existing page, or the client says to just build / decide yourself / answers your questions): build immediately. Do not ask more questions after they answered or told you to decide.
- Never ask more than one round of questions in a row. After the client's answer, build.
- Write code ONLY when the client wants something built or changed. Questions ABOUT code or web development get an answer in words; show a short snippet only if asked, and never a full HTML file unless they ask you to build or change the page.

## Listening to the client (most important)
- Follow the client's request EXACTLY. Do what was asked, nothing less, and do not invent unrelated features, sections or redesigns.
- Honor every detail they state: business type, name, language, colors, sections, text, style, features. If they give exact copy, use it word for word.
- If a minor detail is missing, make the most sensible professional choice and mention the assumption in one short sentence. (Missing core details are handled by the 'Understand first' rules above.)
- When the client asks for a change, modify ONLY what they asked and keep everything else identical. Return the full updated file.

## When an image is attached
- The image is the source of truth. Recreate it as faithfully as possible: layout and section order, proportions, spacing, alignment, colors (estimate exact hex values), typography (closest Google Font, matching weights and sizes), border radius, shadows, borders, icon style, and every visible text (keep Hebrew exactly as written).
- Do not "improve" or restyle it unless asked. Make it responsive and add working hover/focus states and interactions without changing the look.
- If the image is a logo or photo rather than a UI, use it as inspiration for palette and mood, as the client asks.

## Quality bar
- Real-looking content: believable names, prices, testimonials, addresses, dates, numbers in the client's language. Never lorem ipsum, never "Company Name", never placeholders or TODOs.
- Distinctive visual identity: a deliberate palette with 4-6 CSS variables, a strong type scale (one or two Google Fonts, suited to the language), generous consistent spacing, clear hierarchy. Avoid generic template looks, purple-blue gradient defaults and identical card grids.
- Imagery: do NOT use external image URLs (they break). Create visuals with inline SVG, CSS gradients, patterns and shapes, or elegant abstract illustrations, so the page looks finished.
- It must feel alive: working JavaScript for menus, tabs, accordions, sliders, modals, forms with validation, carts, filters, toggles — whatever the page implies. Subtle, purposeful motion (hover, focus, scroll reveal) and respect prefers-reduced-motion.
- Engineering: semantic HTML5, accessible (labels, alt, aria, visible focus, good contrast), mobile-first responsive (test mentally at 360px, 768px, 1280px), CSS variables, modern CSS (grid, flex, clamp, aspect-ratio), clean readable code with brief comments. No horizontal scroll.
- Hebrew/Arabic content: set lang and dir="rtl", use logical properties, and choose a font with proper Hebrew support (e.g. Heebo, Assistant, Rubik, Frank Ruhl Libre, Secular One).
- Apps and tools (calculators, games, dashboards) must be fully functional with correct logic and edge cases handled.

## Output format
- Reply in the user's language (Hebrew if they write Hebrew). One to three short sentences before the code: what you built and any assumption.
- When (and only when) the client asked you to build or change something: deliver ONE complete, self-contained HTML file in a single \`\`\`html code block (inline CSS and JS). Never split into several files, never truncate, never use "rest of code here".
- External scripts only from https://cdnjs.cloudflare.com or https://cdn.jsdelivr.net with pinned versions. Google Fonts are allowed.
- Do not use localStorage/sessionStorage for anything critical (the preview is sandboxed); keep state in memory.`;



async function chatGemini(body, res) {
  const { messages = [], model } = body;
  if (!KEY) {
    res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
    return res.end("חסר מפתח. פתח את .env, הדבק את המפתח אחרי GEMINI_API_KEY= ושמור, ואז הפעל מחדש.");
  }
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [
      ...(m.images || []).slice(0, 4).map(d => { const mm = /^data:(.+?);base64,(.+)$/.exec(d); return mm && { inlineData: { mimeType: mm[1], data: mm[2] } }; }).filter(Boolean),
      { text: m.content || " " },
    ],
  }));
  const useModel = ALLOWED.has(model) ? model : MODEL;
  // חשיבה מוגבלת = תשובות מהירות. הודעה קצרה (שלום, שאלה קצרה) -> כמעט בלי חשיבה בדגם המהיר.
  // אפשר לקבוע ידנית ב-.env: THINKING=minimal / low / medium / high / off
  const lastMsg = messages[messages.length - 1] || {};
  const short = !(lastMsg.images && lastMsg.images.length) && (lastMsg.content || "").length < 60;
  let level = (process.env.THINKING || (short && useModel.includes("flash") ? "minimal" : "low")).toLowerCase();
  let thinkOn = level !== "off" && level !== "none";
  const callG = m => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents, generationConfig: { maxOutputTokens: 32000, ...(thinkOn ? { thinkingConfig: { thinkingLevel: level } } : {}) } }),
  }).catch(e => ({ ok: false, status: 502, text: async () => e.message }));
  // אסטרטגיה: עומס (503/500/502/504) -> עד 3 ניסיונות באותו דגם עם המתנה. מכסה (429) או דגם לא קיים (404) -> עוברים מיד לדגם ה-3.x השני.
  const other = [...ALLOWED].find(m => m !== useModel && m.startsWith("gemini-3"));
  const models = [useModel, ...(other ? [other] : [])];
  let up = null, err = null;
  outer: for (const m of models) {
    for (let t = 0; t < 3; t++) {
      up = await callG(m);
      if (up.ok) break outer;
      const text = await up.text().catch(() => "");
      if (!err || up.status !== 404) err = { status: up.status, text };
      console.log(`הדגם ${m} החזיר ${up.status}`);
      if (up.status === 400 && thinkOn && /thinking/i.test(text)) { if (level !== "low") level = "low"; else thinkOn = false; t--; continue; }  // הדגם לא תומך בהגדרת חשיבה -> בלעדיה
      if (![500, 502, 503, 504].includes(up.status)) break;   // לא עומס -> לא מנסים שוב את אותו דגם
      await new Promise(r => setTimeout(r, 2000 * (t + 1)));
    }
  }
  if (!up || !up.ok) { res.writeHead(err.status, { "content-type": "text/plain; charset=utf-8" }); return res.end(err.text); }
  res.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache" });
  const send = text => res.write(`data: ${JSON.stringify({ type: "content_block_delta", delta: { text } })}\n\n`);
  const dec = new TextDecoder(); let buf = "", got = false, problem = "";
  const handle = l => {
    if (!l.startsWith("data:")) return;
    try {
      const j = JSON.parse(l.slice(5));
      if (j.error) { problem = j.error.message || "שגיאה מהמודל"; return; }
      if (j.promptFeedback?.blockReason) problem = "הבקשה נחסמה ע\"י Google (" + j.promptFeedback.blockReason + ")";
      const c = j.candidates?.[0];
      const text = (c?.content?.parts || []).filter(p => !p.thought).map(p => p.text || "").join("");
      if (text) { got = true; send(text); }
      else if (c?.finishReason && c.finishReason !== "STOP") problem ||= "המודל עצר: " + c.finishReason;
    } catch {}
  };
  for await (const chunk of up.body) {
    buf += dec.decode(chunk, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop();
    lines.forEach(handle);
  }
  handle(buf.trim());
  // אם לא הגיע שום טקסט – מציגים הסבר במקום שקט
  if (!got) send("שגיאה: " + (problem || "המודל לא החזיר תשובה. נסה לשלוח שוב.").slice(0, 300));
  res.end();
}

async function chatAnthropic({ messages = [], model }, res) {
  if (!AKEY) {
    res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
    return res.end("חסר מפתח של Claude. פתח את .env, הדבק אחרי ANTHROPIC_API_KEY= את המפתח מ-console.anthropic.com, שמור והפעל מחדש.");
  }
  const amodel = process.env.ANTHROPIC_MODEL || (model === "gemini-3.1-pro-preview" ? "claude-opus-5-5" : "claude-sonnet-5-5");
  const msgs = messages.map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: [
      ...(m.images || []).slice(0, 4).map(d => { const mm = /^data:(.+?);base64,(.+)$/.exec(d); return mm && { type: "image", source: { type: "base64", media_type: mm[1], data: mm[2] } }; }).filter(Boolean),
      { type: "text", text: m.content || "(ללא טקסט)" },
    ],
  }));
  const up = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": AKEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: amodel, max_tokens: 32000, stream: true, system: SYSTEM, messages: msgs }),
  }).catch(e => ({ ok: false, status: 502, text: async () => e.message }));
  if (!up.ok) { res.writeHead(up.status, { "content-type": "text/plain; charset=utf-8" }); return res.end(await up.text()); }
  res.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache" });
  for await (const chunk of up.body) res.write(chunk); // הזרם של Claude כבר בפורמט שהדפדפן מכיר
  res.end();
}

const types = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/chat") {
    let body = ""; for await (const c of req) body += c;
    try { return await (PROVIDER === "anthropic" ? chatAnthropic : chatGemini)(JSON.parse(body || "{}"), res); }
    catch (e) { if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain; charset=utf-8" }); return res.end("שגיאת שרת: " + e.message); }
  }
  // הגשת קבצים: מתיקיית public אם קיימת, אחרת מאותה תיקייה (רק קבצים מותרים – לא .env!)
  let name = "index.html";
  try { name = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "index.html"; } catch {}
  const okName = /^[\w.-]+$/.test(name) && [".html", ".png", ".js", ".css", ".ico", ".svg"].includes(path.extname(name)) && name !== "server.js";
  const file = okName && [path.join(dir, "public", name), path.join(dir, name)].find(f => fs.existsSync(f) && fs.statSync(f).isFile());
  if (!file) { res.writeHead(404); return res.end("Not found"); }
  res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`\nMayko GPT רץ ← http://localhost:${PORT}\n` + `ספק: ${PROVIDER} - ` + ((PROVIDER === "anthropic" ? AKEY : KEY) ? "המפתח נטען." : "חסר מפתח ב-.env")));
