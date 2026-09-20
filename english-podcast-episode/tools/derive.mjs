/**
 * Single source of truth: `episode-XX/data/episode.json`.
 *
 * Everything the public player and the caption files need is *derived* here, so
 * nobody hand-edits a second copy of the episode and lets it drift.
 *
 *   episode.json  --buildFilm()-->  film.json      (audio-driven shot list)
 *   episode.json  --allCues()---->  SRT / VTT      (bilingual captions)
 *
 * `allCues`, `toSrt` and `toVtt` are imported from the studio's own export
 * module on purpose: the studio "Export" desk and this CLI must never disagree.
 * Those modules are browser-flavoured but side-effect free, so they import
 * cleanly under Node too.
 */
import { allCues, toSrt, toVtt } from "../studio/js/modules/export.js";
import { audioSeconds } from "./audio-duration.mjs";

export { allCues, toSrt, toVtt };

const DEFAULT_PAD = 300;

/** Items a collapsed shot cycles through while its single audio clip plays. */
function itemsFor(scene, film) {
  const from = film.from || "cues";

  if (from === "cards") {
    return (scene.cards || []).map((c) => ({
      en: c.en,
      ipa: c.ipa,
      ar: c.ar,
      ex: c.ex,
    }));
  }

  if (from === "items") {
    return (scene.items || []).map((it) =>
      it.q !== undefined
        ? { en: it.q, ar: it.qAr, a: it.a, aAr: it.aAr } // quiz
        : { en: it.prompt, ar: it.hint }                 // drill
    );
  }

  // from === "cues": the explanation turns become cards
  return (scene.cues || []).map((c) => ({ en: c.en, ar: c.ar }));
}

/**
 * The on-screen fields a single item contributes to a shot, per scene type.
 * Used by `expand` mode, where every item becomes its own shot.
 */
function displayFields(type, it) {
  switch (type) {
    case "quiz":  return { en: it.q, ar: it.qAr, a: it.a, aAr: it.aAr };
    case "drill": return { en: it.prompt, ar: it.hint };
    case "vocab": return { en: it.en, ipa: it.ipa, ar: it.ar, ex: it.ex };
    default:      return { en: it.en, ar: it.ar };
  }
}

/**
 * Flatten an episode into the shot list `episode-XX/index.html` plays.
 *
 * Three shapes are supported per scene:
 *   - default: one shot per cue, each with its own audio file (dialogue, host,
 *     and explain now that every turn has a take)
 *   - `scene.film.expand === "items"`: one shot per item, each with its own
 *     audio — the goal for quiz / drill / vocab once every item is recorded
 *   - `scene.film.collapse === "items"`: one shot whose single audio clip runs
 *     while the player cycles the scene's cards/items — the fallback while a
 *     section still has only one long take instead of per-item takes.
 */
