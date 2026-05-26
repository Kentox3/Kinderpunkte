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
    .filter(purchase => purchase.id);

  renderPurchases();
}

export async function createPurchase({
  reward,
  child,
  cost
}) {
  await loadPurchases();

  const usedRows =
    state.purchasesData.map(
      purchase => purchase.row
    );

  let row = null;

  for (
    let r = purchasesStartRow;
    r <= purchasesEndRow;
    r++
  ) {
    if (!usedRows.includes(r)) {
      row = r;
      break;
    }
  }

  if (!row) {
    throw new Error("Keine freien Kauf-Zeilen.");
  }

  const now =
    new Date().toLocaleString("de-DE");

  await api("setRange", {
    sheet: SHEETS.purchases,
    range: `A${row}:H${row}`,
    values: [[
      `P${Date.now()}`,
      child,
      reward.title,
      cost,
      "PENDING",
      now,
      "",
      reward.visibleFor === "ALL"
        ? "Familienreward"
        : "Privatreward"
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

  const purchases =
    state.purchasesData || [];

  if (!purchases.length) {
    container.innerHTML = `
      <div class="loading">
        Noch keine Käufe vorhanden.
      </div>
    `;
    return;
  }

  container.innerHTML =
    purchases
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

  const cancelled =
    purchase.status === "CANCELLED";

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
            ? "⏳ Wartet auf Übergabe"
            : confirmed
              ? "✅ Übergeben"
              : cancelled
                ? "❌ Storniert"
                : purchase.status
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
                ✅ Übergabe bestätigen
              </button>

              <button
                class="minus"
                data-cancel-purchase="${purchase.row}"
              >
                ❌ Stornieren
              </button>

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
          Number(button.dataset.confirmPurchase)
        );
      });
    });

  document
    .querySelectorAll("[data-cancel-purchase]")
    .forEach(button => {
      button.addEventListener("click", () => {
        cancelPurchase(
          Number(button.dataset.cancelPurchase)
        );
      });
    });
}

async function confirmPurchase(row) {
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

async function cancelPurchase(row) {
  await api("setMany", {
    sheet: SHEETS.purchases,
    data: [
      {
        cell: `E${row}`,
        value: "CANCELLED"
      }
    ]
  });

  await loadPurchases();
}

export function renderPurchaseNoticeForChild(child) {
  const purchases =
    (state.purchasesData || []).filter(
      purchase =>
        purchase.child
          .split(",")
          .map(name => name.trim())
          .includes(child) &&
        purchase.status === "PENDING"
    );

  if (!purchases.length) {
    return "";
  }

  return purchases.map(purchase => `
    <div class="purchase-notice">
      🎁 <b>${purchase.reward}</b><br>
      Bitte warte auf deine Belohnung.
      Deine Eltern geben sie dir bald.
    </div>
  `).join("");
}