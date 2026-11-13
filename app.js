// ============ app.js (PART 1/2) : STRVEX CORE ENGINE, COCKPIT, PLATES & CARDS ============

function $(id) {
  return document.getElementById(id);
}

// Safe HTML escaping to prevent XSS on any user/imported strings
function esc(str) {
  return String(str === null || str === undefined ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------- State ----------
const TABS = ["workout", "history", "progress", "more"];
let currentTab = "workout";
let workoutActive = false;
let workoutStart = 0;
let editingWorkoutId = null; // Non-null when editing a past workout from History
let editingRoutineId = null; // Non-null when editing a routine template
let clockId = null;
let restEnd = 0;
let restId = null;
let progressExId = "";
let progressMetric = "weight";
let progressRangeDays = "all"; // "30" | "90" | "180" | "all"
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let selectedCalDay = null;
let historyVisibleCount = 15; // Pagination for 400+ workouts
let sheetMode = "pick"; // pick | swap | create-add | create | edit
let editingId = null;
let swappingCard = null;
let formType = "weight";
let wakeLock = null;
let isSummaryFromHistory = false;
let lastWindowWidth = window.innerWidth;

// Filter States
let sheetFilterMuscle = "All";
let sheetFilterEquipment = "All";
let routineCategoryFilter = "all";
let libFilterMuscle = "All";
let libFilterEquipment = "All";
let selectedSecondaryMuscles = new Set();

// ---------- Web Audio API Singleton (Offline Beep) ----------
let audioCtx = null;
function getAudioCtx() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
document.addEventListener("pointerdown", getAudioCtx, { once: true });

function playBeep(freq, type, duration) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq || 880, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

function playTimerFinishedBeep() {
  playBeep(880, "sine", 0.12);
  setTimeout(function () { playBeep(880, "sine", 0.12); }, 150);
  setTimeout(function () { playBeep(1174.66, "sine", 0.35); }, 320);
}

// ---------- Screen Wake Lock API ----------
async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", function () { wakeLock = null; });
    }
  } catch (err) {}
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(function () {});
    wakeLock = null;
  }
}

document.addEventListener("visibilitychange", function () {
  if (workoutActive && document.visibilityState === "visible") {
    requestWakeLock();
  }
});

// ---------- Toast Notifications ----------
let toastId = null;
function showToast(msg) {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastId);
  toastId = setTimeout(function () { t.classList.remove("show"); }, 2600);
}

// ---------- Segmented Controls ----------
function setSegmented(el, v) {
  if (!el) return;
  el.querySelectorAll("button").forEach(function (b) {
    b.classList.toggle("active", b.dataset.v === v);
  });
}
function bindSegmented(el, onChange) {
  if (!el) return;
  el.querySelectorAll("button").forEach(function (b) {
    b.addEventListener("click", function () {
      if (el.classList.contains("locked")) return;
      setSegmented(el, b.dataset.v);
      onChange(b.dataset.v);
    });
  });
}

// ---------- Escape Key Modal Handler ----------
document.addEventListener("keydown", function (e) {
  if (e.key !== "Escape") return;
  if ($("plateModal") && !$("plateModal").classList.contains("hidden")) {
    closePlateCalculator();
  } else if ($("exInfoModal") && !$("exInfoModal").classList.contains("hidden")) {
    closeExerciseInfo();
  } else if ($("routinePreviewModal") && !$("routinePreviewModal").classList.contains("hidden")) {
    closeRoutinePreview();
  } else if ($("summaryModal") && !$("summaryModal").classList.contains("hidden")) {
    closeSummaryModal();
  } else if ($("sheet") && !$("sheet").classList.contains("hidden")) {
    closeSheet();
  }
});

// =====================================================
//  NAVIGATION & TABS
// =====================================================
function showTab(name) {
  if (!TABS.includes(name)) name = "workout";
  currentTab = name;
  if (location.hash.slice(1) !== name) history.replaceState(null, "", "#" + name);
  TABS.forEach(function (t) {
    $("tab-" + t).classList.toggle("hidden", t !== name);
  });
  document.querySelectorAll(".tabBtn").forEach(function (b) {
    b.classList.toggle("active", b.dataset.tab === name);
  });
  renderTab(name);
}

function renderTab(name) {
  if (name === "workout") renderWorkoutTab();
  if (name === "history") renderHistoryTab();
  if (name === "progress") renderProgressTab();
  if (name === "more") renderMoreTab();
}

document.querySelectorAll(".tabBtn").forEach(function (b) {
  b.addEventListener("click", function () {
    if (currentTab === b.dataset.tab) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    location.hash = b.dataset.tab;
  });
});

window.addEventListener("hashchange", function () {
  showTab(location.hash.slice(1));
  window.scrollTo(0, 0);
});

// =====================================================
//  TAB 1: LOGBOOK (HOME)
// =====================================================
function syncRoutineCategoryChips() {
  const container = $("routineCategoryFilter");
  if (!container) return;
  container.querySelectorAll(".filter-chip").forEach(c => {
    c.classList.toggle("active", (c.dataset.cat || "all") === routineCategoryFilter);
  });
}

function bindRoutineCategoryFilters() {
  const container = $("routineCategoryFilter");
  if (!container) return;
  container.addEventListener("click", function (e) {
    const chip = e.target.closest(".filter-chip");
    if (!chip) return;
    container.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    routineCategoryFilter = chip.dataset.cat || "all";
    renderWorkoutTab();
  });
}

function renderWorkoutTab() {
  updateHeroStats();
  syncRoutineCategoryChips();

  const totalExercises = getExercises().length;
  if ($("headerExerciseCount")) {
    $("headerExerciseCount").textContent = totalExercises + " EXERCISES";
  }

  // Active workout resume banner with 1-tap DISCARD button
  const resume = $("resumeCard");
  resume.innerHTML = "";
  if (workoutActive) {
    const card = document.createElement("div");
    card.className = "card resume";
    const modeLabel = editingRoutineId
      ? "EDITING ROUTINE TEMPLATE"
      : (editingWorkoutId ? "EDITING PAST WORKOUT LOG" : "ACTIVE WORKOUT IN PROGRESS");
    card.innerHTML =
      '<div class="resume-info">' +
        '<b>' + esc(modeLabel) + '</b>' +
        '<div class="resume-time" id="resumeClock">00:00:00</div>' +
      '</div>' +
      '<div class="resume-actions">' +
        '<button id="resumeDiscardBtn" class="keycap-btn danger">DISCARD</button>' +
        '<button id="resumeActiveBtn" class="keycap-btn primary">RESUME ›</button>' +
      '</div>';
    card.querySelector("#resumeActiveBtn").addEventListener("click", openWorkoutScreen);
    card.querySelector("#resumeDiscardBtn").addEventListener("click", discardWorkout);
    resume.appendChild(card);
    updateClock();
  }

  // Routine templates list: USER'S CUSTOM ROUTINES FIRST
  const list = $("routineList");
  list.innerHTML = "";
  const routines = getRoutines();

  const customRoutines = routines.filter(r => r.category === "Custom Templates" || !String(r.id).startsWith("routine_"));
  const curatedRoutines = routines.filter(r => r.category !== "Custom Templates" && String(r.id).startsWith("routine_"));

  let displayRoutines = [];
  if (routineCategoryFilter === "all") {
    displayRoutines = [...customRoutines, ...curatedRoutines];
  } else if (routineCategoryFilter === "custom") {
    displayRoutines = customRoutines;
  } else {
    displayRoutines = curatedRoutines.filter(r => r.category === routineCategoryFilter);
  }

  if ($("routineCountHeader")) {
    $("routineCountHeader").textContent = displayRoutines.length + " ROUTINES";
  }

  if (displayRoutines.length === 0) {
    list.innerHTML =
      '<div class="metal-card" style="text-align:center; color:var(--muted); padding:24px 16px;">' +
        '<p style="margin:0 0 6px; font-weight:700;">No routines found under this filter.</p>' +
        '<small style="font-family:var(--font-mono);">' +
          (routineCategoryFilter === "custom"
            ? 'You have not saved any custom routines yet. Tap "+ START EMPTY WORKOUT" and tap "SAVE AS ROUTINE" to create your own!'
            : 'Select "ALL ROUTINES" or create your own custom template.') +
        '</small>' +
      '</div>';
    return;
  }

  displayRoutines.forEach(function (r) {
    const card = document.createElement("div");
    card.className = "metal-card routine-card";
    const isCustom = r.category === "Custom Templates" || !String(r.id).startsWith("routine_");

    const muscleSet = new Set();
    (r.exercises || []).forEach(e => {
      const m = exPrimaryMuscleOf(e.exId);
      if (m && m !== "Other") muscleSet.add(m);
    });
    const musclePillsHtml = Array.from(muscleSet).slice(0, 4)
      .map(m => '<span class="routine-pill">' + esc(m.toUpperCase()) + '</span>').join("");

    card.innerHTML =
      '<div class="routine-card-header">' +
        '<div class="routine-title-wrap">' +
          '<span class="routine-category-badge' + (isCustom ? ' custom-routine-badge' : '') + '"></span>' +
          '<h3></h3>' +
        '</div>' +
      '</div>' +
      '<div class="routine-muscle-pills">' + musclePillsHtml + '</div>' +
      '<div class="routine-footer-row">' +
        '<span class="routine-exercise-count">' + (r.exercises ? r.exercises.length : 0) + ' Exercises</span>' +
        '<div class="routine-card-buttons">' +
          '<button class="keycap-btn prev-btn">PREVIEW</button>' +
          '<button class="keycap-btn edit-r-btn" title="Edit Routine">✎ EDIT</button>' +
          '<button class="keycap-btn primary start-btn">START</button>' +
          '<button class="keycap-btn danger del-btn" title="Delete Routine" aria-label="Delete Routine">✕</button>' +
        '</div>' +
      '</div>';

    card.querySelector(".routine-category-badge").textContent =
      isCustom ? "★ MY CUSTOM ROUTINE" : (r.category || "WORKOUT SPLIT");
    card.querySelector("h3").textContent = r.name;

    card.querySelector(".prev-btn").addEventListener("click", function (e) {
      e.stopPropagation();
      openRoutinePreview(r);
    });

    card.querySelector(".edit-r-btn").addEventListener("click", function (e) {
      e.stopPropagation();
      startEditRoutine(r);
    });

    card.querySelector(".start-btn").addEventListener("click", function (e) {
      e.stopPropagation();
      startRoutine(r);
    });

    card.querySelector(".del-btn").addEventListener("click", function (e) {
      e.stopPropagation();
      if (confirm('Delete routine "' + r.name + '"?')) {
        const all = getRoutines();
        const globalIndex = all.findIndex(item => item.id === r.id);
        if (globalIndex !== -1) {
          if (String(r.id).startsWith("routine_") && typeof markCuratedRoutineDeleted === "function") {
            markCuratedRoutineDeleted(r.id);
          }
          all.splice(globalIndex, 1);
          saveRoutines(all);
          renderWorkoutTab();
          showToast("Routine deleted");
        }
      }
    });

    list.appendChild(card);
  });
}

// ---------- Split Preview Modal Controller ----------
let activePreviewRoutine = null;
function openRoutinePreview(r) {
  activePreviewRoutine = r;
  $("prevCatBadge").textContent = (r.category || "CUSTOM ROUTINE").toUpperCase();
  $("prevRoutineTitle").textContent = r.name;
  $("prevRoutineDesc").textContent = r.description || "Structured workout routine ready for progressive overload logging.";

  const list = $("prevExerciseList");
  list.innerHTML = "";
  (r.exercises || []).forEach((item, idx) => {
    const ex = getExercise(item.exId);
    const exNameStr = ex ? ex.name : "(Unknown Exercise)";
    const equip = ex ? exEquipmentOf(ex.id) : "Equipment";
    const setsCount = item.sets || 3;

    const row = document.createElement("div");
    row.className = "preview-exercise-item";

    const nameDiv = document.createElement("div");
    nameDiv.className = "preview-ex-name";
    nameDiv.textContent = pad(idx + 1) + ". " + exNameStr;

    const metaDiv = document.createElement("div");
    metaDiv.className = "preview-ex-meta";
    metaDiv.innerHTML =
      '<span class="equip-badge">' + esc(equip) + '</span>' +
      '<span class="sets-badge">' + esc(setsCount + (item.reps ? " × " + item.reps : " SETS")) + '</span>';

    row.appendChild(nameDiv);
    row.appendChild(metaDiv);
    list.appendChild(row);
  });

  $("routinePreviewBackdrop").classList.remove("hidden");
  $("routinePreviewModal").classList.remove("hidden");
}

function closeRoutinePreview() {
  $("routinePreviewBackdrop").classList.add("hidden");
  $("routinePreviewModal").classList.add("hidden");
  activePreviewRoutine = null;
}

$("prevCloseBtn").addEventListener("click", closeRoutinePreview);
$("routinePreviewBackdrop").addEventListener("click", closeRoutinePreview);
$("prevStartBtn").addEventListener("click", function () {
  if (activePreviewRoutine) {
    const r = activePreviewRoutine;
    closeRoutinePreview();
    startRoutine(r);
  }
});
if ($("prevEditBtn")) {
  $("prevEditBtn").addEventListener("click", function () {
    if (activePreviewRoutine) {
      const r = activePreviewRoutine;
      closeRoutinePreview();
      startEditRoutine(r);
    }
  });
}

