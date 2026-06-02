import { dbGet, dbSet, dbUpdate } from "./firebase.js";
import { state } from "./state.js";
import { safeNumber } from "./utils.js";
import { loadKids } from "./kids.js";
import { loadRewards } from "./rewards.js";
import { loadStreaks } from "./streaks.js";
import { renderPurchases } from "./purchases.js";
import { hardReload } from "./app.js";

export function initAdminEvents() {
  document.getElementById("adminLootButton")
    ?.addEventListener("click", giveAdminLoot);

  document.getElementById("saveRewardButton")
    ?.addEventListener("click", saveReward);

  document.getElementById("saveStreakButton")
    ?.addEventListener("click", saveAdminStreak);

  document.getElementById("hardReloadButton")
    ?.addEventListener("click", hardReload);

  document.getElementById("loadHistoryButton")
    ?.addEventListener("click", loadHistory);

  // Archiv aufklappen → laden
  document.getElementById("adminOverviewSection")
    ?.addEventListener("toggle", function() {
      if (this.open) renderAdminOverview();
    });

  document.querySelector("details:has(#rewardArchiveList)")
    ?.addEventListener("toggle", function() {
      if (this.open) renderRewardArchive();
    });

  document.querySelector("details:has(#pointsChart)")
    ?.addEventListener("toggle", function() {
      if (this.open) renderPointsChart();
    });
}

/* ========================================
   LOOT
======================================== */

async function giveAdminLoot() {
  const child = document.getElementById("adminLootChild")?.value;
  const amount = safeNumber(document.getElementById("adminLootAmount")?.value);

  if (!child || amount <= 0) { alert("Bitte Kind und Loot-Wert auswählen."); return; }

  await loadKids();
  const kid = state.kidsData[child];
  if (!kid) { alert("Kind nicht gefunden."); return; }

  const slots = [...(kid.slots || new Array(20).fill(0))];
  const free = slots.findIndex(v => v <= 0);
  if (free === -1) { alert("Keine freien Loot-Slots."); return; }

  slots[free] = amount;
  const unclaimed = slots.filter(v => v > 0).length;

  // History eintrag
  await logHistory(child, amount, "Loot");

  await dbUpdate(`kids/${child}`, { slots, unclaimed });
  await loadKids();
  renderAdminOverview();

  alert(`${child}: +${amount} Loot erstellt.`);
}

/* ========================================
   REWARD
======================================== */

async function saveReward() {
  const title = document.getElementById("rewardTitle")?.value.trim() || "";
  const img1 = document.getElementById("rewardImage1")?.value.trim() || "";
  const img2 = document.getElementById("rewardImage2")?.value.trim() || "";
  const img3 = document.getElementById("rewardImage3")?.value.trim() || "";
  const visibleFor = document.getElementById("rewardVisibleFor")?.value || "ALL";

  if (!title) { alert("Bitte Reward-Titel eintragen."); return; }

  const id = `R${Date.now()}`;
  let rewardData;

  if (visibleFor === "ALL+") {
    const targets = {
      Luna: safeNumber(document.getElementById("rewardTargetLuna")?.value),
      Milo: safeNumber(document.getElementById("rewardTargetMilo")?.value),
      Finn: safeNumber(document.getElementById("rewardTargetFinn")?.value)
    };
    const activeKids = Object.entries(targets).filter(([, v]) => v > 0);
    if (!activeKids.length) { alert("Bitte mindestens ein Kind-Ziel eintragen."); return; }

    rewardData = {
      id, title,
      target: 0,
      targets,
      images: [img1, img2, img3].filter(Boolean),
      active: true,
      visibleFor: "ALL+",
      contributions: { Luna: 0, Milo: 0, Finn: 0 },
      ready: { Luna: false, Milo: false, Finn: false }
    };
  } else {
    const target = safeNumber(document.getElementById("rewardGoal")?.value);
    if (target <= 0) { alert("Bitte Punkte-Ziel eintragen."); return; }

    rewardData = {
      id, title, target,
      images: [img1, img2, img3].filter(Boolean),
      active: true,
      visibleFor,
      contributions: { Luna: 0, Milo: 0, Finn: 0 },
      ready: { Luna: false, Milo: false, Finn: false }
    };
  }

  await dbSet(`rewards/${id}`, rewardData);
  clearRewardForm();
  await loadRewards();
  renderRewardAdmin();
  alert("Reward gespeichert.");
}

