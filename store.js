// ============ store.js : STRVEX DATA, XP/LEVELS, MULTI-PR, COMPARISON & CSV ENGINE ============

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MUSCLES = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms",
  "Quads", "Hamstrings", "Glutes", "Calves", "Core", "Other"];
const EQUIPMENTS = ["All", "Barbell", "Dumbbell", "Cable", "Machine", "Smith Machine", "Bodyweight"];
const ACCENT_THEMES = ["flame", "cyan", "crimson", "emerald", "volt"];
const DEFAULT_SPOTIFY_EMBED = "https://open.spotify.com/embed/playlist/37i9dQZF1DX76Wlfdnj7AP?utm_source=generator&theme=0";

// Connected 10-Level RPG Athlete Progression Tiers
const LEVEL_TIERS = [
  { level: 1, xp: 0, title: "ROOKIE", desc: "Begin your strength logbook journey" },
  { level: 2, xp: 250, title: "IRON STARTER", desc: "Complete your first 2 workouts & build baseline habits" },
  { level: 3, xp: 600, title: "REGULAR LIFTER", desc: "Consistent weekly sessions & initial personal records" },
  { level: 4, xp: 1200, title: "CONDITIONED", desc: "Solid working set volume & multi-week discipline" },
  { level: 5, xp: 2200, title: "VANGUARD", desc: "Intermediate strength standard & progressive overload" },
  { level: 6, xp: 3600, title: "HEAVY HITTER", desc: "High session tonnage & regular PR breakthroughs" },
  { level: 7, xp: 5500, title: "IRON VETERAN", desc: "Seasoned gym regular with deep movement mastery" },
  { level: 8, xp: 8000, title: "ELITE LIFTER", desc: "Advanced strength output across all compound lifts" },
  { level: 9, xp: 11500, title: "TITAN", desc: "Relentless intensity & elite lifetime volume" },
  { level: 10, xp: 16000, title: "STRVEX APEX", desc: "Peak strength status — top 1% dedication" }
];

// ---------- High-Speed In-Memory Cache & Safe Atomic Write ----------
const CACHED_KEYS = new Set([
  "history",
  "routines",
  "exercises",
  "bodyweight",
  "measurements",
  "settings",
  "deleted_curated_routines",
  "exercise_meta"
]);
const _cache = {};
let _exMap = null;

function rebuildExerciseMap(list) {
  _exMap = new Map();
  (list || []).forEach(function (ex) {
    if (ex && ex.id) _exMap.set(ex.id, ex);
  });
}

function read(key, fallback) {
  if (CACHED_KEYS.has(key) && Object.prototype.hasOwnProperty.call(_cache, key)) {
    return _cache[key];
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      if (CACHED_KEYS.has(key)) _cache[key] = fallback;
      return fallback;
    }
    const v = JSON.parse(raw);
    const res = (v === null || v === undefined) ? fallback : v;
    if (CACHED_KEYS.has(key)) {
      _cache[key] = res;
      if (key === "exercises" && Array.isArray(res)) rebuildExerciseMap(res);
    }
    return res;
  } catch (e) {
    return fallback;
  }
}

function write(key, value) {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    if (CACHED_KEYS.has(key)) {
      _cache[key] = value;
      if (key === "exercises" && Array.isArray(value)) rebuildExerciseMap(value);
    }
    return true;
  } catch (err) {
    console.error("STRVEX Storage Error:", err);
    if (typeof showToast === "function") {
      showToast("Storage full! Export a JSON backup in Settings before closing.");
    }
    return false;
  }
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function pad(n) {
  return String(n).padStart(2, "0");
}