// ---------- Barbell Plate Calculator Modal Controller ----------
function openPlateCalculator(initialWeight) {
  const unit = unitName();
  const settings = getSettings();
  $("plateUnitLabel").textContent = unit.toUpperCase();

  const defaultTarget = initialWeight && Number(initialWeight) > 0
    ? Number(initialWeight)
    : (unit === "lbs" ? 135 : 60);
  $("plateTargetInput").value = defaultTarget;

  renderPlateBarOptions();
  updatePlateCalculatorView();

  $("plateBackdrop").classList.remove("hidden");
  $("plateModal").classList.remove("hidden");
}

function closePlateCalculator() {
  $("plateBackdrop").classList.add("hidden");
  $("plateModal").classList.add("hidden");
}

function renderPlateBarOptions() {
  const unit = unitName();
  const settings = getSettings();
  const currentBar = unit === "lbs" ? settings.barLbs : settings.barKg;
  const options = unit === "lbs" ? [45, 35, 25, 15, 0] : [20, 15, 10, 7.5, 0];

  const container = $("plateBarOptions");
  container.innerHTML = "";
  options.forEach(function (w) {
    const chip = document.createElement("button");
    chip.className = "filter-chip" + (currentBar === w ? " active" : "");
    chip.textContent = w === 0 ? ("0 (NO BAR)") : (w + " " + unit.toUpperCase() + " BAR");
    chip.addEventListener("click", function () {
      const s = getSettings();
      if (unit === "lbs") s.barLbs = w;
      else s.barKg = w;
      saveSettings(s);
      renderPlateBarOptions();
      updatePlateCalculatorView();
    });
    container.appendChild(chip);
  });
}

function updatePlateCalculatorView() {
  const unit = unitName();
  const s = getSettings();
  const barW = unit === "lbs" ? s.barLbs : s.barKg;
  const target = Number($("plateTargetInput").value) || 0;
  const res = calculatePlates(target, barW, unit);
  const box = $("plateResultBox");
  box.innerHTML = "";

  if (res.perSide.length === 0) {
    box.innerHTML =
      '<div style="text-align:center; font-family:var(--font-mono); font-size:12px; color:var(--muted); padding:10px 0;">' +
        (target <= barW
          ? 'Target weight is equal to or less than the empty barbell (' + barW + ' ' + unit.toUpperCase() + ').'
          : 'Enter a target weight above ' + barW + ' ' + unit.toUpperCase() + '.') +
      '</div>';
    return;
  }

  // Color & height map for visual plate disks
  function plateStyle(p) {
    if (p >= 20 && unit === "kg" || p >= 45 && unit === "lbs") return { bg: "#1d4ed8", h: 58 };
    if (p >= 15 && unit === "kg" || p >= 35 && unit === "lbs") return { bg: "#eab308", h: 52 };
    if (p >= 10 && unit === "kg" || p >= 25 && unit === "lbs") return { bg: "#16a34a", h: 46 };
    if (p >= 5 && unit === "kg" || p >= 10 && unit === "lbs") return { bg: "#e11d48", h: 38 };
    return { bg: "#57534e", h: 30 };
  }

  const visualBar = document.createElement("div");
  visualBar.className = "plate-visual-bar";
  const sleeve = document.createElement("div");
  sleeve.className = "bar-sleeve";
  visualBar.appendChild(sleeve);

  res.perSide.forEach(function (p) {
    const st = plateStyle(p);
    const disk = document.createElement("div");
    disk.className = "plate-disk";
    disk.style.background = st.bg;
    disk.style.height = st.h + "px";
    disk.textContent = p;
    visualBar.appendChild(disk);
  });
  box.appendChild(visualBar);

  // Count breakdown (e.g. "20 KG × 1, 10 KG × 1, 2.5 KG × 1 per side")
  const counts = {};
  res.perSide.forEach(p => { counts[p] = (counts[p] || 0) + 1; });
  const breakdownStr = Object.keys(counts)
    .sort((a, b) => Number(b) - Number(a))
    .map(p => p + " " + unit.toUpperCase() + " × " + counts[p])
    .join("  +  ");

  const summary = document.createElement("div");
  summary.style.cssText = "font-family:var(--font-mono); font-size:13px; color:var(--bone); text-align:center; font-weight:700;";
  summary.textContent = "EACH SIDE: " + breakdownStr;
  box.appendChild(summary);

  const sub = document.createElement("div");
  sub.style.cssText = "font-family:var(--font-mono); font-size:11px; color:var(--brass); text-align:center; margin-top:4px;";
  sub.textContent = "Bar (" + res.bar + ") + Both Sides (" + (res.achieved - res.bar) + ") = " + res.achieved + " " + unit.toUpperCase() +
    (res.remainder > 0 ? " (Unmatched remainder: " + res.remainder + " " + unit.toUpperCase() + ")" : "");
  box.appendChild(sub);
}

if ($("plateCloseBtn")) $("plateCloseBtn").addEventListener("click", closePlateCalculator);
if ($("plateBackdrop")) $("plateBackdrop").addEventListener("click", closePlateCalculator);
if ($("plateTargetInput")) $("plateTargetInput").addEventListener("input", updatePlateCalculatorView);
if ($("openPlateCalcSettingsBtn")) {
  $("openPlateCalcSettingsBtn").addEventListener("click", function () {
    openPlateCalculator(unitName() === "lbs" ? 135 : 60);
  });
}

// ---------- Exercise Form Guide & History Modal Controller (ⓘ INFO) ----------
function openExerciseInfo(exId) {
  const ex = getExercise(exId);
  if (!ex) return;

  $("exInfoEquip").textContent = (exEquipmentOf(exId) || "EQUIPMENT").toUpperCase();
  $("exInfoTitle").textContent = ex.name;

  const pills = $("exInfoMuscles");
  pills.innerHTML = "";
  const primPill = document.createElement("span");
  primPill.className = "routine-pill";
  primPill.style.borderColor = "var(--flame)";
  primPill.textContent = "PRIMARY: " + exPrimaryMuscleOf(exId).toUpperCase();
  pills.appendChild(primPill);

  exSecondaryMusclesOf(exId).forEach(sec => {
    const sPill = document.createElement("span");
    sPill.className = "routine-pill";
    sPill.textContent = "SECONDARY: " + sec.toUpperCase();
    pills.appendChild(sPill);
  });

  const guide = typeof getExerciseGuide === "function" ? getExerciseGuide(exId) : null;
  const guideBox = $("exInfoGuide");
  guideBox.innerHTML = "";
  if (guide) {
    const items = [
      { label: "1. SETUP & POSTURE", text: guide.setup },
      { label: "2. EXECUTION CUE", text: guide.cue },
      { label: "3. COMMON MISTAKE TO AVOID", text: guide.mistake }
    ];
    items.forEach(item => {
      const div = document.createElement("div");
      div.className = "info-guide-row";
      const b = document.createElement("b");
      b.textContent = item.label;
      const span = document.createElement("span");
      span.textContent = item.text;
      div.appendChild(b);
      div.appendChild(span);
      guideBox.appendChild(div);
    });
  }

  const histBox = $("exInfoHistory");
  histBox.innerHTML = "";
  const logs = typeof getExerciseHistory === "function" ? getExerciseHistory(exId, 5) : [];
  if (logs.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "font-family:var(--font-mono); font-size:12px; color:var(--muted); padding:8px 0;";
    empty.textContent = "No previous sessions recorded for this exercise yet.";
    histBox.appendChild(empty);
  } else {
    logs.forEach(entry => {
      const row = document.createElement("div");
      row.className = "preview-exercise-item";
      row.style.flexDirection = "column";
      row.style.alignItems = "flex-start";

      const top = document.createElement("div");
      top.style.cssText = "display:flex; justify-content:space-between; width:100%; font-family:var(--font-mono); font-size:11px; color:var(--brass);";
      const dSpan = document.createElement("span");
      dSpan.textContent = entry.dateStr;
      const tSpan = document.createElement("span");
      tSpan.textContent = entry.workoutTitle;
      top.appendChild(dSpan);
      top.appendChild(tSpan);

      const setsLine = document.createElement("div");
      setsLine.style.cssText = "font-family:var(--font-mono); font-size:12px; color:var(--bone); margin-top:4px;";
      setsLine.textContent = setsText({ exId: exId, sets: entry.sets });

      row.appendChild(top);
      row.appendChild(setsLine);
      histBox.appendChild(row);
    });
  }

  $("exInfoBackdrop").classList.remove("hidden");
  $("exInfoModal").classList.remove("hidden");
}

function closeExerciseInfo() {
  $("exInfoBackdrop").classList.add("hidden");
  $("exInfoModal").classList.add("hidden");
}

if ($("exInfoCloseBtn")) $("exInfoCloseBtn").addEventListener("click", closeExerciseInfo);
if ($("exInfoBackdrop")) $("exInfoBackdrop").addEventListener("click", closeExerciseInfo);

function updateHeroStats() {
  const hist = getHistory();
  const now = new Date();
  const thisWeek = weekStart(now);
  let weekVol = 0;
  let weekSets = 0;
  const weeks = {};
  let totalPrCount = 0;

  hist.forEach(function (w) {
    const d = workoutDate(w);
    totalPrCount += (w.prs || []).length;
    if (!d) return;
    weeks[weekStart(d)] = true;

    if (weekStart(d) === thisWeek) {
      weekVol += workoutVolume(w);
      (w.exercises || []).forEach(function (e) {
        weekSets += (e.sets || []).filter(s => s.type !== "W").length;
      });
    }
  });

  let streak = 0;
  let t = thisWeek;
  if (!weeks[t]) t = prevWeek(t);
  while (weeks[t]) {
    streak++;
    t = prevWeek(t);
  }

  $("heroVolume").textContent = showWeight(weekVol).toLocaleString();
  $("heroUnit").textContent = unitName().toUpperCase();
  $("heroStreak").textContent = streak + " WEEK" + (streak === 1 ? "" : "S") + " STREAK 🔥";
  $("heroWorkouts").textContent = hist.length;
  $("heroSets").textContent = weekSets;
  $("heroPrs").textContent = totalPrCount;
  $("currentWeekLabel").textContent = fmtShort(new Date(thisWeek)) + " - TODAY";
}

// =====================================================
//  ACTIVE WORKOUT COCKPIT
// =====================================================
function syncCockpitModeUI() {
  const modeTag = $("workoutModeTag");
  const finishBtn = $("finishBtn");
  const miniLabel = $("miniHudLabel");
  if (editingRoutineId) {
    if (modeTag) modeTag.textContent = "ROUTINE EDIT";
    if (finishBtn) finishBtn.textContent = "SAVE ROUTINE";
    if (miniLabel) miniLabel.textContent = "EDITING ROUTINE";
  } else if (editingWorkoutId) {
    if (modeTag) modeTag.textContent = "EDITING LOG";
    if (finishBtn) finishBtn.textContent = "SAVE CHANGES";
    if (miniLabel) miniLabel.textContent = "EDITING LOG";
  } else {
    if (modeTag) modeTag.textContent = "LIVE";
    if (finishBtn) finishBtn.textContent = "FINISH";
    if (miniLabel) miniLabel.textContent = "ACTIVE WORKOUT";
  }
}

function openWorkoutScreen() {
  syncCockpitModeUI();
  $("workoutScreen").classList.remove("hidden");
  document.body.classList.add("noScroll");
  requestWakeLock();
  updateMiniBar();
}

function minimizeWorkout() {
  $("workoutScreen").classList.add("hidden");
  document.body.classList.remove("noScroll");
  updateMiniBar();
  renderTab(currentTab);
}

function updateMiniBar() {
  const screenOpen = !$("workoutScreen").classList.contains("hidden");
  $("miniBar").classList.toggle("hidden", !(workoutActive && !screenOpen));
}

function updateClock() {
  const total = Math.max(0, Math.floor((Date.now() - workoutStart) / 1000));
  const text = pad(Math.floor(total / 3600)) + ":" +
    pad(Math.floor((total % 3600) / 60)) + ":" + pad(total % 60);
  $("wClock").textContent = text;
  $("miniClock").textContent = text;
  const rc = $("resumeClock");
  if (rc) rc.textContent = text;
}

function startClock() {
  clearInterval(clockId);
  updateClock();
  clockId = setInterval(updateClock, 1000);
}

// ---------- Rest Timer Engine ----------
function tickRest() {
  const left = Math.ceil((restEnd - Date.now()) / 1000);
  if (left <= 0) {
    clearInterval(restId);
    $("timer").textContent = "REST COMPLETE!";
    if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
    playTimerFinishedBeep();
    return;
  }
  $("timer").textContent = Math.floor(left / 60) + ":" + pad(left % 60);
}

function startTimer(seconds) {
  restEnd = Date.now() + seconds * 1000;
  $("timerBox").classList.remove("hidden");
  clearInterval(restId);
  restId = setInterval(tickRest, 250);
  tickRest();
}

function addRest(seconds) {
  const left = Math.max((restEnd - Date.now()) / 1000, 0);
  startTimer(left + seconds);
}

function stopTimer() {
  clearInterval(restId);
  $("timerBox").classList.add("hidden");
}

// ---------- Auto-Save Draft ----------
function saveDraft() {
  if (!workoutActive) return;
  const exercises = [];
  document.querySelectorAll("#exerciseList .exCard").forEach(function (card) {
    const sets = [];
    card.querySelectorAll(".setRow").forEach(function (row) {
      const kgInput = row.querySelector(".kgInput");
      sets.push({
        kg: kgInput ? kgInput.value : "",
        reps: row.querySelector(".repsInput").value,
        rpe: row.dataset.rpe ? Number(row.dataset.rpe) : null,
        done: row.querySelector(".doneBox").classList.contains("checked"),
        type: row.dataset.type
      });
    });
    exercises.push({
      exId: card.dataset.exid,
      targetReps: card.dataset.targetreps || "",
      sets: sets,
      isSuperset: card.classList.contains("isSuperset")
    });
  });
  write("draft", {
    startTime: workoutStart,
    editingWorkoutId: editingWorkoutId,
    editingRoutineId: editingRoutineId,
    title: $("wTitle").value,
    notes: $("wNotes").value,
    unit: unitName(),
    exercises: exercises
  });
}

