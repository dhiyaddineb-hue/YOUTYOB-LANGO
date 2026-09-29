# Universal media fetcher — runs inside GitHub Actions (see .github/workflows/fetchall.yml).
# Supports: direct url · pexels video/photo (API key env) · wikicommons audio · youtube/youtu.be url · ytsearch.
# Editable freely (no workflow edit needed) — the workflow only executes this file.
import urllib.request, urllib.parse, json, os, subprocess, sys, time

# self-logging into the repo (workflow adds assets/ to its commit -> log ships automatically)
os.makedirs("english-podcast-episode/assets", exist_ok=True)
_logf = open("english-podcast-episode/assets/fetch-log.txt", "w", buffering=1)
class _Tee:
    def write(self, s):
        sys.__stdout__.write(s); _logf.write(s)
    def flush(self):
        sys.__stdout__.flush(); _logf.flush()
sys.stdout = _Tee()
import time as _t
print("FETCH LOG", _t.strftime("%Y-%m-%d %H:%M:%S"))

ROOT = "english-podcast-episode"
QP = os.path.join(ROOT, "media-queue.json")
DIRS = {"video": "assets/video", "image": "assets/img-auto", "audio": "assets/audio/auto", "yt": "assets/video"}
for d in DIRS.values():
    os.makedirs(os.path.join(ROOT, d), exist_ok=True)
q = json.load(open(QP))
KEY = os.environ.get("KEY", "")
UA = {"User-Agent": "ArenaMediaBot/1.0"}
_cookies_env = os.environ.get("YT_COOKIES", "")
COOKIES = os.path.join(ROOT, "assets", ".yt-cookies")
if _cookies_env:
    with open(COOKIES, "w") as f:
        f.write(_cookies_env)
    os.chmod(COOKIES, 0o600)

def get(url, headers=None, as_json=False, timeout=180):
    h = dict(UA); h.update(headers or {})
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r) if as_json else r.read()

def download(url, dest):
    data = get(url)
    if len(data) > 98 * 1048576: return "too-big(>98MB)"
    with open(dest, "wb") as f: f.write(data)
    if os.path.getsize(dest) < 1000: os.remove(dest); return "empty"
    return None

def pexels_video(query, orientation, min_d, max_d, max_w):
    params = {"query": query, "per_page": 15}
    if orientation: params["orientation"] = orientation
    data = get("https://api.pexels.com/videos/search?" + urllib.parse.urlencode(params), {"Authorization": KEY}, True)
    for v in data.get("videos", []):
        d = v.get("duration", 0)
        if not (min_d <= d <= max_d): continue
        fs = sorted((f for f in v.get("video_files", []) if f.get("width")), key=lambda f: f["width"])
        pick = None
        for f in fs:
            if f["width"] <= max_w: pick = f
        if pick is None and fs: pick = fs[0]
        if pick: return pick["link"], "pexels-video-%s by %s" % (v.get("id"), v.get("user", {}).get("name", "?"))
    return None, "no-match"

def pexels_image(query, orientation):
    params = {"query": query, "per_page": 8}
    if orientation: params["orientation"] = orientation
    data = get("https://api.pexels.com/v1/search?" + urllib.parse.urlencode(params), {"Authorization": KEY}, True)
    for p in data.get("photos", []):
        src = p.get("src", {})
        return src.get("large2x") or src.get("original"), "pexels-photo-%s by %s" % (p.get("id"), p.get("photographer", "?"))
    return None, "no-match"

def wikimedia_audio(query):
    params = {"action": "query", "generator": "search", "gsrsearch": query, "gsrlimit": 10, "gsrnamespace": 6,
              "prop": "imageinfo", "iiprop": "url", "format": "json"}
    data = get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params), None, True)
    for p in data.get("query", {}).get("pages", {}).values():
        title = p.get("title", "").lower()
        for ii in p.get("imageinfo", []):
            u = ii.get("url", "")
            if u.lower().endswith((".ogg", ".mp3", ".wav")) and ("sound" in title or "audio" in title or len(title) < 60):
                return u, "wikimedia " + p.get("title", "?")
    return None, "no-match"

COBALT = [
    "https://cobalt-api.kwiatekmiki.com",
    "https://cobalt-backend.canine.tools",
    "https://capi.oak.li",
    "https://cobalt-api.meowing.de",
]

def cobalt_extract(yt_url, dest):
    for base in COBALT:
        try:
            payload = json.dumps({"url": yt_url, "videoQuality": "1080"}).encode()
            req = urllib.request.Request(base + "/", data=payload,
                headers={"Accept": "application/json", "Content-Type": "application/json",
                         "User-Agent": "ArenaMediaBot/1.0"})
            with urllib.request.urlopen(req, timeout=45) as r:
                data = json.load(r)
            u = data.get("url")
            if data.get("status") in ("tunnel", "redirect", "stream") and u:
                err = download(u, dest)
                if not err: return "cobalt@" + base
        except Exception:
            continue
    return None

