import { api } from "./api.js";

import {
  SHEETS,
  rewardsStartRow,
  rewardsEndRow,
  kidsConfig
} from "./config.js";

import { state } from "./state.js";

import { safeNumber } from "./utils.js";

import {
  createPurchase
} from "./purchases.js";

import {
  loadKids
} from "./kids.js";

export async function loadRewards() {

  const res = await api(
    "getRange",
    {
      sheet: SHEETS.rewards,
      range:
        `A${rewardsStartRow}:K${rewardsEndRow}`
    }
  );

  state.rewardsData =
    (res.values || [])
      .map((row, index) => ({

        row:
          rewardsStartRow + index,

        id: row[0],

        title: row[1],

        target:
          safeNumber(row[2]),

        images: [
          row[3],
          row[4],
          row[5]
        ].filter(Boolean),

        active:
          String(row[6])
            .toUpperCase() !== "FALSE" &&
          !!row[1],

        visibleFor:
          row[7] || "ALL",

        Luna:
          safeNumber(row[8]),

        Milo:
          safeNumber(row[9]),

        Finn:
          safeNumber(row[10])

      }))
      .filter(reward =>
        reward.title
      );

  renderRewards();

}

export function renderRewards() {

  const container =
    document.getElementById(
      "rewardsContainer"
    );

  if (!container) {
    return;
  }

  const rewards =
    state.rewardsData.filter(
      reward => reward.active
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
    rewards.map(
      renderRewardCard
    ).join("");

  bindRewardButtons();

}

function renderRewardCard(
  reward
) {

  const total =
    reward.Luna +
    reward.Milo +
    reward.Finn;

  const percent =
    Math.min(
      100,
      (total / reward.target) * 100
    );

  const canBuy =
    total >= reward.target;

  const image =
    reward.images?.[0] || "";

  return `

    <div class="reward-card">

      <img
        class="reward-img"
        src="${image}"
      >

      <div>

        <div class="reward-title">
          ${reward.title}
        </div>

        <div class="bar-bg">

          <div
            class="bar"
            style="
              width:${percent}%
            "
          >
            ${total}
            /
            ${reward.target}
          </div>

        </div>

        <div class="reward-small">

          Luna:
          ${reward.Luna}
          ⭐

          <br>

          Milo:
          ${reward.Milo}
          ⭐

          <br>

          Finn:
          ${reward.Finn}
          ⭐

        </div>

        <div
          class="reward-controls"
        >

          ${
            renderRewardButtons(
              reward
            )
          }

          ${
            canBuy
              ? `
                <button
                  class="save"
                  data-buy-reward="${reward.row}"
                >
                  🎁 Kaufen
                </button>
              `
              : ""
          }

        </div>

      </div>

    </div>

  `;

}

function renderRewardButtons(
  reward
) {

  if (
    !state.unlockedChild ||
    state.unlockedChild === "ADMIN"
  ) {
    return "";
  }

  const child =
    state.unlockedChild;

  if (
    reward.visibleFor !== "ALL" &&
    reward.visibleFor !== child
  ) {
    return "";
  }

  return `

    <input
      type="number"
      value="5"
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
    .querySelectorAll(
      "[data-donate]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          donate(
            Number(
              button.dataset.donate
            )
          );

        }
      );

    });

  document
    .querySelectorAll(
      "[data-withdraw]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          withdraw(
            Number(
              button.dataset.withdraw
            )
          );

        }
      );

    });

  document
    .querySelectorAll(
      "[data-buy-reward]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          buyReward(
            Number(
              button.dataset.buyReward
            )
          );

        }
      );

    });

}

async function donate(
  rewardRow
) {

  const child =
    state.unlockedChild;

  const reward =
    state.rewardsData.find(
      r => r.row === rewardRow
    );

  if (!reward || !child) {
    return;
  }

  const input =
    document.getElementById(
      `rewardAmount-${rewardRow}`
    );

  const amount =
    safeNumber(input?.value);

  if (amount <= 0) {
    return;
  }

  const kid =
    state.kidsData.find(
      k => k.name === child
    );

  if (
    !kid ||
    kid.points < amount
  ) {

    alert(
      "Nicht genug Punkte."
    );

    return;

  }

  const col =
    kidsConfig[child]
      .contributionCol;

  await api(
    "setMany",
    {
      sheet: SHEETS.rewards,

      data: [

        {
          cell:
            `${col}${rewardRow}`,

          value:
            reward[child] + amount
        }

      ]

    }
  );

  await api(
    "setMany",
    {
      sheet: SHEETS.kids,

      data: [

        {
          cell:
            `B${kid.row}`,

          value:
            kid.points - amount
        }

      ]

    }
  );

  await loadKids();
  await loadRewards();

}

async function withdraw(
  rewardRow
) {

  const child =
    state.unlockedChild;

  const reward =
    state.rewardsData.find(
      r => r.row === rewardRow
    );

  if (!reward || !child) {
    return;
  }

  const input =
    document.getElementById(
      `rewardAmount-${rewardRow}`
    );

  const amount =
    safeNumber(input?.value);

  if (amount <= 0) {
    return;
  }

  if (
    reward[child] < amount
  ) {

    alert(
      "Du kannst nur deine eigenen Punkte zurücknehmen."
    );

    return;

  }

  const kid =
    state.kidsData.find(
      k => k.name === child
    );

  const col =
    kidsConfig[child]
      .contributionCol;

  await api(
    "setMany",
    {
      sheet: SHEETS.rewards,

      data: [

        {
          cell:
            `${col}${rewardRow}`,

          value:
            reward[child] - amount
        }

      ]

    }
  );

  await api(
    "setMany",
    {
      sheet: SHEETS.kids,

      data: [

        {
          cell:
            `B${kid.row}`,

          value:
            kid.points + amount
        }

      ]

    }
  );

  await loadKids();
  await loadRewards();

}

async function buyReward(
  rewardRow
) {

  const reward =
    state.rewardsData.find(
      r => r.row === rewardRow
    );

  if (!reward) {
    return;
  }

  const total =
    reward.Luna +
    reward.Milo +
    reward.Finn;

  if (
    total < reward.target
  ) {

    alert(
      "Belohnung noch nicht voll."
    );

    return;

  }

  const buyer =
    state.unlockedChild ||
    "Unbekannt";

  await createPurchase({

    reward,

    child: buyer,

    cost: reward.target

  });

  await api(
    "setMany",
    {
      sheet: SHEETS.rewards,

      data: [

        {
          cell:
            `I${rewardRow}`,
          value: 0
        },

        {
          cell:
            `J${rewardRow}`,
          value: 0
        },

        {
          cell:
            `K${rewardRow}`,
          value: 0
        }

      ]

    }
  );

  await loadRewards();

  alert(
    "🎁 Belohnung gekauft!"
  );

}