function clearDraft() {
  try {
    localStorage.removeItem("draft");
  } catch (e) {}
}

function restoreDraft() {
  const d = read("draft", null);
  if (!d || !Array.isArray(d.exercises)) {
    clearDraft();
    return;
  }
  if (d.unit && d.unit !== unitName()) {
    const s = getSettings();
    s.unit = d.unit;
    saveSettings(s);
  }
  workoutActive = true;
  workoutStart = d.startTime || Date.now();
  editingWorkoutId = d.editingWorkoutId || null;
  editingRoutineId = d.editingRoutineId || null;
  $("wTitle").value = d.title || "";
  $("wNotes").value = d.notes || "";
  $("exerciseList").innerHTML = "";
  d.exercises.forEach(function (ex) {
    addExerciseCard(ex.exId, 0, ex.sets, ex.isSuperset, ex.targetReps);
  });
  syncCockpitModeUI();
  startClock();
  requestWakeLock();
  updateMiniBar();
}

$("workoutScreen").addEventListener("click", saveDraft);
$("workoutScreen").addEventListener("input", saveDraft);
$("workoutScreen").addEventListener("change", saveDraft);

// ---------- Live Unit Conversion for Active Workout ----------
function syncActiveWorkoutUnits(oldUnit, newUnit) {
  if (!workoutActive || oldUnit === newUnit) return;
  document.querySelectorAll("#exerciseList .exCard").forEach(function (card) {
    const exId = card.dataset.exid;
    const type = exTypeOf(exId);
    const targetReps = card.dataset.targetreps || "";

    const setHeadSpans = card.querySelectorAll(".setHead span");
    if (type === "weight" && setHeadSpans.length >= 3) {
      setHeadSpans[2].textContent = newUnit.toUpperCase();
    }

    const strip = card.querySelector(".auto-target-strip");
    if (strip) strip.textContent = generateAutoTargetHint(exId, targetReps);

    const previous = getPrevious(exId, editingWorkoutId);
    card.querySelectorAll(".setRow").forEach(function (row, i) {
      const kgInput = row.querySelector(".kgInput");
      if (kgInput && kgInput.value !== "") {
        kgInput.value = convertWeightValue(kgInput.value, oldUnit, newUnit);
      }
      const prev = previous[i];
      const prevSpan = row.querySelector(".set-prev-hint");
      if (prev && prevSpan) {
        if (type === "time") prevSpan.textContent = prev.reps + " sec";
        else if (type === "reps") prevSpan.textContent = prev.reps + " reps";
        else prevSpan.textContent = showWeight(prev.kg) + "×" + prev.reps;
      }
    });
  });
  saveDraft();
}

// ---------- Start / Edit / Repeat / Finish / Discard Session ----------
function startWorkout() {
  if (workoutActive) {
    openWorkoutScreen();
    showToast("Session already active.");
    return false;
  }
  workoutActive = true;
  workoutStart = Date.now();
  editingWorkoutId = null;
  editingRoutineId = null;

  const hour = new Date().getHours();
  let part = "Evening";
  if (hour < 12) part = "Morning";
  else if (hour < 17) part = "Afternoon";
  $("wTitle").value = part + " Workout";
  $("wNotes").value = "";
  $("exerciseList").innerHTML = "";

  stopTimer();
  startClock();
  requestWakeLock();
  saveDraft();
  openWorkoutScreen();
  return true;
}

function startRoutine(r) {
  if (!startWorkout()) return;
  $("wTitle").value = r.name;
  (r.exercises || []).forEach(function (ex) {
    addExerciseCard(ex.exId, ex.sets, null, false, ex.reps || "");
  });
  saveDraft();
}

function startEditRoutine(r) {
  if (workoutActive) {
    openWorkoutScreen();
    showToast("Finish or discard your active session before editing a routine.");
    return;
  }
  workoutActive = true;
  workoutStart = Date.now();
  editingWorkoutId = null;
  editingRoutineId = r.id;

  $("wTitle").value = r.name;
  $("wNotes").value = r.description || "";
  $("exerciseList").innerHTML = "";

  (r.exercises || []).forEach(function (ex) {
    addExerciseCard(ex.exId, ex.sets || 3, null, false, ex.reps || "8-10");
  });

  stopTimer();
  startClock();
  saveDraft();
  openWorkoutScreen();
  showToast("Editing routine: Add/remove exercises or sets, then tap SAVE ROUTINE.");
}

function editHistoryWorkout(w) {
  if (workoutActive) {
    openWorkoutScreen();
    showToast("Finish or discard your active session before editing a past log.");
    return;
  }
  workoutActive = true;
  workoutStart = w.ts || Date.now();
  editingWorkoutId = w.id;
  editingRoutineId = null;

  $("wTitle").value = w.title || "Strength Session";
  $("wNotes").value = w.notes || "";
  $("exerciseList").innerHTML = "";

  (w.exercises || []).forEach(function (ex) {
    const savedSets = (ex.sets || []).map(function (s) {
      return {
        kg: exTypeOf(ex.exId) === "weight" ? showWeight(s.kg) : "",
        reps: s.reps,
        rpe: s.rpe || null,
        done: true,
        type: s.type || "N"
      };
    });
    addExerciseCard(ex.exId, Math.max(savedSets.length, 1), savedSets, ex.isSuperset);
  });

  stopTimer();
  startClock();
  saveDraft();
  openWorkoutScreen();
  showToast("Editing past workout log. Tap SAVE CHANGES when done.");
}

function repeatHistoryWorkout(w) {
  if (!startWorkout()) return;
  $("wTitle").value = w.title || "Strength Session";
  $("wNotes").value = w.notes || "";
  (w.exercises || []).forEach(function (ex) {
    const templateSets = (ex.sets || []).map(function (s) {
      return {
        kg: exTypeOf(ex.exId) === "weight" ? showWeight(s.kg) : "",
        reps: s.reps,
        rpe: null,
        done: false,
        type: s.type || "N"
      };
    });
    addExerciseCard(ex.exId, Math.max(templateSets.length, 1), templateSets, ex.isSuperset);
  });
  saveDraft();
  showToast("Loaded workout template from history!");
}

function endWorkoutUI() {
  workoutActive = false;
  editingWorkoutId = null;
  editingRoutineId = null;
  clearInterval(clockId);
  stopTimer();
  releaseWakeLock();
  $("workoutScreen").classList.add("hidden");
  document.body.classList.remove("noScroll");
  updateMiniBar();
}

// ---------- Smart RPE-Aware Double-Progression Coach ----------
function generateAutoTargetHint(exId, routineTargetReps) {
  const type = exTypeOf(exId);
  const prevSets = getPrevious(exId, editingWorkoutId);
  const workingSets = prevSets.filter(s => s.type !== "W");
  const repRangeLabel = routineTargetReps ? " (Goal: " + routineTargetReps + ")" : "";

  if (workingSets.length === 0) {
    if (type === "time") {
      return "💡 First Session: Hold for " + (routineTargetReps || "45-60s") + " with strict form.";
    }
    return "💡 First Session: Choose a controlled weight for " + (routineTargetReps || "8-10") + " reps to set your baseline.";
  }

  if (type === "time") {
    let maxSec = 0;
    workingSets.forEach(s => { if (Number(s.reps) > maxSec) maxSec = Number(s.reps); });
    return "💡 Target: Last longest hold was " + maxSec + " sec. Aim for " + (maxSec + 5) + " sec today!";
  }

  if (type === "reps") {
    let maxReps = 0;
    workingSets.forEach(s => { if (Number(s.reps) > maxReps) maxReps = Number(s.reps); });
    return "💡 Target: Last best was " + maxReps + " reps. Aim for " + (maxReps + 1) + " reps today!" + repRangeLabel;
  }

  let topWeight = 0;
  let topReps = 0;
  let topRpe = null;
  workingSets.forEach(s => {
    const k = Number(s.kg) || 0;
    const r = Number(s.reps) || 0;
    if (k > topWeight || (k === topWeight && r > topReps)) {
      topWeight = k;
      topReps = r;
      topRpe = s.rpe ? Number(s.rpe) : null;
    }
  });

  const unit = unitName().toUpperCase();
  const shownLastWeight = unitName() === "lbs"
    ? Math.round(Number(topWeight) * 2.20462)
    : showWeight(topWeight);

  // If RPE was 10 (all-out grinder) or reps < 10, hold weight and build reps/control first
  if (topRpe && topRpe >= 10) {
    return "💡 Target: Last set was RPE 10 (" + shownLastWeight + " " + unit + " × " + topReps +
      "). Keep " + shownLastWeight + " " + unit + " today and aim for smoother reps (RPE 8-9).";
  }

  if (topReps < 10) {
    const nextReps = topReps + 1;
    return "💡 Target: Last best was " + shownLastWeight + " " + unit + " × " + topReps +
      ". Keep " + shownLastWeight + " " + unit + " and hit " + nextReps + "+ reps before adding weight.";
  }

  if (unitName() === "lbs") {
    const targetLbs = Math.round((shownLastWeight + 5) / 5) * 5;
    return "💡 Target: You hit " + shownLastWeight + " LBS × " + topReps + " last time! Move up to " + targetLbs + " LBS × 8 reps today.";
  } else {
    const targetKg = showWeight(topWeight + 2.5);
    return "💡 Target: You hit " + shownLastWeight + " KG × " + topReps + " last time! Move up to " + targetKg + " KG × 8 reps today.";
  }
}

function renumberCardIndices() {
  document.querySelectorAll("#exerciseList .exCard").forEach(function (c, i) {
    const idxEl = c.querySelector(".ex-index");
    if (idxEl) idxEl.textContent = pad(i + 1);
  });
}

