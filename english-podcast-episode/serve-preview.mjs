// Preview server for the podcast workspace — committed to the repo so it
// survives sandbox resets. Usage: node english-podcast-episode/serve-preview.mjs
// Serves this directory on 0.0.0.0:4173 with HTTP range support (video scrubbing).
import http from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = dirname(fileURLToPath(import.meta.url));
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.mp4':'video/mp4', '.mp3':'audio/mpeg', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.vtt':'text/vtt; charset=utf-8', '.srt':'application/x-subrip', '.svg':'image/svg+xml', '.pdf':'application/pdf' };
http.createServer((req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404); res.end('nf'); return; }
    const st = statSync(file);
    const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range); let s = m[1] ? +m[1] : 0; let e = m[2] ? +m[2] : st.size - 1;
      if (isNaN(s) || s >= st.size) { res.writeHead(416, {'Content-Range': `bytes */${st.size}`}); res.end(); return; }
      e = Math.min(e, st.size - 1);
      res.writeHead(206, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${s}-${e}/${st.size}`, 'Content-Length': e - s + 1, 'Cache-Control': 'no-cache' });
      createReadStream(file, { start: s, end: e }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': st.size, 'Cache-Control': 'no-cache' });
      createReadStream(file).pipe(res);
    }
  } catch (e) { res.writeHead(500); res.end(String(e)); }
}).listen(4173, '0.0.0.0', () => console.log('serve4173 ready'));
