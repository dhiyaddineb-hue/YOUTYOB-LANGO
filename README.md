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

Episode 01 is **complete as an authored timeline** (9 scenes, 3 voices, bilingual
captions, drills, quiz, thumbnail lab, YouTube copy). Recorded audio is still
**shorter than the 12:25 storyboard target** — run `npm run check` inside
`english-podcast-episode/` for the live figure rather than trusting a number
pasted here (that is exactly the kind of copy that goes stale).

What is real per-cue audio today: the title, host framing, both dialogue passes,
the explanation, the drill (with real repeat gaps) and the quiz. The **vocabulary
section is the last one still collapsed onto a single take** — its eight cards
cycle silently until each word is recorded. No H.264 master has been rendered;
the working video is the HTML player. See the limits list in
[`english-podcast-episode/README.md`](english-podcast-episode/README.md).

> **Note on hosting:** GitHub Pages for this repository currently publishes the
> branch `arena/01a01cb0-youtyob-lango` (an earlier working branch), not `main`.
> Re-point it to the default branch once this work is merged, or the live site
> will keep serving the old copy.