// ---------- Exercise Card inside Live Workout ----------
function addExerciseCard(exId, setCount, savedSets, isSuperset, targetReps, doNotAppend) {
  const ex = getExercise(exId);
  if (!ex) return null;
  const type = exTypeOf(exId); // "weight" | "reps" | "time"
  const isNoWeight = (type === "reps" || type === "time");
  const previous = getPrevious(exId, editingWorkoutId);
  const pinnedNote = getExerciseNote(exId);
  const customRestSec = getExerciseCustomRest(exId);

  const card = document.createElement("div");
  card.className = "exCard" + (isNoWeight ? " repsOnly" : "") + (isSuperset ? " isSuperset" : "");
  card.dataset.exid = exId;
  card.dataset.targetreps = targetReps || "";

  const repColHeader = type === "time" ? "SEC" : "REPS";

  card.innerHTML =
    '<div class="exHead">' +
      '<div class="exHeadTopRow">' +
        '<div class="exHeadLeft">' +
          '<span class="ex-index">01</span>' +
          '<h3></h3>' +
        '</div>' +
      '</div>' +
      '<div class="exActions">' +
        '<button class="info-ex-btn" title="Form Guide & Exercise History">ⓘ INFO</button>' +
        '<button class="swap-ex-btn" title="Swap Exercise">⇄ SWAP</button>' +
        '<button class="action-icon-btn moveUpBtn" title="Move Up" aria-label="Move Exercise Up">▲</button>' +
        '<button class="action-icon-btn moveDownBtn" title="Move Down" aria-label="Move Exercise Down">▼</button>' +
        '<button class="superset-btn' + (isSuperset ? ' active' : '') + '" title="Link Next Exercise as Superset">⚡ SUPERSET</button>' +
        '<button class="remove-ex-btn" title="Remove Exercise" aria-label="Remove Exercise">✕</button>' +
      '</div>' +
      '<div class="ex-utility-bar">' +
        '<button class="util-pill-btn rest-pill-btn" title="Set Custom Rest Timer for this Exercise"></button>' +
        (isNoWeight ? '' : '<button class="util-pill-btn plate-pill-btn" title="Open Barbell Plate Calculator">🏋️ PLATES</button>') +
        (isNoWeight ? '' : '<button class="util-pill-btn warmup-pill-btn" title="Generate Progressive Warm-Up Sets">🔥 + WARM-UP</button>') +
      '</div>' +
      '<input type="text" class="ex-pinned-note" placeholder="📌 Pinned note (e.g. Seat #4, grip width)...">' +
    '</div>' +
    '<div class="auto-target-strip"></div>' +
    '<div class="setHead">' +
      '<span>SET</span>' +
      '<span>PREVIOUS</span>' +
      (isNoWeight ? '' : '<span>' + esc(unitName().toUpperCase()) + '</span>') +
      '<span>' + repColHeader + '</span>' +
      '<span>RPE</span>' +
      '<span>✓</span>' +
      '<span></span>' +
    '</div>' +
    '<div class="sets"></div>' +
    '<button class="addSetBtn">+ ADD SET</button>';

  card.querySelector("h3").textContent = ex.name;
  card.querySelector(".auto-target-strip").textContent = generateAutoTargetHint(exId, targetReps);

  const noteInput = card.querySelector(".ex-pinned-note");
  noteInput.value = pinnedNote;
  noteInput.addEventListener("change", function () {
    saveExerciseNote(exId, noteInput.value);
    showToast("Pinned note saved for " + ex.name);
  });

  const restBtn = card.querySelector(".rest-pill-btn");
  function updateRestPillLabel() {
    const cRest = getExerciseCustomRest(exId);
    restBtn.textContent = cRest > 0 ? ("⏱ REST: " + cRest + "s ★") : ("⏱ REST: " + getSettings().rest + "s");
  }
  updateRestPillLabel();

  restBtn.addEventListener("click", function () {
    const cycle = [0, 60, 90, 120, 180, 240];
    const cur = getExerciseCustomRest(exId);
    const nextIdx = (cycle.indexOf(cur) + 1) % cycle.length;
    const nextVal = cycle[nextIdx];
    saveExerciseRest(exId, nextVal);
    updateRestPillLabel();
    showToast(nextVal > 0 ? ("Custom rest for " + ex.name + ": " + nextVal + "s") : ("Reset to default rest (" + getSettings().rest + "s)"));
  });

  const setsDiv = card.querySelector(".sets");

  function renumberSets() {
    let n = 0;
    setsDiv.querySelectorAll(".setRow").forEach(function (row, i) {
      const t = row.dataset.type || "N";
      const btn = row.querySelector(".setTypeBtn");
      if (t === "N") {
        n++;
        btn.textContent = n;
      } else {
        btn.textContent = t;
      }
      const prev = previous[i];
      const prevSpan = row.querySelector(".set-prev-hint");
      if (prev) {
        if (type === "time") prevSpan.textContent = prev.reps + " sec";
        else if (type === "reps") prevSpan.textContent = prev.reps + " reps";
        else prevSpan.textContent = showWeight(prev.kg) + "×" + prev.reps + (prev.rpe ? " @" + prev.rpe : "");
      } else {
        prevSpan.textContent = targetReps ? ("Goal: " + targetReps) : "—";
      }
    });
  }

  function addSet(saved, insertAtTop) {
    const row = document.createElement("div");
    row.className = "setRow";
    row.dataset.type = saved && saved.type ? saved.type : "N";
    row.dataset.rpe = saved && saved.rpe ? String(saved.rpe) : "";

    row.innerHTML =
      '<button class="setTypeBtn" title="Tap to cycle Set Type: Normal, Warm-up (W), Drop (D), Failure (F)">1</button>' +
      '<span class="set-prev-hint">—</span>' +
      (isNoWeight ? "" : '<input type="number" step="any" min="0" inputmode="decimal" placeholder="0" class="kgInput">') +
      '<input type="number" min="1" step="1" inputmode="numeric" placeholder="' + (type === "time" ? "sec" : "0") + '" class="repsInput">' +
      '<button class="rpeBtn" title="Tap to cycle RPE Effort (7 to 10)">—</button>' +
      '<button class="doneBox" aria-label="Complete Set">✓</button>' +
      '<button class="delSetBtn" title="Delete Set" aria-label="Delete Set">✕</button>';

    const rpeBtn = row.querySelector(".rpeBtn");
    function syncRpeBtn() {
      const rVal = row.dataset.rpe;
      if (rVal) {
        rpeBtn.textContent = "@" + rVal;
        rpeBtn.classList.add("has-rpe");
      } else {
        rpeBtn.textContent = "—";
        rpeBtn.classList.remove("has-rpe");
      }
    }
    syncRpeBtn();

    rpeBtn.addEventListener("click", function () {
      const rpeOrder = ["", "7", "8", "8.5", "9", "9.5", "10"];
      const nextRpe = rpeOrder[(rpeOrder.indexOf(row.dataset.rpe || "") + 1) % rpeOrder.length];
      row.dataset.rpe = nextRpe;
      syncRpeBtn();
      saveDraft();
    });

    row.querySelector(".setTypeBtn").addEventListener("click", function () {
      const order = ["N", "W", "D", "F"];
      const nextType = order[(order.indexOf(row.dataset.type) + 1) % order.length];
      row.dataset.type = nextType;
      const labels = { N: "Normal Working Set", W: "Warm-up Set (excluded from PRs)", D: "Drop Set", F: "Failure Set" };
      showToast("Set Type: " + labels[nextType]);
      renumberSets();
      saveDraft();
    });

    const done = row.querySelector(".doneBox");
    done.addEventListener("click", function () {
      const isChecked = done.classList.contains("checked");
      if (!isChecked) {
        const kgInput = row.querySelector(".kgInput");
        const repsInput = row.querySelector(".repsInput");

        const rowIndex = Array.prototype.indexOf.call(setsDiv.children, row);
        const prev = previous[rowIndex >= 0 ? rowIndex : 0];
        if (kgInput && kgInput.value.trim() === "" && prev && prev.kg !== undefined) {
          kgInput.value = showWeight(prev.kg);
        }
        if (repsInput.value.trim() === "" && prev && prev.reps) {
          repsInput.value = prev.reps;
        }

        const weightVal = kgInput ? Number(kgInput.value) : 0;
        const repsVal = Number(repsInput.value);
        const kgValid = kgInput
          ? (kgInput.value.trim() !== "" && Number.isFinite(weightVal) && weightVal >= 0 && weightVal <= 1500)
          : true;
        const repsValid = repsInput.value.trim() !== "" && Number.isInteger(repsVal) && repsVal >= 1 && repsVal <= 3600;

        if (!kgValid || !repsValid) {
          row.classList.add("shake");
          setTimeout(() => row.classList.remove("shake"), 380);
          showToast(type === "time" ? "Enter valid hold duration in seconds (1+)." : "Enter valid weight (0+) and whole reps (1+).");
          return;
        }

        done.classList.add("checked");
        row.classList.add("done");
        if (navigator.vibrate) navigator.vibrate(14);
        playBeep(700, "sine", 0.08);

        const nextCard = card.nextElementSibling;
        if (card.classList.contains("isSuperset") && nextCard) {
          showToast("⚡ Superset: Move to " + nextCard.querySelector("h3").textContent);
          startTimer(15);
        } else {
          startTimer(getExerciseRest(exId));
        }
      } else {
        done.classList.remove("checked");
        row.classList.remove("done");
      }
      saveDraft();
    });

    row.querySelector(".delSetBtn").addEventListener("click", function () {
      const allRows = setsDiv.querySelectorAll(".setRow");
      if (allRows.length <= 1) {
        if (confirm("Remove this last set and delete " + ex.name + " from workout?")) {
          card.remove();
          renumberCardIndices();
          saveDraft();
        }
        return;
      }
      row.remove();
      renumberSets();
      saveDraft();
    });

    if (insertAtTop && setsDiv.firstChild) {
      setsDiv.insertBefore(row, setsDiv.firstChild);
    } else {
      setsDiv.appendChild(row);
    }

    if (saved) {
      const kgInput = row.querySelector(".kgInput");
      if (kgInput && saved.kg !== undefined) kgInput.value = saved.kg;
      if (saved.reps !== undefined) row.querySelector(".repsInput").value = saved.reps;
      if (saved.done) {
        done.classList.add("checked");
        row.classList.add("done");
      }
    }
    renumberSets();
  }

  // Plate Calculator Button on Card
  const plateBtn = card.querySelector(".plate-pill-btn");
  if (plateBtn) {
    plateBtn.addEventListener("click", function () {
      let wt = 0;
      card.querySelectorAll(".kgInput").forEach(function (inp) {
        if (Number(inp.value) > 0) wt = Number(inp.value);
      });
      if (!wt && previous.length > 0 && previous[0].kg) {
        wt = showWeight(previous[0].kg);
      }
      openPlateCalculator(wt);
    });
  }

  // 1-Tap Warm-up Generator Button on Card
  const warmupBtn = card.querySelector(".warmup-pill-btn");
  if (warmupBtn) {
    warmupBtn.addEventListener("click", function () {
      let workingWt = 0;
      card.querySelectorAll(".setRow").forEach(function (r) {
        if (r.dataset.type !== "W") {
          const inp = r.querySelector(".kgInput");
          if (inp && Number(inp.value) > workingWt) workingWt = Number(inp.value);
        }
      });
      if (!workingWt && previous.length > 0) {
        previous.forEach(p => {
          const shown = showWeight(p.kg);
          if (shown > workingWt) workingWt = shown;
        });
      }
      if (!workingWt) {
        const promptWt = prompt("Enter your working set weight (" + unitName().toUpperCase() + ") to generate warm-up sets:", unitName() === "lbs" ? "135" : "60");
        workingWt = Number(promptWt) || 0;
      }
      if (workingWt <= 0) return;

      const warmups = generateWarmupSets(workingWt, unitName());
      if (warmups.length === 0) {
        showToast("Working weight is light enough to start directly!");
        return;
      }
      // Remove any existing unchecked warm-up sets before inserting fresh ones
      card.querySelectorAll(".setRow").forEach(function (r) {
        if (r.dataset.type === "W" && !r.querySelector(".doneBox").classList.contains("checked")) {
          r.remove();
        }
      });
      for (let i = warmups.length - 1; i >= 0; i--) {
        addSet(warmups[i], true);
      }
      saveDraft();
      showToast("Added " + warmups.length + " progressive warm-up sets [W]!");
    });
  }

  card.querySelector(".info-ex-btn").addEventListener("click", function () {
    openExerciseInfo(exId);
  });

  card.querySelector(".swap-ex-btn").addEventListener("click", function () {
    swappingCard = card;
    openSwapPicker(exId);
  });

  card.querySelector(".moveUpBtn").addEventListener("click", function () {
    const prev = card.previousElementSibling;
    if (prev) {
      card.parentNode.insertBefore(card, prev);
      renumberCardIndices();
      saveDraft();
    }
  });

  card.querySelector(".moveDownBtn").addEventListener("click", function () {
    const next = card.nextElementSibling;
    if (next) {
      card.parentNode.insertBefore(next, card);
      renumberCardIndices();
      saveDraft();
    }
  });

  card.querySelector(".superset-btn").addEventListener("click", function () {
    card.classList.toggle("isSuperset");
    this.classList.toggle("active", card.classList.contains("isSuperset"));
    saveDraft();
  });

  card.querySelector(".addSetBtn").addEventListener("click", function () {
    addSet();
    saveDraft();
  });

  card.querySelector(".remove-ex-btn").addEventListener("click", function () {
    if (confirm("Remove " + ex.name + " from this workout?")) {
      card.remove();
      renumberCardIndices();
      saveDraft();
    }
  });

  if (!doNotAppend) {
    $("exerciseList").appendChild(card);
  }

  if (savedSets && savedSets.length > 0) {
    savedSets.forEach(s => addSet(s));
  } else {
    for (let k = 0; k < (setCount || 1); k++) addSet();
  }
  if (!doNotAppend) {
    renumberCardIndices();
  }
  return card;
}
// ============ app.js (PART 2/2) : SUMMARY, PICKER, HISTORY, RECOVERY, CSV & INIT ============

