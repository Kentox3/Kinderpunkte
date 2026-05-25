import { api } from "./api.js";

import {
  kidsConfig,
  maxPoints
} from "./config.js";

import { state } from "./state.js";

import {
  countOpen,
  highestFilled,
  lootCell,
  safeNumber
} from "./utils.js";

import {
  getStreaksForChild,
  renderStreakDots,
  openChildAdmin
} from "./streaks.js";

export async function loadKids() {
  const res = await api("getRange", {
    range: "A2:W4"
  });

  state.kidsData = res.values
    .map(row => {
      const slots = row
        .slice(3, 23)
        .map(value => safeNumber(value));

      return {
        name: row[0],
        points: safeNumber(row[1]),
        unclaimed: countOpen(slots),
        slots
      };
    })
    .filter(kid => kidsConfig[kid.name]);

  const updates = state.kidsData.map(kid => ({
    cell: `C${kidsConfig[kid.name].row}`,
    value: kid.unclaimed
  }));

  if (updates.length) {
    await api("setMany", {
      data: updates
    });
  }

  renderKids();
}

export function renderKids() {
  const kidsContainer = document.getElementById("kidsContainer");
  kidsContainer.innerHTML = "";

  state.kidsData.forEach(kid => {
    const percent = Math.min(
      (kid.points / maxPoints) * 100,
      100
    );

    const width =
      percent > 0
        ? Math.max(percent, 8)
        : 0;

    const streaks = getStreaksForChild(kid.name);

    const streakHtml = streaks.length
      ? streaks.map(streak => `
          <div class="info">
            ${streak.emoji}
            <b>${streak.title}</b><br>
            ${renderStreakDots(streak)}
          </div>
        `).join("")
      : "";

    const card = document.createElement("div");

    card.className =
      `card ${kidsConfig[kid.name].className}`;

    card.innerHTML = `
      <div class="top">
        <div class="name">
          ${kid.name}

          ${
            kid.unclaimed > 0 &&
            state.unlockedChild === kid.name

              ? `
                <button
                  class="chest-button"
                  data-claim="${kid.name}"
                >
                  ⭐
                </button>
              `
              : ""
          }
        </div>

        <div class="points">
          ${kid.points} Punkte
        </div>
      </div>

      <div class="bar-bg">
        <div
          class="bar"
          style="width:${width}%"
        >
          ${Math.round(percent)}%
        </div>
      </div>

      <div class="info">
        ${kid.unclaimed} Belohnungen offen
      </div>

      ${streakHtml}

      ${
        state.unlockedChild === "ADMIN"
          ? `
            <button
              class="save"
              data-manage-child="${kid.name}"
            >
              ⚙ ${kid.name} verwalten
            </button>
          `
          : ""
      }
    `;

    kidsContainer.appendChild(card);
  });

  document
    .querySelectorAll("[data-claim]")
    .forEach(button => {
      button.addEventListener("click", () => {
        claimLoot(button.dataset.claim);
      });
    });

  document
    .querySelectorAll("[data-manage-child]")
    .forEach(button => {
      button.addEventListener("click", () => {
        openChildAdmin(button.dataset.manageChild);
      });
    });
}

export async function claimLoot(name) {
  if (state.unlockedChild !== name) {
    return;
  }

  const row = kidsConfig[name].row;

  const res = await api("getRange", {
    range: `A${row}:W${row}`
  });

  const rowValues = res.values[0] || [];

  const freshPoints = await api("get", {
    cell: `B${row}`
  });

  const currentPoints = safeNumber(freshPoints.value);

  const slots = rowValues
    .slice(3, 23)
    .map(value => safeNumber(value));

  const slotIndex = highestFilled(slots);

  if (slotIndex === -1) {
    return;
  }

  const reward = safeNumber(slots[slotIndex]);

  slots[slotIndex] = 0;

  await api("setMany", {
    data: [
      {
        cell: `B${row}`,
        value: currentPoints + reward
      },
      {
        cell: `C${row}`,
        value: countOpen(slots)
      },
      {
        cell: lootCell(row, slotIndex),
        value: 0
      }
    ]
  });

  const overlay = document.getElementById("lootOverlay");
  const text = document.getElementById("lootText");

  text.innerHTML = `
    +${reward} Punkte
    <br>
    <small>
      ${countOpen(slots)}
      Belohnungen übrig
    </small>
  `;

  overlay.classList.add("visible");

  setTimeout(() => {
    overlay.classList.remove("visible");
  }, 1500);

  await loadKids();
}