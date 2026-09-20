# STORYBOARD — Episode 02 · Your Daily Routine

> 9 scenes, contiguous storyboard of 12:20 (740s), 49 spoken takes, 3 voices.
> `data/episode.json` is the source of truth; timings are targets — the player
> sizes each shot from the real recorded take (`durMs`).

| # | scene | type | span | takes | backdrop | notes |
|---|-------|------|------|-------|----------|-------|
| 1 | s1-open | title | 0–12 | 1 | studio | animated intro title card (player) |
| 2 | s2-host | host | 12–75 | 2 | map | Arabic framing: goal + how to follow |
| 3 | s3-slow | dialogue | 75–185 | 10 | studio | Maya ⇄ Omar, slow & clear (A1) |
| 4 | s4-explain | explain | 185–310 | 6 | map | Sami explains each pattern in Arabic |
| 5 | s5-natural | dialogue | 310–395 | 10 | cafe | same dialogue at natural speed (separate takes) |
| 6 | s6-vocab | vocab | 395–520 | 9 | studio | intro + 8 word cards (expand) |
| 7 | s7-drill | drill | 520–590 | 6 | studio | intro + 5 repeat-after-me, 5s gap (expand) |
| 8 | s8-quiz | quiz | 590–670 | 4 | map | 4 questions, 4s think-time (expand) |
| 9 | s9-close | outro | 670–740 | 1 | studio | wrap + Episode 03 hook |

## Pedagogy beats
- **Hook → promise** — the day-routine theme is stated in Arabic before any English.
- **Slow pass** then **natural pass** — learners hear the same 10-turn dialogue twice.
- **Explain** bridges every teaching point in Arabic so the load stays on listening.
- **Vocab/Drill/Quiz** are expanded (one shot per word/prompt/question) so captions,
  speakers and think-gaps sync per item — not one long cycling take.

## Production status
- `data/episode.json` authored (49 takes, contiguous timeline). ✅
- Audio: **batch 1 / 5 voiced** — open, host×2, slow dialogue d1–d7 (10 takes) in
  `assets/audio/{host,maya,omar}/ep02/`. Remaining 39 takes (d8–d10, e1–e6, n1–n10,
  vocab ×9, drill ×6, quiz ×4, close) follow over the next production passes.
- Player: `episode-02/index.html` uses the same cinematic player (chapters,
  kinetic captions, scene bumpers) — wired to read this episode's `film.json`.
