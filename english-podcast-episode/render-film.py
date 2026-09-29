#!/usr/bin/env python3
"""Montage v2: renders episode-10 as a documentary-grade film.
- sub-cuts every ~6s from scene pools (landscape normalised, portrait centre-cropped)
- night grading (eq + vignette), burned EN captions, softsubs AR/EN
- narration padded per cue + ambience beds mixed at -20 dB, hard-cut cinema fades
"""
import json, os, subprocess, sys, math

FF = os.environ.get("FF", "/home/user/fftest/node_modules/@ffmpeg-installer/linux-x64/ffmpeg")
FP = os.environ.get("FP", "/home/user/fftest/node_modules/@ffprobe-installer/linux-x64/ffprobe")
ROOT = os.path.dirname(os.path.abspath(__file__))          # english-podcast-episode/
EP   = os.path.join(ROOT, "episode-10")
TMP  = os.path.join(EP, "render2")
os.makedirs(TMP, exist_ok=True)

def sh(cmd):
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0:
        print("FAIL:", " ".join(str(c) for c in cmd[:6]), "…\n", r.stderr.decode()[-500:]); sys.exit(1)
    return r

def dur(p):
    return float(subprocess.check_output([FP, "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", p]))

ep   = json.load(open(os.path.join(EP, "data/episode.json")))
V    = os.path.join(ROOT, "assets/video")
POOL = {   # scene visual -> clip pool (newest doc-grade first)
    "forest":   ["canopy-mist.mp4", "forest-night-fog.mp4", "stars-forest.mp4"],
    "fireflies":["fireflies.mp4", "stars-forest.mp4", "forest-night-fog.mp4"],
    "owl":      ["owl-night.mp4", "forest-night-fog.mp4", "stars-forest.mp4"],
    "river":    ["campfire-night.mp4", "fire-cozy.mp4", "river-night.mp4"],
    "falls":    ["waterfall-night.mp4", "canopy-mist.mp4", "forest-night-fog.mp4"],
}
POOL_RIVER = ["river-night.mp4", "lake-mist.mp4", "moon.mp4", "campfire-night.mp4"]
POOL_CLOSE = ["stars-forest.mp4", "canopy-mist.mp4", "fireflies.mp4"]

cues = []
for s in ep["scenes"]:
    for c in s["cues"]:
        pool = POOL_CLOSE if c["id"] == "t1" else (POOL_RIVER if c["id"] == "r1" else POOL[s["visual"]])
        cues.append(dict(id=c["id"], take=os.path.join(ROOT, c["audio"].replace("../", "")),
                         amb=os.path.join(ROOT, s["amb"].replace("../", "")),
                         pad=c["pad"], pool=[os.path.join(V, p) for p in pool]))

# --- 1) per-cue audio (narration + ambience) --------------------------------
total = 0; plan = []
for cu in cues:
    D = round(dur(cu["take"]) + cu["pad"], 2); total += D
    plan.append((cu, D))

