import { loadJSON } from "./utils.js";

const KEY = "lumen-studio-v1";

export async function boot() {
  const [workspace, formats, characters, voices, lexicon, clips, history, episode] = await Promise.all([
    loadJSON("../data/workspace.json"),
    loadJSON("../data/formats.json"),
    loadJSON("../data/characters.json"),
    loadJSON("../data/voices.json"),
    loadJSON("../data/keyword-lexicon.json"),
    loadJSON("../data/clip-desk.json"),
    loadJSON("../data/thumbnail-history.json"),
    loadJSON("../episode-01/data/episode.json"),
  ]);

  const local = readLocal();
  const state = {
    workspace,
    formats,
    characters: characters.characters,
    voices: voices.voices,
    lexicon,
    clips,
    history: local.history?.length ? local.history : history.analyses,
    episode,
    project: local.project || {
      format: episode.format,
      imageStyle: episode.imageStyle,
      cast: [...episode.cast],
      topic: episode.titleAr,
    },
  };
  return state;
}

export function persist(state) {
  localStorage.setItem(KEY, JSON.stringify({
    history: state.history,
    project: state.project,
  }));
}

function readLocal() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch { return {}; }
}

export function characterMap(state) {
  return Object.fromEntries(state.characters.map((c) => [c.id, c]));
}

export function asset(path) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  if (path.startsWith("../")) return path;
  return `../${path}`;
}
