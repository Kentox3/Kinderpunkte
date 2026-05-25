import { api } from "./api.js";

import {
  kidsConfig,
  streaksStartRow,
  streaksEndRow
} from "./config.js";

import { state } from "./state.js";

import {
  safeNumber,
  lootCell
} from "./utils.js";

async function refreshKids() {
  const module = await import("./kids.js");
  await module.loadKids();
}

export async function loadStreaks() {
  const res = await api("getRange", {
    range: `O${streaksStartRow}:W${streaksEndRow}`
  });

  state.streaksData = res.values
    .map((row, i) => ({
      row: streaksStartRow + i,
      id: row[0],
      child: row[1],
      title: row[2],
      emoji: row[3],
      current: safeNumber(row[4]),
      goal: safeNumber(row[5]),
      pointsPerClick: safeNumber(row[6]),
      bonus: safeNumber(row[7]),
      active:
        String(row[8]).toUpperCase() !== "FALSE" &&
        !!row[2]
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

  const amount = safeNumber(
    document.getElementById("childLootAmount").value
  );

  if (!child || amount <= 0) {
    alert("Loot-Wert fehlt.");
    return;
  }

  const row = kidsConfig[child].row;

  const res = await api("getRange", {
    range: `D${row}:W${row}`
  });

  const slots = (res.values?.[0] || [])
    .map(value => safeNumber(value));

  const free = slots.findIndex(value => value <= 0);

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
        value: slots.filter(value => value > 0).length
      }
    ]
  });

  await refreshKids();

  alert(`${child}: +${amount} Loot erstellt.`);
}

async function saveStreak() {
  const child = state.selectedAdminChild;

  const title =
    document.getElementById("streakTitle").value.trim();

  const emoji =
    document.getElementById("streakEmoji").value.trim();

  const goal = safeNumber(
    document.getElementById("streakGoal").value
  );

  const points = safeNumber(
    document.getElementById("streakPoints").value
  );

  const bonus = safeNumber(
    document.getElementById("streakBonus").value
  );

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
    range: `O${row}:W${row}`,
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

  const freshKidPoints = await api("get", {
    cell: `B${kidRow}`
  });

  const currentPoints = safeNumber(freshKidPoints.value);

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
        cell: `S${row}`,
        value: nextCurrent
      }
    ]
  });

  await refreshKids();
  await loadStreaks();

  renderChildAdminStreaks();
}