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

  await dbUpdate(`kids/${child}`, { slots, unclaimed });
  await loadKids();

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
      target: 0, // nicht genutzt bei ALL+
      targets,   // { Luna: 500, Milo: 300, Finn: 0 }
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
    id,
    child,
    title,
    emoji,
    current: 0,
    goal,
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
   RENDER ADMIN
======================================== */

export function renderRewardAdmin() {
  renderPurchases();
}

/* ========================================
   CLEAR FORMS
======================================== */

function clearRewardForm() {
  ["rewardTitle", "rewardGoal", "rewardImage1", "rewardImage2", "rewardImage3"]
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
}

function clearStreakForm() {
  ["streakTitle", "streakEmoji", "streakGoal", "streakPoints", "streakBonus"]
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
}