/* ========================================
   STREAK
======================================== */

async function saveAdminStreak() {
  const child = document.getElementById("streakChild")?.value;
  const title = document.getElementById("streakTitle")?.value.trim() || "";
  const emoji = document.getElementById("streakEmoji")?.value.trim() || "";
  const goal = safeNumber(document.getElementById("streakGoal")?.value);
  const loot = safeNumber(document.getElementById("streakPoints")?.value);
  const bonus = safeNumber(document.getElementById("streakBonus")?.value);

  if (!child || !title || !emoji || goal <= 0) {
    alert("Bitte Kind, Titel, Emoji und Ziel eintragen.");
    return;
  }

  const id = `S${Date.now()}`;

  await dbSet(`streaks/${id}`, {
    id, child, title, emoji,
    current: 0, goal,
    lootPerClick: loot,
    bonusLoot: bonus,
    active: true,
    completed: 0
  });

  clearStreakForm();
  await loadStreaks();
  await loadKids();
  alert("Streak gespeichert.");
}

/* ========================================
   ÜBERSICHT
======================================== */

export function renderAdminOverview() {
  const box = document.getElementById("adminOverview");
  if (!box) return;

  const kids = Object.values(state.kidsData);
  if (!kids.length) { box.innerHTML = `<div class="loading">Keine Daten.</div>`; return; }

  box.innerHTML = kids.map(kid => {
    const slots = kid.slots || [];
    const freie = slots.filter(v => v <= 0).length;
    const belegt = slots.filter(v => v > 0).length;
    return `
      <div class="card">
        <div class="top">
          <div class="name">${kid.name}</div>
          <div class="points">⭐ ${kid.points}</div>
        </div>
        <div class="info">🎁 Offen: ${kid.unclaimed} &nbsp;|&nbsp; 🟢 Slots frei: ${freie} / ${slots.length}</div>
        <div class="bar-bg">
          <div class="bar" style="width:${Math.round((belegt / Math.max(slots.length,1)) * 100)}%">${belegt} belegt</div>
        </div>
      </div>
    `;
  }).join("");
}

/* ========================================
   HISTORY
======================================== */