# --- 1b) real captions (the build's SRT had zeroed timestamps) ---------------
def ts(sec, dot=","):
    ms = int(round(sec * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{dot}{ms:03d}"
def write_caps():
    import re
    off, en, ar, idx = 0.0, [], [], 1
    flat = []
    for c, D in plan:
        flat.append((c, off)); off += D                                  # start = offset BEFORE this cue
    for c, st in flat:
        sp = dur(c["take"]); e = st + sp
        # EN: split to one sentence per caption line — documentary style
        sents = [s.strip() for s in re.split(r"(?<=[.!?…])\s+", c["en"]) if s.strip()]
        total_ch = sum(max(1, len(s)) for s in sents); cur = st
        for s in sents:
            w = max(1, len(s)) / total_ch; dur_s = sp * w
            en.append(f"{idx}\n{ts(cur)} --> {ts(cur + dur_s)}\n{s}\n")
            cur += dur_s; idx += 1
    for j, (c, st) in enumerate(flat, 1):                                # AR: own numbering, per-cue block
        ar.append(f"{j}\n{ts(st)} --> {ts(st + dur(c['take']))}\n{c['ar']}\n")
    os.makedirs(os.path.join(EP, "captions"), exist_ok=True)
    open(os.path.join(EP, "captions/episode-en.srt"), "w").write("\n".join(en))
    open(os.path.join(EP, "captions/episode-ar.srt"), "w").write("\n".join(ar))
    vtt = "WEBVTT\n\n" + "\n".join(b.replace(",", ".", 2).replace(" --> ", " --> ") for b in en)
    open(os.path.join(EP, "captions/episode.vtt"), "w").write(vtt)
for cu in cues:
    for s in ep["scenes"]:
        for c in s["cues"]:
            if c["id"] == cu["id"]: cu["en"], cu["ar"] = c["en"], c["ar"]
write_caps(); print("captions rebuilt with real timestamps ✓")

# --- 1c) per-cue audio render -------------------------------------------------
for i, (cu, D) in enumerate(plan):
    aw = os.path.join(TMP, f"a{i}.wav")
    sh([FF, "-y", "-i", cu["take"], "-stream_loop", "-1", "-i", cu["amb"],
        "-filter_complex",
        f"[0:a]aresample=44100,apad,atrim=0:{D},volume=0.93[a0];"
        f"[1:a]aresample=44100,atrim=0:{D},volume=0.09,afade=t=in:st=0:d=0.5,afade=t=out:st={max(0,D-0.7)}:d=0.7[a1];"
        f"[a0][a1]amix=inputs=2:duration=first,alimiter=limit=0.98",
        "-c:a", "pcm_s16le", aw])
    print(f"audio {cu['id']} {D:.1f}s ✓")

alst = os.path.join(TMP, "alist.txt")
open(alst, "w").write("".join(f"file 'a{i}.wav'\n" for i in range(len(plan))))
sh([FF, "-y", "-f", "concat", "-safe", "0", "-i", alst, "-c", "copy", os.path.join(TMP, "full.wav")])

# --- 2) montage cuts ----------------------------------------------------------
vlist, gi = [], 0
for ci, (cu, D) in enumerate(plan):
    k = max(2 if D > 9 else 1, round(D / 6.2)); each = D / k
    for j in range(k):
        t = each + (8.0 if (ci == len(plan)-1 and j == k-1) else 0)   # safety tail on last cut
        src = cu["pool"][(j + ci) % len(cu["pool"])]                  # rotate pool, phase-shifted per cue
        out = os.path.join(TMP, f"v{gi:03d}.mp4"); gi += 1
        sh([FF, "-y", "-stream_loop", "-1", "-i", src, "-t", f"{t:.3f}", "-an",
            "-vf", "fps=25,scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,format=yuv420p",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", out])
        vlist.append(out)
    print(f"montage {cu['id']}: {k} cuts ✓")
vlst = os.path.join(TMP, "vlist.txt")
open(vlst, "w").write("".join(f"file '{os.path.basename(x)}'\n" for x in vlist))
sh([FF, "-y", "-f", "concat", "-safe", "0", "-i", vlst, "-c", "copy", os.path.join(TMP, "montage.mp4")])

# --- 3) grade + burn EN captions + mux ---------------------------------------
en = os.path.join(EP, "captions/episode-en.srt"); ar = os.path.join(EP, "captions/episode-ar.srt")
style = "FontName=DejaVu Sans,FontSize=13,Outline=1,Shadow=0,PrimaryColour=&H00ECECEC,OutlineColour=&H80000000,MarginV=26"
subf = str(en).replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
sh([FF, "-y", "-i", os.path.join(TMP, "montage.mp4"), "-i", os.path.join(TMP, "full.wav"),
    "-i", ar, "-i", en,
    "-filter_complex",
    f"[0:v]eq=saturation=0.92:brightness=-0.01:contrast=1.03:gamma=1.05:gamma_b=1.07,vignette=PI/5,"
    f"subtitles='{subf}':force_style='{style}'[v]",
    "-map", "[v]", "-map", "1:a", "-map", "2", "-map", "3",
    "-metadata:s:s:0", "language=ara", "-metadata:s:s:1", "language=eng",
    "-c:v", "libx264", "-preset", "medium", "-crf", "27", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "140k", "-c:s", "mov_text",
    "-t", f"{total:.2f}", "-movflags", "+faststart",
    os.path.join(EP, "film-720p.mp4")])
print(f"FILM v2 DONE — {int(total//60)}:{int(total%60):02d} · {os.path.getsize(os.path.join(EP,'film-720p.mp4'))/1e6:.1f} MB · {gi} cuts")
