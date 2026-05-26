import { api } from "./api.js";

import {
  SHEETS,
  kidsConfig,
  lootSlots,
  maxPoints
} from "./config.js";

import { state } from "./state.js";

import {
  safeNumber,
  lootCell,
  countOpen
} from "./utils.js";

import {
  getStreaksForChild,
  renderStreakDots,
  openChildAdmin,
  claimStreakBonus
} from "./streaks.js";

import {
  renderPurchaseNoticeForChild
} from "./purchases.js";

export async function loadKids() {
  const res = await api("getRange", {
    sheet: SHEETS.kids,
    range: "A2:W4"
  });

  state.kidsData = (res.values || [])
    .map((row, index) => {
      const name = row[0];

      if (!name) {
        return null;
      }

      const slots = row
        .slice(3, 3 + lootSlots)
        .map(safeNumber);

      return {
        row: index + 2,
        name,
        points: safeNumber(row[1]),
        unclaimed: countOpen(slots),
        slots,
        className: kidsConfig[name]?.className || ""
      };
    })
    .filter(Boolean);

  renderKids();
}

export function renderKids() {
  const container =
    document.getElementById("kidsContainer");

  if (!container) {
    return;
  }

  container.innerHTML =
    state.kidsData.map(renderKidCard).join("");

  bindKidButtons();
}

function renderKidCard(kid) {
  const percent =
    maxPoints > 0
      ? Math.min(100, (kid.points / maxPoints) * 100)
      : 0;

  const streaks =
    getStreaksForChild(kid.name);

  const canOpenLoot =
    state.unlockedChild === kid.name;

  return `
    <div class="card ${kid.className}">
      <div class="top">
        <div class="name">
          ${kid.name}
        </div>

        <div class="points">
          ⭐ ${kid.points}
        </div>
      </div>

      <div class="bar-bg">
        <div
          class="bar"
          style="width:${percent}%"
        >
          ${kid.points}
        </div>
      </div>

      <div class="info">
        🎁 Offen: ${kid.unclaimed}
      </div>

      ${renderPurchaseNoticeForChild(kid.name)}

      ${
        streaks.length
          ? `
            <hr>

            ${streaks.map(streak => `
              <div class="info">
                <b>
                  ${streak.emoji}
                  ${streak.title}
                </b>

                <br>

                ${renderStreakDots(streak)}

                <br>

                ${streak.current}/${streak.goal}

                ${
                  state.unlockedChild === kid.name &&
                  streak.current >= streak.goal
                    ? `
                      <br><br>

                      <button
                        class="flame-button"
                        data-claim-streak="${streak.row}"
                      >
                        🔥 Bonus abholen
                      </button>
                    `
                    : ""
                }
              </div>
            `).join("")}
          `
          : ""
      }

      <div class="reward-controls">
        ${
          canOpenLoot
            ? `
              <button
                class="chest-button open"
                data-open-loot="${kid.name}"
                ${kid.unclaimed <= 0 ? "disabled" : ""}
              >
                🎁 Öffnen
              </button>
            `
            : ""
        }

        ${
          state.unlockedChild === "ADMIN"
            ? `
              <button
                class="save"
                data-open-admin-child="${kid.name}"
              >
                ⚙️ Verwalten
              </button>
            `
            : ""
        }
      </div>
    </div>
  `;
}

function bindKidButtons() {
  document
    .querySelectorAll("[data-open-loot]")
    .forEach(button => {
      button.addEventListener("click", () => {
        openLoot(button.dataset.openLoot);
      });
    });

  document
    .querySelectorAll("[data-open-admin-child]")
    .forEach(button => {
      button.addEventListener("click", () => {
        openChildAdmin(button.dataset.openAdminChild);
      });
    });

  document
    .querySelectorAll("[data-claim-streak]")
    .forEach(button => {
      button.addEventListener("click", () => {
        claimStreakBonus(
          Number(button.dataset.claimStreak)
        );
      });
    });
}

async function openLoot(child) {
  if (state.unlockedChild !== child) {
    alert("Du kannst nur deine eigene Belohnung öffnen.");
    return;
  }

  const kid =
    state.kidsData.find(k => k.name === child);

  if (!kid) {
    return;
  }

  const reversedIndex =
    [...kid.slots]
      .reverse()
      .findIndex(value => value > 0);

  if (reversedIndex === -1) {
    return;
  }

  const realIndex =
    kid.slots.length - 1 - reversedIndex;

  const reward =
    kid.slots[realIndex];

  const newPoints =
    kid.points + reward;

  const slots =
    [...kid.slots];

  slots[realIndex] = 0;

  await api("setMany", {
    sheet: SHEETS.kids,
    data: [
      {
        cell: `B${kid.row}`,
        value: newPoints
      },
      {
        cell: `C${kid.row}`,
        value: countOpen(slots)
      },
      {
        cell: lootCell(kid.row, realIndex),
        value: 0
      }
    ]
  });

  showLootOverlay(reward);

  await loadKids();
}

function showLootOverlay(reward) {
  const overlay =
    document.getElementById("rewardOverlay");

  const text =
    document.getElementById("rewardOverlayText");

  if (!overlay || !text) {
    return;
  }

  overlay.classList.remove("streak-fire");

  text.innerHTML = `
    ⭐ +${reward} Punkte
  `;

  overlay.classList.add("visible");

  setTimeout(() => {
    overlay.classList.remove("visible");
  }, 4800);
}