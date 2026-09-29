/**
 * Duration of a recorded take, without ffprobe.
 *
 * The player sizes every shot from the real audio (`loadedmetadata`), so the
 * honest length of an episode is the sum of its takes plus its pads — not the
 * storyboard number in `episode.json`. This module lets `npm run check` report
 * both, which is what keeps the README's limits section true.
 *
 * Supports MPEG-1/2/2.5 Layer III frame walking and canonical RIFF/WAVE.
 */
import fs from "node:fs";

const V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
const V1_L2 = [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0];
const V2_L2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
const L1 = [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0];

function bitrateKbps(mpegVersion, layer, index) {
  if (layer === 1) return L1[index];
  if (layer === 2) return mpegVersion === 3 ? V1_L2[index] : V2_L2[index];
  return mpegVersion === 3 ? V1_L3[index] : V2_L3[index];
}

export function mp3Seconds(buf) {
  let i = 0;
  // Skip an ID3v2 tag if present.
  if (buf.length > 10 && buf.toString("latin1", 0, 3) === "ID3") {
    const size =
      ((buf[6] & 0x7f) << 21) |
      ((buf[7] & 0x7f) << 14) |
      ((buf[8] & 0x7f) << 7) |
      (buf[9] & 0x7f);
    i = 10 + size;
  }

  let seconds = 0;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) {
      i++;
      continue;
    }
    const b1 = buf[i + 1];
    const b2 = buf[i + 2];
    const mpegVersion = (b1 >> 3) & 0x03; // 0=MPEG2.5 2=MPEG2 3=MPEG1 (1=reserved)
    const layerBits = (b1 >> 1) & 0x03; // 1=Layer III 2=Layer II 3=Layer I (0=reserved)
    if (mpegVersion === 1 || layerBits === 0) {
      i++;
      continue;
    }
    const layer = layerBits === 3 ? 1 : layerBits === 2 ? 2 : 3;
    const brIndex = (b2 >> 4) & 0x0f;
    const srIndex = (b2 >> 2) & 0x03;
    const padding = (b2 >> 1) & 0x01;
    if (brIndex === 0 || brIndex === 15 || srIndex === 3) {
      i++;
      continue;
    }

    const sampleRate =
      [11025, 12000, 8000, 0][srIndex] * (mpegVersion === 3 ? 4 : mpegVersion === 2 ? 2 : 1);
    if (!sampleRate) {
      i++;
      continue;
    }
    const kbps = bitrateKbps(mpegVersion, layer, brIndex);
    if (!kbps) {
      i++;
      continue;
    }

    const samplesPerFrame = layer === 1 ? 384 : mpegVersion === 3 ? 1152 : 576;
    const slot = layer === 1 ? 4 : 1;
    const frameBytes =
      Math.floor((samplesPerFrame / 8) * (kbps * 1000) / sampleRate) + padding * slot;
    if (frameBytes <= 0) {
      i++;
      continue;
    }

    seconds += samplesPerFrame / sampleRate;
    i += frameBytes;
  }
  return seconds;
}

export function wavSeconds(buf) {
  if (buf.length < 44 || buf.toString("latin1", 0, 4) !== "RIFF") return 0;
  // Walk chunks to find "fmt " rather than trusting the canonical offsets.
  let i = 12;
  while (i + 8 <= buf.length) {
    const id = buf.toString("latin1", i, i + 4);
    const size = buf.readUInt32LE(i + 4);
    if (id === "fmt ") {
      const sampleRate = buf.readUInt32LE(i + 12);
      const byteRate = buf.readUInt32LE(i + 16);
      if (!byteRate) return 0;
      let dataSize = buf.length - (i + 8 + size);
      for (let j = i + 8 + size; j + 8 <= buf.length; ) {
        if (buf.toString("latin1", j, j + 4) === "data") {
          dataSize = buf.readUInt32LE(j + 4);
          break;
        }
        j += 8 + buf.readUInt32LE(j + 4) + (buf.readUInt32LE(j + 4) % 2);
      }
      return dataSize / byteRate || 0;
    }
    i += 8 + size + (size % 2);
  }
  return 0;
}

/** Seconds of audio in a file, or null when the format is unknown/missing. */
export function audioSeconds(file) {
  if (!fs.existsSync(file)) return null;
  const buf = fs.readFileSync(file);
  const ext = file.toLowerCase().split(".").pop();
  if (ext === "mp3") return mp3Seconds(buf);
  if (ext === "wav") return wavSeconds(buf);
  return null;
}

export function clock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Recorded length of a shot list: every take plus its pad.
 *
 * This is what the public player actually runs, because it sizes each shot from
 * the real audio instead of from the storyboard clock. Comparing it with
 * `episode.duration` is the honest way to report an episode's state.
 *
 * @param {object} film            derived film object
 * @param {(p:string)=>string} resolveAudio  shot audio path -> filesystem path
 */
export function recordedSeconds(film, resolveAudio) {
  let total = 0;
  let resolved = 0;
  let missing = [];
  for (const shot of film.shots) {
    total += (shot.pad ?? 300) / 1000;
    if (!shot.audio) {
      missing.push(shot.id);
      continue;
    }
    const d = audioSeconds(resolveAudio(shot.audio));
    if (d === null) {
      missing.push(shot.id);
      continue;
    }
    total += d;
    resolved++;
  }
  return { total, resolved, shots: film.shots.length, missing };
}
