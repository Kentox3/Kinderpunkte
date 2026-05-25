import { api } from "./api.js";

import {
  kidsConfig,
  streaksStartRow,
  streaksEndRow
} from "./config.js";

import { state } from "./state.js";

import { loadKids } from "./kids.js";

export async function loadStreaks() {
  const res = await api("getRange", {
    range: `M${streaksStartRow}:U${streaksEndRow}`
  });

  state.streaksData = res.values
    .map((row, i) => ({
      row: streaksStartRow + i,
      id: row[0],
      child: row[1],
      title: row[2],
      emoji: row[3],
      current: Number(row[4]) || 0,
      goal: Number(row[5]) || 0,
      pointsPerClick: Number(row[6]) || 0,
      bonus: Number(row[7]) || 0,
      active: String(row[8]).toUpperCase() !== "FALSE" && !!row[2]
    }))
    .filter(streak => streak.title);
}

export function getStreaksForChild(child) {
  return state.streaksData.filter(
    streak => streak.active && streak.child === child
  );
}

export function renderStreakDots(streak) {
  let html = "";

  for (let i = 1; i <= streak.goal; i++) {
    html += i <= streak.current ? "🌟" : "⚫";
  }

  return html;
}

export function initChildAdminEvents() {
  document
    .getElementById("closeChildAdminButton")
    .addEventListener("click", closeChildAdmin);

  document
    .getElementById("childLootButton")
    .addEventListener("click", addLootForSelectedChild);

  document
    .getElementById("saveStreakButton")
    .addEventListener("click", saveStreak);
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
    box.innerHTML = `<div class="loading">Keine Streaks vorhanden.</div>`;
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
        · +${streak.pointsPerClick} pro Klick
        · Bonus ${streak.bonus}
      </div>

      <button
        class="plus"
        data-streak-plus="${streak.row}"
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

async function addLootForSelectedChild() {
  const child = state.selectedAdminChild;
  const amount =
    Number(document.getElementById("childLootAmount").value) || 0;

  if (!child || amount <= 0) {
    alert("Loot-Wert fehlt.");
    return;
  }

  const row = kidsConfig[child].row;

  const res = await api("getRange", {
    range: `D${row}:W${row}`
  });

  const slots = res.values[0].map(v => Number(v) || 0);
  const free = slots.findIndex(v => v <= 0);

  if (free === -1) {
    alert("Keine freien Loot-Slots.");
    return;
  }

  slots[free] = amount;

  await api("setMany", {
    data: [
      {
        cell: lootCell(row, free),
        value: amount
      },
      {
        cell: `C${row}`,
        value: slots.filter(v => v > 0).length
      }
    ]
  });

  await loadKids();

  alert(`${child}: +${amount} Loot erstellt.`);
}

function lootCell(row, index) {
  const columnNumber = 4 + index;
  let letter = "";
  let n = columnNumber;

  while (n > 0) {
    const r = (n - 1) % 26;
    letter = String.fromCharCode(65 + r) + letter;
    n = Math.floor((n - 1) / 26);
  }

  return `${letter}${row}`;
}

async function saveStreak() {
  const child = state.selectedAdminChild;

  const title =
    document.getElementById("streakTitle").value.trim();

  const emoji =
    document.getElementById("streakEmoji").value.trim();

  const goal =
    Number(document.getElementById("streakGoal").value) || 0;

  const points =
    Number(document.getElementById("streakPoints").value) || 0;

  const bonus =
    Number(document.getElementById("streakBonus").value) || 0;

  if (!child || !title || !emoji || goal <= 0) {
    alert("Bitte Titel, Emoji und Ziel eintragen.");
    return;
  }

  const usedRows =
    state.streaksData.map(streak => streak.row);

  let row = null;

  for (let r = streaksStartRow; r <= streaksEndRow; r++) {
    if (!usedRows.includes(r)) {
      row = r;
      break;
    }
  }

  if (!row) {
    alert("Keine freien Streak-Zeilen.");
    return;
  }

  await api("setRange", {
    range: `M${row}:U${row}`,
    values: [[
      `S${Date.now()}`,
      child,
      title,
      emoji,
      0,
      goal,
      points,
      bonus,
      true
    ]]
  });

  document.getElementById("streakTitle").value = "";
  document.getElementById("streakEmoji").value = "";

  await loadStreaks();

  renderChildAdminStreaks();
}

async function increaseStreak(row) {
  const streak =
    state.streaksData.find(s => s.row === row);

  if (!streak) {
    return;
  }

  const child = streak.child;
  const kidRow = kidsConfig[child].row;

  const kidRes = await api("getRange", {
    range: `B${kidRow}:B${kidRow}`
  });

  const currentPoints =
    Number(kidRes.values[0][0]) || 0;

  let nextCurrent = streak.current + 1;
  let pointsToAdd = streak.pointsPerClick;

  if (nextCurrent >= streak.goal) {
    pointsToAdd += streak.bonus;
    nextCurrent = 0;
  }

  await api("setMany", {
    data: [
      {
        cell: `B${kidRow}`,
        value: currentPoints + pointsToAdd
      },
      {
        cell: `Q${row}`,
        value: nextCurrent
      }
    ]
  });

  await loadKids();
  await loadStreaks();

  renderChildAdminStreaks();
}