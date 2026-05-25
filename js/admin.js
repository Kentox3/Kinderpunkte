import { api } from "./api.js";

import {
  kidsConfig,
  rewardsStartRow,
  rewardsEndRow
} from "./config.js";

import { state } from "./state.js";

import {
  nextFree,
  lootCell,
  countOpen,
  safeNumber
} from "./utils.js";

import { loadKids } from "./kids.js";

import { loadRewards } from "./rewards.js";

export function initAdminEvents() {
  document
    .getElementById("giveLootButton")
    ?.addEventListener("click", giveLoot);

  document
    .getElementById("rewardSelect")
    ?.addEventListener("change", fillRewardForm);

  document
    .getElementById("saveRewardButton")
    ?.addEventListener("click", saveReward);

  document
    .getElementById("deactivateRewardButton")
    ?.addEventListener("click", deactivateReward);
}

export async function giveLoot() {
  const selected = [
    ...document.querySelectorAll('input[name="lootChild"]:checked')
  ].map(input => input.value);

  const amount = safeNumber(
    document.getElementById("lootAmount")?.value
  );

  if (!selected.length) {
    alert("Bitte mindestens ein Kind auswählen.");
    return;
  }

  if (amount <= 0) {
    alert("Bitte Loot-Wert eingeben.");
    return;
  }

  const updates = [];
  const messages = [];

  for (const name of selected) {
    const row = kidsConfig[name].row;

    const res = await api("getRange", {
      range: `D${row}:W${row}`
    });

    const slots = res.values[0].map(value => safeNumber(value));
    const free = nextFree(slots);

    if (free === -1) {
      messages.push(`${name}: keine freien Slots`);
      continue;
    }

    slots[free] = amount;

    updates.push({
      cell: lootCell(row, free),
      value: amount
    });

    updates.push({
      cell: `C${row}`,
      value: countOpen(slots)
    });

    messages.push(`${name}: +${amount} in U${free + 1}`);
  }

  if (updates.length) {
    await api("setMany", {
      data: updates
    });
  }

  document.getElementById("adminMessage").innerHTML = `
    <div class="success">
      ${messages.join("<br>")}
    </div>
  `;

  await loadKids();
}

export function renderRewardAdmin() {
  const select = document.getElementById("rewardSelect");

  if (!select) {
    return;
  }

  const currentValue = select.value;

  select.innerHTML = `
    <option value="">
      Neue Belohnung
    </option>
  `;

  state.rewardsData.forEach(reward => {
    select.innerHTML += `
      <option value="${reward.row}">
        ${reward.title}
      </option>
    `;
  });

  if (currentValue) {
    select.value = currentValue;
  }

  const info = document.getElementById("rewardAdminInfo");

  if (!info) {
    return;
  }

  if (!state.rewardsData.length) {
    info.innerHTML = "Noch keine Belohnungen.";
    return;
  }

  info.innerHTML = state.rewardsData.map(reward => {
    const total =
      safeNumber(reward.Luna) +