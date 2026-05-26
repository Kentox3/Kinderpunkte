import { api } from "./api.js";

import {
  SHEETS,
  rewardsStartRow,
  rewardsEndRow,
  kidsConfig
} from "./config.js";

import { state } from "./state.js";

import { safeNumber } from "./utils.js";

import { createPurchase } from "./purchases.js";
import { loadKids } from "./kids.js";

export async function loadRewards() {
  const res = await api("getRange", {
    sheet: SHEETS.rewards,
    range: `A${rewardsStartRow}:N${rewardsEndRow}`
  });

  state.rewardsData = (res.values || [])
    .map((row, index) => ({
      row: rewardsStartRow + index,
      id: row[0],
      title: row[1],
      target: safeNumber(row[2]),
      images: [row[3], row[4], row[5]].filter(Boolean),
      active:
        String(row[6]).toUpperCase() !== "FALSE" &&
        !!row[1],
      visibleFor: row[7] || "ALL",
      Luna: safeNumber(row[8]),
      Milo: safeNumber(row[9]),
      Finn: safeNumber(row[10]),
      LunaReady: String(row[11]).toUpperCase() === "TRUE",
      MiloReady: String(row[12]).toUpperCase() === "TRUE",
      FinnReady: String(row[13]).toUpperCase() === "TRUE"
    }))
    .filter(reward => reward.title);

  renderRewards();
}

function showRewardOverlay(reward, title, subtitle) {
  const overlay =
    document.getElementById("rewardOverlay");

  const text =
    document.getElementById("rewardOverlayText");

  if (!overlay || !text) {
    return;
  }

  const image =
    reward.images?.[0] || "";

  overlay.classList.remove("streak-fire");

  text.innerHTML = `
    <div class="big-reward-show">
      ${
        image
          ? `<img src="${image}" class="big-reward-img">`
          : ""
      }

      <div>${title}</div>

      <small>
        ${reward.title}<br>
        ${subtitle}
      </small>
    </div>
  `;

  overlay.classList.add("visible");

  setTimeout(() => {
    overlay.classList.remove("visible");
  }, 5600);
}