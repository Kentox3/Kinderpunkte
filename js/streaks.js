import { dbGet, dbSet, dbUpdate } from "./firebase.js";
import { state } from "./state.js";
import { safeNumber } from "./utils.js";
import { loadKids } from "./kids.js";

/* ========================================
   LOAD
======================================== */

export async function loadStreaks() {
  const data = await dbGet("streaks");
  state.streaksData = data || {};
}

/* ========================================
   HELPERS
======================================== */

export function getStreaksForChild(child) {
  return Object.values(state.streaksData).filter(
    s => s.active && s.child === child
  );
}

export function renderStreakDots(streak) {
  let html = "";
  for (let i = 1; i <= streak.goal; i++) {
    html += i <= streak.current ? "🔥" : "⚫";
  }
  return html;
}

/* ========================================
   CHILD ADMIN
======================================== */

export function initChildAdminEvents() {
  document.getElementById("closeChildAdminButton")
    ?.addEventListener("click", closeChildAdmin);

  document.getElementById("childLootButton")
    ?.addEventListener("click", addLootForSelectedChild);

  document.getElementById("saveStreakButton")
    ?.addEventListener("click", saveStreak);
}

export function openChildAdmin(child) {
  if (state.unlockedChild !== "ADMIN") return;

  state.selectedAdminChild = child;
  document.getElementById("childAdminTitle").textContent = `${child} verwalten`;
  document.getElementById("childAdminOverlay")?.classList.add("visible");
  renderChildAdminStreaks();
}

export function closeChildAdmin() {
  document.getElementById("childAdminOverlay")?.classList.remove("visible");
  state.selectedAdminChild = null;
}

function renderChildAdminStreaks() {
  const box = document.getElementById("childStreakList");
  const child = state.selectedAdminChild;
  if (!box || !child) return;

  const streaks = getStreaksForChild(child);

  if (!streaks.length) {
    box.innerHTML = `<div class="loading">Keine Streaks vorhanden.</div>`;
    return;
  }

  box.innerHTML = streaks.map(streak => `
    <div class="card">
      <b>${streak.emoji} ${streak.title}</b>
      <div class="info">${renderStreakDots(streak)}</div>
      <div class="info">${streak.current} / ${streak.goal} · Loot ${streak.lootPerClick} · Bonus ${streak.bonusLoot}</div>
      <div class="info">Abgeschlossen: ${streak.completed}x</div>
      <button class="plus" data-streak-plus="${streak.id}" ${streak.current >= streak.goal ? "disabled" : ""}>
        ➕ ${streak.emoji}
      </button>
    </div>
  `).join("");

  document.querySelectorAll("[data-streak-plus]").forEach(btn => {
    btn.addEventListener("click", () => increaseStreak(btn.dataset.streakPlus));
  });
}

/* ========================================
   LOOT HELPER
======================================== */

async function addLootToChild(childName, amount) {
  if (!childName || amount <= 0) return true;

  const kid = state.kidsData[childName];
  if (!kid) return false;

  const slots = [...(kid.slots || new Array(20).fill(0))];
  const free = slots.findIndex(v => v <= 0);
  if (free === -1) return false;

  slots[free] = amount;
  const unclaimed = slots.filter(v => v > 0).length;

  await dbUpdate(`kids/${childName}`, { slots, unclaimed });
  return true;
}

async function addLootForSelectedChild() {
  const child = state.selectedAdminChild;
  const amount = safeNumber(document.getElementById("childLootAmount")?.value);

  if (!child || amount <= 0) { alert("Loot-Wert fehlt."); return; }

  await loadKids();
  const success = await addLootToChild(child, amount);

  if (!success) { alert("Keine freien Loot-Slots."); return; }

  await loadKids();
  alert(`${child}: +${amount} Loot erstellt.`);
}

/* ========================================
   INCREASE STREAK
======================================== */

async function increaseStreak(streakId) {
  const streak = state.streaksData[streakId];
  if (!streak) return;

  if (streak.current >= streak.goal) {
    alert("Streak ist voll. Das Kind kann jetzt den Bonus abholen.");
    return;
  }

  await loadKids();
  const clickLootOk = await addLootToChild(streak.child, streak.lootPerClick);
  if (!clickLootOk) { alert("Keine freien Loot-Slots für diese Streak."); return; }

  const nextCurrent = Math.min(streak.current + 1, streak.goal);
  await dbUpdate(`streaks/${streakId}`, { current: nextCurrent });

  await loadKids();
  await loadStreaks();
  renderChildAdminStreaks();
}

/* ========================================
   SAVE STREAK (Child Admin)
======================================== */

async function saveStreak() {
  const child = state.selectedAdminChild;
  const title = document.getElementById("streakTitle")?.value.trim() || "";
  const emoji = document.getElementById("streakEmoji")?.value.trim() || "";
  const goal = safeNumber(document.getElementById("streakGoal")?.value);
  const loot = safeNumber(document.getElementById("streakPoints")?.value);
  const bonus = safeNumber(document.getElementById("streakBonus")?.value);

  if (!child || !title || !emoji || goal <= 0) {
    alert("Bitte Titel, Emoji und Ziel eintragen.");
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

  document.getElementById("streakTitle").value = "";
  document.getElementById("streakEmoji").value = "";

  await loadStreaks();
  renderChildAdminStreaks();
}

/* ========================================
   CLAIM STREAK BONUS
======================================== */

export async function claimStreakBonus(streakId) {
  const streak = state.streaksData[streakId];
  if (!streak) return;

  if (state.unlockedChild !== streak.child) {
    alert("Du kannst nur deinen eigenen Streak-Bonus abholen.");
    return;
  }

  if (streak.current < streak.goal) {
    alert("Der Streak ist noch nicht voll.");
    return;
  }

  const kid = state.kidsData[streak.child];
  if (!kid) return;

  await dbUpdate(`kids/${streak.child}`, { points: kid.points + streak.bonusLoot });
  await dbUpdate(`streaks/${streakId}`, { current: 0, completed: streak.completed + 1 });

  showStreakBonusOverlay(streak.bonusLoot);

  await loadKids();
  await loadStreaks();
}

function showStreakBonusOverlay(amount) {
  const overlay = document.getElementById("rewardOverlay");
  const text = document.getElementById("rewardOverlayText");
  if (!overlay || !text) return;

  overlay.classList.add("streak-fire");
  text.innerHTML = `🔥 +${amount} StreakBonus`;
  overlay.classList.add("visible");

  setTimeout(() => {
    overlay.classList.remove("visible");
    overlay.classList.remove("streak-fire");
  }, 4800);
}
