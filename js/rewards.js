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

      LunaReady:
        String(row[11]).toUpperCase() === "TRUE",

      MiloReady:
        String(row[12]).toUpperCase() === "TRUE",

      FinnReady:
        String(row[13]).toUpperCase() === "TRUE"
    }))
    .filter(reward => reward.title);

  renderRewards();
}

function isFamilyReward(reward) {
  return reward.visibleFor === "ALL";
}

function canSeeReward(reward) {
  if (state.unlockedChild === "ADMIN") {
    return true;
  }

  if (isFamilyReward(reward)) {
    return true;
  }

  return reward.visibleFor === state.unlockedChild;
}

function isRealChild() {
  return ["Luna", "Milo", "Finn"].includes(
    state.unlockedChild
  );
}

function totalRewardPoints(reward) {
  return (
    reward.Luna +
    reward.Milo +
    reward.Finn
  );
}

function childContribution(reward, child) {
  return safeNumber(reward[child]);
}

function childReady(reward, child) {
  return reward[`${child}Ready`] === true;
}

function contributorChildren(reward) {
  return ["Luna", "Milo", "Finn"].filter(
    child =>
      childContribution(reward, child) > 0
  );
}

function allContributorsReady(reward) {
  const contributors =
    contributorChildren(reward);

  if (!contributors.length) {
    return false;
  }

  return contributors.every(
    child => childReady(reward, child)
  );
}

export function renderRewards() {
  const container =
    document.getElementById("rewardsContainer");

  if (!container) {
    return;
  }

  const rewards =
    state.rewardsData.filter(
      reward =>
        reward.active &&
        canSeeReward(reward)
    );

  if (!rewards.length) {
    container.innerHTML = `
      <div class="loading">
        Keine Belohnungen vorhanden.
      </div>
    `;
    return;
  }

  container.innerHTML =
    rewards.map(renderRewardCard).join("");

  bindRewardButtons();
}

function renderRewardCard(reward) {
  const total =
    totalRewardPoints(reward);

  const percent =
    reward.target > 0
      ? Math.min(
          100,
          (total / reward.target) * 100
        )
      : 0;

  const ready =
    total >= reward.target;

  const image =
    reward.images?.[
      state.slideTick %
        Math.max(reward.images.length, 1)
    ] || "";

  return `
    <div class="reward-card">

      <img
        class="reward-img"
        src="${image}"
        onerror="this.style.display='none'"
      >

      <div>

        <div class="reward-title">
          ${ready ? "🎉 " : ""}
          ${reward.title}
        </div>

        <div class="bar-bg">
          <div
            class="bar"
            style="width:${percent}%"
          >
            ${total}/${reward.target}
          </div>
        </div>

        <div class="reward-small">
          Luna: ${reward.Luna} ⭐
          ${reward.LunaReady ? "✅" : ""}
          <br>

          Milo: ${reward.Milo} ⭐
          ${reward.MiloReady ? "✅" : ""}
          <br>

          Finn: ${reward.Finn} ⭐
          ${reward.FinnReady ? "✅" : ""}
        </div>

        ${
          ready
            ? `
              <div class="purchase-notice">
                🎉 Ziel erreicht!
              </div>
            `
            : ""
        }

        <div class="reward-controls">
          ${renderRewardButtons(reward)}
        </div>

      </div>
    </div>
  `;
}

function renderRewardButtons(reward) {
  if (!isRealChild()) {
    return "";
  }

  if (!canSeeReward(reward)) {
    return "";
  }

  const child =
    state.unlockedChild;

  const total =
    totalRewardPoints(reward);

  const ready =
    total >= reward.target;

  if (isFamilyReward(reward)) {
    const contributed =
      childContribution(reward, child) > 0;

    return `
      ${
        !ready
          ? renderDonateButtons(reward)
          : ""
      }

      ${
        ready &&
        contributed &&
        !childReady(reward, child)
          ? `
            <button
              class="save"
              data-ready-reward="${reward.row}"
            >
              🎉 Kaufen bestätigen
            </button>
          `
          : ""
      }

      ${
        ready &&
        contributed &&
        childReady(reward, child)
          ? `
            <div class="purchase-notice">
              ✅ Du hast bestätigt
            </div>
          `
          : ""
      }
    `;
  }

  if (reward.visibleFor !== child) {
    return "";
  }

  return `
    ${
      !ready
        ? renderDonateButtons(reward)
        : `
          <button
            class="save"
            data-buy-reward="${reward.row}"
          >
            🎁 Kaufen
          </button>
        `
    }
  `;
}

