#!/usr/bin/env python3
"""Generic pro montage renderer: python3 render-episode.py episode-09
- ~6s sub-cuts from per-cue pools (portrait centre-cropped to 16:9)
- cinema grade (eq + vignette), per-scene ambience beds, burned EN sentence captions + AR/EN softsubs
"""
import json, os, subprocess, sys, re

FF = os.environ.get("FF", "/home/user/fftest/node_modules/@ffmpeg-installer/linux-x64/ffmpeg")
FP = os.environ.get("FP", "/home/user/fftest/node_modules/@ffprobe-installer/linux-x64/ffprobe")
ROOT = os.path.dirname(os.path.abspath(__file__))
SLUG = sys.argv[1] if len(sys.argv) > 1 else "episode-10"
EP   = os.path.join(ROOT, SLUG)
TMP  = os.path.join(EP, "render")
os.makedirs(TMP, exist_ok=True)
V = os.path.join(ROOT, "assets/video")
def vx(*names): return [os.path.join(V, n + ".mp4") for n in names]

# per-episode cue pools (keyed by cue id or id prefix)
POOLS = {
 "episode-10": {
   "c1": vx("canopy-mist","forest-night-fog","stars-forest"),
   "f1": vx("fireflies","stars-forest","forest-night-fog"), "f2": vx("fireflies","forest-night-fog","stars-forest"),
   "o1": vx("owl-night","forest-night-fog","stars-forest"), "o2": vx("owl-night","stars-forest","forest-night-fog"),
   "m1": vx("campfire-night","fire-cozy","river-night"),
   "r1": vx("river-night","lake-mist","moon","campfire-night"),
   "s1": vx("waterfall-night","canopy-mist","forest-night-fog"),
   "t1": vx("stars-forest","canopy-mist","fireflies"),
 },
 "episode-09": {
   "c1": vx("aurora-yt","arctic-land","aurora-wide"),
   "l1": vx("wolf-close","wolf-walk","wolf-doc"), "l2": vx("wolf-walk","wolf-doc","arctic-land"),
   "k1": vx("herd","herd-close","arctic-arc"), "k2": vx("herd","caribou-run","herd-close"),
   "f1": vx("snow-drift","snow","arctic-land"),
   "e1": vx("eagle","eagle-fly","eagle-doc"), "e2": vx("eagle-fly","raven-snow","eagle-doc"),
   "t1": vx("aurora-yt","aurora-wide","snow-drift"),
 },
 "episode-08": {
   "arctic":   vx("arctic-land","snow-drift","arctic-arc","snow"),
   "sahara":   vx("desert-night","desert-camel","moon"),
   "ocean":    vx("ocean-rays","whale-doc","whale"),
 },
 "episode-07": {
   "cafe":    vx("fire-cozy","fire","rain-window","cafe-coffee"),
   "morning": vx("lake-mist","street-fog-morning","cafe-coffee","canopy-mist"),
 },
 "episode-11": {
   "c1": vx("desert-night","stars-forest","moon"),
   "k1": vx("desert-camel","campfire-night","desert-night"), "k2": vx("desert-camel","desert-night","campfire-night"),
   "z1": vx("fennec","desert-night","moon"), "z2": vx("fennec","moon","stars-forest"),
   "n1": vx("campfire-night","fire-cozy","moon"),
   "o1": vx("fire-cozy","campfire-night","moon"),
   "d1": vx("desert-sunrise","moon","desert-camel","dunes-wind"),
   "t1": vx("stars-forest","desert-night","moon"),
 },
 "episode-12": {
   "c1": vx("moon-sea","moon","lake-mist"),
   "w1": vx("whale-doc","whale","ocean-rays"), "w2": vx("whale-doc","ocean-rays","whale"),
   "g1": vx("biolum-waves","jellyfish","moon-sea"), "g2": vx("jellyfish","biolum-waves","ocean-rays"),
   "n1": vx("moon-sea","moon","lake-mist"),
   "o1": vx("turtle-reef","jellyfish","ocean-rays"),
   "d1": vx("ocean-rays","turtle-reef","whale-doc"),
   "t1": vx("moon-sea","whale-doc","moon"),
 },
}

