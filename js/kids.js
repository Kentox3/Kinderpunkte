import { dbGet, dbUpdate, dbSet } from "./firebase.js";
import { state } from "./state.js";
import { kidsConfig, lootSlots, maxPoints } from "./config.js";
import { getStreaksForChild, renderStreakDots, openChildAdmin, claimStreakBonus } from "./streaks.js";
import { renderPurchaseNoticeForChild } from "./purchases.js";
import { logHistory } from "./admin.js";
import { showOverlay } from "./utils.js";

/* ========================================
   LOAD
======================================== */

export async function loadKids() {
  const data = await dbGet("kids");
  state.kidsData = data || {};
  renderKids();
}

/* ========================================
   RENDER
======================================== */

export function renderKids() {
  const container = document.getElementById("kidsContainer");
  if (!container) return;

  const kids = Object.values(state.kidsData);
  container.innerHTML = kids.map(renderKidCard).join("");
  bindKidButtons();
}

function renderKidCard(kid) {
  const percent = maxPoints > 0
    ? Math.min(100, (kid.points / maxPoints) * 100)
    : 0;

  const streaks = getStreaksForChild(kid.name);
  const canOpenLoot = state.unlockedChild === kid.name;

  return `
    <div class="card ${kidsConfig[kid.name]?.className || ""}">
      <div class="top">
        <div class="name">${kid.name}</div>
        <div class="points">⭐ ${kid.points}</div>
      </div>

      <div class="bar-bg">
        <div class="bar" style="width:${percent}%">${kid.points}</div>
      </div>

      <div class="info">🎁 Offen: ${kid.unclaimed}</div>

      ${renderPurchaseNoticeForChild(kid.name)}

      ${streaks.length ? `
        <hr>
        ${streaks.map(streak => `
          <div class="info">
            <b>${streak.emoji} ${streak.title}</b>
            <br>
            ${renderStreakDots(streak)}
            <br>
            ${streak.current}/${streak.goal}
            ${state.unlockedChild === kid.name && streak.current >= streak.goal ? `
              <br><br>
              <button class="flame-button" data-claim-streak="${streak.id}">
                🔥 Bonus abholen
              </button>
            ` : ""}
          </div>
        `).join("")}
      ` : ""}

      <div class="reward-controls">
        ${canOpenLoot ? `
          <button
            class="chest-button open"
            data-open-loot="${kid.name}"
            ${kid.unclaimed <= 0 ? "disabled" : ""}
          >
            🎁 Öffnen
          </button>
        ` : ""}

        ${state.unlockedChild === "ADMIN" ? `
          <button class="save" data-open-admin-child="${kid.name}">
            ⚙️ Verwalten
          </button>
        ` : ""}
      </div>
    </div>
  `;
}

function bindKidButtons() {
  document.querySelectorAll("[data-open-loot]").forEach(btn => {
    btn.addEventListener("click", () => openLoot(btn.dataset.openLoot));
  });

  document.querySelectorAll("[data-open-admin-child]").forEach(btn => {
    btn.addEventListener("click", () => openChildAdmin(btn.dataset.openAdminChild));
  });

  document.querySelectorAll("[data-claim-streak]").forEach(btn => {
    btn.addEventListener("click", () => claimStreakBonus(btn.dataset.claimStreak));
  });
}

/* ========================================
   OPEN LOOT
======================================== */

export async function openLoot(childName) {
  if (state.unlockedChild !== childName) {
    alert("Du kannst nur deine eigene Belohnung öffnen.");
    return;
  }

  const kid = state.kidsData[childName];
  if (!kid) return;

  const slots = [...(kid.slots || [])];

  // Letzten befüllten Slot finden (von hinten)
  let realIndex = -1;
  for (let i = slots.length - 1; i >= 0; i--) {
    if (slots[i] > 0) {
      realIndex = i;
      break;
    }
  }

  if (realIndex === -1) {
    await loadKids();
    return;
  }

  const reward = slots[realIndex];
  slots[realIndex] = 0;

  const newPoints = kid.points + reward;
  const newUnclaimed = slots.filter(v => v > 0).length;

  await dbUpdate(`kids/${childName}`, {
    points: newPoints,
    unclaimed: newUnclaimed,
    slots
  });

  await logHistory(childName, reward, "Loot geöffnet");
  showOverlay({ text: `⭐ +${reward} Punkte` });
  await loadKids();
}

