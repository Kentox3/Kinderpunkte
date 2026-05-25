import { api } from "./api.js";

import {
  kidsConfig,
  rewardsStartRow,
  rewardsEndRow
} from "./config.js";

import { state } from "./state.js";

import { loadKids } from "./kids.js";

import { safeNumber } from "./utils.js";

export async function loadRewards() {
  const res = await api("getRange", {
    range: `A${rewardsStartRow}:K${rewardsEndRow}`
  });

  state.rewardsData = res.values
    .map((row, i) => ({
      row: rewardsStartRow + i,
      id: row[0],
      title: row[1],
      target: safeNumber(row[2]),
      images: [
        row[3],
        row[4],
        row[5]
      ].filter(Boolean),
      active:
        String(row[6]).toUpperCase() !== "FALSE" &&
        !!row[1],
      visibleFor: row[7] || "ALL",
      Luna: safeNumber(row[8]),
      Milo: safeNumber(row[9]),
      Finn: safeNumber(row[10])
    }))
    .filter(reward => reward.title);

  renderRewards();
}

function canSeeReward(reward) {
  if (state.unlockedChild === "ADMIN") {
    return true;
  }

  if (reward.visibleFor === "ALL") {
    return true;
  }

  return reward.visibleFor === state.unlockedChild;
}

export function renderRewards() {
  const rewardsContainer = document.getElementById("rewardsContainer");
  rewardsContainer.innerHTML = "";

  const visibleRewards = state.rewardsData.filter(
    reward =>
      reward.active &&
      canSeeReward(reward)
  );

  if (!visibleRewards.length) {
    rewardsContainer.innerHTML = `
      <div class="loading">
        Keine Belohnungen sichtbar.
      </div>
    `;

    return;
  }

  visibleRewards.forEach(reward => {
    const total =
      safeNumber(reward.Luna) +
      safeNumber(reward.Milo) +
      safeNumber(reward.Finn);

    const percent =
      reward.target > 0
        ? Math.min((total / reward.target) * 100, 100)
        : 0;

    const width =
      percent > 0
        ? Math.max(percent, 8)
        : 0;

    const image =
      reward.images.length
        ? reward.images[state.slideTick % reward.images.length]
        : "";

    const card = document.createElement("div");