ep = json.load(open(os.path.join(EP, "data/episode.json")))
def sh(cmd):
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0:
        print("FAIL:", " ".join(str(c) for c in cmd[:6]), "…\n", r.stderr.decode()[-400:]); sys.exit(1)
    return r
def dur(p):
    return float(subprocess.check_output([FP, "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", p]))

def pool_for(s, cid):
    pmap = POOLS.get(SLUG, {})
    if cid in pmap: return pmap[cid]
    vis = s.get("visual", "")
    for k1, v in pmap.items():
        if cid.startswith(k1): return v
    if vis in pmap: return pmap[vis]
    return list(pmap.values())[0] if pmap else vx("wildlife-arc", "moon")

cues = []
AMB_FALLBACK = {"episode-09": "assets/audio/amb/wind-arctic.wav"}
for s in ep["scenes"]:
    for c in s["cues"]:
        amb = os.path.join(ROOT, s["amb"].replace("../", "")) if s.get("amb") else None
        if amb and not os.path.exists(amb):                                   # broken amb e.g. "amb/undefined"
            fb = AMB_FALLBACK.get(SLUG); amb = os.path.join(ROOT, fb) if fb and os.path.exists(os.path.join(ROOT, fb)) else None
        pl = [p for p in pool_for(s, c["id"]) if os.path.exists(p)]
        if not pl: pl = [os.path.join(V, "moon.mp4")]
        cues.append(dict(id=c["id"], take=os.path.join(ROOT, c["audio"].replace("../", "")),
                         amb=amb, pad=c["pad"], en=c["en"], ar=c["ar"], pool=pl))

# --- 1) plan + captions -------------------------------------------------------
PAD_MAX = 30.0          # sleep episodes carry multi-HOUR ambient pads (player design); clamp for the film cut
total = 0; plan = []
for cu in cues:
    D = round(dur(cu["take"]) + min(float(cu["pad"]), PAD_MAX), 2); total += D
    plan.append((cu, D))