// ---------- Full Anatomical SVG Body Map Engine (Direct vs Secondary Aware) ----------
function renderBodyMapSvg(containerId, workloadMap, isBoneTheme) {
  const container = $(containerId);
  if (!container) return;
  workloadMap = workloadMap || {};

  const baseFill = isBoneTheme ? "#cfc8b8" : "#252522";
  const strokeColor = isBoneTheme ? "#121211" : "#3d3d38";
  const flame = "#ff4422";
  const brass = "#d4b483";

  function colorFor(muscle) {
    const entry = workloadMap[muscle];
    if (!entry) return baseFill;
    if (typeof entry === "number") {
      if (entry >= 3) return flame;
      if (entry > 0) return brass;
      return baseFill;
    }
    if (entry.direct >= 2) return flame;
    if (entry.direct > 0 || entry.indirect > 0) return brass;
    return baseFill;
  }

  container.innerHTML =
    '<div class="anatomy-col">' +
      '<div class="anatomy-label">FRONT VIEW</div>' +
      '<svg viewBox="0 0 160 300" class="anatomy-svg">' +
        '<circle cx="80" cy="26" r="14" fill="' + baseFill + '" stroke="' + strokeColor + '" stroke-width="1.5"/>' +
        '<rect x="73" y="40" width="14" height="10" rx="3" fill="' + baseFill + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<path d="M58 50 L73 45 L87 45 L102 50 L95 58 L65 58 Z" fill="' + colorFor("Shoulders") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<path d="M52 56 Q80 54 80 58 L80 86 Q63 90 50 78 Z" fill="' + colorFor("Chest") + '" stroke="' + strokeColor + '" stroke-width="1.5"/>' +
        '<path d="M108 56 Q80 54 80 58 L80 86 Q97 90 110 78 Z" fill="' + colorFor("Chest") + '" stroke="' + strokeColor + '" stroke-width="1.5"/>' +
        '<path d="M36 56 Q44 48 52 56 L50 76 Q38 74 36 64 Z" fill="' + colorFor("Shoulders") + '" stroke="' + strokeColor + '" stroke-width="1.5"/>' +
        '<path d="M124 56 Q116 48 108 56 L110 76 Q122 74 124 64 Z" fill="' + colorFor("Shoulders") + '" stroke="' + strokeColor + '" stroke-width="1.5"/>' +
        '<rect x="31" y="76" width="14" height="34" rx="7" transform="rotate(6 38 93)" fill="' + colorFor("Biceps") + '" stroke="' + strokeColor + '" stroke-width="1.3"/>' +
        '<rect x="115" y="76" width="14" height="34" rx="7" transform="rotate(-6 122 93)" fill="' + colorFor("Biceps") + '" stroke="' + strokeColor + '" stroke-width="1.3"/>' +
        '<rect x="25" y="112" width="12" height="36" rx="6" transform="rotate(8 31 130)" fill="' + colorFor("Forearms") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<rect x="123" y="112" width="12" height="36" rx="6" transform="rotate(-8 129 130)" fill="' + colorFor("Forearms") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<rect x="64" y="88" width="14" height="14" rx="3" fill="' + colorFor("Core") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<rect x="82" y="88" width="14" height="14" rx="3" fill="' + colorFor("Core") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<rect x="64" y="104" width="14" height="14" rx="3" fill="' + colorFor("Core") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<rect x="82" y="104" width="14" height="14" rx="3" fill="' + colorFor("Core") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<path d="M53 140 L77 140 L74 210 Q60 214 52 200 Z" fill="' + colorFor("Quads") + '" stroke="' + strokeColor + '" stroke-width="1.4"/>' +
        '<path d="M107 140 L83 140 L86 210 Q100 214 108 200 Z" fill="' + colorFor("Quads") + '" stroke="' + strokeColor + '" stroke-width="1.4"/>' +
        '<path d="M54 218 L72 218 L69 276 L57 276 Z" fill="' + colorFor("Calves") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<path d="M106 218 L88 218 L91 276 L103 276 Z" fill="' + colorFor("Calves") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
      '</svg>' +
    '</div>' +
    '<div class="anatomy-col">' +
      '<div class="anatomy-label">BACK VIEW</div>' +
      '<svg viewBox="0 0 160 300" class="anatomy-svg">' +
        '<circle cx="80" cy="26" r="14" fill="' + baseFill + '" stroke="' + strokeColor + '" stroke-width="1.5"/>' +
        '<rect x="73" y="40" width="14" height="10" rx="3" fill="' + baseFill + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<polygon points="56,50 80,44 104,50 92,82 80,90 68,82" fill="' + colorFor("Back") + '" stroke="' + strokeColor + '" stroke-width="1.3"/>' +
        '<path d="M52 74 L68 82 L76 124 L56 116 Z" fill="' + colorFor("Back") + '" stroke="' + strokeColor + '" stroke-width="1.5"/>' +
        '<path d="M108 74 L92 82 L84 124 L104 116 Z" fill="' + colorFor("Back") + '" stroke="' + strokeColor + '" stroke-width="1.5"/>' +
        '<rect x="31" y="76" width="14" height="34" rx="7" transform="rotate(6 38 93)" fill="' + colorFor("Triceps") + '" stroke="' + strokeColor + '" stroke-width="1.5"/>' +
        '<rect x="115" y="76" width="14" height="34" rx="7" transform="rotate(-6 122 93)" fill="' + colorFor("Triceps") + '" stroke="' + strokeColor + '" stroke-width="1.5"/>' +
        '<path d="M54 138 L80 138 L80 168 Q56 170 52 154 Z" fill="' + colorFor("Glutes") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<path d="M106 138 L80 138 L80 168 Q104 170 108 154 Z" fill="' + colorFor("Glutes") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<path d="M54 170 L76 170 L73 214 L55 210 Z" fill="' + colorFor("Hamstrings") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<path d="M106 170 L84 170 L87 214 L105 210 Z" fill="' + colorFor("Hamstrings") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<path d="M54 218 L72 218 L69 276 L57 276 Z" fill="' + colorFor("Calves") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<path d="M106 218 L88 218 L91 276 L103 276 Z" fill="' + colorFor("Calves") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
      '</svg>' +
    '</div>';
}

// ---------- Workout Summary Modal Logic ----------
function buildSummaryFromWorkout(w) {
  const workloadMap = calculateMuscleWorkload([w]);
  let totalSets = 0;
  (w.exercises || []).forEach(function (ex) {
    (ex.sets || []).forEach(function (s) {
      if (s.type !== "W") totalSets++;
    });
  });

  const d = workoutDate(w);
  const dateStr = d ? fmtShort(d) + " " + d.getFullYear() : (w.date || "");
  const durationMin = Math.max(1, Math.round((w.duration || 0) / 60000));
  const prs = (w.prs || []).map(function (pr) {
    return {
      name: pr.name || exName(pr.exId),
      kind: pr.kind,
      text: formatPRValue(pr)
    };
  });

  return {
    title: w.title || "Strength Session",
    date: dateStr,
    durationMin: durationMin,
    volume: workoutVolume(w),
    totalSets: totalSets,
    muscleMap: workloadMap,
    prs: prs
  };
}

function showSummaryModal(summaryData, fromHistory) {
  isSummaryFromHistory = !!fromHistory;

  $("sumTitle").textContent = summaryData.title;
  $("sumDate").textContent = summaryData.date + " · DURATION " + summaryData.durationMin + " MIN";

  $("sumTiles").innerHTML =
    '<div class="ticket-metric-cell"><small>Total Volume</small><strong>' + esc(showWeight(summaryData.volume) + " " + unitName().toUpperCase()) + '</strong></div>' +
    '<div class="ticket-metric-cell"><small>Working Sets</small><strong>' + esc(summaryData.totalSets) + '</strong></div>' +
    '<div class="ticket-metric-cell"><small>PRs Broken</small><strong>' + esc(summaryData.prs.length) + '</strong></div>';

  renderBodyMapSvg("sumBodyMap", summaryData.muscleMap, true);

  const mList = $("sumMuscles");
  mList.innerHTML = "";
  const muscles = Object.keys(summaryData.muscleMap).sort((a, b) => {
    return (summaryData.muscleMap[b].total || 0) - (summaryData.muscleMap[a].total || 0);
  });

  if (muscles.length === 0) {
    mList.innerHTML = '<span class="ticket-badge">No working sets logged</span>';
  } else {
    muscles.forEach(function (m) {
      const entry = summaryData.muscleMap[m];
      const badge = document.createElement("span");
      badge.className = "ticket-badge";
      if (entry.direct > 0 && entry.indirect > 0) {
        badge.textContent = m + ": " + entry.direct + " direct + " + entry.indirect + " assist";
      } else if (entry.direct > 0) {
        badge.textContent = m + ": " + entry.direct + " sets";
      } else {
        badge.textContent = m + ": " + entry.indirect + " assist";
      }
      mList.appendChild(badge);
    });
  }

  const prSection = $("sumPrSection");
  const prList = $("sumPrs");
  prList.innerHTML = "";
  if (summaryData.prs.length > 0) {
    prSection.classList.remove("hidden");
    summaryData.prs.forEach(function (pr) {
      const item = document.createElement("div");
      item.className = "pr-ticket-row";
      const leftSpan = document.createElement("span");
      leftSpan.textContent = "🏆 " + pr.name + " · " + pr.kind;
      const rightB = document.createElement("b");
      rightB.textContent = pr.text;
      item.appendChild(leftSpan);
      item.appendChild(rightB);
      prList.appendChild(item);
    });
  } else {
    prSection.classList.add("hidden");
  }

  $("sumDoneBtn").querySelector("span").textContent = isSummaryFromHistory ? "RETURN TO HISTORY" : "VIEW HISTORY";
  $("summaryBackdrop").classList.remove("hidden");
  $("summaryModal").classList.remove("hidden");
}

function closeSummaryModal() {
  $("summaryBackdrop").classList.add("hidden");
  $("summaryModal").classList.add("hidden");
  if (!isSummaryFromHistory) {
    showTab("history");
  }
}

$("sumDoneBtn").addEventListener("click", closeSummaryModal);
$("sumCloseBtn").addEventListener("click", closeSummaryModal);
$("summaryBackdrop").addEventListener("click", closeSummaryModal);

// ---------- Finish Session / Save Edited Routine / Save Edited Log ----------
function finishWorkout() {
  // Mode 1: Saving an Edited Routine Template
  if (editingRoutineId) {
    const routineExercises = [];
    document.querySelectorAll("#exerciseList .exCard").forEach(function (card) {
      routineExercises.push({
        exId: card.dataset.exid,
        sets: Math.max(card.querySelectorAll(".setRow").length, 1),
        reps: card.dataset.targetreps || "8-10"
      });
    });
    if (routineExercises.length === 0) {
      alert("Add at least one exercise to save this routine.");
      return;
    }
    const allRoutines = getRoutines();
    const rIdx = allRoutines.findIndex(r => r.id === editingRoutineId);
    const updatedName = $("wTitle").value.trim() || "Custom Routine";
    const updatedDesc = $("wNotes").value.trim();

    if (rIdx !== -1) {
      allRoutines[rIdx].name = updatedName;
      if (updatedDesc) allRoutines[rIdx].description = updatedDesc;
      allRoutines[rIdx].exercises = routineExercises;
      allRoutines[rIdx].userEdited = true;
      saveRoutines(allRoutines);
    }
    clearDraft();
    endWorkoutUI();
    showTab("workout");
    showToast("Routine updated ✓");
    return;
  }

  // Mode 2 & 3: Live Workout or Editing Past Workout Log
  const unloggedValidRows = [];
  document.querySelectorAll("#exerciseList .exCard").forEach(function (card) {
    card.querySelectorAll(".setRow").forEach(function (row) {
      const isDone = row.querySelector(".doneBox").classList.contains("checked");
      if (isDone) return;
      const kgInput = row.querySelector(".kgInput");
      const repsInput = row.querySelector(".repsInput");
      const weightVal = kgInput ? Number(kgInput.value) : 0;
      const repsVal = Number(repsInput.value);
      const kgFilled = kgInput ? (kgInput.value.trim() !== "" && Number.isFinite(weightVal) && weightVal >= 0) : true;
      const repsFilled = repsInput.value.trim() !== "" && Number.isInteger(repsVal) && repsVal >= 1;
      if (kgFilled && repsFilled) {
        unloggedValidRows.push(row);
      }
    });
  });

  if (unloggedValidRows.length > 0) {
    const includeUnticked = confirm(
      "You have " + unloggedValidRows.length + " filled set(s) that are not marked complete (✓).\n\n" +
      "Press OK to mark them complete and save them, or Cancel to return to your workout."
    );
    if (!includeUnticked) return;
    unloggedValidRows.forEach(function (row) {
      row.querySelector(".doneBox").classList.add("checked");
      row.classList.add("done");
    });
  }

  const exercises = [];
  const prs = [];

  document.querySelectorAll("#exerciseList .exCard").forEach(function (card) {
    const exId = card.dataset.exid;
    const sets = [];

    card.querySelectorAll(".setRow").forEach(function (row) {
      const kgInput = row.querySelector(".kgInput");
      const repsInput = row.querySelector(".repsInput");
      const isDone = row.querySelector(".doneBox").classList.contains("checked");
      const weightVal = kgInput ? Number(kgInput.value) : 0;
      const repsVal = Number(repsInput.value);
      const kgOk = kgInput ? (kgInput.value.trim() !== "" && Number.isFinite(weightVal) && weightVal >= 0) : true;
      const repsOk = repsInput.value.trim() !== "" && Number.isInteger(repsVal) && repsVal >= 1;

      if (isDone && kgOk && repsOk) {
        const setObj = {
          kg: kgInput ? toKg(weightVal) : 0,
          reps: repsVal,
          type: row.dataset.type || "N"
        };
        if (row.dataset.rpe) setObj.rpe = Number(row.dataset.rpe);
        sets.push(setObj);
      }
    });

    if (sets.length > 0) {
      findPRs(exId, sets, editingWorkoutId).forEach(function (pr) {
        prs.push({
          exId: exId,
          kind: pr.kind,
          val: pr.val,
          isReps: pr.isReps,
          isTime: pr.isTime,
          name: exName(exId)
        });
      });
      exercises.push({
        exId: exId,
        sets: sets,
        isSuperset: card.classList.contains("isSuperset")
      });
    }
  });

  if (exercises.length === 0) {
    alert("No completed sets logged. Enter your values and tap ✓ on at least one set before saving.");
    return;
  }

  if (unloggedValidRows.length === 0 && !editingWorkoutId) {
    if (!confirm("Finish and save this workout session?")) return;
  }

  const hist = getHistory();
  const sessionTitle = $("wTitle").value.trim() || "Strength Session";
  const sessionNotes = $("wNotes").value.trim();

  if (editingWorkoutId) {
    const idx = hist.findIndex(w => w.id === editingWorkoutId);
    if (idx !== -1) {
      hist[idx].title = sessionTitle;
      hist[idx].notes = sessionNotes;
      hist[idx].exercises = exercises;
      hist[idx].prs = prs;
      saveHistory(hist);
      const updatedObj = hist[idx];
      clearDraft();
      endWorkoutUI();
      renderTab("history");
      showToast("Workout log updated ✓");
      showSummaryModal(buildSummaryFromWorkout(updatedObj), true);
      return;
    }
  }

  const duration = Date.now() - workoutStart;
  const workoutObj = {
    id: newId(),
    title: sessionTitle,
    notes: sessionNotes,
    ts: Date.now(),
    date: new Date().toLocaleString(),
    duration: duration,
    exercises: exercises,
    prs: prs
  };

  hist.push(workoutObj);
  saveHistory(hist);
  clearDraft();
  endWorkoutUI();
  renderTab(currentTab);
  showToast("Workout saved ✓");

  showSummaryModal(buildSummaryFromWorkout(workoutObj), false);
}

function saveAsRoutine() {
  const exercises = [];
  document.querySelectorAll("#exerciseList .exCard").forEach(function (card) {
    exercises.push({
      exId: card.dataset.exid,
      sets: Math.max(card.querySelectorAll(".setRow").length, 1),
      reps: card.dataset.targetreps || (exTypeOf(card.dataset.exid) === "time" ? "45-60s" : "8-10")
    });
  });
  if (exercises.length === 0) {
    alert("Add at least one exercise to save a routine template.");
    return;
  }
  const routineName = prompt("Enter Routine Name:", $("wTitle").value);
  if (!routineName || !routineName.trim()) return;
  const routines = getRoutines();
  routines.push({
    id: newId(),
    name: routineName.trim(),
    category: "Custom Templates",
    exercises: exercises
  });
  saveRoutines(routines);
  showToast("Routine saved ✓");
}

