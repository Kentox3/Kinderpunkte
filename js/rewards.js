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
    card.className = "reward-card";

    card.innerHTML = `
      <img
        class="reward-img"
        src="${image}"
        onerror="this.style.display='none'"
      >

      <div>
        <div class="reward-title">
          ${reward.title}
        </div>

        <div class="bar-bg">
          <div
            class="bar"
            style="width:${width}%"
          >
            ${Math.round(percent)}%
          </div>
        </div>

        <div class="reward-small">
          ${total} / ${reward.target} Punkte
        </div>

        <div class="reward-small">
          Luna: ${reward.Luna}
          ·
          Milo: ${reward.Milo}
          ·
          Finn: ${reward.Finn}
        </div>

        <div class="reward-small">
          Sichtbar für: ${reward.visibleFor}
        </div>

        ${
          state.unlockedChild &&
          state.unlockedChild !== "ADMIN" &&
          state.unlockedChild !== "GAST"

            ? `
              <div class="reward-controls">
                <input
                  type="number"
                  min="1"
                  value="5"
                  id="amount-${reward.row}"
                >

                <button
                  class="plus reward-action"
                  data-donate="${reward.row}"
                >
                  +
                </button>

                <button
                  class="minus reward-action"
                  data-withdraw="${reward.row}"
                >
                  -
                </button>
              </div>
            `
            : ""
        }
      </div>
    `;

    rewardsContainer.appendChild(card);
  });

  document
    .querySelectorAll("[data-donate]")
    .forEach(button => {
      button.addEventListener("click", () => {
        donate(Number(button.dataset.donate));
      });
    });

  document
    .querySelectorAll("[data-withdraw]")
    .forEach(button => {
      button.addEventListener("click", () => {
        withdraw(Number(button.dataset.withdraw));
      });
    });
}

function setRewardButtonsDisabled(disabled) {
  document
    .querySelectorAll(".reward-action")
    .forEach(button => {
      button.disabled = disabled;
    });
}

function startCooldown() {
  state.rewardCooldown = true;

  setRewardButtonsDisabled(true);

  setTimeout(() => {
    state.rewardCooldown = false;
    setRewardButtonsDisabled(false);
  }, 5000);
}

export async function donate(row) {
  if (
    state.isSaving ||
    state.rewardCooldown
  ) {
    return;
  }

  state.isSaving = true;
  startCooldown();

  try {
    await loadKids();
    await loadRewards();

    const amount = safeNumber(
      document.getElementById(`amount-${row}`)?.value
    );

    if (amount <= 0) {
      throw new Error("Bitte Punkte eingeben.");
    }

    const child = kidsConfig[state.unlockedChild];
    const reward = state.rewardsData.find(
      r => r.row === row
    );

    if (!child || !reward) {
      throw new Error("Daten nicht gefunden.");
    }

    const freshKidPoints = await api("get", {
      cell: `B${child.row}`
    });

    const currentPoints = safeNumber(freshKidPoints.value);

    if (currentPoints < amount) {
      throw new Error("Nicht genug Punkte.");
    }

    const currentContribution =
      safeNumber(reward[state.unlockedChild]);

    await api("setMany", {
      data: [
        {
          cell: `B${child.row}`,
          value: currentPoints - amount
        },
        {
          cell: `${child.contributionCol}${row}`,
          value: currentContribution + amount
        }
      ]
    });

    await loadKids();
    await loadRewards();
  } catch (error) {
    alert(error.message);
  }

  state.isSaving = false;
}

export async function withdraw(row) {
  if (
    state.isSaving ||
    state.rewardCooldown
  ) {
    return;
  }

  state.isSaving = true;
  startCooldown();

  try {
    await loadKids();
    await loadRewards();

    const amount = safeNumber(
      document.getElementById(`amount-${row}`)?.value
    );

    if (amount <= 0) {
      throw new Error("Bitte Punkte eingeben.");
    }

    const child = kidsConfig[state.unlockedChild];
    const reward = state.rewardsData.find(
      r => r.row === row
    );

    if (!child || !reward) {
      throw new Error("Daten nicht gefunden.");
    }

    const currentContribution =
      safeNumber(reward[state.unlockedChild]);

    if (currentContribution < amount) {
      throw new Error(
        "Du kannst nur deine eigenen eingezahlten Punkte zurücknehmen."
      );
    }

    const freshKidPoints = await api("get", {
      cell: `B${child.row}`
    });

    const currentPoints = safeNumber(freshKidPoints.value);

    await api("setMany", {
      data: [
        {
          cell: `B${child.row}`,
          value: currentPoints + amount
        },
        {
          cell: `${child.contributionCol}${row}`,
          value: currentContribution - amount
        }
      ]
    });

    await loadKids();
    await loadRewards();
  } catch (error) {
    alert(error.message);
  }

  state.isSaving = false;
}