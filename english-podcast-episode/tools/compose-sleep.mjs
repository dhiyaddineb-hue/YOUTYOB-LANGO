/**
 * Sleep-lab composer — builds episode-04 «تعلّم الإنجليزية وأنت نائم» by
 * composing already-recorded takes from episodes 01-03 into a long, calm,
 * gap-heavy night podcast (word → long silence → repeat, the real
 * "learn while you sleep" pattern). Pure data: no new scene mechanics.
 *
 * Run: node tools/compose-sleep.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const E = (n) => JSON.parse(readFileSync(`${root}/episode-0${n}/data/episode.json`, "utf8"));
const eps = [E(1), E(2), E(3)];

// ---- index every recorded phrase by audio path -------------------------
const byAudio = new Map();
for (const ep of eps) {
  for (const s of ep.scenes) {
    for (const c of s.cues || []) if (c.audio) {
      byAudio.set(c.audio, { en: c.en, ar: c.ar, speaker: c.speaker, kind: s.type });
    }
    for (const card of s.cards || []) if (card.audio) {
      byAudio.set(card.audio, { card });
    }
    for (const it of s.items || []) if (it.audio) {
      byAudio.set(it.audio, { en: it.prompt ?? it.q, ar: it.hint ?? it.qAr, speaker: it.speaker || "maya", kind: "item" });
    }
  }
}

const A = "../assets/audio/";
const check = (rel) => {
  const p = resolve(`${root}/episode-04`, rel);
  if (!existsSync(p)) throw new Error(`missing take on disk: ${rel}`);
  return rel;
};
const get = (rel) => {
  check(rel);
  const src = byAudio.get(rel);
  if (!src) throw new Error(`no phrase indexed for ${rel}`);
  return src;
};
const card = (rel) => {
  const src = get(rel);
  if (!src.card) throw new Error(`${rel} is not a vocab card`);
  return { ...src.card, audio: rel };
};
const item = (rel, id) => {
  const src = get(rel);
  return { id, prompt: src.en, hint: src.ar, audio: rel, speaker: src.speaker };
};

const PAD_VOCAB = 24000; // 24s of hush after every word
const PAD_DRILL = 34000; // 34s after every sentence — the heartbeat of the format

const ep = {
  id: "ep-04",
  series: "English While You Sleep",
  number: 4,
  title: "Learn English While You Sleep — café words, your day, and first introductions",
  titleAr: "تعلّم الإنجليزية وأنت نائم 🌙 — كلمات المقهى، ويومك، والتعارف",
  cast: ["sami", "maya", "omar"],
  imageStyle: "realistic",
  youtube: {
    title: "تعلّم الإنجليزية وأنت نائم 🌙 | بودكاست طويل للاستماع قبل النوم | English While You Sleep",
    description:
      "بودكاست طويل وهادئ للاستماع قبل النوم: كلمات المقهى (قهوة، شاي، حليب…)، جمل يومك من الصباح إلى المساء، والتعارف الأول — كل كلمة وجملة تُقال ببطء ثم فجوة صمت طويلة لتردّدها في داخلك أو تغفو عليها. منهج Listen & Sleep للمبتدئين A1-A2.\nضع السماعة، أطفئ الشاشة، واسترخِ. تصبح على خير 🌙\n\n0:00 ترحيب الليلة\n1:00 كلمات المقهى غفوةً وراء غفوة\nالمفردات ثم الجمل ثم همسُ المعلّم ثم التعارف\nالخاتمة: نام جيدًا\n\n#تعلم_الإنجليزية #تعلم_الانجليزية_اثناء_النوم #LearnEnglishWhileYouSleep #EnglishPodcast #A1 #A2",
    tags: [
      "تعلم الإنجليزية أثناء النوم",
      "learn english while you sleep",
      "sleep podcast",
      "تعلم الإنجليزية",
      "English podcast",
      "A1",
      "A2",
      "بودكاست نوم",
      "محادثة إنجليزية",
    ],
  },
  visuals: eps[2].visuals,
  scenes: [
    {
      id: "s1-night-open",
      type: "title",
      title: "Welcome to the night",
      label: "ترحيب الليلة",
      visual: "studio",
      pace: "sleep",
      cues: [
        {
          id: "c1",
          speaker: "sami",
          en: "You don't need to study tonight… just listen, breathe, and sleep.",
          ar: "لا تحتاج أن تذاكر الليلة… فقط استمع، وتنفّس… ونام.",
          audio: check(A + "host/ep04/sleep-welcome.mp3"),
          keywords: [],
          pad: 6000,
        },
      ],
    },
    {
      id: "s2-cafe-words",
      type: "vocab",
      title: "Café words, drifting",
      label: "🌙 كلمات المقهى — غفوة وراء غفوة",
      visual: "cafe",
      pace: "sleep",
      pad: 2000,
      film: { expand: "items", shot: "cafe-words", pad: PAD_VOCAB - 2000 },
      cards: ["maya/ep03/vocab1.mp3", "omar/ep03/vocab2.mp3", "maya/ep03/vocab3.mp3", "omar/ep03/vocab4.mp3", "maya/ep03/vocab5.mp3", "omar/ep03/vocab6.mp3", "maya/ep03/vocab7.mp3", "omar/ep03/vocab8.mp3"].map((rel) => card(A + rel)),
    },
    {
      id: "s3-cafe-lines",
      type: "drill",
      title: "Café sentences, slowly",
      label: "☕ جمل المقهى — ببطء شديد",
      visual: "cafe",
      pace: "sleep",
      pad: 2000,
      film: { expand: "items", shot: "cafe-lines", pad: PAD_DRILL - 2000 },
      items: ["maya/ep03/d1.mp3", "omar/ep03/d2.mp3", "maya/ep03/d3.mp3", "omar/ep03/d4.mp3", "maya/ep03/d5.mp3"].map((rel, i) => item(A + rel, `sl${i + 1}`)),
    },
    {
      id: "s4-hello-words",
      type: "vocab",
      title: "Words about you",
      label: "🌙 كلمات عن نفسك",
      visual: "studio",
      pace: "sleep",
      pad: 2000,
      film: { expand: "items", shot: "hello-words", pad: PAD_VOCAB - 2000 },
      cards: ["maya/vocab1.mp3", "omar/vocab2.mp3", "maya/vocab3.mp3", "omar/vocab4.mp3", "maya/vocab5.mp3", "omar/vocab6.mp3", "omar/vocab7.mp3", "maya/vocab8.mp3"].map((rel) => card(A + rel)),
    },
    {
      id: "s5-your-day",
      type: "drill",
      title: "Your day, morning to night",
      label: "⏰ يومك — من الصباح إلى المساء",
      visual: "studio",
      pace: "sleep",
      pad: 2000,
      film: { expand: "items", shot: "your-day", pad: PAD_DRILL - 2000 },
      items: ["maya/ep02/d1.mp3", "omar/ep02/d2.mp3", "maya/ep02/d3.mp3", "omar/ep02/d4.mp3", "maya/ep02/d5.mp3"].map((rel, i) => item(A + rel, `sl${i + 1}`)),
    },
    {
      id: "s6-night-whisper",
      type: "drill",
      title: "Natural voices, whispered",
      label: "💤 همس طبيعي",
      visual: "cafe",
      pace: "sleep",
      pad: 2000,
      film: { expand: "items", shot: "night-whisper", pad: 30000 },
      items: ["maya/ep03/natural3.mp3", "omar/ep03/natural4.mp3", "maya/ep03/natural5.mp3", "omar/ep03/natural6.mp3", "maya/ep02/natural5.mp3", "omar/ep02/natural8.mp3"].map((rel, i) => item(A + rel, `sl${i + 1}`)),
    },
    {
      id: "s7-teacher-breath",
      type: "drill",
      title: "The teacher's calm recap",
      label: "🕯 أنفاس المعلّم",
      visual: "studio",
      pace: "sleep",
      pad: 2000,
      film: { expand: "items", shot: "teacher-breath", pad: 30000 },
      items: ["host/ep03/e1.mp3", "host/ep03/e3.mp3", "host/ep03/e5.mp3", "host/ep03/e6.mp3", "host/ep02/e2.mp3"].map((rel, i) => item(A + rel, `sl${i + 1}`)),
    },
    // ── Second lazy rotation — sleep podcasts repeat on purpose; the mind
    // consolidates what it hears drifting between wake and sleep. ──
    {
      id: "s3b-cafe-words-2",
      type: "vocab",
      title: "Café words — second drift",
      label: "🌌 الدورة الثانية — كلمات المقهى",
      visual: "cafe",
      pace: "sleep",
      pad: 2000,
      film: { expand: "items", shot: "cafe-words-2", pad: PAD_VOCAB - 2000 },
      cards: ["maya/ep03/vocab1.mp3", "omar/ep03/vocab2.mp3", "maya/ep03/vocab3.mp3", "omar/ep03/vocab4.mp3", "maya/ep03/vocab5.mp3", "omar/ep03/vocab6.mp3", "maya/ep03/vocab7.mp3", "omar/ep03/vocab8.mp3"].map((rel) => card(A + rel)),
    },
    {
      id: "s5b-your-day-2",
      type: "drill",
      title: "Your day — second drift",
      label: "🌌 الدورة الثانية — يومك",
      visual: "studio",
      pace: "sleep",
      pad: 2000,
      film: { expand: "items", shot: "your-day-2", pad: PAD_DRILL - 2000 },
      items: ["omar/ep02/d6.mp3", "maya/ep02/d7.mp3", "omar/ep02/d8.mp3", "maya/ep02/d9.mp3", "omar/ep02/d10.mp3"].map((rel, i) => item(A + rel, `s2l${i + 1}`)),
    },
    {
      id: "s6b-whisper-2",
      type: "drill",
      title: "Natural voices — deeper",
      label: "🌌 همسٌ أعمق",
      visual: "cafe",
      pace: "sleep",
      pad: 2000,
      film: { expand: "items", shot: "whisper-2", pad: 30000 },
      items: ["maya/ep03/natural7.mp3", "omar/ep03/natural8.mp3", "maya/ep02/natural3.mp3", "omar/ep02/natural4.mp3", "maya/ep03/natural1.mp3"].map((rel, i) => item(A + rel, `s2w${i + 1}`)),
    },
    {
      // A tiny three-voice slow dialogue — keeps the multi-voice rule green
      // and ends the content arc on the perfect before-bed lines.
      id: "s7b-sleep-journal",
      type: "dialogue",
      title: "Three calm voices, almost asleep",
      label: "🌌 يوميات قبل النوم",
      visual: "cafe",
      pace: "sleep",
      pad: 26000,
      cues: [
        { id: "cj1", speaker: "maya", en: get(A + "maya/ep02/natural9.mp3").en, ar: get(A + "maya/ep02/natural9.mp3").ar, audio: check(A + "maya/ep02/natural9.mp3"), keywords: [] },
        { id: "cj2", speaker: "omar", en: get(A + "omar/ep02/natural8.mp3").en, ar: get(A + "omar/ep02/natural8.mp3").ar, audio: check(A + "omar/ep02/natural8.mp3"), keywords: [] },
        { id: "cj3", speaker: "maya", en: get(A + "maya/ep03/natural9.mp3").en, ar: get(A + "maya/ep03/natural9.mp3").ar, audio: check(A + "maya/ep03/natural9.mp3"), keywords: [] },
      ],
    },
    {
      id: "s8-night-outro",
      type: "outro",
      title: "Bon voyage… sleep",
      label: "تصبح على خير",
      visual: "studio",
      pace: "sleep",
      next: "Next · Sleep Lab — Episode 05",
      cues: [
        {
          id: "o1",
          speaker: "sami",
          en: "Sleep well… see you tomorrow night.",
          ar: "تصبح على خير… نراك في الليلة التالية.",
          audio: check(A + "host/ep04/sleep-close.mp3"),
          keywords: [],
          pad: 6000,
        },
      ],
    },
  ],
};

writeFileSync(`${root}/episode-04/data/episode.json`, JSON.stringify(ep, null, 2) + "\n");

// --- storyboard for the tracker ------------------------------------------
const rows = ep.scenes
  .filter((s) => s.cards || s.items)
  .map((s) => {
    const arr = s.cards || s.items;
    return `| ${s.label.replace(/\s*—.*$/, "")} | ${arr.length} أخذات × فجوة ${(s.film.pad + 2000) / 1000}s |`;
  })
  .join("\n");
writeFileSync(
  `${root}/episode-04/STORYBOARD.md`,
  `# STORYBOARD — Episode 04 · English While You Sleep 🌙

> بودكاست النوم: حلقة طويلة هادئة مؤلّفة من أصوات الحلقات 01-03 (مُحصَّلة كاملة) مع فجوات صمت ليلية.
> المبدأ: كل كلمة/جملة تُقال ببطء ← فجوة 20-30s أثناءها يشتغل الفراش الموسيقي ← تردّد في داخلك أو تنام.
> النوع البصري: \"doze\" — أي لقطة فجوة ≥ 8s يخفت تحتها المشهد شبه كليًّا (اللاعب + التصدير).

## القوس الليلي
${rows}

- ترحيب/خاتمة جديدتان بصوت سامي بنبرة همسية: host/ep04/sleep-welcome.mp3 · sleep-close.mp3
- الفجوات الطويلة data-only (pad per film) — لا تعديل على derive/build.
`
);
console.log("episode-04 composed ✓ — scenes:", ep.scenes.length);
