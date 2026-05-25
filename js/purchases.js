import { api } from "./api.js";

import {
  SHEETS,
  purchasesStartRow,
  purchasesEndRow
} from "./config.js";

import { state } from "./state.js";

import { safeNumber } from "./utils.js";

export async function loadPurchases() {
  const res = await api("getRange", {
    sheet: SHEETS.purchases,
    range: `A${purchasesStartRow}:H${purchasesEndRow}`
  });

  state.purchasesData = (res.values || [])
    .map((row, index) => ({
      row: purchasesStartRow + index,
      id: row[0],
      child: row[1],
      reward: row[2],
      cost: safeNumber(row[3]),
      status: row[4] || "PENDING",
      createdAt: row[5] || "",
      confirmedAt: row[6] || "",
      note: row[7] || ""
    }))
    .filter(purchase => purchase.reward);

  renderPurchases();
}

export async function createPurchase({
  reward,
  child,
  cost
}) {

  const usedRows =
    state.purchasesData.map(p => p.row);

  let freeRow = null;

  for (
    let row = purchasesStartRow;
    row <= purchasesEndRow;
    row++
  ) {

    if (!usedRows.includes(row)) {
      freeRow = row;
      break;
    }

  }

  if (!freeRow) {
    throw new Error("Keine freien Kauf-Zeilen.");
  }

  const now =
    new Date().toLocaleString("de-DE");

  await api("setRange", {
    sheet: SHEETS.purchases,
    range: `A${freeRow}:H${freeRow}`,
    values: [[
      `P${Date.now()}`,
      child,
      reward.title,
      cost,
      "PENDING",
      now,
      "",
      ""
    ]]
  });

  await loadPurchases();
}

export function renderPurchases() {
  const container =
    document.getElementById("purchasesList");

  if (!container) {
    return;
  }

  if (!state.purchasesData.length) {

    container.innerHTML = `
      <div class="loading">
        Noch keine Käufe vorhanden.
      </div>
    `;

    return;
  }

  container.innerHTML =
    state.purchasesData
      .slice()
      .reverse()
      .map(renderPurchaseCard)
      .join("");

  bindPurchaseButtons();
}

function renderPurchaseCard(purchase) {

  const pending =
    purchase.status === "PENDING";

  const confirmed =
    purchase.status === "CONFIRMED";

  return `
    <div class="card">

      <div class="top">

        <div class="name">
          🎁 ${purchase.reward}
        </div>

        <div class="points">
          ${purchase.cost} ⭐
        </div>

      </div>

      <div class="info">
        👦 ${purchase.child}
      </div>

      <div class="info">
        📅 ${purchase.createdAt}
      </div>

      <div class="info">
        ${
          pending
            ? "⏳ Wartet auf Belohnung"
            : "✅ Übergeben"
        }
      </div>

      ${
        purchase.note
          ? `
            <div class="purchase-notice">
              ${purchase.note}
            </div>
          `
          : ""
      }

      ${
        state.unlockedChild === "ADMIN" &&
        pending
          ? `
            <div class="reward-controls">

              <button
                class="plus"
                data-confirm-purchase="${purchase.row}"
              >
                ✅ Bestätigen
              </button>

            </div>
          `
          : ""
      }

      ${
        confirmed
          ? `
            <div class="purchase-notice">
              🎉 Belohnung erhalten
            </div>
          `
          : ""
      }

    </div>
  `;
}

function bindPurchaseButtons() {

  document
    .querySelectorAll("[data-confirm-purchase]")
    .forEach(button => {

      button.addEventListener("click", () => {

        confirmPurchase(
          Number(
            button.dataset.confirmPurchase
          )
        );

      });

    });

}

async function confirmPurchase(row) {

  const purchase =
    state.purchasesData.find(
      p => p.row === row
    );

  if (!purchase) {
    return;
  }

  const now =
    new Date().toLocaleString("de-DE");

  await api("setMany", {
    sheet: SHEETS.purchases,
    data: [
      {
        cell: `E${row}`,
        value: "CONFIRMED"
      },
      {
        cell: `G${row}`,
        value: now
      }
    ]
  });

  await loadPurchases();
}

export function renderPurchaseNoticeForChild(child) {

  const pending =
    state.purchasesData.filter(
      purchase =>
        purchase.child === child &&
        purchase.status === "PENDING"
    );

  if (!pending.length) {
    return "";
  }

  return `
    <div class="purchase-notice">

      🎁 Deine Eltern geben dir bald
      deine Belohnung.

    </div>
  `;
}