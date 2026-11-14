// ============ app.js (PART 1/2) : AUTO-CASCADE, LIVE SET PRs, TARGET TIME & COCKPIT ============

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

// Local roundRect helper so Poster Generator never depends on external globals
function drawRoundedBox(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ---------- State ----------
const TABS = ["workout", "history", "progress", "more"];
let currentTab = "workout";
let workoutActive = false;
let workoutStart = 0;
let editingWorkoutId = null;
let editingRoutineId = null; // null | routineId | "__NEW__"
let duoPartnerName = null;
let duoActiveLifter = "p1";
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
let onbExp = "advanced";

// ---------- Custom Native-Style STRVEX Dialogs ----------
let _dialogResolve = null;

function openAppDialog(opts) {
  return new Promise(function (resolve) {
    _dialogResolve = resolve;
    const backdrop = $("appDialogBackdrop");
    const modal = $("appDialogModal");
    const tagEl = $("appDialogTag");
    const titleEl = $("appDialogTitle");
    const msgEl = $("appDialogMessage");
    const inputEl = $("appDialogInput");
    const cancelBtn = $("appDialogCancelBtn");
    const okBtn = $("appDialogOkBtn");

    tagEl.textContent = opts.tag || "STRVEX // SYSTEM";
    titleEl.textContent = opts.title || "Notice";
    msgEl.textContent = opts.message || "";
    okBtn.textContent = opts.okText || "OK";
    cancelBtn.textContent = opts.cancelText || "CANCEL";
    cancelBtn.classList.toggle("hidden", !!opts.hideCancel);

    if (opts.inputMode) {
      inputEl.classList.remove("hidden");
      inputEl.value = opts.defaultValue || "";
      inputEl.placeholder = opts.placeholder || "";
    } else {
      inputEl.classList.add("hidden");
      inputEl.value = "";
    }

    backdrop.classList.remove("hidden");
    modal.classList.remove("hidden");
    if (opts.inputMode) {
      setTimeout(function () { inputEl.focus(); inputEl.select(); }, 50);
    } else {
      setTimeout(function () { okBtn.focus(); }, 50);
    }
  });
}

function closeAppDialog(result) {
  const backdrop = $("appDialogBackdrop");
  const modal = $("appDialogModal");
  if (backdrop) backdrop.classList.add("hidden");
  if (modal) modal.classList.add("hidden");
  if (_dialogResolve) {
    const fn = _dialogResolve;
    _dialogResolve = null;
    fn(result);
  }
}

if ($("appDialogOkBtn")) {
  $("appDialogOkBtn").addEventListener("click", function () {
    const inputEl = $("appDialogInput");
    const isPrompt = inputEl && !inputEl.classList.contains("hidden");
    closeAppDialog(isPrompt ? inputEl.value : true);
  });
}
if ($("appDialogCancelBtn")) {
  $("appDialogCancelBtn").addEventListener("click", function () {
    const inputEl = $("appDialogInput");
    const isPrompt = inputEl && !inputEl.classList.contains("hidden");
    const cancelHidden = $("appDialogCancelBtn").classList.contains("hidden");
    closeAppDialog(cancelHidden ? true : (isPrompt ? null : false));
  });
}
if ($("appDialogBackdrop")) {
  $("appDialogBackdrop").addEventListener("click", function () {
    const inputEl = $("appDialogInput");
    const isPrompt = inputEl && !inputEl.classList.contains("hidden");
    const cancelHidden = $("appDialogCancelBtn") && $("appDialogCancelBtn").classList.contains("hidden");
    closeAppDialog(cancelHidden ? true : (isPrompt ? null : false));
  });
}
if ($("appDialogInput")) {
  $("appDialogInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      $("appDialogOkBtn").click();
    }
  });
}

function appAlert(title, message) {
  return openAppDialog({ tag: "STRVEX // NOTICE", title: title, message: message, hideCancel: true, okText: "GOT IT" });
}
function appConfirm(title, message, okText) {
  return openAppDialog({ tag: "STRVEX // CONFIRM", title: title, message: message, okText: okText || "CONFIRM", cancelText: "CANCEL" });
}
function appPrompt(title, message, defaultValue, placeholder) {
  return openAppDialog({ tag: "STRVEX // INPUT", title: title, message: message, inputMode: true, defaultValue: defaultValue || "", placeholder: placeholder || "", okText: "SAVE", cancelText: "CANCEL" });
}

// ---------- Theme, 5-Accent Color, Experience Mode & RPE Visibility ----------
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

function applyAccentColor(accent) {
  const valid = ["flame", "cyan", "crimson", "emerald", "volt"].includes(accent) ? accent : "flame";
  document.documentElement.setAttribute("data-accent", valid);
  if ($("accentColorSeg")) {
    $("accentColorSeg").querySelectorAll(".accent-dot").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.v === valid);
    });
  }
  if (currentTab === "progress" && typeof renderProgressChart === "function") {
    renderProgressChart();
    renderBodyWeight();
  }
}

function applyExperienceMode(mode) {
  const m = mode === "simple" ? "simple" : "advanced";
  document.documentElement.setAttribute("data-exp", m);
  if (m === "simple") {
    applyRpeVisibility(false);
  } else {
    applyRpeVisibility(getSettings().showRpe);
  }
}

function applyRpeVisibility(showRpe) {
  const ws = $("workoutScreen");
  if (!ws) return;
  const isSimple = document.documentElement.getAttribute("data-exp") === "simple";
  ws.classList.toggle("hide-rpe", isSimple || !showRpe);
}

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
  onbExp = s.experienceMode || "advanced";

  if ($("onbNameInput")) $("onbNameInput").value = s.userName || "";
  if ($("onbUnitSeg")) setSegmented($("onbUnitSeg"), onbUnit);
  if ($("onbThemeSeg")) setSegmented($("onbThemeSeg"), onbTheme);
  if ($("onbExpSeg")) setSegmented($("onbExpSeg"), onbExp);
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
  s.experienceMode = onbExp;
  s.defaultTrack = trackVal;
  s.onboarded = true;
  saveSettings(s);

  applyTheme(s.theme);
  applyExperienceMode(s.experienceMode);
  if (oldUnit !== s.unit) {
    syncActiveWorkoutUnits(oldUnit, s.unit);
  }
  routineCategoryFilter = trackVal || "all";
  updateHeaderAthleteBadge();
  closeOnboardingModal();
  renderTab(currentTab);
  showToast("Welcome to STRVEX, " + (s.userName || "Athlete"));
}

if ($("headerAthleteBtn")) $("headerAthleteBtn").addEventListener("click", openOnboardingModal);
if ($("openOnboardingBtn")) $("openOnboardingBtn").addEventListener("click", openOnboardingModal);
if ($("onbCloseBtn")) $("onbCloseBtn").addEventListener("click", closeOnboardingModal);
if ($("onboardingBackdrop")) $("onboardingBackdrop").addEventListener("click", closeOnboardingModal);
if ($("onbSaveBtn")) $("onbSaveBtn").addEventListener("click", saveOnboarding);

// ---------- Web Audio API (With Sound Mute Support) ----------
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
  if (getSettings().soundMuted) return;
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
  if (getSettings().soundMuted) return;
  playBeep(880, "sine", 0.12);
  setTimeout(function () { playBeep(880, "sine", 0.12); }, 150);
  setTimeout(function () { playBeep(1174.66, "sine", 0.35); }, 320);
}

function playPrFanfare() {
  if (getSettings().soundMuted) return;
  playBeep(587.33, "triangle", 0.12);
  setTimeout(function () { playBeep(783.99, "triangle", 0.12); }, 120);
  setTimeout(function () { playBeep(987.77, "triangle", 0.14); }, 240);
  setTimeout(function () { playBeep(1174.66, "triangle", 0.38); }, 370);
}

function syncMuteTimerUI() {
  const muted = getSettings().soundMuted;
  const btn = $("muteTimerBtn");
  if (btn) {
    btn.textContent = muted ? "MUTED" : "SOUND";
    btn.style.color = muted ? "var(--red)" : "var(--bone)";
  }
  if ($("soundToggleSeg")) {
    setSegmented($("soundToggleSeg"), muted ? "mute" : "on");
  }
}

if ($("muteTimerBtn")) {
  $("muteTimerBtn").addEventListener("click", function () {
    const s = getSettings();
    s.soundMuted = !s.soundMuted;
    saveSettings(s);
    syncMuteTimerUI();
    showToast(s.soundMuted ? "Timer audio muted" : "Timer audio enabled");
  });
}

let livePrTimerId = null;
function triggerLivePrCelebration(exNameStr, prLabel) {
  playPrFanfare();
  if (navigator.vibrate) navigator.vibrate([120, 60, 180]);
  const banner = $("livePrBanner");
  const textEl = $("livePrText");
  if (!banner || !textEl) return;
  textEl.textContent = "NEW RECORD // " + exNameStr.toUpperCase() + " — " + prLabel;
  banner.classList.remove("hidden");
  clearTimeout(livePrTimerId);
  livePrTimerId = setTimeout(function () {
    banner.classList.add("hidden");
  }, 4500);
}

// ---------- In-Workout Audio & Spotify Dock Controller ----------
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
    customBtn.addEventListener("click", async function () {
      const rawUrl = await appPrompt(
        "SET SPOTIFY PLAYLIST",
        "Paste any Spotify Playlist, Album, or Track link:",
        "",
        "https://open.spotify.com/playlist/..."
      );
      if (!rawUrl || !rawUrl.trim()) return;
      const m = rawUrl.match(/spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
      if (!m) {
        await appAlert("Invalid Link", "Please paste a valid Spotify playlist, album, or track URL.");
        return;
      }
      const embedUrl = "https://open.spotify.com/embed/" + m[1] + "/" + m[2] + "?utm_source=generator&theme=0";
      iframe.src = embedUrl;
      const s = getSettings();
      s.spotifyEmbedUrl = embedUrl;
      saveSettings(s);
      showToast("Custom Spotify playlist loaded");
    });
  }
}

// ---------- DUO // PARTNER MODE & TARGET TIME Controller ----------
function updateWorkoutTargetTimeUI() {
  const targetEl = $("wTargetTime");
  if (!targetEl) return;
  if (editingRoutineId) {
    targetEl.textContent = "";
    return;
  }
  const exList = [];
  document.querySelectorAll("#exerciseList .exCard").forEach(function (card) {
    const workingCount = Array.prototype.filter.call(
      card.querySelectorAll(".setRow"),
      r => r.dataset.type !== "W" && r.dataset.lifter !== "p2"
    ).length;
    if (workingCount > 0) {
      exList.push({ exId: card.dataset.exid, sets: workingCount });
    }
  });
  const estMin = typeof estimateWorkoutMinutes === "function" ? estimateWorkoutMinutes(exList) : 0;
  targetEl.textContent = estMin > 0 ? ("/ ~" + estMin + "M") : "";
}

function updateDuoBarUI() {
  const bar = $("duoBar");
  const toggleBtn = $("duoToggleBtn");
  if (!bar || !toggleBtn) return;

  const isDuo = !!duoPartnerName && !editingRoutineId;
  bar.classList.toggle("hidden", !isDuo);
  toggleBtn.classList.toggle("hidden", !!editingRoutineId);
  toggleBtn.textContent = isDuo ? "DUO:ON" : "+DUO";

  if (!isDuo) return;

  const p1Name = getAthleteProfile().name || "YOU";
  const p2Name = duoPartnerName.toUpperCase();
  const unit = unitName().toUpperCase();

  $("duoP1Label").textContent = p1Name;
  $("duoP2Label").textContent = p2Name;
  $("duoTurnP1Btn").textContent = "TURN: " + p1Name;
  $("duoTurnP2Btn").textContent = "TURN: " + p2Name;

  setSegmented($("duoTurnSeg"), duoActiveLifter);
  $("duoP1StatBox").classList.toggle("is-active", duoActiveLifter === "p1");
  $("duoP2StatBox").classList.toggle("is-active", duoActiveLifter === "p2");

  let p1Vol = 0, p1Sets = 0, p2Vol = 0, p2Sets = 0;
  document.querySelectorAll("#exerciseList .exCard").forEach(function (card) {
    const isWeighted = exTypeOf(card.dataset.exid) === "weight";
    card.querySelectorAll(".setRow").forEach(function (row) {
      if (!row.querySelector(".doneBox").classList.contains("checked")) return;
      if (row.dataset.type === "W") return;
      const kgInp = row.querySelector(".kgInput");
      const repsInp = row.querySelector(".repsInput");
      const wt = kgInp ? (Number(kgInp.value) || 0) : 0;
      const reps = Number(repsInp.value) || 0;
      const vol = isWeighted ? (wt * reps) : 0;
      if (row.dataset.lifter === "p2") {
        p2Sets++;
        p2Vol += vol;
      } else {
        p1Sets++;
        p1Vol += vol;
      }
    });
  });

  $("duoP1Score").textContent = Math.round(p1Vol).toLocaleString() + " " + unit + " · " + p1Sets + " SETS";
  $("duoP2Score").textContent = Math.round(p2Vol).toLocaleString() + " " + unit + " · " + p2Sets + " SETS";
}