function sanitizeSpotifyEmbedUrl(url) {
  if (typeof url !== "string") return DEFAULT_SPOTIFY_EMBED;
  const trimmed = url.trim();
  const match = trimmed.match(/^https:\/\/open\.spotify\.com\/embed\/(playlist|album|track)\/([a-zA-Z0-9]+)(\?[^\s"'<>]*)?$/);
  return match ? trimmed : DEFAULT_SPOTIFY_EMBED;
}

function getHistory() { return read("history", []); }
function saveHistory(v) { return write("history", v); }
function getRoutines() { return read("routines", []); }
function saveRoutines(v) { return write("routines", v); }
function getExercises() { return read("exercises", []); }
function saveExercises(v) { return write("exercises", v); }
function getBodyWeights() { return read("bodyweight", []); }
function saveBodyWeights(v) { return write("bodyweight", v); }
function getMeasurements() { return read("measurements", []); }
function saveMeasurements(v) { return write("measurements", v); }

function getSettings() {
  const s = read("settings", {});
  return {
    userName: s && typeof s.userName === "string" ? s.userName.trim().slice(0, 24) : "",
    theme: s && s.theme === "light" ? "light" : "dark",
    accent: s && ACCENT_THEMES.includes(s.accent) ? s.accent : "flame",
    onboarded: !!(s && s.onboarded),
    defaultTrack: s && typeof s.defaultTrack === "string" ? s.defaultTrack : "all",
    experienceMode: s && s.experienceMode === "simple" ? "simple" : "advanced",
    showRpe: !!(s && s.showRpe),
    soundMuted: !!(s && s.soundMuted),
    measUnit: s && s.measUnit === "cm" ? "cm" : "in",
    spotifyEmbedUrl: sanitizeSpotifyEmbedUrl(s && s.spotifyEmbedUrl),
    unit: s && s.unit === "lbs" ? "lbs" : "kg",
    rest: s && Number(s.rest) > 0 ? Math.min(600, Math.round(Number(s.rest))) : 60,
    barKg: s && Number(s.barKg) >= 0 ? Number(s.barKg) : 20,
    barLbs: s && Number(s.barLbs) >= 0 ? Number(s.barLbs) : 45
  };
}
function saveSettings(s) {
  if (s && s.spotifyEmbedUrl) s.spotifyEmbedUrl = sanitizeSpotifyEmbedUrl(s.spotifyEmbedUrl);
  return write("settings", s);
}
function unitName() { return getSettings().unit; }

// ---------- Connected XP & Level Roadmap Engine ----------
function calculateWorkoutXP(w) {
  if (!w) return 0;
  let setsCount = 0;
  (w.exercises || []).forEach(function (ex) {
    setsCount += (ex.sets || []).filter(s => s.type !== "W" && s.lifter !== "p2").length;
  });
  const prsCount = (w.prs || []).length;
  const volKg = workoutVolume(w);
  return 100 + (setsCount * 10) + (prsCount * 25) + Math.round((volKg / 1000) * 15);
}

function getAthleteProfile() {
  const s = getSettings();
  const hist = getHistory();
  let totalXp = 0;
  hist.forEach(function (w) {
    totalXp += calculateWorkoutXP(w);
  });

  let currentTier = LEVEL_TIERS[0];
  let nextTier = LEVEL_TIERS[1];
  for (let i = 0; i < LEVEL_TIERS.length; i++) {
    if (totalXp >= LEVEL_TIERS[i].xp) {
      currentTier = LEVEL_TIERS[i];
      nextTier = LEVEL_TIERS[i + 1] || null;
    }
  }

  let progressPct = 100;
  let xpInTier = totalXp - currentTier.xp;
  let tierSpan = 1000;
  let xpToNext = 0;

  if (nextTier) {
    tierSpan = nextTier.xp - currentTier.xp;
    progressPct = Math.min(99, Math.max(2, Math.round((xpInTier / tierSpan) * 100)));
    xpToNext = nextTier.xp - totalXp;
  }

  const rawName = s.userName ? s.userName.toUpperCase() : "ATHLETE";
  const roadmap = LEVEL_TIERS.map(function (t) {
    return {
      level: t.level,
      xpRequired: t.xp,
      title: t.title,
      desc: t.desc,
      unlocked: totalXp >= t.xp,
      isCurrent: t.level === currentTier.level
    };
  });

  return {
    name: rawName,
    hasCustomName: !!s.userName,
    level: currentTier.level,
    rank: currentTier.title,
    rankDesc: currentTier.desc,
    xp: totalXp,
    nextLevelXp: nextTier ? nextTier.xp : currentTier.xp,
    nextRank: nextTier ? nextTier.title : "MAX LEVEL",
    xpToNext: xpToNext,
    progressPct: progressPct,
    workouts: hist.length,
    roadmap: roadmap
  };
}

// ---------- Per-Exercise Pinned Notes & Custom Rest Timer ----------
function getExerciseMetaMap() {
  const m = read("exercise_meta", {});
  return (m && typeof m === "object" && !Array.isArray(m)) ? m : {};
}
function saveExerciseMetaMap(m) {
  return write("exercise_meta", m || {});
}
function getExerciseNote(exId) {
  const m = getExerciseMetaMap();
  return (m[exId] && m[exId].note) ? String(m[exId].note) : "";
}
function saveExerciseNote(exId, noteText) {
  if (!exId) return;
  const m = getExerciseMetaMap();
  if (!m[exId]) m[exId] = {};
  m[exId].note = String(noteText || "").trim();
  saveExerciseMetaMap(m);
}
function getExerciseCustomRest(exId) {
  const m = getExerciseMetaMap();
  return (m[exId] && Number(m[exId].rest) > 0) ? Number(m[exId].rest) : 0;
}
function getExerciseRest(exId) {
  const custom = getExerciseCustomRest(exId);
  return custom > 0 ? custom : getSettings().rest;
}
function saveExerciseRest(exId, seconds) {
  if (!exId) return;
  const m = getExerciseMetaMap();
  if (!m[exId]) m[exId] = {};
  const sec = Number(seconds);
  m[exId].rest = (Number.isFinite(sec) && sec > 0) ? Math.round(sec) : 0;
  saveExerciseMetaMap(m);
}

// ---------- Estimated Workout Time Target Calculator ----------
function estimateWorkoutMinutes(exercisesList) {
  if (!Array.isArray(exercisesList) || exercisesList.length === 0) return 0;
  let totalSec = 120; // 2 min initial warm-up/setup
  exercisesList.forEach(function (item) {
    const exId = item.exId;
    const setsCount = Math.max(1, Number(item.sets) || 3);
    const restSec = getExerciseRest(exId);
    // ~40s active work per set + rest between sets + 75s equipment transition
    totalSec += (setsCount * 40) + (setsCount * restSec) + 75;
  });
  return Math.max(10, Math.round(totalSec / 60 / 5) * 5);
}

function getDeletedCuratedRoutines() {
  return read("deleted_curated_routines", []);
}
function markCuratedRoutineDeleted(id) {
  const list = getDeletedCuratedRoutines();
  if (!list.includes(id)) {
    list.push(id);
    write("deleted_curated_routines", list);
  }
}

// ---------- Exercise Database & Curated Routines Seeding ----------
function initializeDatabase() {
  let storedExercises = getExercises();

  if (!Array.isArray(storedExercises) || storedExercises.length === 0) {
    if (typeof DEFAULT_EXERCISES !== "undefined") {
      saveExercises([...DEFAULT_EXERCISES]);
    }
  } else if (typeof DEFAULT_EXERCISES !== "undefined") {
    const existingMap = new Map(storedExercises.map(e => [e.id, e]));
    let hasChanges = false;
    DEFAULT_EXERCISES.forEach(defaultEx => {
      if (!existingMap.has(defaultEx.id)) {
        storedExercises.push(defaultEx);
        hasChanges = true;
      } else {
        const cur = existingMap.get(defaultEx.id);
        if (defaultEx.type === "time" && cur.type !== "time") {
          cur.type = "time";
          hasChanges = true;
        }
      }
    });
    if (hasChanges) {
      saveExercises(storedExercises);
    } else {
      rebuildExerciseMap(storedExercises);
    }
  }

  let storedRoutines = getRoutines();
  const deletedCuratedIds = new Set(getDeletedCuratedRoutines());

  if (!Array.isArray(storedRoutines) || storedRoutines.length === 0) {
    if (typeof CURATED_ROUTINES !== "undefined") {
      const initial = CURATED_ROUTINES.filter(r => !deletedCuratedIds.has(r.id));
      saveRoutines(initial);
    }
  } else if (typeof CURATED_ROUTINES !== "undefined") {
    let needsUpdate = false;
    CURATED_ROUTINES.forEach(curated => {
      if (deletedCuratedIds.has(curated.id)) return;

      const matchIndex = storedRoutines.findIndex(r => r.id === curated.id);
      if (matchIndex === -1) {
        storedRoutines.push(curated);
        needsUpdate = true;
      } else {
        const existing = storedRoutines[matchIndex];
        if (!existing.userEdited && (
          existing.name !== curated.name ||
          existing.description !== curated.description ||
          existing.category !== curated.category
        )) {
          existing.name = curated.name;
          existing.description = curated.description;
          existing.category = curated.category;
          needsUpdate = true;
        }
      }
    });
    if (needsUpdate) {
      saveRoutines(storedRoutines);
    }
  }
}

// ---------- Migration (Schema 2) ----------
function convertV1(history, routines, muscles) {
  const exercises = typeof DEFAULT_EXERCISES !== "undefined" ? [...DEFAULT_EXERCISES] : [];

  function idFor(name, type) {
    const key = String(name || "Exercise").toLowerCase();
    let ex = exercises.find(e => e.name.toLowerCase() === key);
    if (!ex) {
      ex = {
        id: newId(),
        name: String(name || "Exercise"),
        type: (type === "reps" || type === "time") ? type : "weight",
        equipment: "Machine",
        primary: (muscles || {})[key] || "Other",
        secondary: []
      };
      exercises.push(ex);
    }
    return ex.id;
  }

  (history || []).forEach(function (w) {
    (w.exercises || []).forEach(function (ex) {
      if (!ex.exId) ex.exId = idFor(ex.name, ex.type);
      delete ex.name;
      delete ex.type;
    });
    (w.prs || []).forEach(function (p) {
      if (!p.exId) p.exId = idFor(p.name);
      delete p.name;
    });
  });

  (routines || []).forEach(function (r) {
    (r.exercises || []).forEach(function (ex) {
      if (!ex.exId) ex.exId = idFor(ex.name, ex.type);
      delete ex.name;
      delete ex.type;
    });
  });

  return { exercises: exercises, history: history || [], routines: routines || [] };
}

function migrate() {
  if (localStorage.getItem("schema") === "2") {
    initializeDatabase();
    return;
  }

  const oldHistory = read("history", []);
  const oldRoutines = read("routines", []);
  const oldMuscles = read("muscles", {});
  write("backup_v1", { history: oldHistory, routines: oldRoutines, muscles: oldMuscles });

  const result = convertV1(oldHistory, oldRoutines, oldMuscles);
  saveExercises(result.exercises);
  saveHistory(result.history);
  saveRoutines(result.routines);
  try {
    localStorage.removeItem("draft");
    localStorage.setItem("schema", "2");
  } catch (e) {}
  initializeDatabase();
}
migrate();

// ---------- O(1) Exercise Helpers ----------
function getExercise(id) {
  if (!_exMap) rebuildExerciseMap(getExercises());
  return _exMap.get(id);
}
function exName(id) {
  const e = getExercise(id);
  return e ? e.name : "(Deleted Exercise)";
}
function exTypeOf(id) {
  const e = getExercise(id);
  if (!e) return "weight";
  if (e.type === "time") return "time";
  if (e.type === "reps") return "reps";
  return "weight";
}
function exEquipmentOf(id) {
  const e = getExercise(id);
  return e && e.equipment ? e.equipment : "Barbell";
}
function exPrimaryMuscleOf(id) {
  const e = getExercise(id);
  return e && e.primary ? e.primary : (e && e.muscle ? e.muscle : "Other");
}
function exSecondaryMusclesOf(id) {
  const e = getExercise(id);
  return e && Array.isArray(e.secondary) ? e.secondary : [];
}
function getExerciseYoutubeUrl(exId) {
  const name = exName(exId);
  const query = encodeURIComponent(name + " proper exercise form tutorial short");
  return "https://www.youtube.com/results?search_query=" + query;
}

function usageMap() {
  const map = {};
  getHistory().forEach(function (w) {
    (w.exercises || []).forEach(function (ex) {
      map[ex.exId] = (map[ex.exId] || 0) + 1;
    });
  });
  return map;
}

function exercisesWithData() {
  const u = usageMap();
  return getExercises()
    .filter(e => (u[e.id] || 0) > 0)
    .sort((a, b) => ((u[b.id] || 0) - (u[a.id] || 0)) || a.name.localeCompare(b.name));
}

function isExerciseUsed(id) {
  const inHistory = getHistory().some(w => (w.exercises || []).some(ex => ex.exId === id));
  const inRoutines = getRoutines().some(r => (r.exercises || []).some(ex => ex.exId === id));
  return inHistory || inRoutines;
}

// ---------- Weight Unit Conversions ----------
function showWeight(kg) {
  const v = unitName() === "lbs" ? Number(kg) * 2.20462 : Number(kg);
  return Math.round(v * 10) / 10;
}
function toKg(value) {
  const v = Number(value);
  return unitName() === "lbs" ? v / 2.20462 : v;
}
function convertWeightValue(val, fromUnit, toUnit) {
  if (fromUnit === toUnit || val === "" || val === null || val === undefined) return val;
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return val;
  const converted = fromUnit === "kg" ? num * 2.20462 : num / 2.20462;
  return String(Math.round(converted * 10) / 10);
}

// ---------- Barbell Plate Calculator & Warm-Up Generator ----------
function calculatePlates(targetWeight, barWeight, unit) {
  const u = unit || unitName();
  const plates = u === "lbs"
    ? [45, 35, 25, 10, 5, 2.5]
    : [20, 15, 10, 5, 2.5, 1.25];
  const bar = Number.isFinite(Number(barWeight)) ? Number(barWeight) : (u === "lbs" ? 45 : 20);
  const target = Number(targetWeight) || 0;

  if (target <= bar) {
    return { bar: bar, perSide: [], remainder: 0, achieved: bar, unit: u };
  }

  let remSide = (target - bar) / 2;
  const perSide = [];

  plates.forEach(function (p) {
    while (remSide + 0.001 >= p) {
      perSide.push(p);
      remSide = Math.round((remSide - p) * 100) / 100;
    }
  });

  const loadedPerSide = perSide.reduce((acc, v) => acc + v, 0);
  const achieved = Math.round((bar + loadedPerSide * 2) * 100) / 100;

  return {
    bar: bar,
    perSide: perSide,
    remainder: Math.round(remSide * 2 * 100) / 100,
    achieved: achieved,
    unit: u
  };
}

function generateWarmupSets(workingDisplayWeight, unit, equipment) {
  const u = unit || unitName();
  const isBarbell = (equipment === "Barbell" || equipment === "Smith Machine");
  const step = u === "lbs" ? 5 : 2.5;
  const minWeight = isBarbell ? (u === "lbs" ? 45 : 20) : (u === "lbs" ? 10 : 5);
  const w = Number(workingDisplayWeight) || 0;
  if (w <= minWeight) return [];

  function roundStep(val) {
    return Math.max(minWeight, Math.round(val / step) * step);
  }

  const scheme = isBarbell
    ? [{ pct: 0.50, reps: 8 }, { pct: 0.70, reps: 5 }, { pct: 0.85, reps: 2 }]
    : [{ pct: 0.55, reps: 10 }, { pct: 0.75, reps: 6 }];

  const warmups = [];
  const usedWeights = new Set();
  scheme.forEach(function (item) {
    const wt = roundStep(w * item.pct);
    if (wt < w && !usedWeights.has(wt)) {
      usedWeights.add(wt);
      warmups.push({
        displayWeight: String(wt),
        kg: u === "lbs" ? (wt / 2.20462) : wt,
        reps: item.reps,
        type: "W",
        done: false
      });
    }
  });
  return warmups;
}

// ---------- Dates & Intervals ----------
function workoutDate(w) {
  if (!w) return null;
  if (w.ts) return new Date(w.ts);
  const m = String(w.date || "").match(/(\d+)\D+(\d+)\D+(\d{4})/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const y = Number(m[3]);
  const month = b > 12 ? a : b;
  const day = b > 12 ? b : a;
  return new Date(y, month - 1, day);
}

function toDateInputValue(ts) {
  const d = ts ? new Date(ts) : new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

function weekStart(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.getTime();
}
function prevWeek(t) {
  const d = new Date(t);
  d.setDate(d.getDate() - 7);
  return d.getTime();
}
function todayKey() {
  const d = new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function fmtShort(d) {
  return d.getDate() + " " + MONTHS_SHORT[d.getMonth()];
}

// ---------- Strength Stats, Hevy-Style Set-by-Set Live PRs & Session PRs ----------
function e1rm(kg, reps) {
  if (reps <= 0 || kg <= 0) return 0;
  if (reps === 1) return kg;
  return kg * (1 + reps / 30);
}

function getStats(sets) {
  const st = { maxWeight: 0, best1rm: 0, bestSetVol: 0, maxReps: 0, totalVol: 0 };
  (sets || []).forEach(function (s) {
    if (s.type === "W") return;
    const kg = Number(s.kg) || 0;
    const reps = Number(s.reps) || 0;
    if (reps <= 0) return;
    if (kg > st.maxWeight) st.maxWeight = kg;
    const est = e1rm(kg, reps);
    if (est > st.best1rm) st.best1rm = est;
    if (kg * reps > st.bestSetVol) st.bestSetVol = kg * reps;
    if (reps > st.maxReps) st.maxReps = reps;
    st.totalVol += kg * reps;
  });
  return st;
}

function getAllSets(exId, excludeWorkoutId) {
  const all = [];
  getHistory().forEach(function (w) {
    if (excludeWorkoutId && w.id === excludeWorkoutId) return;
    (w.exercises || []).forEach(function (ex) {
      if (ex.exId === exId) {
        (ex.sets || []).forEach(function (s) {
          if (s.lifter !== "p2") all.push(s);
        });
      }
    });
  });
  return all;
}

function getPrevious(exId, excludeWorkoutId) {
  const hist = getHistory();
  for (let i = hist.length - 1; i >= 0; i--) {
    if (excludeWorkoutId && hist[i].id === excludeWorkoutId) continue;
    for (const ex of (hist[i].exercises || [])) {
      if (ex.exId === exId) {
        const p1Sets = (ex.sets || []).filter(s => s.lifter !== "p2");
        if (p1Sets.length > 0) return p1Sets;
      }
    }
  }
  return [];
}

function getExerciseHistory(exId, limit, excludeWorkoutId) {
  const hist = getHistory();
  const logs = [];
  for (let i = hist.length - 1; i >= 0; i--) {
    const w = hist[i];
    if (excludeWorkoutId && w.id === excludeWorkoutId) continue;
    for (const ex of (w.exercises || [])) {
      if (ex.exId === exId && ex.sets && ex.sets.length > 0) {
        const p1Sets = ex.sets.filter(s => s.lifter !== "p2");
        if (p1Sets.length === 0) continue;
        const d = workoutDate(w);
        logs.push({
          workoutTitle: w.title || "Strength Session",
          dateStr: d ? fmtShort(d) + " " + d.getFullYear() : (w.date || ""),
          sets: p1Sets
        });
        break;
      }
    }
    if (limit && logs.length >= limit) break;
  }
  return logs;
}

function detectPlateau(exId, excludeWorkoutId) {
  const recent = getExerciseHistory(exId, 3, excludeWorkoutId);
  if (recent.length < 3) return false;
  const type = exTypeOf(exId);
  const s0 = getStats(recent[0].sets);
  const s1 = getStats(recent[1].sets);
  const s2 = getStats(recent[2].sets);

  if (type === "reps" || type === "time") {
    return (s0.maxReps > 0 && s0.maxReps <= s1.maxReps && s1.maxReps <= s2.maxReps);
  }
  return (s0.best1rm > 0 && s0.best1rm <= s1.best1rm + 0.1 && s1.best1rm <= s2.best1rm + 0.1);
}

// Hevy-Style Live Set-Level PR Evaluator (Checks Weight, 1RM, Set Volume & Reps without dropping any!)
function evaluateSetLivePRs(exId, setKg, repsVal, runningBest) {
  const EPS = 0.05;
  const type = exTypeOf(exId);
  const broken = [];

  if (type === "time") {
    if (repsVal > 0 && repsVal > runningBest.maxReps) {
      runningBest.maxReps = repsVal;
      broken.push("LONGEST HOLD (" + repsVal + "s)");
    }
    return broken;
  }

  if (type === "reps") {
    if (repsVal > 0 && repsVal > runningBest.maxReps) {
      runningBest.maxReps = repsVal;
      broken.push("MAX REPS (" + repsVal + ")");
    }
    return broken;
  }

  const unit = unitName().toUpperCase();
  const isFirstEver = (runningBest.maxWeight === 0 && runningBest.best1rm === 0 && runningBest.bestSetVol === 0);

  if (isFirstEver) {
    if (setKg > 0 && repsVal > 0) {
      runningBest.maxWeight = setKg;
      runningBest.best1rm = e1rm(setKg, repsVal);
      runningBest.bestSetVol = setKg * repsVal;
      broken.push("1ST RECORD (" + showWeight(setKg) + " " + unit + " x " + repsVal + ")");
    }
    return broken;
  }

  if (setKg > runningBest.maxWeight + EPS) {
    runningBest.maxWeight = setKg;
    broken.push("HEAVIEST WEIGHT (" + showWeight(setKg) + " " + unit + ")");
  }
  const est = e1rm(setKg, repsVal);
  if (est > runningBest.best1rm + EPS) {
    runningBest.best1rm = est;
    broken.push("EST. 1RM (" + showWeight(est) + " " + unit + ")");
  }
  const vol = setKg * repsVal;
  if (vol > runningBest.bestSetVol + EPS) {
    runningBest.bestSetVol = vol;
    broken.push("BEST SET VOLUME (" + showWeight(vol) + " " + unit + ")");
  }
  return broken;
}

// Hevy-Style Complete Session PR Finder (Evaluates all 3 categories: Weight, 1RM, Set Volume!)
function findPRs(exId, newSets, excludeWorkoutId, priorSetsOverride) {
  const EPS = 0.05;
  const oldSets = priorSetsOverride !== undefined ? priorSetsOverride : getAllSets(exId, excludeWorkoutId);
  const old = getStats(oldSets);
  const now = getStats(newSets);
  const type = exTypeOf(exId);
  const prs = [];

  if (type === "time") {
    if (now.maxReps > 0 && (old.maxReps === 0 || now.maxReps > old.maxReps)) {
      prs.push({
        exId: exId,
        kind: old.maxReps === 0 ? "First Record" : "Longest Hold",
        val: now.maxReps,
        isTime: true,
        isReps: true
      });
    }
    return prs;
  }

  if (type === "reps") {
    if (now.maxReps > 0 && (old.maxReps === 0 || now.maxReps > old.maxReps)) {
      prs.push({
        exId: exId,
        kind: old.maxReps === 0 ? "First Record" : "Max Reps",
        val: now.maxReps,
        isReps: true
      });
    }
    return prs;
  }

  if (old.maxWeight === 0 && old.best1rm === 0) {
    if (now.maxWeight > 0) {
      prs.push({
        exId: exId,
        kind: "Heaviest Weight",
        val: now.maxWeight,
        isReps: false
      });
      prs.push({
        exId: exId,
        kind: "Est. 1RM",
        val: now.best1rm,
        isReps: false
      });
    }
    return prs;
  }

  if (now.maxWeight > old.maxWeight + EPS) {
    prs.push({
      exId: exId,
      kind: "Heaviest Weight",
      val: now.maxWeight,
      isReps: false
    });
  }
  if (now.best1rm > old.best1rm + EPS) {
    prs.push({
      exId: exId,
      kind: "Est. 1RM",
      val: now.best1rm,
      isReps: false
    });
  }
  if (now.bestSetVol > old.bestSetVol + EPS) {
    prs.push({
      exId: exId,
      kind: "Best Set Volume",
      val: now.bestSetVol,
      isReps: false
    });
  }
  return prs;
}

// Detailed Exercise-by-Exercise Comparison vs Previous Session (For Result Summary)
function getExerciseComparisonVsLast(exId, currentSets, workoutId) {
  const p1Current = (currentSets || []).filter(s => s.type !== "W" && s.lifter !== "p2");
  const prevSets = getPrevious(exId, workoutId).filter(s => s.type !== "W" && s.lifter !== "p2");
  const curSt = getStats(p1Current);
  const prevSt = getStats(prevSets);
  const type = exTypeOf(exId);
  const unit = unitName().toUpperCase();

  if (prevSets.length === 0) {
    return {
      hasPrev: false,
      badgeText: "FIRST LOGGED SESSION",
      isPositive: true
    };
  }

  if (type === "reps" || type === "time") {
    const diff = curSt.maxReps - prevSt.maxReps;
    const suffix = type === "time" ? "s" : " reps";
    if (diff > 0) return { hasPrev: true, badgeText: "▲ +" + diff + suffix + " vs last (" + prevSt.maxReps + suffix + ")", isPositive: true };
    if (diff === 0) return { hasPrev: true, badgeText: "= Matched last best (" + curSt.maxReps + suffix + ")", isPositive: true };
    return { hasPrev: true, badgeText: "Last best: " + prevSt.maxReps + suffix, isPositive: false };
  }

  const wtDiff = showWeight(curSt.maxWeight) - showWeight(prevSt.maxWeight);
  const volDiff = Math.round(showWeight(curSt.totalVol) - showWeight(prevSt.totalVol));
  const parts = [];

  if (wtDiff > 0) parts.push("▲ +" + Math.round(wtDiff * 10) / 10 + " " + unit + " Top Wt");
  else if (wtDiff === 0) parts.push("= Same Top Wt (" + showWeight(curSt.maxWeight) + " " + unit + ")");

  if (volDiff > 0) parts.push("▲ +" + volDiff + " " + unit + " Vol");
  else if (volDiff < 0 && wtDiff <= 0) parts.push("Last Top: " + showWeight(prevSt.maxWeight) + " " + unit);

  return {
    hasPrev: true,
    badgeText: parts.join("  ·  ") || ("Last Top: " + showWeight(prevSt.maxWeight) + " " + unit),
    isPositive: (wtDiff >= 0 || volDiff >= 0)
  };
}

function formatPRValue(pr) {
  if (pr.val !== undefined && pr.val !== null) {
    if (pr.isTime || exTypeOf(pr.exId) === "time") return pr.val + " sec";
    if (pr.isReps || exTypeOf(pr.exId) === "reps") return pr.val + " reps";
    return showWeight(pr.val) + " " + unitName().toUpperCase();
  }
  return pr.text || "";
}

function workoutVolume(w, includePartner) {
  let total = 0;
  (w.exercises || []).forEach(function (ex) {
    if (exTypeOf(ex.exId) !== "weight") return;
    (ex.sets || []).forEach(function (s) {
      if (s.type === "W") return;
      if (!includePartner && s.lifter === "p2") return;
      total += (Number(s.kg) || 0) * (Number(s.reps) || 0);
    });
  });
  return total;
}

function getWorkoutDuoStats(w) {
  if (!w || !w.partnerName) return null;
  const p1Name = (getAthleteProfile().name || "YOU").toUpperCase();
  const p2Name = String(w.partnerName).trim().toUpperCase();
  const unit = unitName().toUpperCase();

  let p1Vol = 0, p1Sets = 0, p1Top1rm = 0, p1TopLift = "";
  let p2Vol = 0, p2Sets = 0, p2Top1rm = 0, p2TopLift = "";

  (w.exercises || []).forEach(function (ex) {
    const isWeighted = exTypeOf(ex.exId) === "weight";
    const name = exName(ex.exId);

    (ex.sets || []).forEach(function (s) {
      if (s.type === "W") return;
      const kg = Number(s.kg) || 0;
      const reps = Number(s.reps) || 0;
      const vol = isWeighted ? (kg * reps) : 0;
      const est = isWeighted ? e1rm(kg, reps) : reps;

      if (s.lifter === "p2") {
        p2Sets++;
        p2Vol += vol;
        if (est > p2Top1rm) {
          p2Top1rm = est;
          p2TopLift = isWeighted ? (name + " (" + showWeight(kg) + " " + unit + " x " + reps + ")") : (name + " (" + reps + ")");
        }
      } else {
        p1Sets++;
        p1Vol += vol;
        if (est > p1Top1rm) {
          p1Top1rm = est;
          p1TopLift = isWeighted ? (name + " (" + showWeight(kg) + " " + unit + " x " + reps + ")") : (name + " (" + reps + ")");
        }
      }
    });
  });

  if (p2Sets === 0) return null;

  let winner = "TIE SESSION";
  if (p1Vol > p2Vol) winner = p1Name + " LEADS VOLUME";
  else if (p2Vol > p1Vol) winner = p2Name + " LEADS VOLUME";
  else if (p1Sets > p2Sets) winner = p1Name + " LEADS SETS";
  else if (p2Sets > p1Sets) winner = p2Name + " LEADS SETS";

  return {
    p1Name: p1Name,
    p1Vol: p1Vol,
    p1Sets: p1Sets,
    p1TopLift: p1TopLift || "—",
    p2Name: p2Name,
    p2Vol: p2Vol,
    p2Sets: p2Sets,
    p2TopLift: p2TopLift || "—",
    winner: winner
  };
}

function getWorkoutFlexInsights(w) {
  const unit = unitName().toUpperCase();
  const curVol = workoutVolume(w);
  const hist = getHistory().filter(item => item.id !== w.id);

  let prevVol = 0;
  for (let i = hist.length - 1; i >= 0; i--) {
    const v = workoutVolume(hist[i]);
    if (v > 0) {
      prevVol = v;
      break;
    }
  }

  let deltaText = "BASELINE SESSION";
  let deltaPositive = true;
  if (prevVol > 0 && curVol > 0) {
    const diffKg = curVol - prevVol;
    const pct = Math.round((diffKg / prevVol) * 100);
    if (diffKg >= 0) {
      deltaText = "▲ +" + showWeight(diffKg) + " " + unit + " (+" + pct + "% VS LAST)";
      deltaPositive = true;
    } else {
      deltaText = "▼ -" + showWeight(Math.abs(diffKg)) + " " + unit + " (" + pct + "% VS LAST)";
      deltaPositive = false;
    }
  }

  let mvp = null;
  let bestScore = -1;
  (w.exercises || []).forEach(function (ex) {
    const type = exTypeOf(ex.exId);
    const p1Sets = (ex.sets || []).filter(s => s.lifter !== "p2");
    const st = getStats(p1Sets);
    const workingCount = p1Sets.filter(s => s.type !== "W").length;
    if (workingCount === 0) return;

    const score = type === "weight" ? st.best1rm : st.maxReps;
    if (score > bestScore) {
      bestScore = score;
      let topRepsAtMax = st.maxReps;
      p1Sets.forEach(s => {
        if (s.type !== "W" && Number(s.kg) === st.maxWeight) {
          topRepsAtMax = Math.max(topRepsAtMax, Number(s.reps) || 0);
        }
      });

      mvp = {
        exId: ex.exId,
        name: exName(ex.exId),
        muscle: exPrimaryMuscleOf(ex.exId),
        equipment: exEquipmentOf(ex.exId),
        setsCount: workingCount,
        topSetText: type === "time"
          ? (st.maxReps + " SEC HOLD")
          : (type === "reps" ? (st.maxReps + " REPS") : (showWeight(st.maxWeight) + " " + unit + " x " + topRepsAtMax)),
        est1rmText: type === "weight" ? (showWeight(st.best1rm) + " " + unit) : "BODYWEIGHT",
        volumeText: type === "weight" ? (showWeight(st.totalVol) + " " + unit) : (workingCount + " SETS")
      };
    }
  });

  return {
    deltaText: deltaText,
    deltaPositive: deltaPositive,
    mvp: mvp,
    xpEarned: calculateWorkoutXP(w)
  };
}

function calculateMuscleWorkload(workouts) {
  const workload = {};
  (workouts || []).forEach(function (w) {
    (w.exercises || []).forEach(function (ex) {
      const primary = exPrimaryMuscleOf(ex.exId);
      const secondaries = exSecondaryMusclesOf(ex.exId);
      (ex.sets || []).forEach(function (s) {
        if (s.type === "W" || s.lifter === "p2") return;
        if (primary && primary !== "Other") {
          if (!workload[primary]) workload[primary] = { direct: 0, indirect: 0, total: 0 };
          workload[primary].direct += 1;
          workload[primary].total += 1;
        }
        secondaries.forEach(function (sec) {
          if (!sec || sec === "Other") return;
          if (!workload[sec]) workload[sec] = { direct: 0, indirect: 0, total: 0 };
          workload[sec].indirect += 1;
          workload[sec].total += 0.5;
        });
      });
    });
  });
  return workload;
}

function calculateMuscleRecovery() {
  const now = Date.now();
  const lookbackMs = 96 * 3600 * 1000;
  const largeMuscles = new Set(["Chest", "Back", "Quads", "Hamstrings", "Glutes"]);
  const trackedMuscles = MUSCLES.filter(m => m !== "Other");
  const fatigueScore = {};
  const lastTrainedTs = {};

  trackedMuscles.forEach(m => {
    fatigueScore[m] = 0;
    lastTrainedTs[m] = 0;
  });

  getHistory().forEach(function (w) {
    const d = workoutDate(w);
    if (!d) return;
    const ts = d.getTime();
    const ageMs = now - ts;
    if (ageMs < 0 || ageMs > lookbackMs) return;

    const ageHours = ageMs / 3600000;
    (w.exercises || []).forEach(function (ex) {
      const primary = exPrimaryMuscleOf(ex.exId);
      const secondaries = exSecondaryMusclesOf(ex.exId);
      const workingSets = (ex.sets || []).filter(s => s.type !== "W" && s.lifter !== "p2").length;
      if (workingSets <= 0) return;

      if (primary && fatigueScore[primary] !== undefined) {
        const recWindow = largeMuscles.has(primary) ? 72 : 48;
        if (ageHours < recWindow) {
          const decay = 1 - (ageHours / recWindow);
          fatigueScore[primary] += workingSets * 12 * decay;
          if (ts > lastTrainedTs[primary]) lastTrainedTs[primary] = ts;
        }
      }

      secondaries.forEach(function (sec) {
        if (sec && fatigueScore[sec] !== undefined) {
          const recWindow = largeMuscles.has(sec) ? 72 : 48;
          if (ageHours < recWindow) {
            const decay = 1 - (ageHours / recWindow);
            fatigueScore[sec] += workingSets * 5 * decay;
            if (ts > lastTrainedTs[sec]) lastTrainedTs[sec] = ts;
          }
        }
      });
    });
  });

  return trackedMuscles.map(function (m) {
    const rawFatigue = Math.min(95, Math.round(fatigueScore[m]));
    const recoveryPct = Math.max(5, 100 - rawFatigue);
    let status = "Fresh";
    if (recoveryPct < 55) status = "Heavy Load";
    else if (recoveryPct < 85) status = "Recovering";
    return {
      muscle: m,
      pct: recoveryPct,
      status: status,
      lastTs: lastTrainedTs[m]
    };
  }).sort((a, b) => a.pct - b.pct);
}

// ---------- Hardened Hevy & Strong CSV Importer (With Chronological PR Calculation!) ----------
function parseCsvRows(text) {
  const src = String(text || "");
  if (!src.trim()) return [];

  const firstBreak = src.indexOf("\n");
  const sample = firstBreak === -1 ? src : src.slice(0, firstBreak);
  const delim = (sample.split(";").length > sample.split(",").length) ? ";" : ",";

  const matrix = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delim) {
        row.push(cell.trim());
        cell = "";
      } else if (ch === "\r" && src[i + 1] === "\n") {
        row.push(cell.trim());
        if (row.some(v => v !== "")) matrix.push(row);
        row = [];
        cell = "";
        i++;
      } else if (ch === "\n" || ch === "\r") {
        row.push(cell.trim());
        if (row.some(v => v !== "")) matrix.push(row);
        row = [];
        cell = "";
      } else {
        cell += ch;
      }
    }
  }
  row.push(cell.trim());
  if (row.some(v => v !== "")) matrix.push(row);
  if (matrix.length < 2) return [];

  const headers = matrix[0].map(h => h.toLowerCase().trim());
  const rows = [];
  for (let r = 1; r < matrix.length; r++) {
    const vals = matrix[r];
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = vals[idx] !== undefined ? vals[idx] : "";
    });
    rows.push(obj);
  }
  return rows;
}

function normalizeExNameForMatch(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .sort()
    .join(" ");
}

function importWorkoutsFromCsv(csvText) {
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) {
    throw new Error("CSV file is empty or unreadable.");
  }

  const allExercises = getExercises();
  let exercisesModified = false;

  function matchOrCreateExercise(rawName, isTimedHint) {
    const clean = String(rawName || "Unknown Exercise").trim();
    const lower = clean.toLowerCase();
    let found = allExercises.find(e => e.name.toLowerCase() === lower);

    if (!found) {
      const norm = normalizeExNameForMatch(clean);
      if (norm.length >= 4) {
        found = allExercises.find(e => normalizeExNameForMatch(e.name) === norm);
      }
    }

    if (!found) {
      let guessedEquip = "Barbell";
      if (lower.includes("dumbbell") || lower.includes("db")) guessedEquip = "Dumbbell";
      else if (lower.includes("cable")) guessedEquip = "Cable";
      else if (lower.includes("machine")) guessedEquip = "Machine";
      else if (lower.includes("smith")) guessedEquip = "Smith Machine";
      else if (lower.includes("bodyweight") || lower.includes("push-up") || lower.includes("pull-up") || lower.includes("plank")) guessedEquip = "Bodyweight";

      found = {
        id: newId(),
        name: clean.slice(0, 100),
        type: isTimedHint ? "time" : "weight",
        equipment: guessedEquip,
        primary: "Other",
        secondary: []
      };
      allExercises.push(found);
      exercisesModified = true;
    }
    return found.id;
  }

  const sessionMap = new Map();

  rows.forEach(function (r) {
    const title = r["title"] || r["workout name"] || r["workout_name"] || "Imported Workout";
    const dateRaw = r["start_time"] || r["date"] || r["workout_date"] || "";
    const endRaw = r["end_time"] || "";
    const exTitle = r["exercise_title"] || r["exercise name"] || r["exercise"] || "";
    if (!exTitle) return;

    const sessionKey = dateRaw + "__" + title;
    if (!sessionMap.has(sessionKey)) {
      const parsedStart = Date.parse(dateRaw);
      const ts = Number.isFinite(parsedStart) ? parsedStart : Date.now();
      let durationMs = 45 * 60000;
      if (endRaw) {
        const parsedEnd = Date.parse(endRaw);
        if (Number.isFinite(parsedEnd) && parsedEnd > ts) {
          durationMs = Math.min(parsedEnd - ts, 5 * 3600000);
        }
      } else if (r["duration"] && Number(r["duration"]) > 0) {
        durationMs = Number(r["duration"]) * 1000;
      }

      sessionMap.set(sessionKey, {
        id: newId(),
        title: title,
        notes: r["description"] || r["workout notes"] || "",
        ts: ts,
        date: new Date(ts).toLocaleString(),
        duration: durationMs,
        exOrder: [],
        exGroups: {},
        prs: []
      });
    }

    const session = sessionMap.get(sessionKey);
    const hasSecondsCol = (r["duration_seconds"] && Number(r["duration_seconds"]) > 0) || (r["seconds"] && Number(r["seconds"]) > 0);
    const exId = matchOrCreateExercise(exTitle, !!hasSecondsCol);

    if (!session.exGroups[exId]) {
      session.exGroups[exId] = { exId: exId, sets: [], isSuperset: false };
      session.exOrder.push(exId);
    }

    let kg = 0;
    if (r["weight_kg"] !== undefined && r["weight_kg"] !== "") {
      kg = Number(r["weight_kg"]) || 0;
    } else if (r["weight_lbs"] !== undefined && r["weight_lbs"] !== "") {
      kg = (Number(r["weight_lbs"]) || 0) / 2.20462;
    } else if (r["weight"] !== undefined && r["weight"] !== "") {
      const rawW = Number(r["weight"]) || 0;
      kg = unitName() === "lbs" ? rawW / 2.20462 : rawW;
    }

    const repsOrSec = Math.max(1, Math.round(Number(r["reps"] || r["duration_seconds"] || r["seconds"] || 1)));
    const rawType = String(r["set_type"] || r["set order"] || "N").toUpperCase();
    let setType = "N";
    if (rawType.startsWith("W")) setType = "W";
    else if (rawType.startsWith("D")) setType = "D";
    else if (rawType.startsWith("F")) setType = "F";

    const rpeVal = Number(r["rpe"]);
    const setObj = {
      kg: Math.round(kg * 100) / 100,
      reps: repsOrSec,
      type: setType
    };
    if (Number.isFinite(rpeVal) && rpeVal >= 5 && rpeVal <= 10) {
      setObj.rpe = rpeVal;
    }

    session.exGroups[exId].sets.push(setObj);
  });

  if (exercisesModified) {
    saveExercises(allExercises);
  }

  const currentHistory = getHistory();
  const existingSignatures = new Set(currentHistory.map(function (w) {
    const d = workoutDate(w);
    const dayBucket = d ? (d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate()) : "";
    return dayBucket + "|" + String(w.title || "").toLowerCase() + "|" + (w.exercises || []).length;
  }));

  const importedWorkouts = [];
  let skippedDuplicates = 0;

  sessionMap.forEach(function (s) {
    const exercises = s.exOrder.map(id => s.exGroups[id]).filter(g => g.sets.length > 0);
    if (exercises.length > 0) {
      const d = new Date(s.ts);
      const sig = (d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate()) + "|" + s.title.toLowerCase() + "|" + exercises.length;
      if (existingSignatures.has(sig)) {
        skippedDuplicates++;
        return;
      }
      existingSignatures.add(sig);
      importedWorkouts.push({
        id: s.id,
        title: s.title,
        notes: s.notes,
        ts: s.ts,
        date: s.date,
        duration: s.duration,
        exercises: exercises,
        prs: []
      });
    }
  });

  if (importedWorkouts.length === 0 && skippedDuplicates > 0) {
    return { imported: 0, skipped: skippedDuplicates };
  }
  if (importedWorkouts.length === 0) {
    throw new Error("No valid workout sets found in CSV file.");
  }

  // Merge chronologically and compute historical PRs across all workouts!
  const merged = [...currentHistory, ...importedWorkouts].sort((a, b) => (a.ts || 0) - (b.ts || 0));
  const runningSetsByEx = {};
  merged.forEach(function (w) {
    const workoutPrs = [];
    (w.exercises || []).forEach(function (ex) {
      const priorSets = runningSetsByEx[ex.exId] || [];
      const found = findPRs(ex.exId, ex.sets, null, priorSets);
      found.forEach(function (pr) {
        workoutPrs.push({
          exId: ex.exId,
          kind: pr.kind,
          val: pr.val,
          isReps: pr.isReps,
          isTime: pr.isTime,
          name: exName(ex.exId)
        });
      });
      if (!runningSetsByEx[ex.exId]) runningSetsByEx[ex.exId] = [];
      (ex.sets || []).forEach(s => {
        if (s.lifter !== "p2") runningSetsByEx[ex.exId].push(s);
      });
    });
    if (!w.prs || w.prs.length === 0) {
      w.prs = workoutPrs;
    }
  });

  saveHistory(merged);
  return { imported: importedWorkouts.length, skipped: skippedDuplicates };
}