function discardWorkout() {
  const msg = editingRoutineId
    ? "Cancel editing this routine? Unsaved changes will be discarded."
    : (editingWorkoutId ? "Cancel editing this workout log? Unsaved changes will be discarded." : "Discard this workout session? Logged sets will not be saved.");
  if (!confirm(msg)) return;
  clearDraft();
  endWorkoutUI();
  renderTab(currentTab);
}

$("startBtn").addEventListener("click", startWorkout);
$("resumeBtn").addEventListener("click", openWorkoutScreen);
if ($("miniDiscardBtn")) $("miniDiscardBtn").addEventListener("click", discardWorkout);
$("minimizeBtn").addEventListener("click", minimizeWorkout);
$("finishBtn").addEventListener("click", finishWorkout);
$("saveRoutineBtn").addEventListener("click", saveAsRoutine);
$("discardBtn").addEventListener("click", discardWorkout);
$("minus30").addEventListener("click", function () { addRest(-30); });
$("plus30").addEventListener("click", function () { addRest(30); });
$("skipTimer").addEventListener("click", stopTimer);

// =====================================================
//  EXERCISE PICKER, 100% FIXED SWAP & MANAGEMENT SHEET
// =====================================================
function showSheet() {
  $("sheetBackdrop").classList.remove("hidden");
  $("sheet").classList.remove("hidden");
}

function closeSheet() {
  $("sheetBackdrop").classList.add("hidden");
  $("sheet").classList.add("hidden");
  $("sheetSearch").value = "";
  swappingCard = null;
}

function openPicker() {
  sheetMode = "pick";
  swappingCard = null;
  $("sheetPickHeading").textContent = "SELECT EXERCISE";
  $("sheetForm").classList.add("hidden");
  $("sheetPick").classList.remove("hidden");
  $("sheetSearch").value = "";
  sheetFilterMuscle = "All";
  sheetFilterEquipment = "All";
  renderSheetFilters();
  renderPickList();
  showSheet();
}

function openSwapPicker(currentExId) {
  sheetMode = "swap";
  const currentEx = getExercise(currentExId);
  $("sheetPickHeading").textContent = "SWAP // " + (currentEx ? currentEx.name.toUpperCase() : "EXERCISE");
  $("sheetForm").classList.add("hidden");
  $("sheetPick").classList.remove("hidden");
  $("sheetSearch").value = "";
  sheetFilterMuscle = currentEx ? exPrimaryMuscleOf(currentExId) : "All";
  sheetFilterEquipment = "All";
  renderSheetFilters();
  renderPickList();
  showSheet();
}

function renderSheetFilters() {
  const eqContainer = $("sheetEquipmentFilter");
  eqContainer.innerHTML = "";
  EQUIPMENTS.forEach(eq => {
    const chip = document.createElement("button");
    chip.className = "filter-chip" + (sheetFilterEquipment === eq ? " active" : "");
    chip.textContent = eq.toUpperCase();
    chip.addEventListener("click", function () {
      sheetFilterEquipment = eq;
      renderSheetFilters();
      renderPickList();
    });
    eqContainer.appendChild(chip);
  });

  const mContainer = $("sheetMuscleFilter");
  mContainer.innerHTML = "";
  const allM = ["All", ...MUSCLES];
  allM.forEach(m => {
    const chip = document.createElement("button");
    chip.className = "filter-chip" + (sheetFilterMuscle === m ? " active" : "");
    chip.textContent = m.toUpperCase();
    chip.addEventListener("click", function () {
      sheetFilterMuscle = m;
      renderSheetFilters();
      renderPickList();
    });
    mContainer.appendChild(chip);
  });
}

