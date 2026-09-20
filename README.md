# YOUTYOB-LANGO

Production workspace for **English Step by Step** — Arabic-first English lessons
built as data-driven HTML video, not as a still image with one voice.

Everything lives in [`english-podcast-episode/`](english-podcast-episode/) (internally: **Lumen Studio**).

## Watch Episode 01

| Where | Link |
| --- | --- |
| Live on GitHub Pages | <https://dhiyaddineb-hue.github.io/YOUTYOB-LANGO/> |
| Episode player | [`english-podcast-episode/episode-01/`](english-podcast-episode/episode-01/index.html) |
| Simple audio + slides | [`english-podcast-episode/watch.html`](english-podcast-episode/watch.html) |
| Full audio mix (MP3) | [`english-podcast-episode/output/episode-01.mp3`](english-podcast-episode/output/episode-01.mp3) |

`english-podcast-episode/latest.json` points the preview pages at the current
episode. Update that one file when the next episode ships and every preview
follows it.

## Run it locally

```bash
cd english-podcast-episode
npm run studio     # static server on 0.0.0.0:4173, no dependencies
```

Open `/studio/` for the creation console, or `/episode-01/` for the player.

## The pipeline in one line

`episode-01/data/episode.json` is the **only** hand-edited content file:

```bash
npm run build      # regenerate film.json + SRT (en/ar) + VTT from episode.json
npm run check      # fail if any derived file drifted, plus AGENTS.md rule checks
```

`film.json` and `episode-01/captions/*` are generated. Do not edit them by hand.

## Current state — honestly

Episode 01 is **complete as an authored timeline and now fully voiced** (9 scenes,
3 distinct voices, bilingual captions, drills, quiz, thumbnail lab, YouTube copy).
Every shot resolves to a real, distinct take — no silent shots, no browser-speech
fallbacks, no section collapsed onto a single take, and the slow and natural
dialogue passes are two genuinely different performances (the natural pass is
connected speech, ~11% brisker), not one file reused.

The recorded takes total ~5 minutes against the 12:25 storyboard clock. That is a
**pacing gap, not missing audio**: the script is concise and the HTML player runs
takes back-to-back, while the storyboard budget allows longer holds, think-time
and a music bed that a HyperFrames render would add. Run `npm run check` inside
`english-podcast-episode/` for the live figure rather than trusting a number
pasted here. No H.264 master has been rendered; the working video is the HTML
player. See the limits list in
[`english-podcast-episode/README.md`](english-podcast-episode/README.md).

> **Note on hosting:** GitHub Pages for this repository currently publishes the
> branch `arena/01a01cb0-youtyob-lango` (an earlier working branch), not `main`.
> Re-point it to the default branch once this work is merged, or the live site
> will keep serving the old copy.
