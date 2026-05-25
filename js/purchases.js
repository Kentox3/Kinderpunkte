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
    range: `A${purchasesStartRow}:J${purchasesEndRow}`
  });

  state.purchasesData = (res.values || [])
    .map((row, index) => ({
      row: purchasesStartRow + index,
      id: row[0],
      rewardId: row[1],
      title: row[2],
      child: row[3],
      cost: safeNumber(row[4]),
      status: row[5] || "PENDING",
      boughtAt: row[6],
      confirmedAt: row[7],
      image: row[8],
      note: row[9]
    }))
    .filter(purchase => purchase.id);
}

export async function createPurchase({
  reward,
  child,
  cost,
  note = ""
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
    throw new Error(
      "Keine freien Kauf-Zeilen mehr."
    );
  }

  const now =
    new Date().toISOString();

  await api("setRange", {
    sheet: SHEETS.purchases,
    range: `A${row}:J${row}`,
    values: [[
      `P${Date.now()}`,
      reward.id,
      reward.title,
      child,
      cost,
      "PENDING",
      now,
      "",
      reward.images?.[0] || "",
      note
    ]]
  });

  await loadPurchases();
}

export async function confirmPurchase(row) {
  await api("setMany", {
    sheet: SHEETS.purchases,
    data: [
      {
        cell: `F${row}`,
        value: "DONE"
      },
      {
        cell: `H${row}`,
        value: new Date().toISOString()
      }
    ]
  });

  await loadPurchases();
}

export async function cancelPurchase(row) {
  await api("setMany", {
    sheet: SHEETS.purchases,
    data: [
      {
        cell: `F${row}`,
        value: "CANCELLED"
      }
    ]
  });

  await loadPurchases();
}

export function getPendingPurchasesForChild(child) {
  return (state.purchasesData || [])
    .filter(purchase =>
      purchase.child === child &&
      purchase.status === "PENDING"
    );
}

export function getVisiblePurchasesForChild(child) {
  return (state.purchasesData || [])
    .filter(purchase =>
      purchase.child === child &&
      purchase.status !== "CANCELLED"
    );
}

export function getPendingPurchases() {
  return (state.purchasesData || [])
    .filter(purchase =>
      purchase.status === "PENDING"
    );
}

export function renderPurchaseNoticeForChild(child) {
  const purchases =
    getPendingPurchasesForChild(child);

  if (!purchases.length) {
    return "";
  }

  return purchases.map(purchase => `
    <div class="purchase-notice">
      🎁 <b>${purchase.title}</b><br>
      Bitte warte auf deine Belohnung.
      Deine Eltern geben sie dir bald.
    </div>
  `).join("");
}

export function renderPurchaseAdminList() {
  const box =
    document.getElementById(
      "purchaseAdminList"
    );

  if (!box) {
    return;
  }

  const pending =
    getPendingPurchases();

  if (!pending.length) {
    box.innerHTML = `
      <div class="loading">
        Keine offenen gekauften Belohnungen.
      </div>
    `;
    return;
  }

  box.innerHTML = pending.map(purchase => `
    <div class="card">

      <b>
        🎁 ${purchase.title}
      </b>

      <div class="info">
        Kind: ${purchase.child}<br>
        Kosten: ${purchase.cost}<br>
        Gekauft am: ${formatDate(purchase.boughtAt)}
      </div>

      <button
        class="plus"
        data-confirm-purchase="${purchase.row}"
      >
        Übergabe bestätigen
      </button>

      <button
        class="minus"
        data-cancel-purchase="${purchase.row}"
      >
        Stornieren
      </button>

    </div>
  `).join("");

  document
    .querySelectorAll(
      "[data-confirm-purchase]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        async () => {
          await confirmPurchase(
            Number(button.dataset.confirmPurchase)
          );

          renderPurchaseAdminList();
        }
      );
    });

  document
    .querySelectorAll(
      "[data-cancel-purchase]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        async () => {
          await cancelPurchase(
            Number(button.dataset.cancelPurchase)
          );

          renderPurchaseAdminList();
        }
      );
    });
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString("de-DE");
}