function renderPickList() {
  const raw = $("sheetSearch").value.trim();
  const term = raw.toLowerCase();
  const list = $("sheetList");
  list.innerHTML = "";
  const usage = usageMap();
  const all = getExercises();

  const exact = all.some(e => e.name.toLowerCase() === term);
  if (term && !exact) {
    const createCell = document.createElement("button");
    createCell.className = "picker-cell";
    const topSpan = document.createElement("span");
    topSpan.style.cssText = "color:var(--flame); font-weight:800;";
    topSpan.textContent = '+ Create "' + raw + '"';
    const subSmall = document.createElement("small");
    subSmall.style.cssText = "font-family:var(--font-mono); color:var(--muted);";
    subSmall.textContent = "Add custom exercise to database";
    createCell.appendChild(topSpan);
    createCell.appendChild(subSmall);
    createCell.addEventListener("click", function () {
      openForm("create-add", { name: raw });
    });
    list.appendChild(createCell);
  }

  const items = all.filter(function (e) {
    const matchesSearch = e.name.toLowerCase().includes(term);
    const matchesEquipment = sheetFilterEquipment === "All" || exEquipmentOf(e.id) === sheetFilterEquipment;
    const primary = exPrimaryMuscleOf(e.id);
    const secondaries = exSecondaryMusclesOf(e.id);
    const matchesMuscle = sheetFilterMuscle === "All" || primary === sheetFilterMuscle || secondaries.includes(sheetFilterMuscle);
    return matchesSearch && matchesEquipment && matchesMuscle;
  }).sort(function (a, b) {
    return ((usage[b.id] || 0) - (usage[a.id] || 0)) || a.name.localeCompare(b.name);
  });

  if (items.length === 0) {
    const emptyCard = document.createElement("div");
    emptyCard.className = "metal-card";
    emptyCard.style.cssText = "text-align:center; color:var(--muted); font-size:12px; margin-top:8px;";
    emptyCard.textContent = "No matching exercises in current filter. Tap '+ Create' above or switch filters to ALL.";
    list.appendChild(emptyCard);
    return;
  }

  items.forEach(function (ex) {
    const cell = document.createElement("button");
    cell.className = "picker-cell";
    const primary = exPrimaryMuscleOf(ex.id);
    const secondaries = exSecondaryMusclesOf(ex.id);
    const secStr = secondaries.length > 0 ? " · Secondary: " + secondaries.join(", ") : "";
    const typeTag = ex.type === "time" ? " · Time (Sec)" : (ex.type === "reps" ? " · Reps Only" : "");

    cell.innerHTML =
      '<div class="picker-cell-top">' +
        '<span class="picker-cell-name"></span>' +
        '<span class="picker-cell-equip"></span>' +
      '</div>' +
      '<div class="picker-cell-bottom">' +
        '<span>Primary: <b>' + esc(primary) + '</b>' + esc(secStr + typeTag) + '</span>' +
      '</div>';

    cell.querySelector(".picker-cell-name").textContent = ex.name;
    cell.querySelector(".picker-cell-equip").textContent = exEquipmentOf(ex.id);

    cell.addEventListener("click", function () {
      const currentMode = sheetMode;
      const targetCard = swappingCard;
      closeSheet();

      if (currentMode === "swap" && targetCard && targetCard.parentNode) {
        const preservedSets = [];
        targetCard.querySelectorAll(".setRow").forEach(function (r) {
          const kgInput = r.querySelector(".kgInput");
          const repsInput = r.querySelector(".repsInput");
          preservedSets.push({
            kg: kgInput ? kgInput.value : "",
            reps: repsInput ? repsInput.value : "",
            rpe: r.dataset.rpe ? Number(r.dataset.rpe) : null,
            done: r.querySelector(".doneBox").classList.contains("checked"),
            type: r.dataset.type || "N"
          });
        });
        const wasSuperset = targetCard.classList.contains("isSuperset");
        const targetReps = targetCard.dataset.targetreps || "";

        const replacementCard = addExerciseCard(
          ex.id,
          Math.max(preservedSets.length, 1),
          preservedSets,
          wasSuperset,
          targetReps,
          true
        );
        if (replacementCard) {
          targetCard.replaceWith(replacementCard);
          renumberCardIndices();
          showToast("Swapped to " + ex.name);
          saveDraft();
        }
      } else {
        const card = addExerciseCard(ex.id, 1);
        saveDraft();
        if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
    list.appendChild(cell);
  });
}

function setFormType(v) {
  formType = v;
  setSegmented($("formType"), v);
}

function openForm(mode, ex) {
  sheetMode = mode;
  editingId = ex && ex.id ? ex.id : null;
  $("sheetPick").classList.add("hidden");
  $("sheetForm").classList.remove("hidden");
  $("formTitle").textContent = mode === "edit" ? "EDIT EXERCISE" : "NEW EXERCISE";
  $("formName").value = ex && ex.name ? ex.name : "";
  setFormType(ex && ex.type ? ex.type : "weight");
  $("formType").classList.toggle("locked", mode === "edit");
  $("formEquipment").value = ex && ex.equipment ? ex.equipment : "Barbell";
  $("formMuscle").value = ex && ex.primary ? ex.primary : (ex && ex.muscle ? ex.muscle : "Chest");

  selectedSecondaryMuscles = new Set(ex && Array.isArray(ex.secondary) ? ex.secondary : []);
  renderSecondarySelector();

  $("formSave").textContent = mode === "create-add" ? "CREATE & ADD TO WORKOUT" : "SAVE EXERCISE";
  $("formDelete").classList.toggle("hidden", mode !== "edit");
  $("sheetBack").classList.toggle("hidden", mode !== "create-add");
  showSheet();
}

function renderSecondarySelector() {
  const container = $("formSecondaryChips");
  container.innerHTML = "";
  MUSCLES.forEach(m => {
    const chip = document.createElement("button");
    chip.className = "sec-select-chip" + (selectedSecondaryMuscles.has(m) ? " selected" : "");
    chip.textContent = m;
    chip.addEventListener("click", function (e) {
      e.preventDefault();
      if (selectedSecondaryMuscles.has(m)) selectedSecondaryMuscles.delete(m);
      else selectedSecondaryMuscles.add(m);
      renderSecondarySelector();
    });
    container.appendChild(chip);
  });
}

function saveForm() {
  const nameVal = $("formName").value.trim();
  if (!nameVal) {
    alert("Please enter a valid exercise name.");
    return;
  }
  const primaryMuscle = $("formMuscle").value;
  const equipment = $("formEquipment").value;
  const secondaryMuscles = Array.from(selectedSecondaryMuscles).filter(m => m !== primaryMuscle);
  const all = getExercises();
  const dup = all.find(e => e.name.toLowerCase() === nameVal.toLowerCase() && e.id !== editingId);

  if (dup) {
    alert("An exercise with this name already exists.");
    return;
  }

  if (sheetMode === "edit") {
    const ex = all.find(e => e.id === editingId);
    if (ex) {
      ex.name = nameVal;
      ex.primary = primaryMuscle;
      ex.equipment = equipment;
      ex.secondary = secondaryMuscles;
      saveExercises(all);
    }
    closeSheet();
    renderLibrary();
    showToast("Exercise updated");
    return;
  }

  const ex = {
    id: newId(),
    name: nameVal,
    type: formType,
    equipment: equipment,
    primary: primaryMuscle,
    secondary: secondaryMuscles
  };
  all.push(ex);
  saveExercises(all);

  const targetSwapCard = swappingCard;
  closeSheet();

  if (sheetMode === "create-add") {
    if (targetSwapCard && targetSwapCard.parentNode) {
      const replacement = addExerciseCard(ex.id, 1, null, targetSwapCard.classList.contains("isSuperset"), "", true);
      targetSwapCard.replaceWith(replacement);
      renumberCardIndices();
      saveDraft();
    } else {
      const card = addExerciseCard(ex.id, 1);
      saveDraft();
      if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  } else {
    renderLibrary();
    showToast("Exercise saved to database");
  }
}

function deleteExercise() {
  const inWorkout = Array.prototype.some.call(
    document.querySelectorAll("#exerciseList .exCard"),
    c => c.dataset.exid === editingId
  );
  if (isExerciseUsed(editingId) || inWorkout) {
    alert("This exercise has recorded workout data and cannot be deleted. You can rename it instead.");
    return;
  }
  if (!confirm("Permanently delete this exercise?")) return;
  saveExercises(getExercises().filter(e => e.id !== editingId));
  closeSheet();
  renderLibrary();
  showToast("Exercise deleted");
}

$("addExerciseBtn").addEventListener("click", openPicker);
$("sheetSearch").addEventListener("input", renderPickList);
$("sheetClose").addEventListener("click", closeSheet);
$("sheetCancel").addEventListener("click", closeSheet);
$("sheetBackdrop").addEventListener("click", closeSheet);
$("sheetBack").addEventListener("click", openPicker);
$("formSave").addEventListener("click", saveForm);
$("formDelete").addEventListener("click", deleteExercise);
bindSegmented($("formType"), v => { formType = v; });

(function () {
  const mSel = $("formMuscle");
  mSel.innerHTML = "";
  MUSCLES.forEach(m => {
    const o = document.createElement("option");
    o.value = m;
    o.textContent = m;
    mSel.appendChild(o);
  });

  const eqSel = $("formEquipment");
  eqSel.innerHTML = "";
  EQUIPMENTS.filter(e => e !== "All").forEach(eq => {
    const o = document.createElement("option");
    o.value = eq;
    o.textContent = eq;
    eqSel.appendChild(o);
  });
})();

// =====================================================
//  TAB 2: HISTORY, EDIT, REPEAT & PAGINATION
// =====================================================
function renderHistoryTab() {
  renderCalendar();
  renderHistoryList();
}

function renderCalendar() {
  $("calTitle").textContent = MONTHS[calMonth].toUpperCase() + " " + calYear;
  $("calSubtitle").textContent = MONTHS_SHORT[calMonth] + " " + calYear;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const startDay = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
  const now = new Date();
  const isThisMonth = now.getFullYear() === calYear && now.getMonth() === calMonth;

  const counts = {};
  getHistory().forEach(function (w) {
    const d = workoutDate(w);
    if (d && d.getFullYear() === calYear && d.getMonth() === calMonth) {
      counts[d.getDate()] = (counts[d.getDate()] || 0) + 1;
    }
  });

  const grid = document.createElement("div");
  grid.className = "calGrid";

  ["M", "T", "W", "T", "F", "S", "S"].forEach(d => {
    const dow = document.createElement("div");
    dow.className = "dow";
    dow.textContent = d;
    grid.appendChild(dow);
  });

  for (let i = 0; i < startDay; i++) {
    const empty = document.createElement("div");
    empty.className = "day empty";
    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    let cls = "day";
    if (counts[day]) cls += " has";
    if (isThisMonth && day === now.getDate()) cls += " today";
    if (selectedCalDay === day) cls += " selected-day";
    cell.className = cls;
    cell.textContent = day;

    if (counts[day]) {
      cell.title = "Tap to filter workouts on " + day + " " + MONTHS_SHORT[calMonth];
      cell.addEventListener("click", function () {
        selectedCalDay = (selectedCalDay === day) ? null : day;
        renderHistoryTab();
      });
    }
    grid.appendChild(cell);
  }

  const box = $("calendarBox");
  box.innerHTML = "";
  box.appendChild(grid);
}

$("calPrev").addEventListener("click", function () {
  selectedCalDay = null;
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderHistoryTab();
});
$("calNext").addEventListener("click", function () {
  selectedCalDay = null;
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderHistoryTab();
});

function setsText(ex) {
  const type = exTypeOf(ex.exId);
  const unit = unitName().toUpperCase();
  return (ex.sets || []).map(function (s) {
    const label = s.type && s.type !== "N" ? "[" + s.type + "] " : "";
    const rpeStr = s.rpe ? " @" + s.rpe : "";
    if (type === "time") return label + s.reps + " sec" + rpeStr;
    if (type === "reps") return label + s.reps + " reps" + rpeStr;
    return label + showWeight(s.kg) + unit + " × " + s.reps + rpeStr;
  }).join(", ");
}

function renderHistoryList() {
  const list = $("historyList");
  list.innerHTML = "";
  const hist = getHistory();
  const unit = unitName().toUpperCase();

  let filtered = hist.slice().reverse();
  if (selectedCalDay !== null) {
    filtered = filtered.filter(function (w) {
      const d = workoutDate(w);
      return d && d.getFullYear() === calYear && d.getMonth() === calMonth && d.getDate() === selectedCalDay;
    });
    if ($("historyFilterLabel")) {
      $("historyFilterLabel").textContent = selectedCalDay + " " + MONTHS_SHORT[calMonth].toUpperCase() + " (TAP DAY AGAIN TO CLEAR)";
    }
  } else if ($("historyFilterLabel")) {
    $("historyFilterLabel").textContent = hist.length + " TOTAL SESSIONS";
  }

  if (filtered.length === 0) {
    list.innerHTML =
      '<div class="metal-card" style="text-align:center; color:var(--muted); padding:24px 16px;">' +
        '<p style="margin:0 0 4px; font-weight:700;">No workout logs found.</p>' +
        '<small style="font-family:var(--font-mono);">Completed workouts will appear here with full session summaries.</small>' +
      '</div>';
    return;
  }

  const visibleItems = selectedCalDay !== null ? filtered : filtered.slice(0, historyVisibleCount);

  visibleItems.forEach(function (w) {
    const card = document.createElement("div");
    card.className = "history-card";

    const title = document.createElement("h3");
    title.textContent = w.title || "Strength Session";
    card.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "history-meta";
    const d = workoutDate(w);
    let metaText = d ? fmtShort(d) + " " + d.getFullYear() : w.date;
    if (w.duration) metaText += " · " + Math.max(1, Math.round(w.duration / 60000)) + " MIN";
    metaText += " · " + showWeight(workoutVolume(w)) + " " + unit;
    meta.textContent = metaText;
    card.appendChild(meta);

    if (w.notes) {
      const notes = document.createElement("div");
      notes.className = "history-notes";
      notes.textContent = w.notes;
      card.appendChild(notes);
    }

    (w.prs || []).forEach(function (pr) {
      const chip = document.createElement("span");
      chip.className = "chip-pr";
      chip.textContent = "🏆 " + (pr.name || exName(pr.exId)) + " · " + pr.kind + " (" + formatPRValue(pr) + ")";
      card.appendChild(chip);
    });

    (w.exercises || []).forEach(function (ex) {
      const line = document.createElement("div");
      line.className = "history-exercise-line";
      const name = document.createElement("b");
      name.textContent = exName(ex.exId) + (ex.isSuperset ? " ⚡" : "");
      const sub = document.createElement("div");
      sub.className = "history-sets-sub";
      sub.textContent = setsText(ex);
      line.appendChild(name);
      line.appendChild(sub);
      card.appendChild(line);
    });

    const actions = document.createElement("div");
    actions.className = "history-card-actions";

    const sumBtn = document.createElement("button");
    sumBtn.className = "keycap-btn primary";
    sumBtn.textContent = "SUMMARY";
    sumBtn.addEventListener("click", function () {
      showSummaryModal(buildSummaryFromWorkout(w), true);
    });

    const editBtn = document.createElement("button");
    editBtn.className = "keycap-btn";
    editBtn.textContent = "✎ EDIT";
    editBtn.addEventListener("click", function () {
      editHistoryWorkout(w);
    });

    const repBtn = document.createElement("button");
    repBtn.className = "keycap-btn";
    repBtn.textContent = "↻ REPEAT";
    repBtn.addEventListener("click", function () {
      repeatHistoryWorkout(w);
    });

    const delBtn = document.createElement("button");
    delBtn.className = "keycap-btn danger";
    delBtn.textContent = "✕";
    delBtn.title = "Delete Log";
    delBtn.addEventListener("click", function () {
      if (confirm('Delete workout log "' + (w.title || "Strength Session") + '"?')) {
        const all = getHistory();
        const nextHist = w.id ? all.filter(item => item.id !== w.id) : all.filter(item => item !== w);
        saveHistory(nextHist);
        renderHistoryTab();
        updateHeroStats();
        showToast("Workout log deleted");
      }
    });

    actions.appendChild(sumBtn);
    actions.appendChild(editBtn);
    actions.appendChild(repBtn);
    actions.appendChild(delBtn);
    card.appendChild(actions);

    list.appendChild(card);
  });

  if (selectedCalDay === null && filtered.length > historyVisibleCount) {
    const moreBtn = document.createElement("button");
    moreBtn.className = "tactile-cta secondary";
    moreBtn.style.marginTop = "8px";
    const remaining = filtered.length - historyVisibleCount;
    moreBtn.innerHTML = '<span>LOAD MORE WORKOUTS (' + remaining + ' REMAINING)</span><span class="btn-sub">▼</span>';
    moreBtn.addEventListener("click", function () {
      historyVisibleCount += 20;
      renderHistoryList();
    });
    list.appendChild(moreBtn);
  }
}

// =====================================================
//  TAB 3: PROGRESS, RECOVERY %, REP TABLE & MEASUREMENTS
// =====================================================
function renderProgressTab() {
  renderMuscleRecovery();
  renderWeeklyMuscles();
  renderProgressChart();
  renderRecords();
  renderBodyWeight();
  renderMeasurements();
}

function renderMuscleRecovery() {
  const grid = $("recoveryGrid");
  if (!grid || typeof calculateMuscleRecovery !== "function") return;
  grid.innerHTML = "";

  const items = calculateMuscleRecovery();
  items.forEach(function (item) {
    const card = document.createElement("div");
    card.className = "rec-card";

    let barColor = "var(--ok)";
    if (item.pct < 55) barColor = "var(--flame)";
    else if (item.pct < 85) barColor = "var(--brass)";

    card.innerHTML =
      '<div class="rec-top">' +
        '<b>' + esc(item.muscle.toUpperCase()) + '</b>' +
        '<span style="color:' + barColor + '; font-weight:700;">' + item.pct + '% · ' + esc(item.status) + '</span>' +
      '</div>' +
      '<div class="rec-bar-track">' +
        '<div class="rec-bar-fill" style="width:' + item.pct + '%; background:' + barColor + ';"></div>' +
      '</div>';
    grid.appendChild(card);
  });
}

function renderWeeklyMuscles() {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentWorkouts = getHistory().filter(function (w) {
    const d = workoutDate(w);
    return d && d.getTime() >= cutoff;
  });

  const workloadMap = calculateMuscleWorkload(recentWorkouts);
  renderBodyMapSvg("analyticsBodyMap", workloadMap, false);

  const distContainer = $("muscleDistribution");
  distContainer.innerHTML = "";
  const names = Object.keys(workloadMap).sort((a, b) => workloadMap[b].total - workloadMap[a].total);

  if (names.length === 0) {
    distContainer.innerHTML = '<span style="font-family:var(--font-mono); font-size:12px; color:var(--muted);">No working sets logged in the last 7 days.</span>';
    return;
  }

  names.forEach(function (m) {
    const entry = workloadMap[m];
    const badge = document.createElement("span");
    badge.className = "dist-badge";
    if (entry.direct > 0 && entry.indirect > 0) {
      badge.innerHTML = esc(m) + ': <b>' + entry.direct + ' direct</b> <small style="color:var(--muted);">(+' + entry.indirect + ' assist)</small>';
    } else if (entry.direct > 0) {
      badge.innerHTML = esc(m) + ': <b>' + entry.direct + ' direct sets</b>';
    } else {
      badge.innerHTML = esc(m) + ': <b style="color:var(--muted);">' + entry.indirect + ' assist sets</b>';
    }
    distContainer.appendChild(badge);
  });
}

function renderProgressChart() {
  const sel = $("progressSelect");
  const canvas = $("progressCanvas");
  const rmBox = $("repMaxBox");
  const used = exercisesWithData();
  sel.innerHTML = "";

  if (used.length === 0) {
    const o = document.createElement("option");
    o.textContent = "No Exercise History Found";
    sel.appendChild(o);
    sel.disabled = true;
    drawChart(canvas, [], {});
    if (rmBox) rmBox.innerHTML = "";
    return;
  }
  sel.disabled = false;
  used.forEach(function (ex) {
    const o = document.createElement("option");
    o.value = ex.id;
    o.textContent = ex.name;
    sel.appendChild(o);
  });
  if (!used.some(e => e.id === progressExId)) progressExId = used[0].id;
  sel.value = progressExId;

  const type = exTypeOf(progressExId);
  const isNoWeight = (type === "reps" || type === "time");
  $("metricSeg").classList.toggle("hidden", isNoWeight);
  setSegmented($("metricSeg"), progressMetric);
  if ($("chartRangeSeg")) setSegmented($("chartRangeSeg"), progressRangeDays);

  const unit = unitName().toUpperCase();
  const cutoffTs = progressRangeDays === "all"
    ? 0
    : (Date.now() - Number(progressRangeDays) * 24 * 3600 * 1000);

  const rows = [];
  getHistory().forEach(function (w) {
    const d = workoutDate(w);
    const ts = d ? d.getTime() : 0;
    if (cutoffTs > 0 && ts < cutoffTs) return;

    (w.exercises || []).forEach(function (e) {
      if (e.exId !== progressExId) return;
      const st = getStats(e.sets);
      let v = st.maxWeight;
      if (isNoWeight) v = st.maxReps;
      else if (progressMetric === "1rm") v = st.best1rm;
      else if (progressMetric === "volume") v = st.totalVol;
      if (v > 0) {
        rows.push({
          t: ts,
          v: isNoWeight ? v : showWeight(v),
          label: d ? fmtShort(d) : ""
        });
      }
    });
  });
  rows.sort((a, b) => a.t - b.t);

  const suffix = type === "time" ? " sec" : (type === "reps" ? " reps" : " " + unit);
  drawChart(canvas, rows, {
    format: v => v + suffix
  });

  // Render 1RM-to-12RM Rep-Max Table for weighted exercises
  if (rmBox) {
    rmBox.innerHTML = "";
    if (!isNoWeight) {
      const allStats = getStats(getAllSets(progressExId));
      const best1rmKg = allStats.best1rm;
      if (best1rmKg > 0) {
        const repTargets = [
          { label: "EST. 1RM", reps: 1 },
          { label: "3RM (~91%)", reps: 3 },
          { label: "5RM (~86%)", reps: 5 },
          { label: "8RM (~79%)", reps: 8 },
          { label: "10RM (~75%)", reps: 10 },
          { label: "12RM (~71%)", reps: 12 }
        ];
        repTargets.forEach(function (rt) {
          const estKg = rt.reps === 1 ? best1rmKg : (best1rmKg / (1 + rt.reps / 30));
          const cell = document.createElement("div");
          cell.className = "rm-cell";
          cell.innerHTML = '<small>' + esc(rt.label) + '</small><b>' + showWeight(estKg) + ' ' + esc(unit) + '</b>';
          rmBox.appendChild(cell);
        });
      }
    }
  }
}

$("progressSelect").addEventListener("change", function () {
  progressExId = $("progressSelect").value;
  renderProgressChart();
});
bindSegmented($("metricSeg"), function (v) {
  progressMetric = v;
  renderProgressChart();
});
if ($("chartRangeSeg")) {
  bindSegmented($("chartRangeSeg"), function (v) {
    progressRangeDays = v;
    renderProgressChart();
  });
}

function renderRecords() {
  const box = $("recordsBox");
  box.innerHTML = "";
  const used = exercisesWithData().sort((a, b) => a.name.localeCompare(b.name));

  if (used.length === 0) {
    box.innerHTML = '<div class="metal-card" style="text-align:center; color:var(--muted); font-size:12px;">No personal records established yet.</div>';
    return;
  }

  const unit = unitName().toUpperCase();
  used.forEach(function (ex) {
    const st = getStats(getAllSets(ex.id));
    const row = document.createElement("div");
    row.className = "record-row";

    const name = document.createElement("span");
    name.className = "record-name";
    name.textContent = ex.name;

    const val = document.createElement("span");
    val.className = "record-value";
    if (ex.type === "time") {
      val.textContent = st.maxReps + " SEC HOLD";
    } else if (ex.type === "reps") {
      val.textContent = st.maxReps + " REPS";
    } else {
      val.textContent = showWeight(st.maxWeight) + " " + unit + " · 1RM: " + showWeight(st.best1rm) + " " + unit;
    }

    row.appendChild(name);
    row.appendChild(val);
    box.appendChild(row);
  });
}

function renderBodyWeight() {
  const unit = unitName().toUpperCase();
  $("bwInput").placeholder = "Body Weight (" + unit + ")";
  const list = getBodyWeights();

  const points = list.slice(-30).map(function (e) {
    const p = e.date.split("-");
    return {
      v: showWeight(e.kg),
      label: Number(p[2]) + " " + MONTHS_SHORT[Number(p[1]) - 1]
    };
  });
  drawChart($("bwCanvas"), points, {
    format: v => v + " " + unit
  });

  const box = $("bwList");
  box.innerHTML = "";
  list.slice(-5).reverse().forEach(function (e) {
    const row = document.createElement("div");
    row.className = "bw-row";
    const text = document.createElement("span");
    text.textContent = e.date + " · " + showWeight(e.kg) + " " + unit;
    const del = document.createElement("button");
    del.className = "bw-del-btn";
    del.textContent = "✕";
    del.addEventListener("click", function () {
      saveBodyWeights(getBodyWeights().filter(x => x.date !== e.date));
      renderBodyWeight();
    });
    row.appendChild(text);
    row.appendChild(del);
    box.appendChild(row);
  });
}

$("bwAddBtn").addEventListener("click", function () {
  const v = Number($("bwInput").value);
  if ($("bwInput").value.trim() === "" || !Number.isFinite(v) || v <= 0 || v > 500) {
    alert("Please enter a valid body weight.");
    return;
  }
  const list = getBodyWeights().filter(e => e.date !== todayKey());
  list.push({ date: todayKey(), kg: toKg(v) });
  list.sort((a, b) => a.date < b.date ? -1 : 1);
  saveBodyWeights(list);
  $("bwInput").value = "";
  renderBodyWeight();
  showToast("Body weight logged");
});

// ---------- Body Measurements Tracker (Arms, Chest, Waist, Thighs, Body Fat %) ----------
function renderMeasurements() {
  const box = $("measList");
  if (!box || typeof getMeasurements !== "function") return;
  box.innerHTML = "";
  const list = getMeasurements();

  if (list.length === 0) {
    box.innerHTML = '<div style="font-family:var(--font-mono); font-size:12px; color:var(--muted); padding:6px 0;">No body measurements logged yet.</div>';
    return;
  }

  list.slice(-8).reverse().forEach(function (entry) {
    const row = document.createElement("div");
    row.className = "bw-row";
    const text = document.createElement("span");
    const suffix = entry.part === "Body Fat %" ? "%" : "";
    text.textContent = entry.date + " · " + entry.part + ": " + entry.val + suffix;

    const del = document.createElement("button");
    del.className = "bw-del-btn";
    del.textContent = "✕";
    del.addEventListener("click", function () {
      saveMeasurements(getMeasurements().filter(x => x.id !== entry.id));
      renderMeasurements();
    });
    row.appendChild(text);
    row.appendChild(del);
    box.appendChild(row);
  });
}

if ($("measAddBtn")) {
  $("measAddBtn").addEventListener("click", function () {
    const part = $("measTypeSelect").value;
    const val = Number($("measInput").value);
    if ($("measInput").value.trim() === "" || !Number.isFinite(val) || val <= 0 || val > 300) {
      alert("Please enter a valid measurement number.");
      return;
    }
    const list = getMeasurements();
    list.push({
      id: newId(),
      date: todayKey(),
      part: part,
      val: Math.round(val * 10) / 10
    });
    saveMeasurements(list);
    $("measInput").value = "";
    renderMeasurements();
    showToast(part + " logged ✓");
  });
}

// =====================================================
//  TAB 4: SETTINGS, LIBRARY, BACKUP & CSV IMPORTER
// =====================================================
function renderMoreTab() {
  $("moreMain").classList.remove("hidden");
  $("libraryView").classList.add("hidden");
  const s = getSettings();
  setSegmented($("unitSeg"), s.unit);
  $("restInput").value = s.rest;
  $("exCount").textContent = getExercises().length + " ›";
}

bindSegmented($("unitSeg"), function (v) {
  const s = getSettings();
  const oldUnit = s.unit;
  if (oldUnit === v) return;
  s.unit = v;
  saveSettings(s);
  syncActiveWorkoutUnits(oldUnit, v);
  updateHeroStats();
  showToast("Unit switched to " + v.toUpperCase());
});

$("restInput").addEventListener("change", function () {
  const s = getSettings();
  const v = Number($("restInput").value);
  s.rest = (Number.isFinite(v) && v >= 5 && v <= 600) ? Math.round(v) : 60;
  saveSettings(s);
  $("restInput").value = s.rest;
});

$("openLibrary").addEventListener("click", function () {
  $("moreMain").classList.add("hidden");
  $("libraryView").classList.remove("hidden");
  $("libSearch").value = "";
  libFilterMuscle = "All";
  libFilterEquipment = "All";
  renderLibFilters();
  renderLibrary();
  window.scrollTo(0, 0);
});
$("libBack").addEventListener("click", renderMoreTab);
$("libAdd").addEventListener("click", function () { openForm("create", { name: "" }); });
$("libSearch").addEventListener("input", renderLibrary);

function renderLibFilters() {
  const mContainer = $("libMuscleFilter");
  mContainer.innerHTML = "";
  ["All", ...MUSCLES].forEach(m => {
    const chip = document.createElement("button");
    chip.className = "filter-chip" + (libFilterMuscle === m ? " active" : "");
    chip.textContent = m.toUpperCase();
    chip.addEventListener("click", function () {
      libFilterMuscle = m;
      renderLibFilters();
      renderLibrary();
    });
    mContainer.appendChild(chip);
  });

  const eqContainer = $("libEquipmentFilter");
  eqContainer.innerHTML = "";
  EQUIPMENTS.forEach(eq => {
    const chip = document.createElement("button");
    chip.className = "filter-chip" + (libFilterEquipment === eq ? " active" : "");
    chip.textContent = eq.toUpperCase();
    chip.addEventListener("click", function () {
      libFilterEquipment = eq;
      renderLibFilters();
      renderLibrary();
    });
    eqContainer.appendChild(chip);
  });
}

function renderLibrary() {
  const term = $("libSearch").value.trim().toLowerCase();
  const list = $("libList");
  list.innerHTML = "";
  const all = getExercises();

  const items = all.filter(function (e) {
    const matchesSearch = e.name.toLowerCase().includes(term);
    const matchesEquipment = libFilterEquipment === "All" || exEquipmentOf(e.id) === libFilterEquipment;
    const primary = exPrimaryMuscleOf(e.id);
    const secondaries = exSecondaryMusclesOf(e.id);
    const matchesMuscle = libFilterMuscle === "All" || primary === libFilterMuscle || secondaries.includes(libFilterMuscle);
    return matchesSearch && matchesEquipment && matchesMuscle;
  }).sort((a, b) => a.name.localeCompare(b.name));

  if (items.length === 0) {
    list.innerHTML = '<div class="metal-card" style="text-align:center; color:var(--muted); font-size:12px;">No matching exercises found. Tap "+ NEW EXERCISE" to create.</div>';
    return;
  }

  items.forEach(function (ex) {
    const cell = document.createElement("div");
    cell.className = "lib-item";

    const leftDiv = document.createElement("div");
    const nameSpan = document.createElement("span");
    nameSpan.textContent = ex.name;
    const metaDiv = document.createElement("div");
    metaDiv.style.cssText = "font-family:var(--font-mono); font-size:11px; color:var(--muted); margin-top:2px;";
    const typeLabel = ex.type === "time" ? " · Time (Sec)" : (ex.type === "reps" ? " · Reps Only" : "");
    metaDiv.textContent = exEquipmentOf(ex.id) + " · " + exPrimaryMuscleOf(ex.id) + typeLabel;
    leftDiv.appendChild(nameSpan);
    leftDiv.appendChild(metaDiv);

    const editSmall = document.createElement("small");
    editSmall.style.cssText = "font-family:var(--font-mono); color:var(--brass);";
    editSmall.textContent = "EDIT ›";

    cell.appendChild(leftDiv);
    cell.appendChild(editSmall);
    cell.addEventListener("click", function () { openForm("edit", ex); });
    list.appendChild(cell);
  });
  $("exCount").textContent = all.length + " ›";
}

// Backup Export & Validated Import
$("exportBtn").addEventListener("click", function () {
  const data = {
    version: 2,
    appName: "STRVEX",
    exportDate: new Date().toISOString(),
    exercises: getExercises(),
    history: getHistory(),
    routines: getRoutines(),
    bodyweight: getBodyWeights(),
    measurements: typeof getMeasurements === "function" ? getMeasurements() : [],
    exercise_meta: typeof getExerciseMetaMap === "function" ? getExerciseMetaMap() : {},
    settings: getSettings()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "strvex-backup-" + todayKey() + ".json";
  link.click();
  showToast("Backup exported ✓");
});

$("importFile").addEventListener("change", function () {
  const file = $("importFile").files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== "object" || !Array.isArray(data.history) || !Array.isArray(data.routines)) {
        throw new Error("Invalid backup structure");
      }

      let exercises = data.exercises;
      let history = data.history;
      let routines = data.routines;

      if (!Array.isArray(exercises)) {
        const conv = convertV1(history, routines, data.muscles);
        exercises = conv.exercises;
        history = conv.history;
        routines = conv.routines;
      }

      const cleanExercises = exercises
        .filter(e => e && typeof e.id === "string" && typeof e.name === "string" && e.name.trim() !== "")
        .map(e => ({
          id: String(e.id),
          name: String(e.name).trim().slice(0, 120),
          type: (e.type === "reps" || e.type === "time") ? e.type : "weight",
          equipment: EQUIPMENTS.includes(e.equipment) && e.equipment !== "All" ? e.equipment : "Barbell",
          primary: MUSCLES.includes(e.primary) ? e.primary : (MUSCLES.includes(e.muscle) ? e.muscle : "Other"),
          secondary: Array.isArray(e.secondary) ? e.secondary.filter(m => MUSCLES.includes(m)) : []
        }));

      if (!confirm("Restore backup? Your current device logs will be backed up automatically before restoring.")) {
        $("importFile").value = "";
        return;
      }

      write("backup_before_restore", {
        ts: Date.now(),
        exercises: getExercises(),
        history: getHistory(),
        routines: getRoutines(),
        bodyweight: getBodyWeights()
      });

      saveExercises(cleanExercises);
      saveHistory(history);
      saveRoutines(routines);
      if (Array.isArray(data.bodyweight)) saveBodyWeights(data.bodyweight);
      if (Array.isArray(data.measurements) && typeof saveMeasurements === "function") saveMeasurements(data.measurements);
      if (data.exercise_meta && typeof saveExerciseMetaMap === "function") saveExerciseMetaMap(data.exercise_meta);
      if (data.settings && typeof data.settings === "object") saveSettings(data.settings);
      initializeDatabase();
      clearDraft();
      showToast("Backup restored ✓");
      setTimeout(function () { location.reload(); }, 500);
    } catch (e) {
      alert("Invalid backup file: Please select a valid STRVEX JSON backup file.");
    }
    $("importFile").value = "";
  };
  reader.readAsText(file);
});

// Hevy & Strong CSV Importer Handler
if ($("importCsvFile")) {
  $("importCsvFile").addEventListener("change", function () {
    const file = $("importCsvFile").files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const count = importWorkoutsFromCsv(reader.result);
        updateHeroStats();
        showToast("Imported " + count + " workouts from CSV ✓");
        showTab("history");
      } catch (err) {
        alert("CSV Import Error: " + (err && err.message ? err.message : "Please select a valid Hevy or Strong workout CSV export file."));
      }
      $("importCsvFile").value = "";
    };
    reader.readAsText(file);
  });
}

// =====================================================
//  INITIALIZATION
// =====================================================
bindRoutineCategoryFilters();
restoreDraft();
showTab(location.hash.slice(1) || "workout");

window.addEventListener("resize", function () {
  if (Math.abs(window.innerWidth - lastWindowWidth) > 10) {
    lastWindowWidth = window.innerWidth;
    if (currentTab === "progress") {
      renderProgressChart();
      renderBodyWeight();
    }
  }
});