// ============ app.js (PART 1/2) : STRVEX CORE, MUSIC DOCK, LIVE PR & COCKPIT ============

function $(id) {
  return document.getElementById(id);
}

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
let editingWorkoutId = null;
let editingRoutineId = null;
let clockId = null;
let restEnd = 0;
let restId = null;
let progressExId = "";
let progressMetric = "weight";
let progressRangeDays = "all";
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let selectedCalDay = null;
let historyVisibleCount = 15;
let sheetMode = "pick";
let editingId = null;
let swappingCard = null;
let formType = "weight";
let wakeLock = null;
let isSummaryFromHistory = false;
let activeSummaryData = null;
let activeFlexMode = "carbon"; // "carbon" | "mvp" | "photo"
let uploadedFlexPhotoDataUrl = null;
let lastWindowWidth = window.innerWidth;

// Filter States
let sheetFilterMuscle = "All";
let sheetFilterEquipment = "All";
let routineCategoryFilter = "all";
let libFilterMuscle = "All";
let libFilterEquipment = "All";
let selectedSecondaryMuscles = new Set();

// Onboarding temporary state
let onbUnit = "kg";
let onbTheme = "dark";

// ---------- Theme & RPE Column Visibility ----------
function applyTheme(themeMode) {
  const mode = themeMode === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", mode);
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", mode === "light" ? "#ebe6dc" : "#121211");
  }
  if (currentTab === "progress" && typeof renderProgressChart === "function") {
    renderProgressChart();
    renderBodyWeight();
  }
}

function applyRpeVisibility(showRpe) {
  const ws = $("workoutScreen");
  if (!ws) return;
  ws.classList.toggle("hide-rpe", !showRpe);
}

// ---------- Header Athlete Name & Level Badge ----------
function updateHeaderAthleteBadge() {
  if (typeof getAthleteProfile !== "function") return;
  const prof = getAthleteProfile();
  const label = $("headerAthleteLabel");
  if (label) {
    label.textContent = prof.name + " // LVL " + prof.level;
  }
}

// ---------- First-Time Onboarding & Quick Guide Controller ----------
function openOnboardingModal() {
  const s = getSettings();
  onbUnit = s.unit || "kg";
  onbTheme = s.theme || "dark";

  if ($("onbNameInput")) $("onbNameInput").value = s.userName || "";
  if ($("onbUnitSeg")) setSegmented($("onbUnitSeg"), onbUnit);
  if ($("onbThemeSeg")) setSegmented($("onbThemeSeg"), onbTheme);
  if ($("onbTrackSelect")) $("onbTrackSelect").value = s.defaultTrack || "all";

  $("onboardingBackdrop").classList.remove("hidden");
  $("onboardingModal").classList.remove("hidden");
}

function closeOnboardingModal() {
  $("onboardingBackdrop").classList.add("hidden");
  $("onboardingModal").classList.add("hidden");
}

function saveOnboarding() {
  const s = getSettings();
  const oldUnit = s.unit;
  const nameVal = $("onbNameInput") ? $("onbNameInput").value.trim() : "";
  const trackVal = $("onbTrackSelect") ? $("onbTrackSelect").value : "all";

  s.userName = nameVal.slice(0, 20);
  s.unit = onbUnit;
  s.theme = onbTheme;
  s.defaultTrack = trackVal;
  s.onboarded = true;
  saveSettings(s);

  applyTheme(s.theme);
  if (oldUnit !== s.unit) {
    syncActiveWorkoutUnits(oldUnit, s.unit);
  }
  routineCategoryFilter = trackVal || "all";
  updateHeaderAthleteBadge();
  closeOnboardingModal();
  renderTab(currentTab);
  showToast("Welcome to STRVEX, " + (s.userName || "Athlete") + "!");
}

if ($("headerAthleteBtn")) $("headerAthleteBtn").addEventListener("click", openOnboardingModal);
if ($("openOnboardingBtn")) $("openOnboardingBtn").addEventListener("click", openOnboardingModal);
if ($("onbCloseBtn")) $("onbCloseBtn").addEventListener("click", closeOnboardingModal);
if ($("onboardingBackdrop")) $("onboardingBackdrop").addEventListener("click", closeOnboardingModal);
if ($("onbSaveBtn")) $("onbSaveBtn").addEventListener("click", saveOnboarding);

// ---------- Web Audio API (Offline Beep & PR Victory Fanfare) ----------
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