export function buildFilm(episode, characters, { style, resolveAudio } = {}) {
  const imageStyle = style || episode.imageStyle || "realistic";
  const byId = Object.fromEntries(characters.map((c) => [c.id, c]));

  const cast = {};
  for (const id of episode.cast) {
    const c = byId[id];
    if (!c) throw new Error(`cast member "${id}" is not in data/characters.json`);
    cast[id] = {
      name: c.name,
      nameEn: c.nameEn,
      color: c.color,
      photo: c.styles[imageStyle] || c.styles.realistic,
    };
  }

  const shots = [];
  for (const scene of episode.scenes) {
    const cues = scene.cues || [];
    const first = cues[0];
    const film = scene.film;

    if (film?.collapse === "items") {
      let items = itemsFor(scene, film);
      if (film.limit) items = items.slice(0, film.limit);
      if (!items.length) throw new Error(`${scene.id}: collapse shot has no items`);

      // Caption for the whole shot: the scene's intro cue, or an explicit line.
      const captionCue = film.captionFrom === "cue" ? first : null;
      const audio = film.audio || captionCue?.audio || first?.audio || null;

      const shot = {
        id: film.shot || scene.id,
        type: scene.type,
        scene: scene.id,
        visual: scene.visual,
        speaker: captionCue?.speaker || first?.speaker || episode.cast[0],
        audio,
        en: captionCue?.en || film.en || "",
        ar: captionCue?.ar || film.ar || "",
        items,
        pad: film.pad ?? scene.pad ?? DEFAULT_PAD,
      };
      if (scene.chips) shot.chips = scene.chips;
      shots.push(shot);
      continue;
    }

    if (film?.expand === "items") {
      // One shot per item, each with its own recorded take. Used once every
      // quiz / drill / vocab item has real audio, so each gets its own synced
      // caption instead of cycling silently under a single take.
      const items = scene.items || scene.cards || [];
      if (!items.length) throw new Error(`${scene.id}: expand scene has no items`);
      // Any intro cue (e.g. the drill's "your turn, speak after me") leads the
      // section, then each item follows as its own shot.
      for (const cue of cues) {
        shots.push({
          id: cue.id,
          type: scene.type,
          scene: scene.id,
          visual: scene.visual,
          speaker: cue.speaker,
          audio: cue.audio || null,
          en: cue.en,
          ar: cue.ar,
          pad: cue.pad ?? scene.pad ?? DEFAULT_PAD,
        });
      }
      items.forEach((it, i) => {
        shots.push({
          id: it.id || `${film.shot || scene.id}-${i + 1}`,
          type: scene.type,
          scene: scene.id,
          visual: scene.visual,
          speaker: it.speaker || first?.speaker || episode.cast[0],
          audio: it.audio || film.audio || null,
          pad: it.pad ?? film.pad ?? scene.pad ?? DEFAULT_PAD,
          ...displayFields(scene.type, it),
        });
      });
      continue;
    }

    if (!cues.length) {
      // A scene with only cards/items and no cue still needs a shot.
      const items = itemsFor(scene, { from: scene.cards ? "cards" : "items" });
      if (!items.length) continue;
      shots.push({
        id: scene.id,
        type: scene.type,
        scene: scene.id,
        visual: scene.visual,
        speaker: episode.cast[0],
        audio: film?.audio || null,
        en: film?.en || "",
        ar: film?.ar || "",
        items,
        pad: film?.pad ?? scene.pad ?? DEFAULT_PAD,
      });
      continue;
    }

    cues.forEach((cue, index) => {
      const shot = {
        id: cue.id,
        type: scene.type,
        scene: scene.id,
        visual: scene.visual,
        speaker: cue.speaker,
        audio: cue.audio || null,
      };
      // Title and outro paint their own hero copy; a caption rail there is noise.
      if (scene.type !== "title" && scene.type !== "outro") {
        shot.en = cue.en;
        shot.ar = cue.ar;
      }
      // Phrase chips introduce the lesson, so they ride the scene's first shot
      // only — repeating them on every turn of the same scene is visual noise.
      if (scene.chips && index === 0) shot.chips = scene.chips;
      if (scene.next) shot.next = scene.next;
      shot.pad = cue.pad ?? scene.pad ?? DEFAULT_PAD;
      shots.push(shot);
    });
  }

  // Bake each shot's real recorded duration so the player's timeline, chapter
  // times and scrubber are accurate from load instead of guessing 4s per shot.
  // Only when a resolver is passed (build/check do); buildFilm stays pure else.
  if (typeof resolveAudio === "function") {
    for (const shot of shots) {
      if (!shot.audio) continue;
      const secs = audioSeconds(resolveAudio(shot.audio));
      if (secs !== null && Number.isFinite(secs)) shot.durMs = Math.round(secs * 1000);
    }
  }

  // Chapter manifest: one entry per scene, in order, so the player can build a
  // scene rail and group shots into chapters without re-deriving anything.
  const scenesManifest = episode.scenes.map((s) => ({
    id: s.id,
    type: s.type,
    visual: s.visual,
    title: s.title || s.type,
    titleAr: s.label || "",
  }));

  return {
    id: episode.id,
    series: episode.series,
    number: episode.number,
    title: episode.title,
    titleAr: episode.titleAr,
    youtubeTitle: episode.youtube?.title || episode.title,
    thumbnail: episode.thumbnail || "../assets/images/thumbnails/ep01-thumb.jpg",
    visuals: episode.visuals,
    cast,
    scenes: scenesManifest,
    shots,
    generatedFrom: "data/episode.json",
  };
}

/** Everything that is spoken or read on screen, in time order. */
export function captionRows(episode) {
  return allCues(episode);
}