def ts(sec, dot=","):
    ms = int(round(sec * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{dot}{ms:03d}"
def write_caps():
    off, en, ar, idx = 0.0, [], [], 1
    flat = []
    for c, D in plan: flat.append((c, off)); off += D
    for c, st in flat:
        sp = dur(c["take"])
        sents = [s.strip() for s in re.split(r"(?<=[.!?…])\s+", c["en"]) if s.strip()]
        total_ch = sum(max(1, len(s)) for s in sents); cur = st
        for s in sents:
            w = max(1, len(s)) / total_ch; dur_s = sp * w
            en.append(f"{idx}\n{ts(cur)} --> {ts(cur + dur_s)}\n{s}\n"); cur += dur_s; idx += 1
    for j, (c, st) in enumerate(flat, 1):
        ar.append(f"{j}\n{ts(st)} --> {ts(st + dur(c['take']))}\n{c['ar']}\n")
    os.makedirs(os.path.join(EP, "captions"), exist_ok=True)
    open(os.path.join(EP, "captions/episode-en.srt"), "w").write("\n".join(en))
    open(os.path.join(EP, "captions/episode-ar.srt"), "w").write("\n".join(ar))
    open(os.path.join(EP, "captions/episode-en.vtt"), "w").write("WEBVTT\n\n" + "\n".join(b.replace(",", ".", 2) for b in en))
    open(os.path.join(EP, "captions/episode-ar.vtt"), "w").write("WEBVTT\n\n" + "\n".join(b.replace(",", ".", 2) for b in ar))
    open(os.path.join(EP, "captions/episode.vtt"), "w").write("WEBVTT\n\n" + "\n".join(b.replace(",", ".", 2) for b in en))
write_caps(); print("captions ✓")

# --- 2) per-cue audio ---------------------------------------------------------
for i, (cu, D) in enumerate(plan):
    aw = os.path.join(TMP, f"a{i}.wav")
    if cu["amb"]:
        sh([FF, "-y", "-i", cu["take"], "-stream_loop", "-1", "-i", cu["amb"], "-filter_complex",
            f"[0:a]aresample=44100,apad,atrim=0:{D},volume=0.93[a0];"
            f"[1:a]aresample=44100,atrim=0:{D},volume=0.09,afade=t=in:st=0:d=0.5,afade=t=out:st={max(0,D-0.7)}:d=0.7[a1];"
            f"[a0][a1]amix=inputs=2:duration=first,alimiter=limit=0.98", "-c:a", "pcm_s16le", aw])
    else:
        sh([FF, "-y", "-i", cu["take"], "-af", f"aresample=44100,apad,atrim=0:{D},volume=0.95", "-c:a", "pcm_s16le", aw])
    print(f"audio {cu['id']} {D:.1f}s ✓")
alst = os.path.join(TMP, "alist.txt")
open(alst, "w").write("".join(f"file 'a{i}.wav'\n" for i in range(len(plan))))
sh([FF, "-y", "-f", "concat", "-safe", "0", "-i", alst, "-c", "copy", os.path.join(TMP, "full.wav")])

# --- 3) montage ---------------------------------------------------------------
vlist, gi = [], 0
for ci, (cu, D) in enumerate(plan):
    k = max(2 if D > 9 else 1, round(D / 6.2)); each = D / k
    for j in range(k):
        t = each + (8.0 if (ci == len(plan)-1 and j == k-1) else 0)
        src = cu["pool"][(j + ci) % len(cu["pool"])]
        out = os.path.join(TMP, f"v{gi:03d}.mp4"); gi += 1
        sh([FF, "-y", "-stream_loop", "-1", "-i", src, "-t", f"{t:.3f}", "-an",
            "-vf", "fps=25,scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,format=yuv420p",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", out])
        vlist.append(out)
    print(f"montage {cu['id']}: {k} cuts ✓")
vlst = os.path.join(TMP, "vlist.txt")
open(vlst, "w").write("".join(f"file '{os.path.basename(x)}'\n" for x in vlist))
sh([FF, "-y", "-f", "concat", "-safe", "0", "-i", vlst, "-c", "copy", os.path.join(TMP, "montage.mp4")])

# --- 4) grade + captions + mux ------------------------------------------------
BURN = False   # clean cinema frame — captions live as CC tracks, never burned in
en = os.path.join(EP, "captions/episode-en.srt"); ar = os.path.join(EP, "captions/episode-ar.srt")
style = "FontName=DejaVu Sans,FontSize=13,Outline=1,Shadow=0,PrimaryColour=&H00ECECEC,OutlineColour=&H80000000,MarginV=26"
subf = str(en).replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
vgraph = (f"[0:v]eq=saturation=0.92:brightness=-0.01:contrast=1.03:gamma=1.05:gamma_b=1.07,vignette=PI/5,"
          f"subtitles='{subf}':force_style='{style}'[v]") if BURN else "[0:v]eq=saturation=0.92:brightness=-0.01:contrast=1.03:gamma=1.05:gamma_b=1.07,vignette=PI/5[v]"
sh([FF, "-y", "-i", os.path.join(TMP, "montage.mp4"), "-i", os.path.join(TMP, "full.wav"), "-i", ar, "-i", en,
    "-filter_complex", vgraph,
    "-map", "[v]", "-map", "1:a", "-map", "2", "-map", "3",
    "-metadata:s:s:0", "language=ara", "-metadata:s:s:1", "language=eng",
    "-c:v", "libx264", "-preset", "medium", "-crf", "27", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "140k", "-c:s", "mov_text",
    "-t", f"{total:.2f}", "-movflags", "+faststart", os.path.join(EP, "film-720p.mp4")])
print(f"{SLUG} FILM DONE — {int(total//60)}:{int(total%60):02d} · {os.path.getsize(os.path.join(EP,'film-720p.mp4'))/1e6:.1f} MB · {gi} cuts")
