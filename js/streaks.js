import { api } from "./api.js";

import {
  SHEETS,
  streaksStartRow,
  streaksEndRow
} from "./config.js";

import { state } from "./state.js";

import {
  safeNumber,
  lootCell,
  countOpen
} from "./utils.js";

import { loadKids } from "./kids.js";

export async function loadStreaks() {
  const res = await api("getRange", {
    sheet: SHEETS.streaks,
    range: `A${streaksStartRow}:J${streaksEndRow}`
  });

  state.streaksData = (res.values || [])
    .map((row, index) => ({
      row: streaksStartRow + index,
      id: row[0],
      child: row[1],
      title: row[2],
      emoji: row[3],
      current: safeNumber(row[4]),
      goal: safeNumber(row[5]),
      lootPerClick: safeNumber(row[6]),
      bonusLoot: safeNumber(row[7]),
      active:
        String(row[8]).toUpperCase() !== "FALSE" &&
        !!row[2],
      completed: safeNumber(row[9])
    }))
    .filter(streak => streak.title);
}

export function getStreaksForChild(child) {
  return state.streaksData.filter(
    streak =>
      streak.active &&
      streak.child === child
  );
}

export function renderStreakDots(streak) {
  let html = "";

  for (let i = 1; i <= streak.goal; i++) {
    html += i <= streak.current ? "🔥" : "⚫";
  }

  return html;
}

export function initChildAdminEvents() {
  document
    .getElementById("closeChildAdminButton")
    ?.addEventListener("click", closeChildAdmin);

  document
    .getElementById("childLootButton")
    ?.addEventListener("click", addLootForSelectedChild);

  document
    .getElementById("saveStreakButton")
    ?.addEventListener("click", saveStreak);
}

export function openChildAdmin(child) {
  if (state.unlockedChild !== "ADMIN") {
    return;
  }

  state.selectedAdminChild = child;

  document.getElementById("childAdminTitle").textContent =
    `${child} verwalten`;

  document
    .getElementById("childAdminOverlay")
    .classList.add("visible");

  renderChildAdminStreaks();
}

export function closeChildAdmin() {
  document
    .getElementById("childAdminOverlay")
    .classList.remove("visible");

  state.selectedAdminChild = null;
}

function renderChildAdminStreaks() {
  const box = document.getElementById("childStreakList");
  const child = state.selectedAdminChild;

  const streaks = getStreaksForChild(child);

  if (!streaks.length) {
    box.innerHTML = `
      <div class="loading">
        Keine Streaks vorhanden.
      </div>
    `;
    return;
  }

  box.innerHTML = streaks.map(streak => `
    <div class="card">
      <b>${streak.emoji} ${streak.title}</b>

      <div class="info">
        ${renderStreakDots(streak)}
      </div>

      <div class="info">
        ${streak.current} / ${streak.goal}
        · Loot ${streak.lootPerClick}
        · Bonus ${streak.bonusLoot}
      </div>

      <div class="info">
        Abgeschlossen: ${streak.completed}x
      </div>

      <button
        class="plus"
        data-streak-plus="${streak.row}"
        ${streak.current >= streak.goal ? "disabled" : ""}
      >
        ➕ ${streak.emoji}
      </button>
    </div>
  `).join("");

  document
    .querySelectorAll("[data-streak-plus]")
    .forEach(button => {
      button.addEventListener("click", () => {
        increaseStreak(Number(button.dataset.streakPlus));
      });
    });
}

async function addLootToChild(child, amount) {
  if (!child || amount <= 0) {
    return true;
  }

  const kid = state.kidsData.find(k => k.name === child);

  if (!kid) {
    return false;
  }

  const slots = [...kid.slots];
  const free = slots.findIndex(value => value <= 0);

  if (free === -1) {
    return false;
  }

  slots[free] = amount;

  await api("setMany", {
    sheet: SHEETS.kids,
    data: [
      {
        cell: lootCell(kid.row, free),
        value: amount
      },
      {
        cell: `C${kid.row}`,
        value: countOpen(slots)
      }
    ]
  });

  return true;
}

function showStreakBonusOverlay(amount) {
  const overlay =
    document.getElementById("rewardOverlay");

  const text =
    document.getElementById("rewardOverlayText");

  if (!overlay || !text) {
    return;
  }

  overlay.classList.add("streak-fire");

  text.innerHTML = `
    🔥 +${amount} StreakBonus
  `;

  overlay.classList.add("visible");

  setTimeout(() => {
    overlay.classList.remove("visible");
    overlay.classList.remove("streak-fire");
  }, 4800);
}