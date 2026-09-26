# Agent operating manual — Lumen Studio

You are producing inside `english-podcast-episode/` only. Do not scatter files around the repo root.

## Before you write pixels

1. Read `BRIEF.md`. If a missing fact blocks production, ask only for that fact.
2. Write or update `SCRIPT.md` and `STORYBOARD.md`.
3. Encode the episode as `episode-XX/data/episode.json`. That file is the source of truth.
4. Run `npm run build`. It regenerates `film.json` and the SRT/VTT captions.
5. Then build HTML, thumbnails, PNG cards, and audio.
6. Run `npm run check` before committing. It fails on drift and on the rules below.

## Derived files — never hand-edit

| Generated from `episode-XX/data/episode.json` | Consumed by |
| --- | --- |
| `episode-XX/film.json` | the public player `episode-XX/index.html` |
| `episode-XX/captions/episode-en.srt` | YouTube English captions |
| `episode-XX/captions/episode-ar.srt` | YouTube Arabic captions |
| `episode-XX/captions/episode.vtt` | bilingual in-player captions |

`npm run build` writes them, `npm run check` proves they match. The logic is in
`tools/derive.mjs`, which imports the studio's own `allCues`/`toSrt`/`toVtt` so
the Export desk and the CLI cannot disagree.

A scene plays **one shot per cue** by default. Give the scene a `film` block to
collapse it into a single shot whose one audio take runs while the player cycles
its cards or items — that is how explain / vocab / drill / quiz work today:

```json
"film": {
  "collapse": "items",
  "shot": "vocab",
  "from": "cards",        // "cards" | "items" | "cues"
  "limit": 5,             // optional cap, the player divides the take evenly
  "captionFrom": "cue",   // caption the shot from its first cue
  "pad": 400              // ms of hold after the shot; cue-level "pad" wins
}
```

Pacing (`pad`) belongs on the scene or the cue in `episode.json`, not in
`film.json`. If a cue has no `audio`, the player falls back to browser speech —
that is a gap to fill, not a feature to ship.

## Defaults when the user is silent

- American English, clear and slow enough for A1–A2
- Arabic explanation in simplified fusḥā
- 10–15 minutes of *real* teaching, never padded silence
- 16:9 · 1920×1080 if the renderer allows, else 1280×720
- 30fps, or 25fps if capture is heavy
- Three voices: Arabic host, English woman, English man
- Warm cream / teal / mustard / charcoal
- Captions: English on top, Arabic below, speaker color, keyword color

## Episode skeleton

1. Cold open 15–30s
2. Host framing in Arabic
3. Slow dialogue
4. Phrase-by-phrase explanation
5. Natural-speed dialogue
6. Vocabulary cards (5–10)
7. Repeat-after-me with a real gap and a “Your turn” cue
8. Short quiz with think-time
9. Close + next-episode hook

## Audio

Separate file per speaker. Never one voice for every role. Music only under titles, ducked under speech. No copyrighted beds unless the user supplies a license.

## Captions

Every spoken window has a caption. Time from audio, not from a word-count guess if audio exists. Max 2–3 lines. RTL Arabic must not split letters. Also write SRT and VTT.

## Thumbnails

Design title + thumbnail as one unit. ≤4 words on the plate. Face + curiosity gap. Run the CTR lab, save the analysis into `data/thumbnail-history.json` and `history/thumbnails/`. Never ship an untested plate.

## Film clips

clip.cafe, getyarn.io, and playphrase.me are **search desks**, not CDNs. Do not scrape or store copyrighted movie files. Attach a clip brief + source URL + fair-use note to a scene. The editor downloads what they have rights to.

## HTML video contract (HyperFrames)

```html
<div id="stage" data-composition-id="ep-01" data-start="0"
     data-width="1920" data-height="1080" data-duration="745">
  <div class="scene clip" data-start="0" data-duration="20" data-track-index="0">
    <div class="scene-content">...</div>
  </div>
</div>
<script>
  const tl = gsap.timeline({ paused: true });
  window.__timelines = window.__timelines || {};
  window.__timelines["ep-01"] = tl;
</script>
```

Clips need `class="clip"`. GSAP timelines stay paused and registered.

## Space

Do not commit long MP4s. Keep plates under ~300KB. Generated speech goes in `assets/audio/{speaker}/`.

The `output/` split is enforced by `.gitignore`: the audio mix and the preview
GIF are committed because GitHub Pages serves them, every `*.mp4` / `*.webm` /
`*.mov` / `*.wav` master is not. Keep the `!output/…` negations — without them
Pages serves nothing to watch.

## Definition of done

- More than one distinct voice
- Bilingual captions in sync
- Scenes actually change
- Arabic renders RTL
- Source JSON + HTML + SRT/VTT + thumbnail + YouTube copy
- `npm run check` passes: derived files match `episode.json`, the scene timeline
  is contiguous, every cue is bilingual and sits inside its scene
- Honest note if duration or render was limited — state the real recorded audio
  length next to the storyboard target, never the target alone
