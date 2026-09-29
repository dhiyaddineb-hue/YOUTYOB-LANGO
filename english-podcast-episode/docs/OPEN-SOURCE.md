# Open-source map

This workspace does not vendor a 40k-star renderer. It is authored so an agent can drop the episode onto a real engine without rewriting the story.

## Primary renderer

**[heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)** — Apache-2.0  
Write HTML with `data-start` / `data-duration` / `class="clip"`. GSAP timeline paused and registered on `window.__timelines`. Chromium + ffmpeg → H.264 MP4.

Use:

- `/general-video` for a long multi-scene lesson
- `/hyperframes-core` for the composition contract
- `/hyperframes-audio` for per-speaker tracks and music ducking
- `/media-use` for plates, voices, music

```bash
npx hyperframes skills update
npx hyperframes lint
npx hyperframes preview
npx hyperframes render episode-01/index.html
```

## Storyboard layer

**[nexu-io/html-video](https://github.com/nexu-io/html-video)** — Apache-2.0  
Content-graph + per-frame HTML + studio loop. Useful when an episode is planned as discrete frames before a HyperFrames concat.

## Not used as a base

- **FWF** — preview is unreliable; README warns against it
- **Remotion** — excellent, but React + bundler. This workspace stays HTML-native
- Scrapers for clip.cafe / getyarn / playphrase — no public free API we can legally mirror

## Caption research baked into the lab

HyperFrames embedded-captions skill is built for existing talking-head footage. We take its *rules* (readable windows, rail at the bottom, no overlap, test frames while speech is happening) and implement a custom bilingual rail, because this show is multi-speaker and generated from scratch.

## Film phrase desks

| Desk | Use |
| --- | --- |
| [playphrase.me](https://www.playphrase.me/) | Search a phrase, hear it in films. Educational clips are short. No public API. |
| [getyarn.io](https://getyarn.io/) | Yarn-find by text. Good for idiom confirmation. |
| [clip.cafe](https://clip.cafe/) | Quote / title search. Paid API if you ever automate. |

The studio Clip Desk opens these with the lesson phrase. The human editor decides what they have the right to download.
