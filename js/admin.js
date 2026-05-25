import { api } from "./api.js";

import {
  SHEETS,
  rewardsStartRow,
  rewardsEndRow,
  streaksStartRow,
  streaksEndRow
} from "./config.js";

import { state } from "./state.js";

import { safeNumber } from "./utils.js";

import { loadKids } from "./kids.js";
import { loadRewards } from "./rewards.js";
import { loadStreaks } from "./streaks.js";
import { renderPurchases } from "./purchases.js";

export function initAdminEvents() {
  document
    .getElementById("adminLootButton")
    ?.addEventListener("click", giveAdminLoot);

  document
    .getElementById("saveRewardButton")
    ?.addEventListener("click", saveReward);

  document
    .getElementById("saveStreakButton")
    ?.addEventListener("click", saveAdminStreak);
}

async function giveAdminLoot() {
  const child =
    document.getElementById("adminLootChild")?.value;

  const amount = safeNumber(
    document.getElementById("adminLootAmount")?.value
  );

  if (!child || amount <= 0) {
    alert("Bitte Kind und Loot-Wert auswählen.");
    return;
  }

  const kid =
    state.kidsData.find(k => k.name === child);

  if (!kid) {
    alert("Kind nicht gefunden.");
    return;
  }

  const slots = [...kid.slots];
  const free = slots.findIndex(value => value <= 0);

  if (free === -1) {
    alert("Keine freien Loot-Slots.");
    return;
  }

  slots[free] = amount;

  const cell =
    columnToLetter(4 + free) + kid.row;

  await api("setMany", {
    sheet: SHEETS.kids,
    data: [
      {
        cell,
        value: amount
      },
      {
        cell: `C${kid.row}`,
        value: slots.filter(value => value > 0).length
      }
    ]
  });

  await loadKids();

  alert(`${child}: +${amount} Loot erstellt.`);
}

export async function saveReward() {
  const title =
    document.getElementById("rewardTitle")?.value.trim() || "";

  const target = safeNumber(
    document.getElementById("rewardGoal")?.value
  );

  const img1 =
    document.getElementById("rewardImage1")?.value.trim() || "";

  const img2 =
    document.getElementById("rewardImage2")?.value.trim() || "";

  const img3 =
    document.getElementById("rewardImage3")?.value.trim() || "";

  const visibleFor =
    document.getElementById("rewardVisibleFor")?.value || "ALL";

  if (!title || target <= 0) {
    alert("Bitte Reward-Titel und Punkte eintragen.");
    return;
  }

  const usedRows =
    state.rewardsData.map(reward => reward.row);

  let row = null;

  for (let r = rewardsStartRow; r <= rewardsEndRow; r++) {
    if (!usedRows.includes(r)) {
      row = r;
      break;
    }
  }

  if (!row) {
    alert("Keine freien Reward-Zeilen.");
    return;
  }

  await api("setRange", {
    sheet: SHEETS.rewards,
    range: `A${row}:K${row}`,
    values: [[
      `R${Date.now()}`,
      title,
      target,
      img1,
      img2,
      img3,
      true,
      visibleFor,
      0,
      0,
      0
    ]]
  });

  clearRewardForm();

  await loadRewards();
  renderRewardAdmin();

  alert("Reward gespeichert.");
}

async function saveAdminStreak() {
  const child =
    document.getElementById("streakChild")?.value;

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
    alert("Bitte Kind, Titel, Emoji und Ziel eintragen.");
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

  clearStreakForm();

  await loadStreaks();
  await loadKids();

  alert("Streak gespeichert.");
}

export function renderRewardAdmin() {
  renderPurchases();
}

function clearRewardForm() {
  document.getElementById("rewardTitle").value = "";
  document.getElementById("rewardGoal").value = "";
  document.getElementById("rewardImage1").value = "";
  document.getElementById("rewardImage2").value = "";
  document.getElementById("rewardImage3").value = "";
}

function clearStreakForm() {
  document.getElementById("streakTitle").value = "";
  document.getElementById("streakEmoji").value = "";
  document.getElementById("streakGoal").value = "";
  document.getElementById("streakPoints").value = "";
  document.getElementById("streakBonus").value = "";
}

function columnToLetter(column) {
  let temp = "";
  let letter = "";

  while (column > 0) {
    temp = (column - 1) % 26;

    letter =
      String.fromCharCode(temp + 65) + letter;

    column =
      (column - temp - 1) / 26;
  }

  return letter;
}