// ============ store.js : STRVEX DATA, CACHE, RECOVERY, MEASUREMENTS & CSV ENGINE ============

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MUSCLES = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms",
  "Quads", "Hamstrings", "Glutes", "Calves", "Core", "Other"];
const EQUIPMENTS = ["All", "Barbell", "Dumbbell", "Cable", "Machine", "Smith Machine", "Bodyweight"];

// ---------- High-Speed In-Memory Cache & O(1) Lookup ----------
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
  if (CACHED_KEYS.has(key)) {
    _cache[key] = value;
    if (key === "exercises" && Array.isArray(value)) rebuildExerciseMap(value);
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error("STRVEX Storage Error:", err);
    if (typeof showToast === "function") {
      showToast("⚠️ Device storage full! Please export a backup in Settings.");
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
    unit: s && s.unit === "lbs" ? "lbs" : "kg",
    rest: s && Number(s.rest) > 0 ? Number(s.rest) : 60,
    barKg: s && Number(s.barKg) >= 0 ? Number(s.barKg) : 20,
    barLbs: s && Number(s.barLbs) >= 0 ? Number(s.barLbs) : 45
  };
}
function saveSettings(s) { return write("settings", s); }
function unitName() { return getSettings().unit; }

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
        // Sync "time" type upgrade for isometric exercises (Plank, Dead Hang, Wall Sit)
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