export async function logHistory(child, amount, reason) {
  const id = `H${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
  const now = new Date().toLocaleString("de-DE");
  await dbSet(`history/${child}/${id}`, { id, child, amount, reason, date: now });
}

async function loadHistory() {
  const child = document.getElementById("historyChild")?.value;
  const box = document.getElementById("historyList");
  if (!box || !child) return;

  box.innerHTML = `<div class="loading">Lade...</div>`;

  const data = await dbGet(`history/${child}`);
  if (!data) { box.innerHTML = `<div class="loading">Keine Einträge.</div>`; return; }

  const entries = Object.values(data).sort((a, b) => b.id.localeCompare(a.id));

  box.innerHTML = entries.slice(0, 50).map(e => `
    <div class="card" style="padding:8px 12px">
      <div style="display:flex; justify-content:space-between">
        <span>${e.reason}</span>
        <span>+${e.amount} ⭐</span>
      </div>
      <div style="font-size:0.8em; opacity:0.6">${e.date}</div>
    </div>
  `).join("");
}

/* ========================================
   REWARD ARCHIV
======================================== */

export function renderRewardArchive() {
  const box = document.getElementById("rewardArchiveList");
  if (!box) return;

  const archived = Object.values(state.rewardsData).filter(r => !r.active);

  if (!archived.length) {
    box.innerHTML = `<div class="loading">Keine archivierten Rewards.</div>`;
    return;
  }

  box.innerHTML = archived.map(r => `
    <div class="card">
      <div class="top">
        <div class="name">${r.title}</div>
        <div class="points">${r.target || "ALL+"} ⭐</div>
      </div>
      <div class="info">Typ: ${r.visibleFor}</div>
      <button class="save" data-reactivate="${r.id}">✅ Reaktivieren</button>
    </div>
  `).join("");

  box.querySelectorAll("[data-reactivate]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await dbUpdate(`rewards/${btn.dataset.reactivate}`, { active: true });
      await loadRewards();
      renderRewardArchive();
    });
  });
}

/* ========================================
   PUNKTE-VERLAUF CHART
======================================== */

export async function renderPointsChart() {
  const canvas = document.getElementById("pointsChart");
  const noData = document.getElementById("chartNoData");
  if (!canvas) return;

  // Letzte 7 Tage aufbauen
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }));
  }

  // History aller Kinder laden
  const children = ["Luna", "Milo", "Finn"];
  const colors = { Luna: "#ff4fd8", Milo: "#4da6ff", Finn: "#5bff95" };
  const datasets = {};

  for (const child of children) {
    const data = await dbGet(`history/${child}`);
    const byDay = {};
    days.forEach(d => byDay[d] = 0);

    if (data) {
      Object.values(data).forEach(e => {
        const date = e.date?.split(",")[0]?.trim();
        if (date && byDay[date] !== undefined) {
          byDay[date] += safeNumber(e.amount);
        }
      });
    }

    datasets[child] = days.map(d => byDay[d]);
  }

  const hasAnyData = children.some(c => datasets[c].some(v => v > 0));

  if (!hasAnyData) {
    canvas.style.display = "none";
    if (noData) noData.style.display = "block";
    return;
  }

  canvas.style.display = "block";
  if (noData) noData.style.display = "none";

  // Einfacher Canvas-Chart ohne externe Library
  const ctx = canvas.getContext("2d");
  const W = canvas.offsetWidth || 320;
  const H = 200;
  canvas.width = W;
  canvas.height = H;

  const pad = { top: 20, right: 16, bottom: 40, left: 36 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const allValues = children.flatMap(c => datasets[c]);
  const maxVal = Math.max(...allValues, 1);

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(0, 0, W, H);

  // Gitterlinien
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "10px sans-serif";
    ctx.fillText(Math.round(maxVal - (maxVal / 4) * i), 2, y + 4);
  }

  // X-Achse Labels
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "center";
  days.forEach((day, i) => {
    const x = pad.left + (chartW / (days.length - 1)) * i;
    ctx.fillText(day, x, H - 8);
  });

  // Linien pro Kind
  children.forEach(child => {
    const vals = datasets[child];
    ctx.beginPath();
    ctx.strokeStyle = colors[child];
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";

    vals.forEach((v, i) => {
      const x = pad.left + (chartW / (days.length - 1)) * i;
      const y = pad.top + chartH - (v / maxVal) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Punkte
    vals.forEach((v, i) => {
      const x = pad.left + (chartW / (days.length - 1)) * i;
      const y = pad.top + chartH - (v / maxVal) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = colors[child];
      ctx.fill();
    });
  });

  // Legende
  ctx.textAlign = "left";
  children.forEach((child, i) => {
    const lx = pad.left + (chartW / 3) * i;
    ctx.fillStyle = colors[child];
    ctx.fillRect(lx, H - 26, 12, 3);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "10px sans-serif";
    ctx.fillText(child, lx + 16, H - 22);
  });
}

/* ========================================
   RENDER ADMIN
======================================== */

export function renderRewardAdmin() {
  renderPurchases();
  renderAdminOverview();
  renderRewardArchive();
}

/* ========================================
   CLEAR FORMS
======================================== */

function clearRewardForm() {
  ["rewardTitle", "rewardGoal", "rewardImage1", "rewardImage2", "rewardImage3",
   "rewardTargetLuna", "rewardTargetMilo", "rewardTargetFinn"]
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
}

function clearStreakForm() {
  ["streakTitle", "streakEmoji", "streakGoal", "streakPoints", "streakBonus"]
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
}