function initDuoControls() {
  const toggleBtn = $("duoToggleBtn");
  const removeBtn = $("duoRemoveBtn");
  const turnSeg = $("duoTurnSeg");

  if (toggleBtn) {
    toggleBtn.addEventListener("click", async function () {
      if (duoPartnerName) {
        const nextName = await appPrompt("PARTNER NAME", "Update your gym partner's name:", duoPartnerName, "e.g. Rohan");
        if (nextName && nextName.trim()) {
          duoPartnerName = nextName.trim().slice(0, 16);
          updateDuoBarUI();
          saveDraft();
        }
        return;
      }
      const partner = await appPrompt(
        "DUO // PARTNER MODE",
        "Training with a friend on 1 phone?\nEnter your partner's name to track Head-to-Head sets & volume:",
        "",
        "e.g. Rohan"
      );
      if (!partner || !partner.trim()) return;
      duoPartnerName = partner.trim().slice(0, 16);
      duoActiveLifter = "p1";
      updateDuoBarUI();
      saveDraft();
      showToast("Duo Mode Active: " + getAthleteProfile().name + " vs " + duoPartnerName.toUpperCase());
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener("click", async function () {
      const ok = await appConfirm("EXIT DUO MODE", "Turn off Duo Mode for this session?", "EXIT DUO");
      if (!ok) return;
      duoPartnerName = null;
      duoActiveLifter = "p1";
      updateDuoBarUI();
      saveDraft();
    });
  }

  if (turnSeg) {
    bindSegmented(turnSeg, function (v) {
      duoActiveLifter = v === "p2" ? "p2" : "p1";
      updateDuoBarUI();
    });
  }
}

if ($("toggleMetaDateBtn")) {
  $("toggleMetaDateBtn").addEventListener("click", function () {
    const row = $("wEditMetaRow");
    if (!row) return;
    const isHidden = row.classList.contains("hidden");
    row.classList.toggle("hidden", !isHidden);
    if (isHidden && $("wDateInput") && !$("wDateInput").value) {
      $("wDateInput").value = toDateInputValue(workoutStart || Date.now());
    }
  });
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

let toastId = null;
function showToast(msg) {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastId);
  toastId = setTimeout(function () { t.classList.remove("show"); }, 2600);
}

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
if ($("onbExpSeg")) bindSegmented($("onbExpSeg"), v => { onbExp = v; });
if ($("onbThemeSeg")) {
  bindSegmented($("onbThemeSeg"), v => {
    onbTheme = v;
    applyTheme(v);
  });
}

document.addEventListener("keydown", function (e) {
  if (e.key !== "Escape") return;
  if ($("appDialogModal") && !$("appDialogModal").classList.contains("hidden")) {
    $("appDialogCancelBtn").click();
  } else if ($("onboardingModal") && !$("onboardingModal").classList.contains("hidden")) {
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
//  TAB 1: WORKOUT & ROUTINES (With Est. Duration Target)
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
      ? (editingRoutineId === "__NEW__" ? "CREATING NEW ROUTINE" : "EDITING ROUTINE TEMPLATE")
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
            ? 'No custom routines yet. Tap "+ CREATE NEW ROUTINE" above to build one.'
            : 'Select "ALL ROUTINES" or build your own routine.') +
        '</small>' +
      '</div>';
    return;
  }

  displayRoutines.forEach(function (r) {
    const card = document.createElement("div");
    card.className = "metal-card routine-card";
    const isCustom = r.category === "Custom Templates" || !String(r.id).startsWith("routine_");
    const estMinutes = typeof estimateWorkoutMinutes === "function" ? estimateWorkoutMinutes(r.exercises) : 45;

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
        '<span class="routine-exercise-count">' + (r.exercises ? r.exercises.length : 0) + ' Exercises  ·  ~' + estMinutes + ' Min</span>' +
        '<div class="routine-card-buttons">' +
          '<button class="keycap-btn prev-btn">PREVIEW</button>' +
          '<button class="keycap-btn edit-r-btn">EDIT</button>' +
          '<button class="keycap-btn primary start-btn">START</button>' +
          '<button class="keycap-btn danger del-btn" title="Delete Routine" aria-label="Delete Routine">✕</button>' +
        '</div>' +
      '</div>';

    card.querySelector(".routine-category-badge").textContent =
      isCustom ? "CUSTOM ROUTINE" : (r.category || "WORKOUT SPLIT");
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

    card.querySelector(".del-btn").addEventListener("click", async function (e) {
      e.stopPropagation();
      const ok = await appConfirm("DELETE ROUTINE", 'Permanently delete routine "' + r.name + '"?', "DELETE");
      if (ok) {
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

let activePreviewRoutine = null;
function openRoutinePreview(r) {
  activePreviewRoutine = r;
  const estMin = typeof estimateWorkoutMinutes === "function" ? estimateWorkoutMinutes(r.exercises) : 45;
  $("prevCatBadge").textContent = ((r.category || "CUSTOM ROUTINE") + "  ·  EST. TIME: ~" + estMin + " MIN").toUpperCase();
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
    nameDiv.textContent = pad(idx + 1) + ". " + exNameStr + (item.isSuperset ? " [SS]" : "");

    const metaDiv = document.createElement("div");
    metaDiv.className = "preview-ex-meta";
    metaDiv.innerHTML =
      '<span class="equip-badge">' + esc(equip) + '</span>' +
      '<span class="sets-badge">' + esc(setsCount + (item.reps ? " x " + item.reps : " SETS")) + '</span>';

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
    .map(p => p + " " + unit.toUpperCase() + " x " + counts[p])
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
      { label: "01 // SETUP & POSTURE", text: guide.setup },
      { label: "02 // EXECUTION CUE", text: guide.cue },
      { label: "03 // MISTAKE TO AVOID", text: guide.mistake }
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
        weekSets += (e.sets || []).filter(s => s.type !== "W" && s.lifter !== "p2").length;
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
  $("heroStreak").textContent = streak + " WEEK" + (streak === 1 ? "" : "S") + " STREAK";
  $("heroWorkouts").textContent = hist.length;
  $("heroSets").textContent = weekSets;
  $("heroPrs").textContent = totalPrCount;
  $("currentWeekLabel").textContent = fmtShort(new Date(thisWeek)) + " - TODAY";
}

// =====================================================
//  ACTIVE WORKOUT COCKPIT & A1/A2 SUPERSET GROUPING
// =====================================================
function syncCockpitModeUI() {
  const modeTag = $("workoutModeTag");
  const finishBtn = $("finishBtn");
  const miniLabel = $("miniHudLabel");
  const editMetaRow = $("wEditMetaRow");
  const footerActions = $("wFooterActions");
  const s = getSettings();

  applyExperienceMode(s.experienceMode);
  applyRpeVisibility(s.showRpe);
  syncMuteTimerUI();

  if (editMetaRow && editingWorkoutId) {
    editMetaRow.classList.remove("hidden");
  }
  if (footerActions) {
    const saveAsBtn = $("saveRoutineBtn");
    if (saveAsBtn) saveAsBtn.classList.toggle("hidden", !!editingRoutineId);
  }

  if (editingRoutineId) {
    if (modeTag) modeTag.textContent = editingRoutineId === "__NEW__" ? "NEW" : "EDIT";
    if (finishBtn) finishBtn.textContent = "SAVE";
    if (miniLabel) miniLabel.textContent = "EDITING ROUTINE";
  } else if (editingWorkoutId) {
    if (modeTag) modeTag.textContent = "EDIT";
    if (finishBtn) finishBtn.textContent = "SAVE";
    if (miniLabel) miniLabel.textContent = "EDITING LOG";
  } else {
    if (modeTag) modeTag.textContent = "LIVE";
    if (finishBtn) finishBtn.textContent = "FINISH";
    if (miniLabel) miniLabel.textContent = "ACTIVE WORKOUT";
  }

  updateWorkoutTargetTimeUI();
  updateDuoBarUI();
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

// Fixed Bug #3: Shows "EDIT LOG" instead of "72:14:30" when editing a past workout!
function updateClock() {
  if (editingRoutineId) {
    $("wClock").textContent = "BUILDER";
    $("miniClock").textContent = "BUILDER";
    const rc = $("resumeClock");
    if (rc) rc.textContent = "BUILDER";
    return;
  }
  if (editingWorkoutId) {
    $("wClock").textContent = "EDIT LOG";
    $("miniClock").textContent = "EDIT LOG";
    const rc = $("resumeClock");
    if (rc) rc.textContent = "EDIT LOG";
    return;
  }
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

function tickRest() {
  const left = Math.ceil((restEnd - Date.now()) / 1000);
  if (left <= 0) {
    clearInterval(restId);
    $("timer").textContent = "REST COMPLETE";
    if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
    playTimerFinishedBeep();
    return;
  }
  $("timer").textContent = Math.floor(left / 60) + ":" + pad(left % 60);
}

function startTimer(seconds) {
  restEnd = Date.now() + seconds * 1000;
  syncMuteTimerUI();
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

function saveDraft() {
  if (!workoutActive) return;
  const exercises = [];
  document.querySelectorAll("#exerciseList .exCard").forEach(function (card) {
    const sets = [];
    card.querySelectorAll(".setRow").forEach(function (row) {
      const kgInput = row.querySelector(".kgInput");
      sets.push({
        displayWeight: kgInput ? kgInput.value : "",
        reps: row.querySelector(".repsInput").value,
        rpe: row.dataset.rpe ? Number(row.dataset.rpe) : null,
        lifter: row.dataset.lifter || "p1",
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
    duoPartnerName: duoPartnerName,
    editDateVal: $("wDateInput") ? $("wDateInput").value : "",
    editDurationMin: $("wDurationInput") ? $("wDurationInput").value : "",
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
  duoPartnerName = d.duoPartnerName || null;
  $("wTitle").value = d.title || "";
  $("wNotes").value = d.notes || "";
  if ($("wDateInput") && d.editDateVal) $("wDateInput").value = d.editDateVal;
  if ($("wDurationInput") && d.editDurationMin) $("wDurationInput").value = d.editDurationMin;

  $("exerciseList").innerHTML = "";
  d.exercises.forEach(function (ex) {
    const normalizedSets = (ex.sets || []).map(function (s) {
      return {
        displayWeight: s.displayWeight !== undefined ? s.displayWeight : (s.kg !== undefined ? s.kg : ""),
        reps: s.reps,
        rpe: s.rpe || null,
        lifter: s.lifter || "p1",
        done: !!s.done,
        type: s.type || "N"
      };
    });
    addExerciseCard(ex.exId, 0, normalizedSets, ex.isSuperset, ex.targetReps);
  });
  renumberSupersetBadges();
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

    const stepMinusWtBtn = card.querySelector(".step-minus-wt-btn");
    const stepPlusWtBtn = card.querySelector(".step-wt-btn");
    if (stepMinusWtBtn) stepMinusWtBtn.textContent = "-" + (newUnit === "lbs" ? "5" : "2.5");
    if (stepPlusWtBtn) stepPlusWtBtn.textContent = "+" + (newUnit === "lbs" ? "5 LB" : "2.5 KG");

    const previous = getPrevious(exId, editingWorkoutId);
    card.querySelectorAll(".setRow").forEach(function (row, i) {
      const kgInput = row.querySelector(".kgInput");
      if (kgInput && kgInput.value !== "") {
        kgInput.value = convertWeightValue(kgInput.value, oldUnit, newUnit);
      }
      const prev = previous[i];
      const prevSpan = row.querySelector(".set-prev-hint");
      if (prev && prevSpan && row.dataset.lifter !== "p2") {
        const rpeSuffix = prev.rpe ? (" @" + prev.rpe) : "";
        if (type === "time") prevSpan.textContent = prev.reps + "s" + rpeSuffix;
        else if (type === "reps") prevSpan.textContent = prev.reps + "r" + rpeSuffix;
        else prevSpan.textContent = showWeight(prev.kg) + "x" + prev.reps + rpeSuffix;
      }
    });
  });
  updateDuoBarUI();
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
  duoPartnerName = null;
  duoActiveLifter = "p1";

  const hour = new Date().getHours();
  let part = "Evening";
  if (hour < 12) part = "Morning";
  else if (hour < 17) part = "Afternoon";
  $("wTitle").value = part + " Workout";
  $("wNotes").value = "";
  if ($("wDateInput")) $("wDateInput").value = toDateInputValue(workoutStart);
  if ($("wDurationInput")) $("wDurationInput").value = "";
  if ($("wEditMetaRow")) $("wEditMetaRow").classList.add("hidden");
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
    addExerciseCard(ex.exId, ex.sets, null, !!ex.isSuperset, ex.reps || "");
  });
  renumberSupersetBadges();
  updateWorkoutTargetTimeUI();
  saveDraft();
}

async function startNewRoutineBuilder() {
  if (workoutActive) {
    openWorkoutScreen();
    showToast("Finish or discard your active session before building a routine.");
    return;
  }
  workoutActive = true;
  workoutStart = Date.now();
  editingWorkoutId = null;
  editingRoutineId = "__NEW__";
  duoPartnerName = null;
  duoActiveLifter = "p1";

  $("wTitle").value = "My Custom Routine";
  $("wNotes").value = "";
  if ($("wEditMetaRow")) $("wEditMetaRow").classList.add("hidden");
  $("exerciseList").innerHTML = "";

  stopTimer();
  startClock();
  saveDraft();
  openWorkoutScreen();
  showToast("Routine Builder: Tap + ADD EXERCISE to assemble your plan.");
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
  duoPartnerName = null;
  duoActiveLifter = "p1";

  $("wTitle").value = r.name;
  $("wNotes").value = r.description || "";
  if ($("wEditMetaRow")) $("wEditMetaRow").classList.add("hidden");
  $("exerciseList").innerHTML = "";

  (r.exercises || []).forEach(function (ex) {
    addExerciseCard(ex.exId, ex.sets || 3, null, !!ex.isSuperset, ex.reps || "8-10");
  });
  renumberSupersetBadges();

  stopTimer();
  startClock();
  saveDraft();
  openWorkoutScreen();
  showToast("Editing routine: Adjust exercises, sets, or target reps, then tap SAVE.");
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
  duoPartnerName = w.partnerName || null;
  duoActiveLifter = "p1";

  $("wTitle").value = w.title || "Strength Session";
  $("wNotes").value = w.notes || "";
  if ($("wDateInput")) $("wDateInput").value = toDateInputValue(w.ts || Date.now());
  if ($("wDurationInput")) $("wDurationInput").value = Math.max(1, Math.round((w.duration || 45 * 60000) / 60000));
  $("exerciseList").innerHTML = "";

  (w.exercises || []).forEach(function (ex) {
    const savedSets = (ex.sets || []).map(function (s) {
      return {
        displayWeight: exTypeOf(ex.exId) === "weight" ? String(showWeight(s.kg)) : "",
        reps: s.reps,
        rpe: s.rpe || null,
        lifter: s.lifter || "p1",
        done: true,
        type: s.type || "N"
      };
    });
    addExerciseCard(ex.exId, Math.max(savedSets.length, 1), savedSets, !!ex.isSuperset);
  });
  renumberSupersetBadges();

  stopTimer();
  startClock();
  saveDraft();
  openWorkoutScreen();
  showToast("Editing past workout log.");
}

function repeatHistoryWorkout(w) {
  if (!startWorkout()) return;
  $("wTitle").value = w.title || "Strength Session";
  $("wNotes").value = w.notes || "";
  (w.exercises || []).forEach(function (ex) {
    const templateSets = (ex.sets || []).filter(s => s.lifter !== "p2").map(function (s) {
      return {
        displayWeight: exTypeOf(ex.exId) === "weight" ? String(showWeight(s.kg)) : "",
        reps: s.reps,
        rpe: null,
        lifter: "p1",
        done: false,
        type: s.type || "N"
      };
    });
    addExerciseCard(ex.exId, Math.max(templateSets.length, 1), templateSets, !!ex.isSuperset);
  });
  renumberSupersetBadges();
  updateWorkoutTargetTimeUI();
  saveDraft();
  showToast("Workout template loaded.");
}

function endWorkoutUI() {
  workoutActive = false;
  editingWorkoutId = null;
  editingRoutineId = null;
  duoPartnerName = null;
  duoActiveLifter = "p1";
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
  const workingSets = prevSets.filter(s => s.type !== "W" && s.lifter !== "p2");
  const repRangeLabel = routineTargetReps ? " (Goal: " + routineTargetReps + ")" : "";

  if (workingSets.length === 0) {
    if (type === "time") {
      return "FIRST SESSION: Hold for " + (routineTargetReps || "45-60s") + " with strict form.";
    }
    return "FIRST SESSION: Choose a controlled weight for " + (routineTargetReps || "8-10") + " reps to set your baseline.";
  }

  const isPlateau = typeof detectPlateau === "function" && detectPlateau(exId, editingWorkoutId);

  if (type === "time") {
    let maxSec = 0;
    workingSets.forEach(s => { if (Number(s.reps) > maxSec) maxSec = Number(s.reps); });
    if (isPlateau) {
      return "PLATEAU ALERT: Held " + maxSec + "s for 3 sessions. Add 1 extra set or slow down breathing.";
    }
    return "TARGET: Last best hold was " + maxSec + " sec. Aim for " + (maxSec + 5) + " sec today.";
  }

  if (type === "reps") {
    let maxReps = 0;
    workingSets.forEach(s => { if (Number(s.reps) > maxReps) maxReps = Number(s.reps); });
    if (isPlateau) {
      return "PLATEAU ALERT: Stuck at " + maxReps + " reps for 3 sessions. Add a 2s pause or a Drop Set [D].";
    }
    return "TARGET: Last best was " + maxReps + " reps. Aim for " + (maxReps + 1) + " reps today." + repRangeLabel;
  }

  let topWeightKg = 0;
  let topReps = 0;
  let topRpe = null;
  workingSets.forEach(s => {
    const k = Number(s.kg) || 0;
    const r = Number(s.reps) || 0;
    if (k > topWeightKg || (k === topWeightKg && r > topReps)) {
      topWeightKg = k;
      topReps = r;
      topRpe = s.rpe ? Number(s.rpe) : null;
    }
  });

  const unit = unitName().toUpperCase();
  const shownLast = showWeight(topWeightKg);

  if (isPlateau) {
    return "PLATEAU ALERT: Stuck at " + shownLast + " " + unit + " x " + topReps +
      " for 3 sessions. Tap SWAP for a variation or add a Drop Set [D].";
  }

  if (topRpe && topRpe >= 10) {
    return "TARGET: Last set was RPE 10 (" + shownLast + " " + unit + " x " + topReps +
      "). Keep " + shownLast + " " + unit + " today and build smoother control.";
  }

  if (topReps < 10) {
    return "TARGET: Last best was " + shownLast + " " + unit + " x " + topReps +
      ". Keep " + shownLast + " " + unit + " and hit " + (topReps + 1) + "+ reps before adding weight.";
  }

  if (unitName() === "lbs") {
    const targetLbs = Math.round((shownLast + 5) / 5) * 5;
    return "TARGET: Hit " + shownLast + " LBS x " + topReps + " last time. Move up to " + targetLbs + " LBS x 8 reps.";
  } else {
    const targetKg = showWeight(topWeightKg + 2.5);
    return "TARGET: Hit " + shownLast + " KG x " + topReps + " last time. Move up to " + targetKg + " KG x 8 reps.";
  }
}

function renumberCardIndices() {
  document.querySelectorAll("#exerciseList .exCard").forEach(function (c, i) {
    const idxEl = c.querySelector(".ex-index");
    if (idxEl) idxEl.textContent = pad(i + 1);
  });
}

function renumberSupersetBadges() {
  const cards = Array.prototype.slice.call(document.querySelectorAll("#exerciseList .exCard"));
  let groupIdx = 0;
  let subIdx = 0;
  let inChain = false;

  cards.forEach(function (card, i) {
    const badge = card.querySelector(".superset-badge");
    const isLinkedToNext = card.classList.contains("isSuperset") && cards[i + 1];
    const prevWasLinked = i > 0 && cards[i - 1].classList.contains("isSuperset");

    if (isLinkedToNext || prevWasLinked) {
      if (!inChain) {
        inChain = true;
        subIdx = 1;
      } else {
        subIdx++;
      }
      const letter = String.fromCharCode(65 + (groupIdx % 26));
      if (badge) {
        badge.textContent = letter + subIdx;
        badge.classList.remove("hidden");
      }
      if (!isLinkedToNext) {
        inChain = false;
        groupIdx++;
      }
    } else {
      if (badge) badge.classList.add("hidden");
    }
  });
}

// ---------- Exercise Card inside Live Workout (With Set 1 -> 2/3 Auto-Cascade & Live PR Badges!) ----------
function addExerciseCard(exId, setCount, savedSets, isSuperset, targetReps, doNotAppend) {
  const ex = getExercise(exId);
  if (!ex) return null;
  const type = exTypeOf(exId);
  const equip = exEquipmentOf(exId);
  const isNoWeight = (type === "reps" || type === "time");
  const isPlateLoaded = (equip === "Barbell" || equip === "Smith Machine");
  const previous = getPrevious(exId, editingWorkoutId);
  const pinnedNote = getExerciseNote(exId);
  const runningBest = Object.assign({}, getStats(getAllSets(exId, editingWorkoutId)));

  const card = document.createElement("div");
  card.className = "exCard" + (isNoWeight ? " repsOnly" : "") + (isSuperset ? " isSuperset" : "");
  card.dataset.exid = exId;
  card.dataset.targetreps = targetReps || (type === "time" ? "45-60s" : "8-10");

  const repColHeader = type === "time" ? "SEC" : "REPS";
  const stepUnitNum = unitName() === "lbs" ? "5" : "2.5";
  const stepWtLabel = "+" + (unitName() === "lbs" ? "5 LB" : "2.5 KG");

  card.innerHTML =
    '<div class="exHead">' +
      '<div class="exHeadTopRow">' +
        '<div class="exHeadLeft">' +
          '<span class="ex-index">01</span>' +
          '<span class="superset-badge hidden">A1</span>' +
          '<h3></h3>' +
        '</div>' +
      '</div>' +
      '<div class="exActions">' +
        '<button class="info-ex-btn" title="Form Guide & History">INFO</button>' +
        '<button class="swap-ex-btn" title="Swap Exercise">SWAP</button>' +
        (isNoWeight ? '' : '<button class="util-pill-btn step-minus-wt-btn" title="Decrease weight">-' + stepUnitNum + '</button>') +
        (isNoWeight ? '' : '<button class="util-pill-btn step-wt-btn" title="Increase weight">' + esc(stepWtLabel) + '</button>') +
        '<button class="util-pill-btn step-minus-rep-btn" title="Decrease rep">-1</button>' +
        '<button class="util-pill-btn step-rep-btn" title="Increase rep/sec">+1 ' + repColHeader + '</button>' +
        '<button class="tools-toggle-btn" title="More Tools">•••</button>' +
      '</div>' +
      '<div class="ex-tools-drawer hidden">' +
        '<button class="util-pill-btn rest-pill-btn" title="Custom Rest Timer"></button>' +
        (isPlateLoaded ? '<button class="util-pill-btn plate-pill-btn" title="Barbell Plate Calculator">PLATES</button>' : '') +
        (isNoWeight ? '' : '<button class="util-pill-btn warmup-pill-btn adv-only" title="Generate Warm-Up Sets">+ WARMUP</button>') +
        '<button class="superset-btn adv-only' + (isSuperset ? ' active' : '') + '" title="Link Next Exercise as Superset">SUPERSET</button>' +
        '<button class="util-pill-btn target-reps-btn" title="Set Routine Target Rep Range">GOAL: ' + esc(card.dataset.targetreps) + '</button>' +
        '<button class="action-icon-btn moveUpBtn" title="Move Up" aria-label="Move Up">▲</button>' +
        '<button class="action-icon-btn moveDownBtn" title="Move Down" aria-label="Move Down">▼</button>' +
        '<button class="remove-ex-btn" title="Remove Exercise">REMOVE</button>' +
      '</div>' +
      '<input type="text" class="ex-pinned-note" placeholder="Pinned note (e.g. Seat #4, grip width)...">' +
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
  const hintText = generateAutoTargetHint(exId, card.dataset.targetreps);
  targetStrip.textContent = hintText;
  if (hintText.startsWith("PLATEAU")) targetStrip.classList.add("plateau-alert");

  const toolsBtn = card.querySelector(".tools-toggle-btn");
  const toolsDrawer = card.querySelector(".ex-tools-drawer");
  toolsBtn.addEventListener("click", function () {
    const isHidden = toolsDrawer.classList.contains("hidden");
    toolsDrawer.classList.toggle("hidden", !isHidden);
    toolsBtn.classList.toggle("open", isHidden);
  });

  // Target Rep Range Editor inside Tools Drawer
  const targetRepsBtn = card.querySelector(".target-reps-btn");
  if (targetRepsBtn) {
    targetRepsBtn.addEventListener("click", async function () {
      const nextGoal = await appPrompt(
        "TARGET REP RANGE",
        "Set target reps for " + ex.name + " (e.g. 6-8, 8-10, 10-12, 12-15):",
        card.dataset.targetreps,
        "8-10"
      );
      if (nextGoal && nextGoal.trim()) {
        card.dataset.targetreps = nextGoal.trim().slice(0, 12);
        targetRepsBtn.textContent = "GOAL: " + card.dataset.targetreps;
        targetStrip.textContent = generateAutoTargetHint(exId, card.dataset.targetreps);
        renumberSets();
        saveDraft();
      }
    });
  }

  // Pinned Note Always Visible Outside Drawer
  const noteInput = card.querySelector(".ex-pinned-note");
  noteInput.value = pinnedNote;
  noteInput.addEventListener("change", function () {
    saveExerciseNote(exId, noteInput.value);
    showToast("Pinned note saved");
  });

  const restBtn = card.querySelector(".rest-pill-btn");
  function updateRestPillLabel() {
    const cRest = getExerciseCustomRest(exId);
    restBtn.textContent = cRest > 0 ? ("REST: " + cRest + "s *") : ("REST: " + getSettings().rest + "s");
  }
  updateRestPillLabel();

  restBtn.addEventListener("click", function () {
    const cycle = [0, 60, 90, 120, 180, 240];
    const cur = getExerciseCustomRest(exId);
    const nextIdx = (cycle.indexOf(cur) + 1) % cycle.length;
    const nextVal = cycle[nextIdx];
    saveExerciseRest(exId, nextVal);
    updateRestPillLabel();
    updateWorkoutTargetTimeUI();
    showToast(nextVal > 0 ? ("Custom rest for " + ex.name + ": " + nextVal + "s") : ("Reset to default rest (" + getSettings().rest + "s)"));
  });

  const setsDiv = card.querySelector(".sets");
  let lastFocusedRow = null;

  // Auto-Cascade: Whatever you type in Set 1 cascades into empty Set 2 & Set 3 placeholders!
  function cascadeSetPlaceholders() {
    let lastKnownKg = "";
    let lastKnownReps = "";
    setsDiv.querySelectorAll(".setRow").forEach(function (row, idx) {
      if (row.dataset.type === "W" || row.dataset.lifter === "p2") return;
      const kgInp = row.querySelector(".kgInput");
      const repsInp = row.querySelector(".repsInput");
      const prev = previous[idx];

      if (kgInp) {
        if (kgInp.value.trim() !== "") {
          lastKnownKg = kgInp.value.trim();
        } else {
          const fallbackKg = lastKnownKg !== "" ? lastKnownKg : (prev && prev.kg !== undefined ? String(showWeight(prev.kg)) : "0");
          kgInp.placeholder = fallbackKg;
          row.dataset.cascadekg = fallbackKg !== "0" ? fallbackKg : "";
        }
      }
      if (repsInp) {
        if (repsInp.value.trim() !== "") {
          lastKnownReps = repsInp.value.trim();
        } else {
          const fallbackReps = lastKnownReps !== "" ? lastKnownReps : (prev && prev.reps ? String(prev.reps) : (type === "time" ? "sec" : "0"));
          repsInp.placeholder = fallbackReps;
          row.dataset.cascadereps = (fallbackReps !== "0" && fallbackReps !== "sec") ? fallbackReps : "";
        }
      }
    });
  }

  // Focused-Row Aware Target Finder for -2.5 / +2.5 Steppers
  function getTargetRowForStepper() {
    if (lastFocusedRow && lastFocusedRow.parentNode === setsDiv) return lastFocusedRow;
    const rows = setsDiv.querySelectorAll(".setRow");
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].querySelector(".doneBox").classList.contains("checked")) return rows[i];
    }
    return rows[rows.length - 1] || null;
  }

  function adjustRowWeight(delta) {
    const targetRow = getTargetRowForStepper();
    if (!targetRow) return;
    const kgInput = targetRow.querySelector(".kgInput");
    if (!kgInput) return;
    const baseVal = kgInput.value.trim() !== ""
      ? Number(kgInput.value)
      : (targetRow.dataset.cascadekg ? Number(targetRow.dataset.cascadekg) : 0);
    const nextVal = Math.max(0, Math.round((baseVal + delta) * 10) / 10);
    kgInput.value = nextVal;
    cascadeSetPlaceholders();
    saveDraft();
  }

  function adjustRowReps(delta) {
    const targetRow = getTargetRowForStepper();
    if (!targetRow) return;
    const repsInput = targetRow.querySelector(".repsInput");
    if (!repsInput) return;
    const baseReps = repsInput.value.trim() !== ""
      ? Number(repsInput.value)
      : (targetRow.dataset.cascadereps ? Number(targetRow.dataset.cascadereps) : 0);
    const nextReps = Math.max(1, Math.round(baseReps + delta));
    repsInput.value = nextReps;
    cascadeSetPlaceholders();
    saveDraft();
  }

  const stepMinusWtBtn = card.querySelector(".step-minus-wt-btn");
  const stepPlusWtBtn = card.querySelector(".step-wt-btn");
  const stepMinusRepBtn = card.querySelector(".step-minus-rep-btn");
  const stepPlusRepBtn = card.querySelector(".step-rep-btn");

  if (stepMinusWtBtn) stepMinusWtBtn.addEventListener("click", function () { adjustRowWeight(unitName() === "lbs" ? -5 : -2.5); });
  if (stepPlusWtBtn) stepPlusWtBtn.addEventListener("click", function () { adjustRowWeight(unitName() === "lbs" ? 5 : 2.5); });
  if (stepMinusRepBtn) stepMinusRepBtn.addEventListener("click", function () { adjustRowReps(type === "time" ? -5 : -1); });
  if (stepPlusRepBtn) stepPlusRepBtn.addEventListener("click", function () { adjustRowReps(type === "time" ? 5 : 1); });

  function renumberSets() {
    let n = 0;
    let p1Idx = 0;
    setsDiv.querySelectorAll(".setRow").forEach(function (row) {
      const t = row.dataset.type || "N";
      const btn = row.querySelector(".setTypeBtn");
      const isP2 = row.dataset.lifter === "p2";
      row.classList.toggle("is-p2", isP2);

      if (isP2) {
        btn.textContent = "P2";
      } else if (t === "N") {
        n++;
        btn.textContent = n;
      } else {
        btn.textContent = t;
      }

      const prev = (!isP2 && t !== "W") ? previous[p1Idx] : null;
      if (!isP2 && t !== "W") p1Idx++;

      const prevSpan = row.querySelector(".set-prev-hint");
      const prTagHtml = row.dataset.prtag ? ('<span class="set-pr-badge">PR</span>') : "";

      if (isP2) {
        prevSpan.classList.remove("clickable");
        prevSpan.title = "";
        prevSpan.textContent = (duoPartnerName ? duoPartnerName.toUpperCase() : "PARTNER");
      } else if (prev) {
        prevSpan.classList.add("clickable");
        prevSpan.title = "Tap to copy into set";
        const rpeSuffix = prev.rpe ? (" @" + prev.rpe) : "";
        let txt = "";
        if (type === "time") txt = prev.reps + "s" + rpeSuffix;
        else if (type === "reps") txt = prev.reps + "r" + rpeSuffix;
        else txt = showWeight(prev.kg) + "x" + prev.reps + rpeSuffix;
        prevSpan.innerHTML = esc(txt) + prTagHtml;
      } else {
        prevSpan.classList.add("clickable");
        prevSpan.title = "Tap to fill from above set";
        prevSpan.innerHTML = esc("Goal: " + card.dataset.targetreps) + prTagHtml;
      }
    });
    cascadeSetPlaceholders();
  }

  function addSet(saved, insertAtTop) {
    const row = document.createElement("div");
    row.className = "setRow";
    row.dataset.type = saved && saved.type ? saved.type : "N";
    row.dataset.rpe = saved && saved.rpe ? String(saved.rpe) : "";
    row.dataset.lifter = (saved && saved.lifter) ? saved.lifter : (duoPartnerName ? duoActiveLifter : "p1");
    row.dataset.prtag = "";

    row.innerHTML =
      '<button class="setTypeBtn" title="Tap to cycle Set Type: Normal, Warm-up (W), Drop (D), Failure (F)">1</button>' +
      '<span class="set-prev-hint">—</span>' +
      (isNoWeight ? "" : '<input type="number" step="any" min="0" inputmode="decimal" placeholder="0" class="kgInput">') +
      '<input type="number" min="1" step="1" inputmode="numeric" placeholder="' + (type === "time" ? "sec" : "0") + '" class="repsInput">' +
      '<button class="rpeBtn" title="Tap to cycle RPE Effort (7 to 10)">—</button>' +
      '<button class="doneBox" aria-label="Complete Set">✓</button>' +
      '<button class="delSetBtn" title="Delete Set" aria-label="Delete Set">✕</button>';

    // Track focused row and auto-cascade on typing
    row.querySelectorAll("input").forEach(function (inp) {
      inp.addEventListener("focus", function () { lastFocusedRow = row; });
      inp.addEventListener("input", function () {
        lastFocusedRow = row;
        cascadeSetPlaceholders();
        saveDraft();
      });
    });

    // Clicking PREV or Goal copies previous/cascaded values into the inputs
    const prevSpan = row.querySelector(".set-prev-hint");
    prevSpan.addEventListener("click", function () {
      lastFocusedRow = row;
      if (row.dataset.lifter === "p2") return;
      const kgInput = row.querySelector(".kgInput");
      const repsInput = row.querySelector(".repsInput");
      const p1Rows = Array.prototype.filter.call(setsDiv.children, r => r.dataset.lifter !== "p2" && r.dataset.type !== "W");
      const idx = p1Rows.indexOf(row);
      const prev = previous[idx >= 0 ? idx : 0];

      if (kgInput) {
        if (row.dataset.cascadekg) kgInput.value = row.dataset.cascadekg;
        else if (prev && prev.kg !== undefined) kgInput.value = showWeight(prev.kg);
      }
      if (repsInput) {
        if (row.dataset.cascadereps) repsInput.value = row.dataset.cascadereps;
        else if (prev && prev.reps !== undefined) repsInput.value = prev.reps;
      }
      cascadeSetPlaceholders();
      saveDraft();
      showToast("Set values filled");
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
      if (duoPartnerName && row.dataset.lifter === "p2") {
        row.dataset.lifter = "p1";
        showToast("Assigned set to " + getAthleteProfile().name);
        renumberSets();
        updateDuoBarUI();
        saveDraft();
        return;
      }
      const isSimple = document.documentElement.getAttribute("data-exp") === "simple";
      const order = isSimple ? ["N", "W"] : ["N", "W", "D", "F"];
      const nextType = order[(order.indexOf(row.dataset.type) + 1) % order.length];
      row.dataset.type = nextType;
      const labels = { N: "Working Set", W: "Warm-up Set", D: "Drop Set", F: "Failure Set" };
      showToast("Set Type: " + labels[nextType]);
      renumberSets();
      updateWorkoutTargetTimeUI();
      saveDraft();
    });

    const done = row.querySelector(".doneBox");
    done.addEventListener("click", function () {
      lastFocusedRow = row;
      if (editingRoutineId) {
        showToast("Routine Builder: Adjust set count, then tap SAVE.");
        return;
      }
      const isChecked = done.classList.contains("checked");
      if (!isChecked) {
        const kgInput = row.querySelector(".kgInput");
        const repsInput = row.querySelector(".repsInput");

        // Auto-fill from cascaded value or previous session if blank!
        if (kgInput && kgInput.value.trim() === "" && row.dataset.cascadekg) {
          kgInput.value = row.dataset.cascadekg;
        }
        if (repsInput.value.trim() === "" && row.dataset.cascadereps) {
          repsInput.value = row.dataset.cascadereps;
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
          showToast(type === "time" ? "Enter hold duration in seconds (1+)." : "Enter weight (0+) and reps (1+).");
          return;
        }

        if (duoPartnerName) {
          row.dataset.lifter = duoActiveLifter;
        }

        done.classList.add("checked");
        row.classList.add("done");
        cascadeSetPlaceholders();

        // Hevy-Style Live Set-by-Set PR Evaluation & Gold [PR] Row Badge!
        let brokeLivePr = false;
        if (row.dataset.type !== "W" && row.dataset.lifter !== "p2" && typeof evaluateSetLivePRs === "function") {
          const setKg = kgInput ? toKg(weightVal) : 0;
          const brokenList = evaluateSetLivePRs(exId, setKg, repsVal, runningBest);
          if (brokenList.length > 0) {
            brokeLivePr = true;
            row.dataset.prtag = brokenList.join(" · ");
            row.classList.add("is-pr-set");
            triggerLivePrCelebration(ex.name, brokenList.join(" & "));
          }
        }

        renumberSets();

        if (!brokeLivePr) {
          if (navigator.vibrate) navigator.vibrate(14);
          playBeep(700, "sine", 0.08);
        }

        if (duoPartnerName) {
          duoActiveLifter = duoActiveLifter === "p1" ? "p2" : "p1";
          updateDuoBarUI();
          const nextName = duoActiveLifter === "p1" ? getAthleteProfile().name : duoPartnerName.toUpperCase();
          showToast("Set logged! Next turn: " + nextName);
        } else {
          const nextCard = card.nextElementSibling;
          const prevCard = card.previousElementSibling;
          if (card.classList.contains("isSuperset") && nextCard) {
            showToast("Superset: Move immediately to " + nextCard.querySelector("h3").textContent);
            startTimer(15);
          } else if (prevCard && prevCard.classList.contains("isSuperset")) {
            showToast("Superset round complete! Full rest, then return to " + prevCard.querySelector("h3").textContent);
            startTimer(getExerciseRest(exId));
          } else {
            startTimer(getExerciseRest(exId));
          }
        }
      } else {
        done.classList.remove("checked");
        row.classList.remove("done");
        row.dataset.prtag = "";
        row.classList.remove("is-pr-set");
        renumberSets();
        if (duoPartnerName) updateDuoBarUI();
      }
      saveDraft();
    });

    row.querySelector(".delSetBtn").addEventListener("click", async function () {
      const allRows = setsDiv.querySelectorAll(".setRow");
      if (allRows.length <= 1) {
        const ok = await appConfirm("REMOVE EXERCISE", "Remove this last set and delete " + ex.name + " from session?", "REMOVE");
        if (ok) {
          card.remove();
          renumberCardIndices();
          renumberSupersetBadges();
          updateWorkoutTargetTimeUI();
          updateDuoBarUI();
          saveDraft();
        }
        return;
      }
      row.remove();
      renumberSets();
      updateWorkoutTargetTimeUI();
      updateDuoBarUI();
      saveDraft();
    });

    if (insertAtTop && setsDiv.firstChild) {
      setsDiv.insertBefore(row, setsDiv.firstChild);
    } else {
      setsDiv.appendChild(row);
    }

    if (saved) {
      const kgInput = row.querySelector(".kgInput");
      const rawWt = saved.displayWeight !== undefined ? saved.displayWeight : (saved.kg !== undefined ? saved.kg : "");
      if (kgInput && rawWt !== undefined) kgInput.value = rawWt;
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
    warmupBtn.addEventListener("click", async function () {
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
        const promptWt = await appPrompt(
          "WARM-UP GENERATOR",
          "Enter your target working weight (" + unitName().toUpperCase() + "):",
          unitName() === "lbs" ? "135" : "60"
        );
        workingWt = Number(promptWt) || 0;
      }
      if (workingWt <= 0) return;

      const warmups = generateWarmupSets(workingWt, unitName(), equip);
      if (warmups.length === 0) {
        showToast("Working weight is light enough to start directly.");
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
      showToast("Added " + warmups.length + " warm-up set(s) [W]");
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
      renumberSupersetBadges();
      saveDraft();
    }
  });

  card.querySelector(".moveDownBtn").addEventListener("click", function () {
    const next = card.nextElementSibling;
    if (next) {
      card.parentNode.insertBefore(next, card);
      renumberCardIndices();
      renumberSupersetBadges();
      saveDraft();
    }
  });

  card.querySelector(".superset-btn").addEventListener("click", function () {
    card.classList.toggle("isSuperset");
    this.classList.toggle("active", card.classList.contains("isSuperset"));
    renumberSupersetBadges();
    saveDraft();
  });

  // + ADD SET automatically pre-fills from the last set above it!
  card.querySelector(".addSetBtn").addEventListener("click", function () {
    const allRows = setsDiv.querySelectorAll(".setRow");
    const lastRow = allRows[allRows.length - 1];
    let prefill = null;
    if (lastRow) {
      const kgInp = lastRow.querySelector(".kgInput");
      const repsInp = lastRow.querySelector(".repsInput");
      const wt = kgInp ? (kgInp.value.trim() || lastRow.dataset.cascadekg || "") : "";
      const rp = repsInp ? (repsInp.value.trim() || lastRow.dataset.cascadereps || "") : "";
      prefill = { displayWeight: wt, reps: rp, type: "N", done: false };
    }
    addSet(prefill);
    updateWorkoutTargetTimeUI();
    saveDraft();
  });

  card.querySelector(".remove-ex-btn").addEventListener("click", async function () {
    const ok = await appConfirm("REMOVE EXERCISE", "Remove " + ex.name + " from this session?", "REMOVE");
    if (ok) {
      card.remove();
      renumberCardIndices();
      renumberSupersetBadges();
      updateWorkoutTargetTimeUI();
      updateDuoBarUI();
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
    renumberSupersetBadges();
    updateWorkoutTargetTimeUI();
  }
  return card;
}
// ============ app.js (PART 2/2) : FULL RESULT REPORT, LVL 1-10 ROADMAP, 5 ACCENTS & INIT ============

function renderBodyMapSvg(containerId, workloadMap, isDarkCard) {
  const container = $(containerId);
  if (!container) return;
  workloadMap = workloadMap || {};

  const isLightMode = !isDarkCard && document.documentElement.getAttribute("data-theme") === "light";
  const baseFill = isLightMode ? "#cfc8b8" : "#252522";
  const strokeColor = isLightMode ? "#121211" : "#3d3d38";
  const flame = cssVar("--flame") || "#ff4422";
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
      '<div class="anatomy-label">ANTERIOR // FRONT</div>' +
      '<svg viewBox="0 0 180 320" class="anatomy-svg">' +
        '<path d="M78 16 C78 8 102 8 102 16 L100 32 C100 38 80 38 80 32 Z" fill="' + baseFill + '" stroke="' + strokeColor + '" stroke-width="1.4"/>' +
        '<path d="M82 37 L98 37 L101 48 L79 48 Z" fill="' + baseFill + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<path d="M56 56 Q74 44 82 47 L98 47 Q106 44 124 56 L112 62 L68 62 Z" fill="' + colorFor("Back") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<path d="M54 60 Q72 56 89 62 L89 92 Q70 96 54 82 Q50 70 54 60 Z" fill="' + colorFor("Chest") + '" stroke="' + strokeColor + '" stroke-width="1.4"/>' +
        '<path d="M126 60 Q108 56 91 62 L91 92 Q110 96 126 82 Q130 70 126 60 Z" fill="' + colorFor("Chest") + '" stroke="' + strokeColor + '" stroke-width="1.4"/>' +
        '<path d="M54 57 Q38 56 36 72 Q36 84 48 84 L54 74 Z" fill="' + colorFor("Shoulders") + '" stroke="' + strokeColor + '" stroke-width="1.4"/>' +
        '<path d="M126 57 Q142 56 144 72 Q144 84 132 84 L126 74 Z" fill="' + colorFor("Shoulders") + '" stroke="' + strokeColor + '" stroke-width="1.4"/>' +
        '<path d="M37 85 Q30 100 35 118 L47 118 Q51 100 48 85 Z" fill="' + colorFor("Biceps") + '" stroke="' + strokeColor + '" stroke-width="1.3"/>' +
        '<path d="M143 85 Q150 100 145 118 L133 118 Q129 100 132 85 Z" fill="' + colorFor("Biceps") + '" stroke="' + strokeColor + '" stroke-width="1.3"/>' +
        '<path d="M34 120 Q24 138 25 160 L34 162 Q43 142 46 120 Z" fill="' + colorFor("Forearms") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<path d="M146 120 Q156 138 155 160 L146 162 Q137 142 134 120 Z" fill="' + colorFor("Forearms") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<path d="M62 92 L72 95 L72 138 L60 134 Z" fill="' + colorFor("Core") + '" stroke="' + strokeColor + '" stroke-width="1.1"/>' +
        '<path d="M118 92 L108 95 L108 138 L120 134 Z" fill="' + colorFor("Core") + '" stroke="' + strokeColor + '" stroke-width="1.1"/>' +
        '<path d="M74 96 L88 96 L88 112 L74 112 Z" fill="' + colorFor("Core") + '" stroke="' + strokeColor + '" stroke-width="1.1"/>' +
        '<path d="M92 96 L106 96 L106 112 L92 112 Z" fill="' + colorFor("Core") + '" stroke="' + strokeColor + '" stroke-width="1.1"/>' +
        '<path d="M74 115 L88 115 L88 138 L76 138 Z" fill="' + colorFor("Core") + '" stroke="' + strokeColor + '" stroke-width="1.1"/>' +
        '<path d="M92 115 L106 115 L104 138 L92 138 Z" fill="' + colorFor("Core") + '" stroke="' + strokeColor + '" stroke-width="1.1"/>' +
        '<path d="M58 144 L86 148 L82 222 Q64 226 55 208 Q50 176 58 144 Z" fill="' + colorFor("Quads") + '" stroke="' + strokeColor + '" stroke-width="1.4"/>' +
        '<path d="M122 144 L94 148 L98 222 Q116 226 125 208 Q130 176 122 144 Z" fill="' + colorFor("Quads") + '" stroke="' + strokeColor + '" stroke-width="1.4"/>' +
        '<path d="M60 230 Q54 256 61 294 L73 294 Q80 258 77 230 Z" fill="' + colorFor("Calves") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<path d="M120 230 Q126 256 119 294 L107 294 Q100 258 103 230 Z" fill="' + colorFor("Calves") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
      '</svg>' +
    '</div>' +
    '<div class="anatomy-col">' +
      '<div class="anatomy-label">POSTERIOR // BACK</div>' +
      '<svg viewBox="0 0 180 320" class="anatomy-svg">' +
        '<path d="M78 16 C78 8 102 8 102 16 L100 32 C100 38 80 38 80 32 Z" fill="' + baseFill + '" stroke="' + strokeColor + '" stroke-width="1.4"/>' +
        '<path d="M82 37 L98 37 L101 48 L79 48 Z" fill="' + baseFill + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<path d="M60 54 L90 46 L120 54 L104 94 L90 104 L76 94 Z" fill="' + colorFor("Back") + '" stroke="' + strokeColor + '" stroke-width="1.3"/>' +
        '<path d="M56 56 Q38 56 36 72 Q36 84 48 84 L58 74 Z" fill="' + colorFor("Shoulders") + '" stroke="' + strokeColor + '" stroke-width="1.4"/>' +
        '<path d="M124 56 Q142 56 144 72 Q144 84 132 84 L122 74 Z" fill="' + colorFor("Shoulders") + '" stroke="' + strokeColor + '" stroke-width="1.4"/>' +
        '<path d="M56 76 L76 94 L86 138 L62 128 Q50 102 56 76 Z" fill="' + colorFor("Back") + '" stroke="' + strokeColor + '" stroke-width="1.4"/>' +
        '<path d="M124 76 L104 94 L94 138 L118 128 Q130 102 124 76 Z" fill="' + colorFor("Back") + '" stroke="' + strokeColor + '" stroke-width="1.4"/>' +
        '<path d="M37 85 Q30 100 35 118 L47 118 Q51 100 48 85 Z" fill="' + colorFor("Triceps") + '" stroke="' + strokeColor + '" stroke-width="1.3"/>' +
        '<path d="M143 85 Q150 100 145 118 L133 118 Q129 100 132 85 Z" fill="' + colorFor("Triceps") + '" stroke="' + strokeColor + '" stroke-width="1.3"/>' +
        '<path d="M34 120 Q24 138 25 160 L34 162 Q43 142 46 120 Z" fill="' + colorFor("Forearms") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<path d="M146 120 Q156 138 155 160 L146 162 Q137 142 134 120 Z" fill="' + colorFor("Forearms") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<path d="M58 142 L89 144 L89 178 Q62 182 55 162 Z" fill="' + colorFor("Glutes") + '" stroke="' + strokeColor + '" stroke-width="1.3"/>' +
        '<path d="M122 142 L91 144 L91 178 Q118 182 125 162 Z" fill="' + colorFor("Glutes") + '" stroke="' + strokeColor + '" stroke-width="1.3"/>' +
        '<path d="M57 178 L86 182 L82 224 L59 220 Q53 200 57 178 Z" fill="' + colorFor("Hamstrings") + '" stroke="' + strokeColor + '" stroke-width="1.3"/>' +
        '<path d="M123 178 L94 182 L98 224 L121 220 Q127 200 123 178 Z" fill="' + colorFor("Hamstrings") + '" stroke="' + strokeColor + '" stroke-width="1.3"/>' +
        '<path d="M60 230 Q52 252 62 294 L73 294 Q82 254 77 230 Z" fill="' + colorFor("Calves") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
        '<path d="M120 230 Q128 252 118 294 L107 294 Q98 254 103 230 Z" fill="' + colorFor("Calves") + '" stroke="' + strokeColor + '" stroke-width="1.2"/>' +
      '</svg>' +
    '</div>';
}

// =====================================================
//  BRAND-NEW MOTIVATION & PROGRESS RESULT REPORT
// =====================================================
function buildSummaryFromWorkout(w) {
  const workloadMap = calculateMuscleWorkload([w]);
  const insights = typeof getWorkoutFlexInsights === "function"
    ? getWorkoutFlexInsights(w)
    : { deltaText: "SESSION COMPLETE", deltaPositive: true, mvp: null, xpEarned: 150 };
  const duoStats = typeof getWorkoutDuoStats === "function" ? getWorkoutDuoStats(w) : null;

  let totalSets = 0;
  const exerciseLines = [];
  const detailedExercises = [];

  const estMinTarget = typeof estimateWorkoutMinutes === "function"
    ? estimateWorkoutMinutes((w.exercises || []).map(e => ({
        exId: e.exId,
        sets: (e.sets || []).filter(s => s.type !== "W" && s.lifter !== "p2").length
      })))
    : 45;

  (w.exercises || []).forEach(function (ex) {
    const working = (ex.sets || []).filter(s => s.type !== "W" && s.lifter !== "p2");
    totalSets += working.length;
    if (working.length > 0) {
      exerciseLines.push({
        name: exName(ex.exId),
        setsCount: working.length
      });
    }

    const comp = typeof getExerciseComparisonVsLast === "function"
      ? getExerciseComparisonVsLast(ex.exId, ex.sets, w.id)
      : { badgeText: "COMPLETED", isPositive: true };

    const exPrs = (w.prs || []).filter(p => p.exId === ex.exId);
    detailedExercises.push({
      exId: ex.exId,
      name: exName(ex.exId),
      isSuperset: !!ex.isSuperset,
      sets: ex.sets || [],
      comparisonBadge: comp.badgeText,
      isPositive: comp.isPositive,
      prs: exPrs
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
    id: w.id,
    title: w.title || "Strength Session",
    date: dateStr,
    durationMin: durationMin,
    estMinTarget: estMinTarget,
    volume: workoutVolume(w),
    totalSets: totalSets,
    muscleMap: workloadMap,
    exerciseLines: exerciseLines,
    detailedExercises: detailedExercises,
    prs: prs,
    deltaText: insights.deltaText,
    mvp: insights.mvp,
    xpEarned: insights.xpEarned || 150,
    duoStats: duoStats
  };
}

if ($("flexPhotoInput")) {
  $("flexPhotoInput").addEventListener("change", function () {
    const file = $("flexPhotoInput").files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      uploadedFlexPhotoDataUrl = reader.result;
      if ($("photoAttachedHint")) $("photoAttachedHint").classList.remove("hidden");
      showToast("Gym photo attached! Tap EXPORT IMAGE (.PNG).");
    };
    reader.readAsDataURL(file);
  });
}

function showSummaryModal(summaryData, fromHistory) {
  isSummaryFromHistory = !!fromHistory;
  activeSummaryData = summaryData;
  uploadedFlexPhotoDataUrl = null;
  if ($("photoAttachedHint")) $("photoAttachedHint").classList.add("hidden");

  const unit = unitName().toUpperCase();
  const prof = typeof getAthleteProfile === "function" ? getAthleteProfile() : { name: "ATHLETE", level: 1, rank: "ROOKIE", xp: 100, nextLevelXp: 250, progressPct: 40, xpToNext: 150, nextRank: "IRON STARTER" };
  const volText = showWeight(summaryData.volume).toLocaleString() + " " + unit;

  if ($("sumTopBannerTag")) {
    $("sumTopBannerTag").textContent = fromHistory
      ? ("WORKOUT LOG REPORT // " + prof.name)
      : ("WORKOUT COMPLETE // GREAT WORK, " + prof.name + "!");
  }
  $("sumTitle").textContent = summaryData.title;
  $("sumDate").textContent = summaryData.date.toUpperCase() + "  ·  DURATION: " + summaryData.durationMin + " MIN (TARGET: ~" + (summaryData.estMinTarget || 45) + "M)";

  // 1. Level & XP Card
  if ($("sumLevelBadge")) $("sumLevelBadge").textContent = "LVL " + prof.level + " // " + prof.rank;
  if ($("sumXpEarned")) $("sumXpEarned").textContent = "+" + (summaryData.xpEarned || 150) + " XP EARNED";
  if ($("sumXpBarFill")) $("sumXpBarFill").style.width = prof.progressPct + "%";
  if ($("sumXpSub")) {
    $("sumXpSub").textContent = prof.xpToNext > 0
      ? ("Total: " + prof.xp + " XP  ·  " + prof.xpToNext + " XP needed for LVL " + (prof.level + 1) + " (" + prof.nextRank + ")")
      : ("Total: " + prof.xp + " XP  ·  MAX LEVEL REACHED");
  }

  // 2. 4 Key Comparison Tiles
  $("sumTiles").innerHTML =
    '<div class="ticket-metric-cell"><small>Total Volume</small><strong>' + esc(volText) + '</strong></div>' +
    '<div class="ticket-metric-cell"><small>Working Sets</small><strong>' + esc(summaryData.totalSets) + '</strong></div>' +
    '<div class="ticket-metric-cell"><small>Duration vs Target</small><strong>' + esc(summaryData.durationMin + "m / ~" + (summaryData.estMinTarget || 45) + "m") + '</strong></div>' +
    '<div class="ticket-metric-cell"><small>Records Broken</small><strong style="color:var(--flame);">' + esc(summaryData.prs.length + " PRs") + '</strong></div>';

  if ($("sumDeltaBanner")) {
    $("sumDeltaBanner").textContent = summaryData.deltaText || "SESSION VERIFIED";
  }

  // 3. PRs Broken Today
  const prSection = $("sumPrSection");
  const prList = $("sumPrs");
  prList.innerHTML = "";
  if (summaryData.prs.length > 0) {
    prSection.classList.remove("hidden");
    if ($("sumPrCountBadge")) $("sumPrCountBadge").textContent = summaryData.prs.length + " RECORD(S)";
    summaryData.prs.forEach(function (pr) {
      const item = document.createElement("div");
      item.className = "pr-ticket-row";
      const leftSpan = document.createElement("span");
      leftSpan.textContent = pr.name + " · " + pr.kind;
      const rightB = document.createElement("b");
      rightB.textContent = pr.text;
      item.appendChild(leftSpan);
      item.appendChild(rightB);
      prList.appendChild(item);
    });
  } else {
    prSection.classList.add("hidden");
  }

  // 4. Exercise-by-Exercise Progress & Set Breakdown
  const exContainer = $("sumExerciseBreakdown");
  if (exContainer) {
    exContainer.innerHTML = "";
    (summaryData.detailedExercises || []).forEach(function (ex, idx) {
      const box = document.createElement("div");
      box.className = "result-ex-item";
      const type = exTypeOf(ex.exId);

      const topRow = document.createElement("div");
      topRow.className = "result-ex-top";
      const titleB = document.createElement("b");
      titleB.textContent = pad(idx + 1) + ". " + ex.name + (ex.isSuperset ? " [SS]" : "");
      topRow.appendChild(titleB);
      box.appendChild(topRow);

      const deltaBadge = document.createElement("div");
      deltaBadge.className = "result-ex-delta";
      deltaBadge.textContent = ex.comparisonBadge;
      box.appendChild(deltaBadge);

      const setsWrap = document.createElement("div");
      setsWrap.className = "result-sets-wrap";
      let workIdx = 0;

      (ex.sets || []).forEach(function (s) {
        const line = document.createElement("div");
        line.className = "result-set-line";
        let setLabel = "";
        if (s.lifter === "p2") setLabel = "PARTNER";
        else if (s.type === "W") setLabel = "WARMUP [W]";
        else {
          workIdx++;
          setLabel = "SET " + workIdx + (s.type && s.type !== "N" ? (" [" + s.type + "]") : "");
        }

        let valText = "";
        const rpeSuffix = s.rpe ? (" @" + s.rpe) : "";
        if (type === "time") valText = s.reps + " SEC" + rpeSuffix;
        else if (type === "reps") valText = s.reps + " REPS" + rpeSuffix;
        else valText = showWeight(s.kg) + " " + unit + " x " + s.reps + rpeSuffix;

        const leftS = document.createElement("span");
        leftS.style.color = "var(--muted)";
        leftS.textContent = setLabel;
        const rightS = document.createElement("b");
        rightS.textContent = valText;

        line.appendChild(leftS);
        line.appendChild(rightS);
        setsWrap.appendChild(line);
      });

      if (ex.prs && ex.prs.length > 0) {
        const prLine = document.createElement("div");
        prLine.style.cssText = "font-family:var(--font-mono); font-size:11px; font-weight:800; color:var(--flame); margin-top:4px;";
        prLine.textContent = "RECORDS: " + ex.prs.map(p => p.kind + " (" + formatPRValue(p) + ")").join(" · ");
        setsWrap.appendChild(prLine);
      }

      box.appendChild(setsWrap);
      exContainer.appendChild(box);
    });
  }

  // 5. Duo Head-to-Head Section
  const duoSec = $("sumDuoSection");
  const ds = summaryData.duoStats;
  if (duoSec) {
    duoSec.classList.toggle("hidden", !ds);
    if (ds) {
      if ($("duoWinnerBanner")) $("duoWinnerBanner").textContent = ds.winner;
      if ($("duoP1Name")) $("duoP1Name").textContent = ds.p1Name;
      if ($("duoP1Vol")) $("duoP1Vol").textContent = Math.round(showWeight(ds.p1Vol)).toLocaleString() + " " + unit;
      if ($("duoP1Sets")) $("duoP1Sets").textContent = ds.p1Sets + " WORKING SETS";
      if ($("duoP1Top")) $("duoP1Top").textContent = "BEST: " + ds.p1TopLift;
      if ($("duoP2Name")) $("duoP2Name").textContent = ds.p2Name;
      if ($("duoP2Vol")) $("duoP2Vol").textContent = Math.round(showWeight(ds.p2Vol)).toLocaleString() + " " + unit;
      if ($("duoP2Sets")) $("duoP2Sets").textContent = ds.p2Sets + " WORKING SETS";
      if ($("duoP2Top")) $("duoP2Top").textContent = "BEST: " + ds.p2TopLift;
    }
  }

  // 6. Muscle Split & Anatomy
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

  $("sumDoneBtn").querySelector("span").textContent = isSummaryFromHistory ? "RETURN TO HISTORY" : "DONE";
  $("summaryBackdrop").classList.remove("hidden");
  $("summaryModal").classList.remove("hidden");
  $("summaryModal").scrollTop = 0;
}

function closeSummaryModal() {
  $("summaryBackdrop").classList.add("hidden");
  $("summaryModal").classList.add("hidden");
  if (!isSummaryFromHistory) {
    showTab("history");
  }
}

// High-Res 1080x1920 PNG Summary Card Exporter (Uses local drawRoundedBox!)
function generateAndShareStoryPoster(sData) {
  if (!sData) return;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  const prof = typeof getAthleteProfile === "function" ? getAthleteProfile() : { name: "ATHLETE", level: 1, rank: "ROOKIE" };
  const unit = unitName().toUpperCase();
  const volText = showWeight(sData.volume).toLocaleString() + " " + unit;
  const accentColor = cssVar("--flame") || "#ff4422";

  function finalizeExport() {
    canvas.toBlob(function (blob) {
      if (!blob) return;
      const fileName = "strvex-summary-" + todayKey() + ".png";
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          title: "STRVEX Workout Report",
          text: sData.title + " logged on STRVEX",
          files: [file]
        }).catch(function () {});
      } else {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        showToast("Summary Image (.PNG) downloaded");
      }
    }, "image/png");
  }

  if (uploadedFlexPhotoDataUrl) {
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

      ctx.fillStyle = accentColor;
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
        { l: "RECORDS SET", v: sData.prs.length + " PRs" }
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
        ctx.fillStyle = accentColor;
        ctx.font = "800 32px 'JetBrains Mono', monospace";
        ctx.fillText("TOP LIFT: " + sData.mvp.name.toUpperCase() + " — " + sData.mvp.topSetText, 80, 1710);
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

  ctx.fillStyle = "#0d0d0c";
  ctx.fillRect(0, 0, 1080, 1920);

  ctx.fillStyle = "rgba(28, 28, 26, 0.92)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = 3;
  drawRoundedBox(ctx, 64, 100, 952, 1720, 40);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ebe6dc";
  ctx.font = "900 38px 'Archivo', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("STRVEX // WORKOUT REPORT", 124, 190);

  ctx.fillStyle = accentColor;
  ctx.font = "800 28px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";
  ctx.fillText(prof.name + " · LVL " + prof.level + " (" + prof.rank + ")", 956, 190);

  ctx.textAlign = "left";
  ctx.fillStyle = "#9a968c";
  ctx.font = "700 26px 'JetBrains Mono', monospace";
  ctx.fillText(sData.date.toUpperCase() + "  ·  " + sData.durationMin + " MIN  ·  +" + (sData.xpEarned || 150) + " XP", 124, 265);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 68px 'Archivo', sans-serif";
  ctx.fillText((sData.title || "STRENGTH SESSION").toUpperCase().slice(0, 22), 124, 350);

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  drawRoundedBox(ctx, 124, 400, 832, 270, 28);
  ctx.fill();
  ctx.fillStyle = accentColor;
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

  if (sData.mvp) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    drawRoundedBox(ctx, 124, 710, 832, 240, 24);
    ctx.fill();

    ctx.fillStyle = "#d4b483";
    ctx.font = "800 24px 'JetBrains Mono', monospace";
    ctx.fillText("PEAK LIFT // EST. 1RM: " + sData.mvp.est1rmText, 164, 768);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 46px 'Archivo', sans-serif";
    ctx.fillText(sData.mvp.name.slice(0, 26), 164, 835);

    ctx.fillStyle = accentColor;
    ctx.font = "900 44px 'JetBrains Mono', monospace";
    ctx.fillText("TOP SET: " + sData.mvp.topSetText, 164, 905);
  }

  let curY = 1020;
  ctx.fillStyle = "#d4b483";
  ctx.font = "800 24px 'JetBrains Mono', monospace";
  ctx.fillText("EXERCISES & PROGRESS (" + sData.totalSets + " WORKING SETS)", 124, curY);

  (sData.detailedExercises || []).slice(0, 6).forEach(function (ex, i) {
    curY += 78;
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    drawRoundedBox(ctx, 124, curY - 48, 832, 66, 12);
    ctx.fill();

    ctx.fillStyle = "#ebe6dc";
    ctx.font = "700 26px 'Archivo', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(pad(i + 1) + ". " + ex.name.slice(0, 24), 150, curY - 6);

    ctx.fillStyle = "#26d07c";
    ctx.font = "800 20px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(ex.comparisonBadge.slice(0, 28), 930, curY - 6);
  });

  if (sData.prs && sData.prs.length > 0) {
    curY += 80;
    ctx.textAlign = "left";
    ctx.fillStyle = accentColor;
    ctx.font = "800 28px 'JetBrains Mono', monospace";
    ctx.fillText(sData.prs.length + " NEW PERSONAL RECORD(S) SET TODAY", 124, curY);
  }

  ctx.fillStyle = "#9a968c";
  ctx.font = "800 26px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("STRVEX // STRENGTH LOGBOOK", 540, 1765);

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

// ---------- Finish Session / Save Routine / Save Edited Log ----------
async function finishWorkout() {
  if (editingRoutineId) {
    const isCreatingNew = (editingRoutineId === "__NEW__");
    const routineExercises = [];
    document.querySelectorAll("#exerciseList .exCard").forEach(function (card) {
      const workingRows = Array.prototype.filter.call(
        card.querySelectorAll(".setRow"),
        row => row.dataset.type !== "W"
      );
      routineExercises.push({
        exId: card.dataset.exid,
        sets: Math.max(workingRows.length, 1),
        reps: card.dataset.targetreps || (exTypeOf(card.dataset.exid) === "time" ? "45-60s" : "8-10"),
        isSuperset: card.classList.contains("isSuperset")
      });
    });
    if (routineExercises.length === 0) {
      await appAlert("EMPTY ROUTINE", "Add at least one exercise to save this routine.");
      return;
    }

    const allRoutines = getRoutines().slice();
    const updatedName = $("wTitle").value.trim() || "Custom Routine";
    const updatedDesc = $("wNotes").value.trim();

    if (isCreatingNew) {
      allRoutines.push({
        id: newId(),
        name: updatedName,
        category: "Custom Templates",
        description: updatedDesc || "Custom routine template.",
        exercises: routineExercises
      });
    } else {
      const rIdx = allRoutines.findIndex(r => r.id === editingRoutineId);
      if (rIdx !== -1) {
        allRoutines[rIdx].name = updatedName;
        if (updatedDesc) allRoutines[rIdx].description = updatedDesc;
        allRoutines[rIdx].exercises = routineExercises;
        allRoutines[rIdx].userEdited = true;
      }
    }

    if (!saveRoutines(allRoutines)) {
      await appAlert("SAVE FAILED", "Could not write routine to device storage. Please export a backup first.");
      return;
    }
    clearDraft();
    endWorkoutUI();
    showTab("workout");
    showToast(isCreatingNew ? "Routine created" : "Routine updated");
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
    const includeUnticked = await appConfirm(
      "UNCHECKED SETS DETECTED",
      "You have " + unloggedValidRows.length + " filled set(s) that are not marked complete (✓).\n\nMark them complete and include them in your workout?",
      "INCLUDE & SAVE"
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
    const p1SetsForPr = [];

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
        if (duoPartnerName && row.dataset.lifter === "p2") {
          setObj.lifter = "p2";
        } else {
          p1SetsForPr.push(setObj);
        }
        sets.push(setObj);
      }
    });

    if (sets.length > 0) {
      if (p1SetsForPr.length > 0) {
        findPRs(exId, p1SetsForPr, editingWorkoutId).forEach(function (pr) {
          prs.push({
            exId: exId,
            kind: pr.kind,
            val: pr.val,
            isReps: pr.isReps,
            isTime: pr.isTime,
            name: exName(exId)
          });
        });
      }
      exercises.push({
        exId: exId,
        sets: sets,
        isSuperset: card.classList.contains("isSuperset")
      });
    }
  });

  if (exercises.length === 0) {
    await appAlert("NO SETS LOGGED", "Enter your numbers and tap ✓ on at least one set before finishing.");
    return;
  }

  if (unloggedValidRows.length === 0 && !editingWorkoutId) {
    const ok = await appConfirm("FINISH WORKOUT", "Complete and save this workout session?", "SAVE WORKOUT");
    if (!ok) return;
  }

  const hist = getHistory().slice();
  const sessionTitle = $("wTitle").value.trim() || "Strength Session";
  const sessionNotes = $("wNotes").value.trim();

  // Check if user specified a custom date or custom duration (Works for both New Backdated Workouts & Edited Workouts!)
  let finalTs = editingWorkoutId ? workoutStart : Date.now();
  const dateStr = $("wDateInput") ? $("wDateInput").value : "";
  if (dateStr) {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const refD = new Date(finalTs);
      const customD = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), refD.getHours(), refD.getMinutes());
      if (Number.isFinite(customD.getTime())) finalTs = customD.getTime();
    }
  }

  let finalDuration = Math.max(60000, Date.now() - workoutStart);
  const durMin = $("wDurationInput") ? Number($("wDurationInput").value) : 0;
  if (Number.isFinite(durMin) && durMin >= 1 && durMin <= 600) {
    finalDuration = Math.round(durMin) * 60000;
  }

  if (editingWorkoutId) {
    const idx = hist.findIndex(w => w.id === editingWorkoutId);
    if (idx !== -1) {
      hist[idx].title = sessionTitle;
      hist[idx].notes = sessionNotes;
      hist[idx].exercises = exercises;
      hist[idx].prs = prs;
      hist[idx].ts = finalTs;
      hist[idx].date = new Date(finalTs).toLocaleString();
      hist[idx].duration = finalDuration;
      if (duoPartnerName) hist[idx].partnerName = duoPartnerName;
      else delete hist[idx].partnerName;

      if (!saveHistory(hist)) {
        await appAlert("SAVE FAILED", "Device storage is full! Your changes could not be written. Please export a backup.");
        return;
      }
      const updatedObj = hist[idx];
      clearDraft();
      endWorkoutUI();
      updateHeaderAthleteBadge();
      renderTab("history");
      showToast("Workout log updated");
      showSummaryModal(buildSummaryFromWorkout(updatedObj), true);
      return;
    }
  }

  const workoutObj = {
    id: newId(),
    title: sessionTitle,
    notes: sessionNotes,
    ts: finalTs,
    date: new Date(finalTs).toLocaleString(),
    duration: finalDuration,
    exercises: exercises,
    prs: prs
  };
  if (duoPartnerName) workoutObj.partnerName = duoPartnerName;

  hist.push(workoutObj);
  hist.sort((a, b) => (a.ts || 0) - (b.ts || 0));

  if (!saveHistory(hist)) {
    await appAlert("STORAGE FULL", "Could not save workout to browser storage. Your active workout draft is still safe—please go to Settings > Export JSON Backup and free space.");
    return;
  }

  clearDraft();
  endWorkoutUI();
  updateHeaderAthleteBadge();
  renderTab(currentTab);
  playPrFanfare();
  showToast("Workout Complete! +" + calculateWorkoutXP(workoutObj) + " XP");

  showSummaryModal(buildSummaryFromWorkout(workoutObj), false);
}

async function saveAsRoutine() {
  const exercises = [];
  document.querySelectorAll("#exerciseList .exCard").forEach(function (card) {
    const workingRows = Array.prototype.filter.call(
      card.querySelectorAll(".setRow"),
      row => row.dataset.type !== "W" && row.dataset.lifter !== "p2"
    );
    exercises.push({
      exId: card.dataset.exid,
      sets: Math.max(workingRows.length, 1),
      reps: card.dataset.targetreps || (exTypeOf(card.dataset.exid) === "time" ? "45-60s" : "8-10"),
      isSuperset: card.classList.contains("isSuperset")
    });
  });
  if (exercises.length === 0) {
    await appAlert("NO EXERCISES", "Add at least one exercise before saving a routine template.");
    return;
  }
  const routineName = await appPrompt("SAVE AS ROUTINE", "Enter a name for this routine template:", $("wTitle").value, "e.g. Push Day A");
  if (!routineName || !routineName.trim()) return;
  const routines = getRoutines().slice();
  routines.push({
    id: newId(),
    name: routineName.trim(),
    category: "Custom Templates",
    exercises: exercises
  });
  if (saveRoutines(routines)) {
    showToast("Routine template saved");
  }
}

async function discardWorkout() {
  const msg = editingRoutineId
    ? "Discard unsaved changes to this routine?"
    : (editingWorkoutId ? "Cancel editing this workout log? Unsaved changes will be lost." : "Discard this active workout? Logged sets will not be saved.");
  const ok = await appConfirm("DISCARD SESSION", msg, "DISCARD");
  if (!ok) return;
  clearDraft();
  endWorkoutUI();
  renderTab(currentTab);
}

$("startBtn").addEventListener("click", startWorkout);
if ($("createRoutineBtn")) $("createRoutineBtn").addEventListener("click", startNewRoutineBuilder);
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
//  EXERCISE PICKER, SWAP & MANAGEMENT SHEET (Unlocked formType!)
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
            displayWeight: kgInput ? kgInput.value : "",
            reps: repsInput ? repsInput.value : "",
            rpe: r.dataset.rpe ? Number(r.dataset.rpe) : null,
            lifter: r.dataset.lifter || "p1",
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
          renumberSupersetBadges();
          updateWorkoutTargetTimeUI();
          updateDuoBarUI();
          showToast("Swapped to " + ex.name);
          saveDraft();
        }
      } else {
        const card = addExerciseCard(ex.id, 1);
        updateWorkoutTargetTimeUI();
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

// Unlocked formType even in edit mode so user can switch Pull-ups/Push-ups to Weighted!
function openForm(mode, ex) {
  sheetMode = mode;
  editingId = ex && ex.id ? ex.id : null;
  $("sheetPick").classList.add("hidden");
  $("sheetForm").classList.remove("hidden");
  $("formTitle").textContent = mode === "edit" ? "EDIT EXERCISE" : "NEW EXERCISE";
  $("formName").value = ex && ex.name ? ex.name : "";
  setFormType(ex && ex.type ? ex.type : "weight");
  $("formType").classList.remove("locked");
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

async function saveForm() {
  const nameVal = $("formName").value.trim();
  if (!nameVal) {
    await appAlert("INVALID NAME", "Please enter an exercise name.");
    return;
  }
  const primaryMuscle = $("formMuscle").value;
  const equipment = $("formEquipment").value;
  const secondaryMuscles = Array.from(selectedSecondaryMuscles).filter(m => m !== primaryMuscle);
  const all = getExercises().slice();
  const dup = all.find(e => e.name.toLowerCase() === nameVal.toLowerCase() && e.id !== editingId);

  if (dup) {
    await appAlert("DUPLICATE EXERCISE", "An exercise with this name already exists.");
    return;
  }

  if (sheetMode === "edit") {
    const ex = all.find(e => e.id === editingId);
    if (ex) {
      ex.name = nameVal;
      ex.type = formType;
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
      renumberSupersetBadges();
      updateWorkoutTargetTimeUI();
      saveDraft();
    } else {
      const card = addExerciseCard(ex.id, 1);
      updateWorkoutTargetTimeUI();
      saveDraft();
      if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  } else {
    renderLibrary();
    showToast("Exercise saved");
  }
}

async function deleteExercise() {
  const inWorkout = Array.prototype.some.call(
    document.querySelectorAll("#exerciseList .exCard"),
    c => c.dataset.exid === editingId
  );
  if (isExerciseUsed(editingId) || inWorkout) {
    await appAlert("CANNOT DELETE", "This exercise has recorded workout data and cannot be deleted. You can rename it instead.");
    return;
  }
  const ok = await appConfirm("DELETE EXERCISE", "Permanently delete this exercise from the library?", "DELETE");
  if (!ok) return;
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

function setsText(ex, partnerName) {
  const type = exTypeOf(ex.exId);
  const unit = unitName().toUpperCase();
  return (ex.sets || []).map(function (s) {
    const pTag = (partnerName && s.lifter === "p2") ? (partnerName.toUpperCase() + ": ") : "";
    const label = s.type && s.type !== "N" ? "[" + s.type + "] " : "";
    const rpeStr = s.rpe ? " @" + s.rpe : "";
    if (type === "time") return pTag + label + s.reps + " sec" + rpeStr;
    if (type === "reps") return pTag + label + s.reps + " reps" + rpeStr;
    return pTag + label + showWeight(s.kg) + unit + " x " + s.reps + rpeStr;
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
      $("historyFilterLabel").textContent = selectedCalDay + " " + MONTHS_SHORT[calMonth].toUpperCase() + " (TAP DAY TO CLEAR)";
    }
  } else if ($("historyFilterLabel")) {
    $("historyFilterLabel").textContent = hist.length + " TOTAL SESSIONS";
  }

  if (filtered.length === 0) {
    list.innerHTML =
      '<div class="metal-card" style="text-align:center; color:var(--muted); padding:24px 16px;">' +
        '<p style="margin:0 0 4px; font-weight:700;">No workout logs found.</p>' +
        '<small style="font-family:var(--font-mono);">Completed workouts will appear here with full Progress Reports.</small>' +
      '</div>';
    return;
  }

  const visibleItems = selectedCalDay !== null ? filtered : filtered.slice(0, historyVisibleCount);

  visibleItems.forEach(function (w) {
    const card = document.createElement("div");
    card.className = "history-card";

    const title = document.createElement("h3");
    title.textContent = (w.title || "Strength Session") + (w.partnerName ? (" [DUO: " + w.partnerName.toUpperCase() + "]") : "");
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
      chip.textContent = "PR: " + (pr.name || exName(pr.exId)) + " · " + pr.kind + " (" + formatPRValue(pr) + ")";
      card.appendChild(chip);
    });

    (w.exercises || []).forEach(function (ex) {
      const line = document.createElement("div");
      line.className = "history-exercise-line";
      const name = document.createElement("b");
      name.textContent = exName(ex.exId) + (ex.isSuperset ? " [SS]" : "");
      const sub = document.createElement("div");
      sub.className = "history-sets-sub";
      sub.textContent = setsText(ex, w.partnerName);
      line.appendChild(name);
      line.appendChild(sub);
      card.appendChild(line);
    });

    const actions = document.createElement("div");
    actions.className = "history-card-actions";

    const sumBtn = document.createElement("button");
    sumBtn.className = "keycap-btn primary";
    sumBtn.textContent = "REPORT";
    sumBtn.addEventListener("click", function () {
      showSummaryModal(buildSummaryFromWorkout(w), true);
    });

    const editBtn = document.createElement("button");
    editBtn.className = "keycap-btn";
    editBtn.textContent = "EDIT";
    editBtn.addEventListener("click", function () {
      editHistoryWorkout(w);
    });

    const repBtn = document.createElement("button");
    repBtn.className = "keycap-btn";
    repBtn.textContent = "REPEAT";
    repBtn.addEventListener("click", function () {
      repeatHistoryWorkout(w);
    });

    const delBtn = document.createElement("button");
    delBtn.className = "keycap-btn danger";
    delBtn.textContent = "✕";
    delBtn.title = "Delete Log";
    delBtn.addEventListener("click", async function () {
      const ok = await appConfirm("DELETE LOG", 'Permanently delete "' + (w.title || "Strength Session") + '"?', "DELETE");
      if (ok) {
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
//  TAB 3: PROGRESS, CONNECTED LVL 1-10 ROADMAP & CHARTS
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
  const heroBox = $("levelHeroCard");
  const grid = $("achievementsGrid");
  if (!grid || typeof getAthleteProfile !== "function") return;
  const prof = getAthleteProfile();

  if ($("achievementsCountLabel")) {
    $("achievementsCountLabel").textContent = "LVL " + prof.level + " // " + prof.rank;
  }

  if (heroBox) {
    heroBox.innerHTML =
      '<div class="level-hero-top">' +
        '<span class="level-hero-rank">LVL ' + prof.level + ' // ' + esc(prof.rank) + '</span>' +
        '<span class="level-hero-xp">' + prof.xp.toLocaleString() + ' XP</span>' +
      '</div>' +
      '<div style="font-size:12px; color:var(--muted); margin-bottom:6px;">' + esc(prof.rankDesc) + '</div>' +
      '<div class="level-bar-track">' +
        '<div class="level-bar-fill" style="width:' + prof.progressPct + '%;"></div>' +
      '</div>' +
      '<div class="level-hero-sub">' +
        '<span>' + prof.workouts + ' Workouts Logged</span>' +
        '<span>' + (prof.xpToNext > 0 ? (prof.xpToNext + ' XP to LVL ' + (prof.level + 1) + ' (' + esc(prof.nextRank) + ')') : 'MAX LEVEL UNLOCKED') + '</span>' +
      '</div>';
  }

  grid.innerHTML = "";
  (prof.roadmap || []).forEach(function (tier) {
    const row = document.createElement("div");
    let cls = "lvl-row";
    if (tier.isCurrent) cls += " current";
    else if (tier.unlocked) cls += " unlocked";
    row.className = cls;

    row.innerHTML =
      '<span class="lvl-badge-num">LVL ' + tier.level + '</span>' +
      '<div class="lvl-info">' +
        '<b>' + esc(tier.title) + (tier.isCurrent ? ' (CURRENT)' : (tier.unlocked ? ' ✓' : '')) + '</b>' +
        '<small>' + esc(tier.desc) + '</small>' +
      '</div>' +
      '<span class="lvl-xp-req">' + tier.xpRequired.toLocaleString() + ' XP</span>';
    grid.appendChild(row);
  });
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
  const isSimple = document.documentElement.getAttribute("data-exp") === "simple";
  $("metricSeg").classList.toggle("hidden", isNoWeight || isSimple);
  if (isSimple) progressMetric = "weight";
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
      const p1Sets = (e.sets || []).filter(s => s.lifter !== "p2");
      const st = getStats(p1Sets);
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

$("bwAddBtn").addEventListener("click", async function () {
  const v = Number($("bwInput").value);
  if ($("bwInput").value.trim() === "" || !Number.isFinite(v) || v <= 0 || v > 500) {
    await appAlert("INVALID WEIGHT", "Please enter a valid body weight.");
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

function syncMeasurementUnitPicker() {
  const typeSel = $("measTypeSelect");
  const unitSel = $("measUnitSelect");
  if (!typeSel || !unitSel) return;
  const isBf = typeSel.value === "Body Fat %";
  unitSel.classList.toggle("hidden", isBf);
  if (!isBf) unitSel.value = getSettings().measUnit || "in";
}

if ($("measTypeSelect")) {
  $("measTypeSelect").addEventListener("change", syncMeasurementUnitPicker);
}
if ($("measUnitSelect")) {
  $("measUnitSelect").addEventListener("change", function () {
    const s = getSettings();
    s.measUnit = $("measUnitSelect").value === "cm" ? "cm" : "in";
    saveSettings(s);
  });
}

function renderMeasurements() {
  syncMeasurementUnitPicker();
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
    const u = entry.part === "Body Fat %" ? "%" : (" " + (entry.unit || "in"));
    text.textContent = entry.date + " · " + entry.part + ": " + entry.val + u;

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
  $("measAddBtn").addEventListener("click", async function () {
    const part = $("measTypeSelect").value;
    const isBf = part === "Body Fat %";
    const unitVal = isBf ? "%" : ($("measUnitSelect") ? $("measUnitSelect").value : "in");
    const val = Number($("measInput").value);

    if (isBf) {
      if ($("measInput").value.trim() === "" || !Number.isFinite(val) || val < 3 || val > 65) {
        await appAlert("INVALID BODY FAT %", "Enter a realistic body fat percentage between 3% and 65%.");
        return;
      }
    } else {
      const maxLim = unitVal === "cm" ? 250 : 100;
      if ($("measInput").value.trim() === "" || !Number.isFinite(val) || val <= 2 || val > maxLim) {
        await appAlert("INVALID MEASUREMENT", "Enter a valid measurement between 2 and " + maxLim + " " + unitVal + ".");
        return;
      }
    }

    const list = getMeasurements().slice();
    list.push({
      id: newId(),
      date: todayKey(),
      part: part,
      unit: unitVal,
      val: Math.round(val * 10) / 10
    });
    saveMeasurements(list);
    $("measInput").value = "";
    renderMeasurements();
    showToast(part + " logged");
  });
}

// =====================================================
//  TAB 4: SETTINGS, 5 ACCENT COLORS, LIBRARY & CSV
// =====================================================
function renderMoreTab() {
  $("moreMain").classList.remove("hidden");
  $("libraryView").classList.add("hidden");
  const s = getSettings();
  setSegmented($("unitSeg"), s.unit);
  if ($("themeSeg")) setSegmented($("themeSeg"), s.theme || "dark");
  if ($("experienceModeSeg")) setSegmented($("experienceModeSeg"), s.experienceMode || "advanced");
  if ($("rpeToggleSeg")) setSegmented($("rpeToggleSeg"), s.showRpe ? "on" : "off");
  if ($("soundToggleSeg")) setSegmented($("soundToggleSeg"), s.soundMuted ? "mute" : "on");
  applyAccentColor(s.accent || "flame");
  $("restInput").value = s.rest;
  $("exCount").textContent = getExercises().length + " ›";
}

if ($("accentColorSeg")) {
  $("accentColorSeg").addEventListener("click", function (e) {
    const dot = e.target.closest(".accent-dot");
    if (!dot || !dot.dataset.v) return;
    const s = getSettings();
    s.accent = dot.dataset.v;
    saveSettings(s);
    applyAccentColor(s.accent);
    showToast("Accent color updated");
  });
}

if ($("experienceModeSeg")) {
  bindSegmented($("experienceModeSeg"), function (v) {
    const s = getSettings();
    s.experienceMode = v === "simple" ? "simple" : "advanced";
    saveSettings(s);
    applyExperienceMode(s.experienceMode);
    showToast(s.experienceMode === "simple" ? "Simple (Beginner) Mode enabled" : "Advanced (Pro) Mode enabled");
  });
}

if ($("soundToggleSeg")) {
  bindSegmented($("soundToggleSeg"), function (v) {
    const s = getSettings();
    s.soundMuted = (v === "mute");
    saveSettings(s);
    syncMuteTimerUI();
    showToast(s.soundMuted ? "Timer audio muted" : "Timer audio enabled");
  });
}

if ($("rpeHelpBtn")) {
  $("rpeHelpBtn").addEventListener("click", function () {
    appAlert(
      "WHAT IS RPE?",
      "RPE (Rate of Perceived Exertion) measures how hard a set felt from 7 to 10:\n\n" +
      "• @7 = Could do ~3 more reps\n" +
      "• @8 = Could do ~2 more reps (ideal muscle-building zone)\n" +
      "• @9 = Could do 1 more rep\n" +
      "• @10 = Maximum effort, 0 reps left"
    );
  });
}

if ($("rpeToggleSeg")) {
  bindSegmented($("rpeToggleSeg"), function (v) {
    const s = getSettings();
    s.showRpe = (v === "on");
    saveSettings(s);
    applyRpeVisibility(s.showRpe);
    showToast("RPE Column " + (s.showRpe ? "enabled" : "hidden"));
  });
}

if ($("themeSeg")) {
  bindSegmented($("themeSeg"), function (v) {
    const s = getSettings();
    s.theme = v;
    saveSettings(s);
    applyTheme(v);
    showToast(v === "light" ? "Warm Bone Light Theme active" : "Dark Titanium Theme active");
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

// Backup Export & Deep Schema-Validated Import
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
  showToast("Backup exported");
});

$("importFile").addEventListener("change", function () {
  const file = $("importFile").files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function () {
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

      const cleanHistory = history
        .filter(w => w && typeof w === "object" && Array.isArray(w.exercises))
        .map(w => ({
          id: typeof w.id === "string" ? w.id : newId(),
          title: typeof w.title === "string" ? w.title.slice(0, 120) : "Strength Session",
          notes: typeof w.notes === "string" ? w.notes.slice(0, 500) : "",
          ts: Number.isFinite(Number(w.ts)) ? Number(w.ts) : Date.now(),
          date: typeof w.date === "string" ? w.date : new Date().toLocaleString(),
          duration: Number.isFinite(Number(w.duration)) ? Number(w.duration) : 45 * 60000,
          partnerName: typeof w.partnerName === "string" ? w.partnerName.slice(0, 20) : undefined,
          exercises: w.exercises
            .filter(ex => ex && typeof ex.exId === "string" && Array.isArray(ex.sets))
            .map(ex => ({
              exId: ex.exId,
              isSuperset: !!ex.isSuperset,
              sets: ex.sets
                .filter(s => s && typeof s === "object" && Number.isFinite(Number(s.reps)) && Number(s.reps) >= 1)
                .map(s => {
                  const cleanSet = {
                    kg: Math.max(0, Number(s.kg) || 0),
                    reps: Math.round(Number(s.reps)),
                    type: ["N", "W", "D", "F"].includes(s.type) ? s.type : "N"
                  };
                  if (s.rpe && Number(s.rpe) >= 5 && Number(s.rpe) <= 10) cleanSet.rpe = Number(s.rpe);
                  if (s.lifter === "p2") cleanSet.lifter = "p2";
                  return cleanSet;
                })
            }))
            .filter(ex => ex.sets.length > 0),
          prs: Array.isArray(w.prs) ? w.prs.filter(p => p && typeof p.exId === "string") : []
        }))
        .filter(w => w.exercises.length > 0);

      const cleanRoutines = routines
        .filter(r => r && typeof r === "object" && typeof r.name === "string" && Array.isArray(r.exercises))
        .map(r => ({
          id: typeof r.id === "string" ? r.id : newId(),
          name: r.name.trim().slice(0, 100),
          category: typeof r.category === "string" ? r.category : "Custom Templates",
          description: typeof r.description === "string" ? r.description.slice(0, 300) : "",
          userEdited: !!r.userEdited,
          exercises: r.exercises
            .filter(ex => ex && typeof ex.exId === "string")
            .map(ex => ({
              exId: ex.exId,
              sets: Math.max(1, Math.min(20, Math.round(Number(ex.sets) || 3))),
              reps: typeof ex.reps === "string" ? ex.reps : "8-10",
              isSuperset: !!ex.isSuperset
            }))
        }));

      const ok = await appConfirm(
        "RESTORE BACKUP",
        "Found " + cleanHistory.length + " valid workouts and " + cleanRoutines.length + " routines.\n\nCurrent device data will be safely snapshotted before restoring.",
        "RESTORE"
      );
      if (!ok) {
        $("importFile").value = "";
        return;
      }

      write("backup_before_restore", {
        ts: Date.now(),
        exercises: getExercises(),
        history: getHistory(),
        routines: getRoutines(),
        bodyweight: getBodyWeights(),
        measurements: getMeasurements(),
        exercise_meta: getExerciseMetaMap(),
        settings: getSettings()
      });

      saveExercises(cleanExercises);
      saveHistory(cleanHistory);
      saveRoutines(cleanRoutines);
      if (Array.isArray(data.bodyweight)) {
        saveBodyWeights(data.bodyweight.filter(b => b && typeof b.date === "string" && Number(b.kg) > 0));
      }
      if (Array.isArray(data.measurements)) {
        saveMeasurements(data.measurements.filter(m => m && typeof m.part === "string" && Number(m.val) > 0));
      }
      if (data.exercise_meta && typeof data.exercise_meta === "object" && !Array.isArray(data.exercise_meta)) {
        saveExerciseMetaMap(data.exercise_meta);
      }
      if (data.settings && typeof data.settings === "object") {
        const cleanSettings = Object.assign({}, data.settings);
        cleanSettings.spotifyEmbedUrl = sanitizeSpotifyEmbedUrl(cleanSettings.spotifyEmbedUrl);
        saveSettings(cleanSettings);
      }
      initializeDatabase();
      clearDraft();
      showToast("Backup restored successfully");
      setTimeout(function () { location.reload(); }, 500);
    } catch (e) {
      await appAlert("INVALID BACKUP FILE", "Please select a valid STRVEX JSON backup file.");
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
    reader.onload = async function () {
      try {
        const res = importWorkoutsFromCsv(reader.result);
        updateHeroStats();
        updateHeaderAthleteBadge();
        if (res.imported === 0 && res.skipped > 0) {
          await appAlert("DUPLICATES SKIPPED", "All " + res.skipped + " workout(s) in this CSV already exist in your history.");
        } else {
          showToast("Imported " + res.imported + " workout(s)" + (res.skipped > 0 ? " (" + res.skipped + " duplicates skipped)" : ""));
          showTab("history");
        }
      } catch (err) {
        await appAlert("CSV IMPORT ERROR", (err && err.message) ? err.message : "Please select a valid Hevy or Strong CSV file.");
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
  applyAccentColor(s.accent || "flame");
  applyExperienceMode(s.experienceMode || "advanced");
  syncMuteTimerUI();
  if (s.defaultTrack) {
    routineCategoryFilter = s.defaultTrack;
  }
  bindRoutineCategoryFilters();
  initMusicDock();
  initDuoControls();
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