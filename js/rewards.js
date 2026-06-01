import { dbGet, dbUpdate, dbSet } from "./firebase.js";
import { state } from "./state.js";
import { safeNumber } from "./utils.js";
import { createPurchase } from "./purchases.js";
import { loadKids } from "./kids.js";

/* ========================================
   LOAD
======================================== */

export async function loadRewards() {
  const data = await dbGet("rewards");
  state.rewardsData = data || {};
  renderRewards();
}

/* ========================================
   VISIBILITY
======================================== */

function canSeeReward(reward) {
  if (state.unlockedChild === "ADMIN") return true;
  if (reward.visibleFor === "ALL") return true;
  return reward.visibleFor === state.unlockedChild;
}

function isRealChild() {
  return ["Luna", "Milo", "Finn"].includes(state.unlockedChild);
}

function totalRewardPoints(reward) {
  const c = reward.contributions || {};
  return safeNumber(c.Luna) + safeNumber(c.Milo) + safeNumber(c.Finn);
}

function contributorChildren(reward) {
  return ["Luna", "Milo", "Finn"].filter(
    child => safeNumber((reward.contributions || {})[child]) > 0
  );
}

function allContributorsReady(reward) {
  const contributors = contributorChildren(reward);
  if (!contributors.length) return false;
  return contributors.every(child => (reward.ready || {})[child] === true);
}

/* ========================================
   RENDER
======================================== */

export function renderRewards() {
  const container = document.getElementById("rewardsContainer");
  if (!container) return;

  const rewards = Object.values(state.rewardsData).filter(
    r => r.active && canSeeReward(r)
  );

  if (!rewards.length) {
    container.innerHTML = `<div class="loading">Keine Belohnungen vorhanden.</div>`;
    return;
  }

  container.innerHTML = rewards.map(renderRewardCard).join("");
  bindRewardButtons();
}

function renderRewardCard(reward) {
  const total = totalRewardPoints(reward);
  const percent = reward.target > 0
    ? Math.min(100, (total / reward.target) * 100)
    : 0;
  const ready = total >= reward.target;

  const images = reward.images || [];
  const image = images[state.slideTick % Math.max(images.length, 1)] || "";

  const contributions = reward.contributions || {};
  const readyMap = reward.ready || {};

  return `
    <div class="reward-card">
      <img class="reward-img" src="${image}" onerror="this.style.display='none'">
      <div>
        <div class="reward-title">${ready ? "🎉 " : ""}${reward.title}</div>
        <div class="bar-bg">
          <div class="bar" style="width:${percent}%">${total}/${reward.target}</div>
        </div>
        <div class="reward-small">
          Luna: ${safeNumber(contributions.Luna)} ⭐ ${readyMap.Luna ? "✅" : ""}<br>
          Milo: ${safeNumber(contributions.Milo)} ⭐ ${readyMap.Milo ? "✅" : ""}<br>
          Finn: ${safeNumber(contributions.Finn)} ⭐ ${readyMap.Finn ? "✅" : ""}
        </div>
        ${ready ? `<div class="purchase-notice">🎉 Ziel erreicht!</div>` : ""}
        <div class="reward-controls">
          ${renderRewardButtons(reward, total, ready)}
        </div>
      </div>
    </div>
  `;
}

function renderRewardButtons(reward, total, ready) {
  if (!isRealChild()) return "";
  if (!canSeeReward(reward)) return "";

  const child = state.unlockedChild;
  const contributions = reward.contributions || {};
  const readyMap = reward.ready || {};

  if (reward.visibleFor === "ALL") {
    const contributed = safeNumber(contributions[child]) > 0;
    return `
      ${!ready ? renderDonateButtons(reward) : ""}
      ${ready && contributed && !readyMap[child] ? `
        <button class="save" data-ready-reward="${reward.id}">🎉 Kaufen bestätigen</button>
      ` : ""}
      ${ready && contributed && readyMap[child] ? `
        <div class="purchase-notice">✅ Du hast bestätigt</div>
      ` : ""}
    `;
  }

  if (reward.visibleFor !== child) return "";
  return !ready
    ? renderDonateButtons(reward)
    : `<button class="save" data-buy-reward="${reward.id}">🎁 Kaufen</button>`;
}

function renderDonateButtons(reward) {
  return `
    <input type="number" value="5" min="1" id="rewardAmount-${reward.id}">
    <button class="plus" data-donate="${reward.id}">➕</button>
    <button class="minus" data-withdraw="${reward.id}">➖</button>
  `;
}

function bindRewardButtons() {
  document.querySelectorAll("[data-donate]").forEach(btn => {
    btn.addEventListener("click", () => donate(btn.dataset.donate));
  });
  document.querySelectorAll("[data-withdraw]").forEach(btn => {
    btn.addEventListener("click", () => withdraw(btn.dataset.withdraw));
  });
  document.querySelectorAll("[data-buy-reward]").forEach(btn => {
    btn.addEventListener("click", () => buyPrivateReward(btn.dataset.buyReward));
  });
  document.querySelectorAll("[data-ready-reward]").forEach(btn => {
    btn.addEventListener("click", () => confirmFamilyReward(btn.dataset.readyReward));
  });
}

