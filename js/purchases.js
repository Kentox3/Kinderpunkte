import { dbGet, dbSet, dbUpdate } from "./firebase.js";
import { state } from "./state.js";
import { safeNumber } from "./utils.js";

/* ========================================
   LOAD
======================================== */

export async function loadPurchases() {
  const data = await dbGet("purchases");
  state.purchasesData = data || {};
  renderPurchases();
}

/* ========================================
   CREATE
======================================== */

export async function createPurchase({ reward, child, cost }) {
  const id = `P${Date.now()}`;
  const now = new Date().toLocaleString("de-DE");

  await dbSet(`purchases/${id}`, {
    id,
    child,
    reward: reward.title,
    cost,
    status: "PENDING",
    createdAt: now,
    confirmedAt: "",
    note: reward.visibleFor === "ALL" ? "Familienreward" : "Privatreward"
  });

  await loadPurchases();
}

/* ========================================
   RENDER
======================================== */

export function renderPurchases() {
  const container = document.getElementById("purchasesList");
  if (!container) return;

  const purchases = Object.values(state.purchasesData);

  if (!purchases.length) {
    container.innerHTML = `<div class="loading">Noch keine Käufe vorhanden.</div>`;
    return;
  }

  container.innerHTML = purchases
    .slice()
    .reverse()
    .map(renderPurchaseCard)
    .join("");

  bindPurchaseButtons();
}

function renderPurchaseCard(purchase) {
  const pending = purchase.status === "PENDING";
  const confirmed = purchase.status === "CONFIRMED";
  const cancelled = purchase.status === "CANCELLED";

  return `
    <div class="card">
      <div class="top">
        <div class="name">🎁 ${purchase.reward}</div>
        <div class="points">${purchase.cost} ⭐</div>
      </div>
      <div class="info">👦 ${purchase.child}</div>
      <div class="info">📅 ${purchase.createdAt}</div>
      <div class="info">
        ${pending ? "⏳ Wartet auf Übergabe" : confirmed ? "✅ Übergeben" : cancelled ? "❌ Storniert" : purchase.status}
      </div>
      ${purchase.note ? `<div class="purchase-notice">${purchase.note}</div>` : ""}
      ${state.unlockedChild === "ADMIN" && pending ? `
        <div class="reward-controls">
          <button class="plus" data-confirm-purchase="${purchase.id}">✅ Übergabe bestätigen</button>
          <button class="minus" data-cancel-purchase="${purchase.id}">❌ Stornieren</button>
        </div>
      ` : ""}
    </div>
  `;
}

function bindPurchaseButtons() {
  document.querySelectorAll("[data-confirm-purchase]").forEach(btn => {
    btn.addEventListener("click", () => confirmPurchase(btn.dataset.confirmPurchase));
  });
  document.querySelectorAll("[data-cancel-purchase]").forEach(btn => {
    btn.addEventListener("click", () => cancelPurchase(btn.dataset.cancelPurchase));
  });
}

async function confirmPurchase(id) {
  const now = new Date().toLocaleString("de-DE");
  await dbUpdate(`purchases/${id}`, { status: "CONFIRMED", confirmedAt: now });
  await loadPurchases();
}

async function cancelPurchase(id) {
  await dbUpdate(`purchases/${id}`, { status: "CANCELLED" });
  await loadPurchases();
}

/* ========================================
   NOTICE PER CHILD
======================================== */

export function renderPurchaseNoticeForChild(childName) {
  const purchases = Object.values(state.purchasesData).filter(p =>
    p.child.split(",").map(n => n.trim()).includes(childName) &&
    p.status === "PENDING"
  );

  if (!purchases.length) return "";

  return purchases.map(p => `
    <div class="purchase-notice">
      🎁 <b>${p.reward}</b><br>
      Bitte warte auf deine Belohnung. Deine Eltern geben sie dir bald.
    </div>
  `).join("");
}