function getRewardInputValue(row) {
  const existing =
    document.getElementById(
      `rewardAmount-${row}`
    );

  return existing?.value || 5;
}

function renderDonateButtons(reward) {
  return `
    <input
      type="number"
      value="${getRewardInputValue(reward.row)}"
      min="1"
      id="rewardAmount-${reward.row}"
    >

    <button
      class="plus"
      data-donate="${reward.row}"
    >
      ➕
    </button>

    <button
      class="minus"
      data-withdraw="${reward.row}"
    >
      ➖
    </button>
  `;
}

function bindRewardButtons() {
  document
    .querySelectorAll("[data-donate]")
    .forEach(button => {
      button.addEventListener("click", () => {
        donate(
          Number(button.dataset.donate)
        );
      });
    });

  document
    .querySelectorAll("[data-withdraw]")
    .forEach(button => {
      button.addEventListener("click", () => {
        withdraw(
          Number(button.dataset.withdraw)
        );
      });
    });

  document
    .querySelectorAll("[data-buy-reward]")
    .forEach(button => {
      button.addEventListener("click", () => {
        buyPrivateReward(
          Number(button.dataset.buyReward)
        );
      });
    });

  document
    .querySelectorAll("[data-ready-reward]")
    .forEach(button => {
      button.addEventListener("click", () => {
        confirmFamilyReward(
          Number(button.dataset.readyReward)
        );
      });
    });
}