function playPrFanfare() {
  playBeep(587.33, "triangle", 0.12);
  setTimeout(function () { playBeep(783.99, "triangle", 0.12); }, 120);
  setTimeout(function () { playBeep(987.77, "triangle", 0.14); }, 240);
  setTimeout(function () { playBeep(1174.66, "triangle", 0.38); }, 370);
}

let livePrTimerId = null;
function triggerLivePrCelebration(exNameStr, prLabel) {
  playPrFanfare();
  if (navigator.vibrate) navigator.vibrate([120, 60, 180]);
  const banner = $("livePrBanner");
  const textEl = $("livePrText");
  if (!banner || !textEl) return;
  textEl.textContent = "🏆 NEW LIVE PR! " + exNameStr.toUpperCase() + " — " + prLabel;
  banner.classList.remove("hidden");
  clearTimeout(livePrTimerId);
  livePrTimerId = setTimeout(function () {
    banner.classList.add("hidden");
  }, 4500);
}

// ---------- In-Workout Music & Spotify Dock Controller ----------
function initMusicDock() {
  const toggleBtn = $("musicToggleBtn");
  const dock = $("musicDock");
  const iframe = $("spotifyIframe");
  const genreContainer = $("musicGenreChips");
  const customBtn = $("customSpotifyBtn");

  if (!toggleBtn || !dock || !iframe) return;

  toggleBtn.addEventListener("click", function () {
    const isHidden = dock.classList.contains("hidden");
    dock.classList.toggle("hidden", !isHidden);
    if (isHidden && !iframe.getAttribute("src")) {
      iframe.src = getSettings().spotifyEmbedUrl;
    }
  });

  if (genreContainer) {
    genreContainer.addEventListener("click", function (e) {
      const chip = e.target.closest(".filter-chip");
      if (!chip || !chip.dataset.embed) return;
      genreContainer.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      iframe.src = chip.dataset.embed;
      const s = getSettings();
      s.spotifyEmbedUrl = chip.dataset.embed;
      saveSettings(s);
    });
  }

  if (customBtn) {
    customBtn.addEventListener("click", function () {
      const rawUrl = prompt("Paste any Spotify Playlist or Track link (e.g. https://open.spotify.com/playlist/...):", "");
      if (!rawUrl || !rawUrl.trim()) return;
      const m = rawUrl.match(/spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
      if (!m) {
        alert("Please paste a valid Spotify playlist, album, or track URL.");
        return;
      }
      const embedUrl = "https://open.spotify.com/embed/" + m[1] + "/" + m[2] + "?utm_source=generator&theme=0";
      iframe.src = embedUrl;
      const s = getSettings();
      s.spotifyEmbedUrl = embedUrl;
      saveSettings(s);
      showToast("Custom Spotify playlist loaded 🎵");
    });
  }
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

if ($("onbUnitSeg")) bindSegmented($("onbUnitSeg"), v => { onbUnit = v; });
if ($("onbThemeSeg")) {
  bindSegmented($("onbThemeSeg"), v => {
    onbTheme = v;
    applyTheme(v);
  });
}

document.addEventListener("keydown", function (e) {
  if (e.key !== "Escape") return;
  if ($("onboardingModal") && !$("onboardingModal").classList.contains("hidden")) {
    closeOnboardingModal();
  } else if ($("plateModal") && !$("plateModal").classList.contains("hidden")) {
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
  updateHeaderAthleteBadge();
  syncRoutineCategoryChips();

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

// ---------- Exercise Form Guide, YouTube Demo & History Modal Controller ----------
function openExerciseInfo(exId) {
  const ex = getExercise(exId);
  if (!ex) return;

  $("exInfoEquip").textContent = (exEquipmentOf(exId) || "EQUIPMENT").toUpperCase();
  $("exInfoTitle").textContent = ex.name;

  if ($("exInfoYoutubeBtn") && typeof getExerciseYoutubeUrl === "function") {
    $("exInfoYoutubeBtn").href = getExerciseYoutubeUrl(exId);
  }

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
  applyRpeVisibility(getSettings().showRpe);

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

    const stepWtBtn = card.querySelector(".step-wt-btn");
    if (stepWtBtn) {
      stepWtBtn.textContent = "+" + (newUnit === "lbs" ? "5 LB" : "2.5 KG");
    }

    const previous = getPrevious(exId, editingWorkoutId);
    card.querySelectorAll(".setRow").forEach(function (row, i) {
      const kgInput = row.querySelector(".kgInput");
      if (kgInput && kgInput.value !== "") {
        kgInput.value = convertWeightValue(kgInput.value, oldUnit, newUnit);
      }
      const prev = previous[i];
      const prevSpan = row.querySelector(".set-prev-hint");
      if (prev && prevSpan) {
        if (type === "time") prevSpan.textContent = prev.reps + "s ↵";
        else if (type === "reps") prevSpan.textContent = prev.reps + "r ↵";
        else prevSpan.textContent = showWeight(prev.kg) + "×" + prev.reps + " ↵";
      }
    });
  });
  saveDraft();
}

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

  const isPlateau = typeof detectPlateau === "function" && detectPlateau(exId, editingWorkoutId);

  if (type === "time") {
    let maxSec = 0;
    workingSets.forEach(s => { if (Number(s.reps) > maxSec) maxSec = Number(s.reps); });
    if (isPlateau) {
      return "🚨 Plateau Alert: Stuck at " + maxSec + "s for 3 sessions! Add 1 extra set or slow down your breathing today.";
    }
    return "💡 Target: Last longest hold was " + maxSec + " sec. Aim for " + (maxSec + 5) + " sec today!";
  }

  if (type === "reps") {
    let maxReps = 0;
    workingSets.forEach(s => { if (Number(s.reps) > maxReps) maxReps = Number(s.reps); });
    if (isPlateau) {
      return "🚨 Plateau Alert: Stuck at " + maxReps + " reps for 3 sessions! Try a 2-second pause at the top or add a Drop Set [D].";
    }
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

  if (isPlateau) {
    return "🚨 Plateau Alert: Stuck at " + shownLastWeight + " " + unit + " × " + topReps +
      " for 3 sessions! Tap ⇄ SWAP for a dumbbell/cable variation or add 1 Drop Set [D] today.";
  }

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
  const type = exTypeOf(exId);
  const isNoWeight = (type === "reps" || type === "time");
  const previous = getPrevious(exId, editingWorkoutId);
  const pinnedNote = getExerciseNote(exId);
  const historicalBest = getStats(getAllSets(exId, editingWorkoutId));

  const card = document.createElement("div");
  card.className = "exCard" + (isNoWeight ? " repsOnly" : "") + (isSuperset ? " isSuperset" : "");
  card.dataset.exid = exId;
  card.dataset.targetreps = targetReps || "";

  const repColHeader = type === "time" ? "SEC" : "REPS";
  const stepWtLabel = "+" + (unitName() === "lbs" ? "5 LB" : "2.5 KG");

  card.innerHTML =
    '<div class="exHead">' +
      '<div class="exHeadTopRow">' +
        '<div class="exHeadLeft">' +
          '<span class="ex-index">01</span>' +
          '<h3></h3>' +
        '</div>' +
      '</div>' +
      '<div class="exActions">' +
        '<button class="info-ex-btn" title="Form Guide, YouTube Demo & Exercise History">ⓘ INFO</button>' +
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
        (isNoWeight ? '' : '<button class="util-pill-btn step-wt-btn" title="Quick add weight to active set">' + esc(stepWtLabel) + '</button>') +
        '<button class="util-pill-btn step-rep-btn" title="Quick add +1 rep/sec to active set">+1 ' + repColHeader + '</button>' +
      '</div>' +
      '<input type="text" class="ex-pinned-note" placeholder="📌 Pinned note (e.g. Seat #4, grip width)...">' +
    '</div>' +
    '<div class="auto-target-strip"></div>' +
    '<div class="setHead">' +
      '<span>SET</span>' +
      '<span>PREV (TAP)</span>' +
      (isNoWeight ? '' : '<span>' + esc(unitName().toUpperCase()) + '</span>') +
      '<span>' + repColHeader + '</span>' +
      '<span class="rpe-col">RPE</span>' +
      '<span>✓</span>' +
      '<span></span>' +
    '</div>' +
    '<div class="sets"></div>' +
    '<button class="addSetBtn">+ ADD SET</button>';

  card.querySelector("h3").textContent = ex.name;
  const targetStrip = card.querySelector(".auto-target-strip");
  const hintText = generateAutoTargetHint(exId, targetReps);
  targetStrip.textContent = hintText;
  if (hintText.startsWith("🚨")) targetStrip.classList.add("plateau-alert");

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

  function getActiveOrFirstUncheckedRow() {
    const rows = setsDiv.querySelectorAll(".setRow");
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].querySelector(".doneBox").classList.contains("checked")) return rows[i];
    }
    return rows[rows.length - 1] || null;
  }

  const stepWtBtn = card.querySelector(".step-wt-btn");
  if (stepWtBtn) {
    stepWtBtn.addEventListener("click", function () {
      const targetRow = getActiveOrFirstUncheckedRow();
      if (!targetRow) return;
      const kgInput = targetRow.querySelector(".kgInput");
      if (!kgInput) return;
      const rowIndex = Array.prototype.indexOf.call(setsDiv.children, targetRow);
      const prev = previous[rowIndex >= 0 ? rowIndex : 0];
      let curVal = kgInput.value.trim() !== "" ? Number(kgInput.value) : (prev && prev.kg ? showWeight(prev.kg) : 0);
      const step = unitName() === "lbs" ? 5 : 2.5;
      kgInput.value = Math.round((curVal + step) * 10) / 10;
      saveDraft();
    });
  }

  const stepRepBtn = card.querySelector(".step-rep-btn");
  if (stepRepBtn) {
    stepRepBtn.addEventListener("click", function () {
      const targetRow = getActiveOrFirstUncheckedRow();
      if (!targetRow) return;
      const repsInput = targetRow.querySelector(".repsInput");
      if (!repsInput) return;
      const rowIndex = Array.prototype.indexOf.call(setsDiv.children, targetRow);
      const prev = previous[rowIndex >= 0 ? rowIndex : 0];
      let curReps = repsInput.value.trim() !== "" ? Number(repsInput.value) : (prev && prev.reps ? Number(prev.reps) : 0);
      const inc = type === "time" ? 5 : 1;
      repsInput.value = Math.max(1, Math.round(curReps + inc));
      saveDraft();
    });
  }

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
        prevSpan.classList.add("clickable");
        prevSpan.title = "Tap to copy previous weight & reps into this set";
        if (type === "time") prevSpan.textContent = prev.reps + "s ↵";
        else if (type === "reps") prevSpan.textContent = prev.reps + "r ↵";
        else prevSpan.textContent = showWeight(prev.kg) + "×" + prev.reps + " ↵";
      } else {
        prevSpan.classList.remove("clickable");
        prevSpan.title = "";
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

    const prevSpan = row.querySelector(".set-prev-hint");
    prevSpan.addEventListener("click", function () {
      const rowIndex = Array.prototype.indexOf.call(setsDiv.children, row);
      const prev = previous[rowIndex >= 0 ? rowIndex : 0];
      if (!prev) return;
      const kgInput = row.querySelector(".kgInput");
      const repsInput = row.querySelector(".repsInput");
      if (kgInput && prev.kg !== undefined) kgInput.value = showWeight(prev.kg);
      if (repsInput && prev.reps !== undefined) repsInput.value = prev.reps;
      saveDraft();
      showToast("Copied previous set ✓");
    });

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

        // Instant Live PR Detection on Set Completion!
        let brokeLivePr = false;
        if (row.dataset.type !== "W") {
          const setKg = kgInput ? toKg(weightVal) : 0;
          if (type === "weight" && historicalBest.maxWeight > 0) {
            if (setKg > historicalBest.maxWeight + 0.05) {
              brokeLivePr = true;
              historicalBest.maxWeight = setKg;
              triggerLivePrCelebration(ex.name, weightVal + " " + unitName().toUpperCase() + " × " + repsVal);
            } else if (e1rm(setKg, repsVal) > historicalBest.best1rm + 0.05) {
              brokeLivePr = true;
              historicalBest.best1rm = e1rm(setKg, repsVal);
              triggerLivePrCelebration(ex.name, "NEW 1RM (" + showWeight(historicalBest.best1rm) + " " + unitName().toUpperCase() + ")");
            }
          } else if (isNoWeight && historicalBest.maxReps > 0 && repsVal > historicalBest.maxReps) {
            brokeLivePr = true;
            historicalBest.maxReps = repsVal;
            triggerLivePrCelebration(ex.name, repsVal + (type === "time" ? " SEC HOLD" : " REPS"));
          }
        }

        if (!brokeLivePr) {
          if (navigator.vibrate) navigator.vibrate(14);
          playBeep(700, "sine", 0.08);
        }

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
// ============ app.js (PART 2/2) : FLEX STUDIO, PHOTO OVERLAY, ACHIEVEMENTS & INIT ============

function renderBodyMapSvg(containerId, workloadMap, isDarkCard) {
  const container = $(containerId);
  if (!container) return;
  workloadMap = workloadMap || {};

  const isLightMode = !isDarkCard && document.documentElement.getAttribute("data-theme") === "light";
  const baseFill = isLightMode ? "#cfc8b8" : "#252522";
  const strokeColor = isLightMode ? "#121211" : "#3d3d38";
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

// =====================================================
//  STRAVA × HEVY 3-MODE FLEX STUDIO & STORY EXPORTER
// =====================================================
function buildSummaryFromWorkout(w) {
  const workloadMap = calculateMuscleWorkload([w]);
  const insights = typeof getWorkoutFlexInsights === "function"
    ? getWorkoutFlexInsights(w)
    : { deltaText: "SESSION COMPLETE", deltaPositive: true, mvp: null };

  let totalSets = 0;
  const exerciseLines = [];

  (w.exercises || []).forEach(function (ex) {
    const working = (ex.sets || []).filter(s => s.type !== "W");
    totalSets += working.length;
    exerciseLines.push({
      name: exName(ex.exId),
      setsCount: working.length
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
    exerciseLines: exerciseLines,
    prs: prs,
    deltaText: insights.deltaText,
    mvp: insights.mvp
  };
}

function switchFlexMode(mode) {
  activeFlexMode = mode || "carbon";
  if ($("flexModeSeg")) setSegmented($("flexModeSeg"), activeFlexMode);
  if ($("flexCardCarbon")) $("flexCardCarbon").classList.toggle("hidden", activeFlexMode !== "carbon");
  if ($("flexCardMvp")) $("flexCardMvp").classList.toggle("hidden", activeFlexMode !== "mvp");
  if ($("flexCardPhoto")) $("flexCardPhoto").classList.toggle("hidden", activeFlexMode !== "photo");
}

if ($("flexModeSeg")) {
  bindSegmented($("flexModeSeg"), function (v) {
    switchFlexMode(v);
  });
}

if ($("flexPhotoInput")) {
  $("flexPhotoInput").addEventListener("change", function () {
    const file = $("flexPhotoInput").files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      uploadedFlexPhotoDataUrl = reader.result;
      const bg = $("photoOverlayBg");
      if (bg) bg.style.backgroundImage = 'url("' + uploadedFlexPhotoDataUrl + '")';
      showToast("Gym photo applied to Flex Card 📷");
    };
    reader.readAsDataURL(file);
  });
}

function showSummaryModal(summaryData, fromHistory) {
  isSummaryFromHistory = !!fromHistory;
  activeSummaryData = summaryData;
  const unit = unitName().toUpperCase();
  const prof = typeof getAthleteProfile === "function" ? getAthleteProfile() : { name: "ATHLETE", level: 1 };
  const volText = showWeight(summaryData.volume).toLocaleString() + " " + unit;

  // 1. Populate Carbon Flex Card
  if ($("flexAthleteBadge")) $("flexAthleteBadge").textContent = prof.name + " · LVL " + prof.level;
  $("sumTitle").textContent = summaryData.title;
  $("sumDate").textContent = summaryData.date.toUpperCase() + " · " + summaryData.durationMin + " MIN";
  if ($("flexGiantVolume")) $("flexGiantVolume").textContent = volText;
  if ($("flexDeltaPill")) $("flexDeltaPill").textContent = summaryData.deltaText || "SESSION VERIFIED";

  $("sumTiles").innerHTML =
    '<div class="ticket-metric-cell"><small>Duration</small><strong>' + esc(summaryData.durationMin + " MIN") + '</strong></div>' +
    '<div class="ticket-metric-cell"><small>Working Sets</small><strong>' + esc(summaryData.totalSets) + '</strong></div>' +
    '<div class="ticket-metric-cell"><small>PRs Broken</small><strong>' + esc(summaryData.prs.length) + '</strong></div>';

  renderBodyMapSvg("sumBodyMap", summaryData.muscleMap, true);

  const mList = $("sumMuscles");
  mList.innerHTML = "";
  const muscles = Object.keys(summaryData.muscleMap).sort((a, b) => {
    return (summaryData.muscleMap[b].total || 0) - (summaryData.muscleMap[a].total || 0);
  });
  muscles.forEach(function (m) {
    const entry = summaryData.muscleMap[m];
    const badge = document.createElement("span");
    badge.className = "ticket-badge";
    badge.textContent = entry.direct > 0
      ? (m + " (" + entry.direct + " sets)")
      : (m + " (" + entry.indirect + " assist)");
    mList.appendChild(badge);
  });

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

  // 2. Populate MVP Best Lift Card
  const mvp = summaryData.mvp;
  if ($("flexMvpDate")) $("flexMvpDate").textContent = summaryData.date.toUpperCase();
  if (mvp) {
    if ($("mvpExName")) $("mvpExName").textContent = mvp.name;
    if ($("mvpExMeta")) $("mvpExMeta").textContent = (mvp.muscle + " · " + mvp.equipment + " · " + mvp.setsCount + " SETS").toUpperCase();
    if ($("mvpTopSet")) $("mvpTopSet").textContent = mvp.topSetText;
    if ($("mvpEst1rm")) $("mvpEst1rm").textContent = mvp.est1rmText;
    if ($("mvpExVol")) $("mvpExVol").textContent = mvp.volumeText;
  }

  // 3. Populate Strava Photo Flex Card
  if ($("photoFlexTitle")) $("photoFlexTitle").textContent = summaryData.title;
  if ($("photoFlexVol")) $("photoFlexVol").textContent = volText;
  if ($("photoFlexSets")) $("photoFlexSets").textContent = summaryData.totalSets;
  if ($("photoFlexDur")) $("photoFlexDur").textContent = summaryData.durationMin + " MIN";
  if ($("photoFlexMvp")) {
    $("photoFlexMvp").textContent = mvp
      ? ("👑 MVP LIFT: " + mvp.name.toUpperCase() + " (" + mvp.topSetText + ")")
      : summaryData.deltaText;
  }

  switchFlexMode("carbon");
  $("sumDoneBtn").querySelector("span").textContent = isSummaryFromHistory ? "RETURN TO HISTORY" : "DONE";
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

// High-Res 1080x1920 Strava × Hevy Flex Card Canvas Exporter
function generateAndShareStoryPoster(sData) {
  if (!sData) return;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  const prof = typeof getAthleteProfile === "function" ? getAthleteProfile() : { name: "ATHLETE", level: 1 };
  const unit = unitName().toUpperCase();
  const volText = showWeight(sData.volume).toLocaleString() + " " + unit;

  function finalizeExport() {
    canvas.toBlob(function (blob) {
      if (!blob) return;
      const fileName = "strvex-flex-" + todayKey() + ".png";
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          title: "STRVEX Workout Flex",
          text: sData.title + " logged on STRVEX!",
          files: [file]
        }).catch(function () {});
      } else {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        showToast("Flex Card (.PNG) downloaded ✓");
      }
    }, "image/png");
  }

  // If Photo Flex Mode with uploaded photo, draw user photo + Strava watermark overlay
  if (activeFlexMode === "photo" && uploadedFlexPhotoDataUrl) {
    const img = new Image();
    img.onload = function () {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, 1080, 1920);
      const scale = Math.max(1080 / img.width, 1920 / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (1080 - dw) / 2, (1920 - dh) / 2, dw, dh);

      const grad = ctx.createLinearGradient(0, 0, 0, 1920);
      grad.addColorStop(0, "rgba(0,0,0,0.55)");
      grad.addColorStop(0.4, "rgba(0,0,0,0.1)");
      grad.addColorStop(1, "rgba(0,0,0,0.92)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 44px 'Archivo', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("STRVEX", 80, 130);

      ctx.fillStyle = "#ff4422";
      ctx.font = "800 30px 'JetBrains Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText(prof.name + " // LVL " + prof.level, 1000, 130);

      ctx.textAlign = "left";
      ctx.fillStyle = "#d4b483";
      ctx.font = "700 30px 'JetBrains Mono', monospace";
      ctx.fillText(sData.date.toUpperCase(), 80, 1340);

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 76px 'Archivo', sans-serif";
      ctx.fillText((sData.title || "WORKOUT").toUpperCase().slice(0, 20), 80, 1430);

      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(80, 1475);
      ctx.lineTo(1000, 1475);
      ctx.stroke();

      const stats = [
        { l: "TOTAL VOLUME", v: volText },
        { l: "WORKING SETS", v: String(sData.totalSets) },
        { l: "DURATION", v: sData.durationMin + " MIN" }
      ];
      stats.forEach(function (st, idx) {
        const sx = 80 + idx * 320;
        ctx.fillStyle = "#d4b483";
        ctx.font = "700 24px 'JetBrains Mono', monospace";
        ctx.fillText(st.l, sx, 1535);
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 54px 'Archivo', sans-serif";
        ctx.fillText(st.v, sx, 1605);
      });

      if (sData.mvp) {
        ctx.fillStyle = "#ff4422";
        ctx.font = "800 32px 'JetBrains Mono', monospace";
        ctx.fillText("👑 MVP LIFT: " + sData.mvp.name.toUpperCase() + " — " + sData.mvp.topSetText, 80, 1710);
      }

      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "700 24px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("STRVEX // STRENGTH LOGBOOK", 540, 1840);
      finalizeExport();
    };
    img.src = uploadedFlexPhotoDataUrl;
    return;
  }

  // Dark Carbon Luxury Radial Glow Background (Hevy × Strava Style)
  ctx.fillStyle = "#0d0d0c";
  ctx.fillRect(0, 0, 1080, 1920);

  const glow = ctx.createRadialGradient(850, 280, 40, 850, 280, 900);
  glow.addColorStop(0, "rgba(255, 68, 34, 0.32)");
  glow.addColorStop(0.5, "rgba(212, 180, 131, 0.08)");
  glow.addColorStop(1, "rgba(13, 13, 12, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1920);

  // Outer Carbon Frame
  ctx.fillStyle = "rgba(28, 28, 26, 0.88)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = 3;
  roundRect(ctx, 64, 100, 952, 1720, 40);
  ctx.fill();
  ctx.stroke();

  // Top Brand & Athlete Tag
  ctx.fillStyle = "#ebe6dc";
  ctx.font = "900 38px 'Archivo', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("STRVEX // FLEX CARD", 124, 190);

  ctx.fillStyle = "#ff4422";
  ctx.font = "800 28px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";
  ctx.fillText(prof.name + " · LVL " + prof.level, 956, 190);

  ctx.textAlign = "left";
  ctx.fillStyle = "#9a968c";
  ctx.font = "700 26px 'JetBrains Mono', monospace";
  ctx.fillText(sData.date.toUpperCase() + "  ·  " + sData.durationMin + " MIN", 124, 265);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 68px 'Archivo', sans-serif";
  ctx.fillText((sData.title || "STRENGTH SESSION").toUpperCase().slice(0, 22), 124, 350);

  // Giant Volume Hero Box
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  roundRect(ctx, 124, 400, 832, 270, 28);
  ctx.fill();
  ctx.fillStyle = "#ff4422";
  ctx.fillRect(124, 400, 12, 270);

  ctx.fillStyle = "#d4b483";
  ctx.font = "800 24px 'JetBrains Mono', monospace";
  ctx.fillText("TOTAL SESSION VOLUME", 170, 460);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 96px 'Archivo', sans-serif";
  ctx.fillText(volText, 170, 570);

  ctx.fillStyle = "#26d07c";
  ctx.font = "800 26px 'JetBrains Mono', monospace";
  ctx.fillText(sData.deltaText || "VERIFIED SESSION", 170, 632);

  // MVP Best Lift Spotlight Box
  if (sData.mvp) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    roundRect(ctx, 124, 710, 832, 240, 24);
    ctx.fill();

    ctx.fillStyle = "#d4b483";
    ctx.font = "800 24px 'JetBrains Mono', monospace";
    ctx.fillText("👑 SESSION MVP LIFT // EST. 1RM: " + sData.mvp.est1rmText, 164, 768);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 46px 'Archivo', sans-serif";
    ctx.fillText(sData.mvp.name.slice(0, 26), 164, 835);

    ctx.fillStyle = "#ff4422";
    ctx.font = "900 44px 'JetBrains Mono', monospace";
    ctx.fillText("TOP SET: " + sData.mvp.topSetText, 164, 905);
  }

  // Exercises & PRs Summary
  let curY = 1020;
  ctx.fillStyle = "#d4b483";
  ctx.font = "800 24px 'JetBrains Mono', monospace";
  ctx.fillText("WORKOUT LINEUP (" + sData.totalSets + " WORKING SETS)", 124, curY);

  (sData.exerciseLines || []).slice(0, 6).forEach(function (ex, i) {
    curY += 74;
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    roundRect(ctx, 124, curY - 46, 832, 62, 12);
    ctx.fill();

    ctx.fillStyle = "#ebe6dc";
    ctx.font = "700 28px 'Archivo', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(pad(i + 1) + ". " + ex.name.slice(0, 28), 150, curY - 6);

    ctx.fillStyle = "#ff4422";
    ctx.font = "800 24px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(ex.setsCount + " SETS", 930, curY - 6);
  });

  if (sData.prs && sData.prs.length > 0) {
    curY += 80;
    ctx.textAlign = "left";
    ctx.fillStyle = "#ff4422";
    ctx.font = "800 28px 'JetBrains Mono', monospace";
    ctx.fillText("🏆 " + sData.prs.length + " NEW PERSONAL RECORD(S) BROKEN!", 124, curY);
  }

  ctx.fillStyle = "#9a968c";
  ctx.font = "800 26px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("BUILT WITH STRVEX // STRENGTH LOGBOOK", 540, 1765);

  finalizeExport();
}

if ($("sumSharePosterBtn")) {
  $("sumSharePosterBtn").addEventListener("click", function () {
    generateAndShareStoryPoster(activeSummaryData);
  });
}

$("sumDoneBtn").addEventListener("click", closeSummaryModal);
$("sumCloseBtn").addEventListener("click", closeSummaryModal);
$("summaryBackdrop").addEventListener("click", closeSummaryModal);

// ---------- Finish Session / Save Edited Routine / Save Edited Log ----------
function finishWorkout() {
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
      updateHeaderAthleteBadge();
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
  updateHeaderAthleteBadge();
  renderTab(currentTab);
  playPrFanfare();
  showToast("Workout Complete! Great job 🔥");

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
//  EXERCISE PICKER, SWAP & MANAGEMENT SHEET
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
        '<small style="font-family:var(--font-mono);">Completed workouts will appear here with full Flex Cards.</small>' +
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
    sumBtn.textContent = "FLEX CARD";
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
        updateHeaderAthleteBadge();
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
//  TAB 3: PROGRESS, ACHIEVEMENTS, RECOVERY % & CHARTS
// =====================================================
function renderProgressTab() {
  renderAchievements();
  renderMuscleRecovery();
  renderWeeklyMuscles();
  renderProgressChart();
  renderRecords();
  renderBodyWeight();
  renderMeasurements();
}

function renderAchievements() {
  const grid = $("achievementsGrid");
  if (!grid || typeof getAchievements !== "function") return;
  grid.innerHTML = "";

  const list = getAchievements();
  let unlockedCount = 0;

  list.forEach(function (ach) {
    if (ach.unlocked) unlockedCount++;
    const card = document.createElement("div");
    card.className = "ach-card" + (ach.unlocked ? " unlocked" : "");
    card.innerHTML =
      '<div class="ach-head">' +
        '<span class="ach-icon">' + ach.icon + '</span>' +
        '<span class="ach-title">' + esc(ach.title) + '</span>' +
      '</div>' +
      '<div class="ach-desc">' + esc(ach.desc) + '</div>' +
      '<div class="ach-prog">' + (ach.unlocked ? "UNLOCKED ✓" : esc(ach.progress)) + '</div>';
    grid.appendChild(card);
  });

  if ($("achievementsCountLabel")) {
    $("achievementsCountLabel").textContent = unlockedCount + " / " + list.length + " UNLOCKED";
  }
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
//  TAB 4: SETTINGS, RPE TOGGLE, THEME, LIBRARY & CSV
// =====================================================
function renderMoreTab() {
  $("moreMain").classList.remove("hidden");
  $("libraryView").classList.add("hidden");
  const s = getSettings();
  setSegmented($("unitSeg"), s.unit);
  if ($("themeSeg")) setSegmented($("themeSeg"), s.theme || "dark");
  if ($("rpeToggleSeg")) setSegmented($("rpeToggleSeg"), s.showRpe ? "on" : "off");
  $("restInput").value = s.rest;
  $("exCount").textContent = getExercises().length + " ›";
}

if ($("rpeToggleSeg")) {
  bindSegmented($("rpeToggleSeg"), function (v) {
    const s = getSettings();
    s.showRpe = (v === "on");
    saveSettings(s);
    applyRpeVisibility(s.showRpe);
    showToast("RPE Column " + (s.showRpe ? "enabled" : "hidden (clean view)"));
  });
}

if ($("themeSeg")) {
  bindSegmented($("themeSeg"), function (v) {
    const s = getSettings();
    s.theme = v;
    saveSettings(s);
    applyTheme(v);
    showToast(v === "light" ? "Switched to Warm Bone Daylight Theme" : "Switched to Dark Titanium Theme");
  });
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

if ($("importCsvFile")) {
  $("importCsvFile").addEventListener("change", function () {
    const file = $("importCsvFile").files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const count = importWorkoutsFromCsv(reader.result);
        updateHeroStats();
        updateHeaderAthleteBadge();
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
(function initStrvex() {
  const s = getSettings();
  applyTheme(s.theme || "dark");
  applyRpeVisibility(s.showRpe);
  if (s.defaultTrack) {
    routineCategoryFilter = s.defaultTrack;
  }
  bindRoutineCategoryFilters();
  initMusicDock();
  restoreDraft();
  updateHeaderAthleteBadge();
  showTab(location.hash.slice(1) || "workout");

  if (!s.onboarded) {
    setTimeout(openOnboardingModal, 350);
  }
})();

window.addEventListener("resize", function () {
  if (Math.abs(window.innerWidth - lastWindowWidth) > 10) {
    lastWindowWidth = window.innerWidth;
    if (currentTab === "progress") {
      renderProgressChart();
      renderBodyWeight();
    }
  }
});