def archive_video(query, dest):
    # Internet Archive: public-domain/CC nature footage, no key, datacenter-friendly
    qs = urllib.parse.urlencode({
        "q": f"({query}) AND mediatype:movies",
        "fl[]": ["identifier", "downloads"], "rows": 25, "output": "json", "sort[]": "downloads desc"}, doseq=True)
    data = get("https://archive.org/advancedsearch.php?" + qs, None, True)
    docs = sorted(data.get("response", {}).get("docs", []), key=lambda d: -d.get("downloads", 0))
    for doc in docs[:12]:
        ident = doc.get("identifier")
        if not ident: continue
        try:
            meta = get(f"https://archive.org/metadata/{ident}", None, True, timeout=40)
        except Exception: continue
        for f in meta.get("files", []):
            name = f.get("name", "")
            if not name.lower().endswith(".mp4"): continue
            size = int(f.get("size") or 0)
            if size and size > 80 * 1048576: continue
            if size and size < 300000: continue
            url = f"https://archive.org/download/{ident}/" + urllib.parse.quote(name)
            err = download(url, dest)
            if not err:
                return None, f"archive.org/{ident} ({meta.get('metadata',{}).get('licenseurl','?')[-40:]})"
    return None, "no-match"

def commons_video(query, dest):
    # Wikimedia Commons nature clips (webm/ogv) — CC, no key
    params = {"action": "query", "generator": "search", "gsrsearch": query + " filemime:video/webm", "gsrlimit": 10,
              "gsrnamespace": 6, "prop": "imageinfo", "iiprop": "url|size", "format": "json"}
    data = get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params), None, True)
    for p in data.get("query", {}).get("pages", {}).values():
        for ii in p.get("imageinfo", []):
            u = ii.get("url", "")
            if not u.lower().endswith((".webm", ".ogv")): continue
            err = download(u, dest)
            if not err: return None, "wikimedia " + p.get("title", "?")
    return None, "no-match"

def yt_download(target, dest, cc_only):
    cobalt_hit = None
    args = [sys.executable, "-m", "yt_dlp", target,
            "-f", "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]/b[height<=1080]",
            "--merge-output-format", "mp4", "--max-filesize", "80m",
            "--no-playlist", "--restrict-filenames", "-N", "4",
            "--extractor-args", "youtube:player_client=android,web_embedded,tv_embedded",
            "--print", "after_move:filepath", "-o", dest]
    if cc_only:
        args += ["--match-filter", "license='Creative Commons Attribution license (reuse allowed)'"]
    if os.path.exists(COOKIES):
        args += ["--cookies", COOKIES]
    r = subprocess.run(args, capture_output=True, text=True, timeout=600)
    if not os.path.exists(dest) or os.path.getsize(dest) < 1000:
        tail = (r.stderr or r.stdout or "").strip().splitlines()
        if "youtube.com" in target or "youtu.be" in target:
            hit = cobalt_extract(target, dest)
            if hit:
                print("cobalt-recovered:", hit); return None
        return "yt-fail: " + (tail[-1][:90] if tail else str(r.returncode))
    return None

for it in q.get("items", []):
    slug = it["slug"]; typ = it.get("type", "video")
    ext = it.get("ext") or (".mp4" if typ in ("video", "yt") else {".img": ".jpg"}.get("." , ".jpg") if typ == "image" else ".ogg")
    dest = os.path.join(ROOT, DIRS[typ], slug + ext)
    if it.get("skip"):
        continue
    if it.get("status") == "done" and os.path.exists(dest) and not it.get("force"):
        continue
    try:
        url = it.get("url", "")
        if typ == "yt" or "youtube.com" in url or "youtu.be" in url:
            target = url if url else "ytsearch1:" + it["query"]
            err = yt_download(target, dest, it.get("cc_only", not bool(url)))
            if err: it["status"] = "failed:" + err; print("FAIL", slug, err); continue
            it["status"] = "done"; it["meta"] = "youtube " + (url if url else it["query"])
            print("OK", slug, "yt %.2fMB" % (os.path.getsize(dest) / 1048576.0))
        else:
            if url:
                link, meta = url, "direct"
            elif typ == "video" and it.get("provider") == "archive":
                link, meta = archive_video(it["query"], dest)
                if link:
                    it["status"] = "done"; it["meta"] = meta
                    print("OK", slug, "archive %.2fMB" % (os.path.getsize(dest)/1048576.0), meta)
                    continue
            elif typ == "video" and it.get("provider") == "commons":
                link, meta = commons_video(it["query"], dest)
                if link:
                    it["status"] = "done"; it["meta"] = meta
                    print("OK", slug, "commons %.2fMB" % (os.path.getsize(dest)/1048576.0), meta)
                    continue
            elif typ == "video":
                link, meta = pexels_video(it["query"], it.get("orientation"), it.get("min_d", 0), it.get("max_d", 999), it.get("max_w", 2560))
            elif typ == "image":
                link, meta = pexels_image(it["query"], it.get("orientation"))
            else:
                link, meta = wikimedia_audio(it["query"])
            if not link and typ == "video":
                link, meta = pexels_video(it["query"], it.get("orientation"), 0, 999, it.get("max_w", 1920))
                if link: meta = "fallback-" + meta
            if not link:
                it["status"] = "failed:" + meta; print("MISS", slug, meta); continue
            err = download(link, dest)
            if err: it["status"] = "failed:" + err; print("FAIL", slug, err); continue
            it["status"] = "done"; it["source"] = link; it["meta"] = meta
            print("OK", slug, typ, "%.2fMB" % (os.path.getsize(dest) / 1048576.0), meta)
        time.sleep(1)
    except Exception as e:
        it["status"] = "failed:" + str(e)[:80]; print("ERR", slug, e)

json.dump(q, open(QP, "w"), ensure_ascii=False, indent=2)
print("queue done")