async function donate(rewardRow) {
  if (
    state.isSaving ||
    state.rewardCooldown
  ) {
    return;
  }

  state.isSaving = true;

  startRewardCooldown();

  try {
    const child =
      state.unlockedChild;

    const reward =
      state.rewardsData.find(
        r => r.row === rewardRow
      );

    if (
      !reward ||
      !canSeeReward(reward)
    ) {
      throw new Error(
        "Diese Belohnung ist für dich nicht verfügbar."
      );
    }

    const input =
      document.getElementById(
        `rewardAmount-${rewardRow}`
      );

    const amount =
      safeNumber(input?.value);

    if (amount <= 0) {
      throw new Error(
        "Bitte Punkte eingeben."
      );
    }

    await loadKids();

    const kid =
      state.kidsData.find(
        k => k.name === child
      );

    if (
      !kid ||
      kid.points < amount
    ) {
      throw new Error(
        "Nicht genug Punkte."
      );
    }

    const col =
      kidsConfig[child]
        .contributionCol;

    await api("setMany", {
      sheet: SHEETS.rewards,
      data: [
        {
          cell: `${col}${rewardRow}`,
          value:
            reward[child] + amount
        },
        {
          cell: readyCell(
            child,
            rewardRow
          ),
          value: false
        }
      ]
    });

    await api("setMany", {
      sheet: SHEETS.kids,
      data: [
        {
          cell: `B${kid.row}`,
          value:
            kid.points - amount
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

async function withdraw(rewardRow) {
  if (
    state.isSaving ||
    state.rewardCooldown
  ) {
    return;
  }

  state.isSaving = true;

  startRewardCooldown();

  try {
    const child =
      state.unlockedChild;

    const reward =
      state.rewardsData.find(
        r => r.row === rewardRow
      );

    if (
      !reward ||
      !canSeeReward(reward)
    ) {
      throw new Error(
        "Diese Belohnung ist für dich nicht verfügbar."
      );
    }

    const input =
      document.getElementById(
        `rewardAmount-${rewardRow}`
      );

    const amount =
      safeNumber(input?.value);

    if (amount <= 0) {
      throw new Error(
        "Bitte Punkte eingeben."
      );
    }

    if (reward[child] < amount) {
      throw new Error(
        "Du kannst nur deine eigenen Punkte zurücknehmen."
      );
    }

    await loadKids();

    const kid =
      state.kidsData.find(
        k => k.name === child
      );

    const col =
      kidsConfig[child]
        .contributionCol;

    await api("setMany", {
      sheet: SHEETS.rewards,
      data: [
        {
          cell: `${col}${rewardRow}`,
          value:
            reward[child] - amount
        },
        {
          cell: readyCell(
            child,
            rewardRow
          ),
          value: false
        }
      ]
    });

    await api("setMany", {
      sheet: SHEETS.kids,
      data: [
        {
          cell: `B${kid.row}`,
          value:
            kid.points + amount
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

async function buyPrivateReward(
  rewardRow
) {
  const reward =
    state.rewardsData.find(
      r => r.row === rewardRow
    );

  if (!reward) {
    return;
  }

  await completeRewardPurchase(
    reward,
    state.unlockedChild
  );
}

async function confirmFamilyReward(
  rewardRow
) {
  const reward =
    state.rewardsData.find(
      r => r.row === rewardRow
    );

  if (!reward) {
    return;
  }

  const child =
    state.unlockedChild;

  if (
    childContribution(
      reward,
      child
    ) <= 0
  ) {
    alert(
      "Du hast nichts beigesteuert."
    );
    return;
  }

  await api("setMany", {
    sheet: SHEETS.rewards,
    data: [
      {
        cell: readyCell(
          child,
          rewardRow
        ),
        value: true
      }
    ]
  });

  await loadRewards();

  const updated =
    state.rewardsData.find(
      r => r.row === rewardRow
    );

  showRewardReachedOverlay(updated);

  if (
    allContributorsReady(updated)
  ) {
    await completeRewardPurchase(
      updated,
      contributorChildren(updated)
        .join(", ")
    );
  }
}

async function completeRewardPurchase(
  reward,
  buyer
) {
  const total =
    totalRewardPoints(reward);

  if (total < reward.target) {
    alert(
      "Belohnung noch nicht voll."
    );
    return;
  }

  await createPurchase({
    reward,
    child: buyer,
    cost: reward.target
  });

  await api("setMany", {
    sheet: SHEETS.rewards,
    data: [
      {
        cell: `I${reward.row}`,
        value: 0
      },
      {
        cell: `J${reward.row}`,
        value: 0
      },
      {
        cell: `K${reward.row}`,
        value: 0
      },
      {
        cell: `L${reward.row}`,
        value: false
      },
      {
        cell: `M${reward.row}`,
        value: false
      },
      {
        cell: `N${reward.row}`,
        value: false
      }
    ]
  });

  showRewardBoughtOverlay(
    reward
  );

  await loadRewards();
}

function readyCell(child, row) {
  const map = {
    Luna: "L",
    Milo: "M",
    Finn: "N"
  };

  return `${map[child]}${row}`;
}

function showRewardReachedOverlay(
  reward
) {
  showRewardOverlay(
    reward,
    "🎉 Geschafft!",
    "Die Belohnung ist erreicht!"
  );
}

function showRewardBoughtOverlay(
  reward
) {
  showRewardOverlay(
    reward,
    "🎁 Gekauft!",
    "Bitte warte auf deine Belohnung."
  );
}

function showRewardOverlay(
  reward,
  title,
  subtitle
) {
  const overlay =
    document.getElementById(
      "rewardOverlay"
    );

  const text =
    document.getElementById(
      "rewardOverlayText"
    );

  if (!overlay || !text) {
    return;
  }

  const image =
    reward.images?.[0] || "";

  overlay.classList.remove(
    "streak-fire"
  );

  text.innerHTML = `
    <div class="big-reward-show">

      ${
        image
          ? `
            <img
              src="${image}"
              class="big-reward-img"
            >
          `
          : ""
      }

      <div>
        ${title}
      </div>

      <small>
        ${reward.title}
        <br>
        ${subtitle}
      </small>

    </div>
  `;

  overlay.classList.add(
    "visible"
  );

  setTimeout(() => {
    overlay.classList.remove(
      "visible"
    );
  }, 5600);
}

function startRewardCooldown() {
  state.rewardCooldown = true;

  document
    .querySelectorAll(
      "[data-donate], [data-withdraw], [data-buy-reward], [data-ready-reward]"
    )
    .forEach(button => {
      button.disabled = true;
    });

  setTimeout(() => {
    state.rewardCooldown = false;

    document
      .querySelectorAll(
        "[data-donate], [data-withdraw], [data-buy-reward], [data-ready-reward]"
      )
      .forEach(button => {
        button.disabled = false;
      });
  }, 1200);
}