function generateWarmupSets(workingWeight, unit) {
  const u = unit || unitName();
  const step = u === "lbs" ? 5 : 2.5;
  const minBar = u === "lbs" ? 45 : 20;
  const w = Number(workingWeight) || 0;
  if (w <= minBar) return [];

  function roundStep(val) {
    return Math.max(minBar, Math.round(val / step) * step);
  }

  const rawScheme = [
    { pct: 0.50, reps: 8 },
    { pct: 0.70, reps: 5 },
    { pct: 0.85, reps: 2 }
  ];

  const warmups = [];
  const usedWeights = new Set();
  rawScheme.forEach(function (item) {
    const wt = roundStep(w * item.pct);
    if (wt < w && !usedWeights.has(wt)) {
      usedWeights.add(wt);
      warmups.push({ kg: wt, reps: item.reps, type: "W", done: false });
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

// ---------- Strength Stats, PR & 1RM ----------
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
        (ex.sets || []).forEach(s => all.push(s));
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
      if (ex.exId === exId) return ex.sets || [];
    }
  }
  return [];
}

function getExerciseHistory(exId, limit) {
  const hist = getHistory();
  const logs = [];
  for (let i = hist.length - 1; i >= 0; i--) {
    const w = hist[i];
    for (const ex of (w.exercises || [])) {
      if (ex.exId === exId && ex.sets && ex.sets.length > 0) {
        const d = workoutDate(w);
        logs.push({
          workoutTitle: w.title || "Strength Session",
          dateStr: d ? fmtShort(d) + " " + d.getFullYear() : (w.date || ""),
          sets: ex.sets
        });
        break;
      }
    }
    if (limit && logs.length >= limit) break;
  }
  return logs;
}

function findPRs(exId, newSets, excludeWorkoutId) {
  const EPS = 0.05;
  const old = getStats(getAllSets(exId, excludeWorkoutId));
  const now = getStats(newSets);
  const type = exTypeOf(exId);

  if (type === "time") {
    if (old.maxReps > 0 && now.maxReps > old.maxReps) {
      return [{
        exId: exId,
        kind: "Longest Hold",
        val: now.maxReps,
        isTime: true,
        isReps: true
      }];
    }
    return [];
  }

  if (type === "reps") {
    if (old.maxReps > 0 && now.maxReps > old.maxReps) {
      return [{
        exId: exId,
        kind: "Max Reps",
        val: now.maxReps,
        isReps: true
      }];
    }
    return [];
  }

  if (old.maxWeight > 0 && now.maxWeight > old.maxWeight + EPS) {
    return [{
      exId: exId,
      kind: "Heaviest Weight",
      val: now.maxWeight,
      isReps: false
    }];
  }
  if (old.best1rm > 0 && now.best1rm > old.best1rm + EPS) {
    return [{
      exId: exId,
      kind: "Est. 1RM",
      val: now.best1rm,
      isReps: false
    }];
  }
  if (old.bestSetVol > 0 && now.bestSetVol > old.bestSetVol + EPS) {
    return [{
      exId: exId,
      kind: "Best Set Volume",
      val: now.bestSetVol,
      isReps: false
    }];
  }
  return [];
}

function formatPRValue(pr) {
  if (pr.val !== undefined && pr.val !== null) {
    if (pr.isTime || exTypeOf(pr.exId) === "time") return pr.val + " sec";
    if (pr.isReps || exTypeOf(pr.exId) === "reps") return pr.val + " reps";
    return showWeight(pr.val) + " " + unitName().toUpperCase();
  }
  return pr.text || "";
}

function workoutVolume(w) {
  let total = 0;
  (w.exercises || []).forEach(function (ex) {
    if (exTypeOf(ex.exId) !== "weight") return;
    (ex.sets || []).forEach(function (s) {
      if (s.type !== "W") total += (Number(s.kg) || 0) * (Number(s.reps) || 0);
    });
  });
  return total;
}

function calculateMuscleWorkload(workouts) {
  const workload = {};
  (workouts || []).forEach(function (w) {
    (w.exercises || []).forEach(function (ex) {
      const primary = exPrimaryMuscleOf(ex.exId);
      const secondaries = exSecondaryMusclesOf(ex.exId);
      (ex.sets || []).forEach(function (s) {
        if (s.type === "W") return;
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

// ---------- Muscle Recovery % (Freshness / Readiness Engine) ----------
function calculateMuscleRecovery() {
  const now = Date.now();
  const lookbackMs = 96 * 3600 * 1000; // 4 days window
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
      const workingSets = (ex.sets || []).filter(s => s.type !== "W").length;
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
    if (recoveryPct < 55) status = "Rest Needed";
    else if (recoveryPct < 85) status = "Recovering";
    return {
      muscle: m,
      pct: recoveryPct,
      status: status,
      lastTs: lastTrainedTs[m]
    };
  }).sort((a, b) => a.pct - b.pct);
}

// ---------- Hevy & Strong CSV Importer Engine ----------
function parseCsvRows(text) {
  const lines = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const delim = (headerLine.split(";").length > headerLine.split(",").length) ? ";" : ",";

  function splitLine(line) {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delim && !inQuotes) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  }

  const headers = splitLine(lines[0]).map(h => h.toLowerCase().replace(/^"|"$/g, "").trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = splitLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = vals[idx] !== undefined ? vals[idx].replace(/^"|"$/g, "").trim() : "";
    });
    rows.push(obj);
  }
  return rows;
}

function importWorkoutsFromCsv(csvText) {
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) {
    throw new Error("CSV file is empty or unreadable.");
  }

  const allExercises = getExercises();
  let exercisesModified = false;

  function matchOrCreateExercise(rawName) {
    const clean = String(rawName || "Unknown Exercise").trim();
    const lower = clean.toLowerCase();
    let found = allExercises.find(e => e.name.toLowerCase() === lower);
    if (!found) {
      found = allExercises.find(e => e.name.toLowerCase().includes(lower) || lower.includes(e.name.toLowerCase()));
    }
    if (!found) {
      found = {
        id: newId(),
        name: clean.slice(0, 100),
        type: "weight",
        equipment: "Barbell",
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
    const exTitle = r["exercise_title"] || r["exercise name"] || r["exercise"] || "";
    if (!exTitle) return;

    const sessionKey = dateRaw + "__" + title;
    if (!sessionMap.has(sessionKey)) {
      const parsedDate = Date.parse(dateRaw);
      const ts = Number.isFinite(parsedDate) ? parsedDate : Date.now();
      sessionMap.set(sessionKey, {
        id: newId(),
        title: title,
        notes: r["description"] || r["workout notes"] || "",
        ts: ts,
        date: new Date(ts).toLocaleString(),
        duration: 45 * 60000,
        exOrder: [],
        exGroups: {},
        prs: []
      });
    }

    const session = sessionMap.get(sessionKey);
    const exId = matchOrCreateExercise(exTitle);

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

  const importedWorkouts = [];
  sessionMap.forEach(function (s) {
    const exercises = s.exOrder.map(id => s.exGroups[id]).filter(g => g.sets.length > 0);
    if (exercises.length > 0) {
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

  if (importedWorkouts.length === 0) {
    throw new Error("No valid workout sets found in CSV file.");
  }

  importedWorkouts.sort((a, b) => a.ts - b.ts);
  const currentHistory = getHistory();
  const merged = [...currentHistory, ...importedWorkouts].sort((a, b) => (a.ts || 0) - (b.ts || 0));
  saveHistory(merged);
  return importedWorkouts.length;
}