/* ========================================
   DONATE / WITHDRAW
======================================== */

async function donate(rewardId) {
  if (state.isSaving || state.rewardCooldown) return;
  state.isSaving = true;
  startRewardCooldown();

  try {
    const child = state.unlockedChild;
    const reward = state.rewardsData[rewardId];
    if (!reward || !canSeeReward(reward)) throw new Error("Belohnung nicht verfügbar.");

    const amount = safeNumber(document.getElementById(`rewardAmount-${rewardId}`)?.value);
    if (amount <= 0) throw new Error("Bitte Punkte eingeben.");

    await loadKids();
    const kid = state.kidsData[child];
    if (!kid || kid.points < amount) throw new Error("Nicht genug Punkte.");

    const contributions = reward.contributions || {};
    await dbUpdate(`rewards/${rewardId}/contributions`, { [child]: safeNumber(contributions[child]) + amount });
    await dbUpdate(`rewards/${rewardId}/ready`, { [child]: false });
    await dbUpdate(`kids/${child}`, { points: kid.points - amount });

    await loadKids();
    await loadRewards();
  } catch (err) {
    alert(err.message);
  }

  state.isSaving = false;
}

async function withdraw(rewardId) {
  if (state.isSaving || state.rewardCooldown) return;
  state.isSaving = true;
  startRewardCooldown();

  try {
    const child = state.unlockedChild;
    const reward = state.rewardsData[rewardId];
    if (!reward || !canSeeReward(reward)) throw new Error("Belohnung nicht verfügbar.");

    const amount = safeNumber(document.getElementById(`rewardAmount-${rewardId}`)?.value);
    if (amount <= 0) throw new Error("Bitte Punkte eingeben.");

    const contributions = reward.contributions || {};
    if (safeNumber(contributions[child]) < amount) throw new Error("Du kannst nur deine eigenen Punkte zurücknehmen.");

    await loadKids();
    const kid = state.kidsData[child];

    await dbUpdate(`rewards/${rewardId}/contributions`, { [child]: safeNumber(contributions[child]) - amount });
    await dbUpdate(`rewards/${rewardId}/ready`, { [child]: false });
    await dbUpdate(`kids/${child}`, { points: kid.points + amount });

    await loadKids();
    await loadRewards();
  } catch (err) {
    alert(err.message);
  }

  state.isSaving = false;
}

/* ========================================
   BUY / CONFIRM
======================================== */

async function buyPrivateReward(rewardId) {
  const reward = state.rewardsData[rewardId];
  if (!reward) return;
  await completeRewardPurchase(reward, state.unlockedChild);
}

async function confirmFamilyReward(rewardId) {
  const child = state.unlockedChild;
  const reward = state.rewardsData[rewardId];
  if (!reward) return;

  const contributions = reward.contributions || {};
  if (safeNumber(contributions[child]) <= 0) {
    alert("Du hast nichts beigesteuert.");
    return;
  }

  await dbUpdate(`rewards/${rewardId}/ready`, { [child]: true });
  await loadRewards();

  const updated = state.rewardsData[rewardId];
  showRewardReachedOverlay(updated);

  if (allContributorsReady(updated)) {
    await completeRewardPurchase(updated, contributorChildren(updated).join(", "));
  }
}

async function completeRewardPurchase(reward, buyer) {
  const total = totalRewardPoints(reward);
  if (total < reward.target) { alert("Belohnung noch nicht voll."); return; }

  await createPurchase({ reward, child: buyer, cost: reward.target });

  await dbUpdate(`rewards/${reward.id}`, {
    contributions: { Luna: 0, Milo: 0, Finn: 0 },
    ready: { Luna: false, Milo: false, Finn: false }
  });

  showRewardBoughtOverlay(reward);
  await loadRewards();
}

/* ========================================
   OVERLAYS
======================================== */

function showRewardReachedOverlay(reward) {
  showRewardOverlay(reward, "🎉 Geschafft!", "Die Belohnung ist erreicht!");
}

function showRewardBoughtOverlay(reward) {
  showRewardOverlay(reward, "🎁 Gekauft!", "Bitte warte auf deine Belohnung.");
}

function showRewardOverlay(reward, title, subtitle) {
  const overlay = document.getElementById("rewardOverlay");
  const text = document.getElementById("rewardOverlayText");
  if (!overlay || !text) return;

  const image = (reward.images || [])[0] || "";
  overlay.classList.remove("streak-fire");

  text.innerHTML = `
    <div class="big-reward-show">
      ${image ? `<img src="${image}" class="big-reward-img">` : ""}
      <div>${title}</div>
      <small>${reward.title}<br>${subtitle}</small>
    </div>
  `;

  overlay.classList.add("visible");
  setTimeout(() => overlay.classList.remove("visible"), 5600);
}

function startRewardCooldown() {
  state.rewardCooldown = true;
  const sel = "[data-donate],[data-withdraw],[data-buy-reward],[data-ready-reward]";
  document.querySelectorAll(sel).forEach(btn => btn.disabled = true);

  setTimeout(() => {
    state.rewardCooldown = false;
    document.querySelectorAll(sel).forEach(btn => btn.disabled = false);
  }, 1200);
}
