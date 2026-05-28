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
    ?.classList.add("visible");

  renderChildAdminStreaks();
}

export function closeChildAdmin() {
  document
    .getElementById("childAdminOverlay")
    ?.classList.remove("visible");

  state.selectedAdminChild = null;
}

function renderChildAdminStreaks() {
  const box = document.getElementById("childStreakList");
  const child = state.selectedAdminChild;

  if (!box || !child) {
    return;
  }

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

  const kid =
    state.kidsData.find(k => k.name === child);

  if (!kid) {
    return false;
  }

  const res = await api("getRange", {
    sheet: SHEETS.kids,
    range: `D${kid.row}:W${kid.row}`
  });

  const slots =
    (res.values?.[0] || [])
      .map(safeNumber);

  const free =
    slots.findIndex(value => value <= 0);

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

async function addLootForSelectedChild() {
  const child =
    state.selectedAdminChild;

  const amount = safeNumber(
    document.getElementById("childLootAmount")?.value
  );

  if (!child || amount <= 0) {
    alert("Loot-Wert fehlt.");
    return;
  }

  const success =
    await addLootToChild(child, amount);

  if (!success) {
    alert("Keine freien Loot-Slots.");
    return;
  }

  await loadKids();

  alert(`${child}: +${amount} Loot erstellt.`);
}

async function saveStreak() {
  const child =
    state.selectedAdminChild;

  const title =
    document.getElementById("streakTitle")?.value.trim() || "";

  const emoji =
    document.getElementById("streakEmoji")?.value.trim() || "";

  const goal = safeNumber(
    document.getElementById("streakGoal")?.value
  );

  const loot = safeNumber(
    document.getElementById("streakPoints")?.value
  );

  const bonus = safeNumber(
    document.getElementById("streakBonus")?.value
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
    sheet: SHEETS.streaks,
    range: `A${row}:J${row}`,
    values: [[
      `S${Date.now()}`,
      child,
      title,
      emoji,
      0,
      goal,
      loot,
      bonus,
      true,
      0
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

  if (streak.current >= streak.goal) {
    alert("Streak ist voll. Das Kind kann jetzt den Bonus abholen.");
    return;
  }

  const clickLootOk =
    await addLootToChild(
      streak.child,
      streak.lootPerClick
    );

  if (!clickLootOk) {
    alert("Keine freien Loot-Slots für diese Streak.");
    return;
  }

  const nextCurrent =
    Math.min(streak.current + 1, streak.goal);

  await api("setMany", {
    sheet: SHEETS.streaks,
    data: [
      {
        cell: `E${row}`,
        value: nextCurrent
      }
    ]
  });

  await loadKids();
  await loadStreaks();

  renderChildAdminStreaks();
}

export async function claimStreakBonus(row) {
  const streak =
    state.streaksData.find(s => s.row === row);

  if (!streak) {
    return;
  }

  if (state.unlockedChild !== streak.child) {
    alert("Du kannst nur deinen eigenen Streak-Bonus abholen.");
    return;
  }

  if (streak.current < streak.goal) {
    alert("Der Streak ist noch nicht voll.");
    return;
  }

  const kid =
    state.kidsData.find(k => k.name === streak.child);

  if (!kid) {
    return;
  }

  const newPoints =
    kid.points + streak.bonusLoot;

  const completed =
    streak.completed + 1;

  await api("setMany", {
    sheet: SHEETS.kids,
    data: [
      {
        cell: `B${kid.row}`,
        value: newPoints
      }
    ]
  });

  await api("setMany", {
    sheet: SHEETS.streaks,
    data: [
      {
        cell: `E${row}`,
        value: 0
      },
      {
        cell: `J${row}`,
        value: completed
      }
    ]
  });

  showStreakBonusOverlay(streak.bonusLoot);

  await loadKids();
  await loadStreaks();
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