#!/usr/bin/env node
/**
 * Regenerate every derived artefact for an episode from its `data/episode.json`.
 *
 *   node tools/build.mjs [episodeDir]     # default: episode-01
 *   npm run build
 *
 * Writes:
 *   <episodeDir>/film.json                 audio-driven shot list for index.html
 *   <episodeDir>/captions/episode-en.srt   English captions
 *   <episodeDir>/captions/episode-ar.srt   Arabic captions
 *   <episodeDir>/captions/episode.vtt      bilingual WebVTT
 *
 * Never edit those four files by hand — edit `data/episode.json` and re-run.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildFilm, toSrt, toVtt } from "./derive.mjs";
import { clock, recordedSeconds } from "./audio-duration.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const episodeDir = path.resolve(root, process.argv[2] || "episode-01");

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

const episode = read(path.join(episodeDir, "data/episode.json"));
const characters = read(path.join(root, "data/characters.json")).characters;

// Resolve a shot's audio ref (e.g. ../assets/audio/host/open.mp3) to a file so
// buildFilm can bake each take's real duration into film.json — the player's
// timeline, chapter times and scrubber are then accurate from load.
const resolveAudio = (p) => path.resolve(episodeDir, p);
const film = buildFilm(episode, characters, { resolveAudio });

const targets = [
  [path.join(episodeDir, "film.json"), JSON.stringify(film, null, 2) + "\n"],
  [path.join(episodeDir, "captions/episode-en.srt"), toSrt(episode, "en")],
  [path.join(episodeDir, "captions/episode-ar.srt"), toSrt(episode, "ar")],
  [path.join(episodeDir, "captions/episode.vtt"), toVtt(episode)],
];

for (const [file, text] of targets) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  console.log(`wrote ${path.relative(root, file)}  (${text.length} bytes)`);
}

const rec = recordedSeconds(film, resolveAudio);
console.log(
  `\n${film.shots.length} shots · ${rec.resolved} with a recorded take · ${rec.missing.length} silent`
);
console.log(
  `plays ~${clock(rec.total)} against a ${clock(episode.duration)} storyboard target`
);
if (rec.missing.length) {
  console.warn(
    `warning: no take for ${rec.missing.join(", ")} — the player falls back to browser speech.`
  );
}
