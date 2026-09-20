#!/usr/bin/env node
/**
 * Fail when a derived artefact is out of sync with `data/episode.json`.
 *
 *   node tools/check.mjs [episodeDir]     # default: episode-01
 *   npm run check
 *
 * Run this before committing. It is the guard that keeps film.json and the
 * caption files from becoming a second, stale source of truth.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildFilm, toSrt, toVtt } from "./derive.mjs";
import { audioSeconds, clock, recordedSeconds } from "./audio-duration.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const episodeDir = path.resolve(root, process.argv[2] || "episode-01");

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const episode = read(path.join(episodeDir, "data/episode.json"));
const characters = read(path.join(root, "data/characters.json")).characters;
const resolveAudio = (p) => path.resolve(episodeDir, p);
const film = buildFilm(episode, characters, { resolveAudio });

const expected = [
  [path.join(episodeDir, "film.json"), JSON.stringify(film, null, 2) + "\n"],
  [path.join(episodeDir, "captions/episode-en.srt"), toSrt(episode, "en")],
  [path.join(episodeDir, "captions/episode-ar.srt"), toSrt(episode, "ar")],
  [path.join(episodeDir, "captions/episode.vtt"), toVtt(episode)],
];

let bad = 0;
for (const [file, text] of expected) {
  const rel = path.relative(root, file);
  if (!fs.existsSync(file)) {
    console.error(`MISSING  ${rel}`);
    bad++;
    continue;
  }
  const actual = fs.readFileSync(file, "utf8");
  if (actual === text) {
    console.log(`ok       ${rel}`);
    continue;
  }
  bad++;
  console.error(`STALE    ${rel}`);
  const a = actual.split("\n");
  const b = text.split("\n");
  let shown = 0;
  for (let i = 0; i < Math.max(a.length, b.length) && shown < 6; i++) {
    if (a[i] !== b[i]) {
      console.error(`         line ${i + 1}`);
      console.error(`           on disk : ${JSON.stringify(a[i] ?? null)}`);
      console.error(`           expected: ${JSON.stringify(b[i] ?? null)}`);
      shown++;
    }
  }
  if (a.length !== b.length) {
    console.error(`         line count on disk ${a.length}, expected ${b.length}`);
  }
}

// Structural invariants from AGENTS.md, checked so a bad edit cannot ship.
const errors = [];
if (!new Set(film.shots.map((s) => s.speaker)).size) errors.push("no speakers");
const speakers = new Set(episode.scenes.flatMap((s) => (s.cues || []).map((c) => c.speaker)));
if (speakers.size < 2) errors.push(`only ${speakers.size} distinct voice — "a still image plus one voice is not a video"`);
for (const s of episode.scenes) {
  for (const c of s.cues || []) {
    if (c.start < s.start || c.end > s.end) errors.push(`${c.id} falls outside scene ${s.id} (${s.start}-${s.end})`);
    if (!c.en || !c.ar) errors.push(`${c.id} is missing a bilingual caption`);
  }
}
const gaps = episode.scenes.filter((s, i, all) => i && s.start !== all[i - 1].end);
if (gaps.length) errors.push(`scene timeline is not contiguous at: ${gaps.map((s) => s.id).join(", ")}`);
if (episode.duration !== episode.scenes.at(-1).end) {
  errors.push(`duration ${episode.duration} != last scene end ${episode.scenes.at(-1).end}`);
}
for (const e of errors) console.error(`RULE     ${e}`);

// Storyboard target vs what is actually recorded. Reported, not enforced: a
// short episode is a gap to close, not a broken build.
const rec = recordedSeconds(film, resolveAudio);
const target = episode.duration;
const pct = target ? Math.round((rec.total / target) * 100) : 0;
console.log(
  `\nAUDIO    recorded ${clock(rec.total)} of ${clock(target)} storyboard (${pct}%) · ` +
    `${rec.resolved}/${rec.shots} shots have a take`
);
if (rec.missing.length) {
  console.error(`AUDIO    no resolvable take for: ${rec.missing.join(", ")}`);
}
if (rec.total < target * 0.9) {
  console.log(
    `AUDIO    episode plays ~${clock(target - rec.total)} shorter than BRIEF.md promises — ` +
      `record per-cue takes before publishing (not a build failure)`
  );
}

if (bad || errors.length || rec.missing.length) {
  console.error(
    `\n${bad} stale file(s), ${errors.length} rule violation(s), ${rec.missing.length} shot(s) without audio.` +
      (bad || errors.length ? " Run: npm run build" : "")
  );
  process.exit(1);
}
console.log("\nAll derived artefacts match episode.json.");
