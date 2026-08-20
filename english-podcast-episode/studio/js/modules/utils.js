export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function fmt(t) {
  t = Math.max(0, t || 0);
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const cs = Math.floor((t % 1) * 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${cs}`;
}

export function srtStamp(t) {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const ms = Math.floor((t % 1) * 1000);
  const pad = (n, z = 2) => String(n).padStart(z, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

export async function loadJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

export function download(name, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function paintKeywords(text, lexicon) {
  if (!text) return "";
  return text.split(/(\s+)/).map((tok) => {
    if (/^\s+$/.test(tok)) return tok;
    const clean = tok.toLowerCase().replace(/[^a-z'’]/g, "");
    const cls = lexicon.words[clean];
    if (!cls) return escapeHtml(tok);
    return `<span class="kw-${cls}">${escapeHtml(tok)}</span>`;
  }).join("");
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function encodeQuery(q) {
  return encodeURIComponent(q).replace(/%20/g, "+");
}
