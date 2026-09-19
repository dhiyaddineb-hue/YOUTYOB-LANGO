# Lumen Studio

Professional workspace for **English Step by Step** — educational podcast videos built as HTML, not a still image with one voice.

This folder is the entire production room. Space is limited, so the workspace stays lean: source, studio, data, compressed plates. Final long MP4s stay in `output/` and are gitignored.

## What you can produce

| Mode | What it is |
| --- | --- |
| Solo host | One Arabic presenter, cards, drills |
| Duo podcast | Host + one English speaker |
| Trio classroom | Host + Maya + Omar — the flagship format |
| Animated story | Scene-driven narrative with character plates |
| Explainer | Faceless educational film: diagrams, PNG cards, kinetic type |

Plus: realistic / illustrated / cinematic character styles, bilingual captions with keyword color, PNG explainer cards, film-clip desk (clip.cafe · getyarn · playphrase), thumbnail lab with CTR prediction and history.

## GitHub preview

After each push, GitHub Pages republishes this folder:

**https://dhiyaddineb-hue.github.io/YOUTYOB-LANGO/**

`latest.json` points at the current episode. Change that file when you produce the next video and the preview follows it.

## Quick start

```bash
npm install        # optional — there are no dependencies
npm run studio     # static server on 0.0.0.0:4173
```

Then open `/studio/`. Episode 01 is already loaded as the working project.

Two more commands keep the data honest:

```bash
npm run build      # film.json + SRT (en/ar) + VTT, regenerated from episode.json
npm run check      # fail on drift, plus the structural rules from AGENTS.md
```

`episode-01/data/episode.json` is the only hand-edited content file. `film.json`
and everything under `episode-01/captions/` are generated — see `tools/derive.mjs`.

## Workspace map

```
english-podcast-episode/
  BRIEF.md                 Episode contract
  SCRIPT.md                Full bilingual script
  STORYBOARD.md            Scene-by-scene picture
  AGENTS.md                How an agent produces the next episode
  studio/                  Creation console
  episode-01/              First complete episode
  tools/                   build + check: derive film.json and captions
  data/                    Formats, cast, voices, clips, CTR history
  assets/                  Characters, scenes, plates, audio
  captions/                Shared caption tools
  render/                  HyperFrames / ffmpeg config
  output/                  Audio mix + preview GIF (MP4 masters not committed)
  docs/                    Open-source map + thumbnail science
```

## Episode 01

- Series: English Step by Step
- Title: Introduce Yourself with Confidence
- Goal: name, country, job, free time, polite close
- Cast: Sami (AR host), Maya (EN), Omar (EN)
- Ratio: 16:9 · target 1920×1080 · 30fps · H.264/AAC

Play it inside the studio or open `episode-01/index.html`.

## Render to MP4

The studio is the authoring layer. For a publishable file:

```bash
# after Node 22+, Chromium, ffmpeg
npx hyperframes lint
npx hyperframes preview
npx hyperframes render episode-01/index.html
```

If HyperFrames is not installed, export the HyperFrames HTML from the studio Export desk and render later. Do not fake a finished video with one freeze-frame.

## Open-source engines this workspace is built to use

- [HyperFrames](https://github.com/heygen-com/hyperframes) — HTML → deterministic MP4
- [nexu-io/html-video](https://github.com/nexu-io/html-video) — storyboard / content-graph layer
- Caption, audio-duck, and safe-zone rules from HyperFrames skills

See `docs/OPEN-SOURCE.md`.

## Honest limits of this checkout

`npm run check` prints the live numbers (recorded audio vs the 12:25 storyboard
target, and how many shots have a take), so nothing here hardcodes a total that
would go stale the moment another section is recorded.

- **Every shot resolves to a real take — nothing falls back to browser speech.**
  The title, host framing, slow dialogue, explanation, drill (with real repeat
  gaps) and quiz (with think time) all play per-cue/per-item audio in distinct
  voices. Two gaps remain before this is a full 12-minute lesson:
  - **Vocabulary is the last collapsed section** — its eight cards still cycle
    silently under one intro take. Record each word + example, then switch
    `s6-vocab` from `collapse` to `expand` (the deriver and player already
    support it; the quiz and drill use the same path).
  - **The natural-speed dialogue reuses the slow-dialogue takes.** It needs its
    own conversational-pace pass to earn the "natural speed" label in the script.
- The working video is the **HTML player** (scenes, three voices, captions, drills).
  A 12-minute H.264 master is not sitting in `output/` because HyperFrames +
  Chromium capture was not run here. Export the composition from the studio, then
  `npx hyperframes render`.
- clip.cafe / Yarn / Playphrase are search desks only. No copyrighted film files are stored.
- Extra cinematic character plates can be generated later; realistic + illustrated are in the vault.

## Rule that is not negotiable

A still image plus one voice is not a video. Success means multiple voices, timed bilingual captions, changing scenes, and a real export path.
