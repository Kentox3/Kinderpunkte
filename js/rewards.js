import { dbGet, dbUpdate, dbSet } from "./firebase.js";
import { state } from "./state.js";
import { safeNumber, showOverlay } from "./utils.js";
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
  if (reward.visibleFor === "ALL+") return true;
  return reward.visibleFor === state.unlockedChild;
}

function isRealChild() {
  return ["Luna", "Milo", "Finn"].includes(state.unlockedChild);
}

function totalRewardPoints(reward) {
  const c = reward.contributions || {};
  return safeNumber(c.Luna) + safeNumber(c.Milo) + safeNumber(c.Finn);
}

// Kinder die bei ALL+ ein Ziel haben
function activePlusKids(reward) {
  const targets = reward.targets || {};
  return ["Luna", "Milo", "Finn"].filter(k => safeNumber(targets[k]) > 0);
}

// Prüft ob bei ALL+ alle aktiven Kinder ihr Ziel erreicht haben
function allPlusGoalsMet(reward) {
  const kids = activePlusKids(reward);
  if (!kids.length) return false;
  const contributions = reward.contributions || {};
  const targets = reward.targets || {};
  return kids.every(k => safeNumber(contributions[k]) >= safeNumber(targets[k]));
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

  // Aktive Input-Werte merken bevor neu gerendert wird
  const savedInputs = {};
  container.querySelectorAll("input[id^='rewardAmount-']").forEach(el => {
    savedInputs[el.id] = el.value;
  });
  const focusedId = document.activeElement?.id || "";

  const rewards = Object.values(state.rewardsData).filter(
    r => r.active && canSeeReward(r)
  );

  if (!rewards.length) {
    container.innerHTML = `<div class="loading">Keine Belohnungen vorhanden.</div>`;
    return;
  }

  container.innerHTML = rewards.map(renderRewardCard).join("");
  bindRewardButtons();

  // Gespeicherte Werte wiederherstellen
  Object.entries(savedInputs).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });
  if (focusedId) document.getElementById(focusedId)?.focus();
}

function renderRewardCard(reward) {
  const images = reward.images || [];
  const image = images[state.slideTick % Math.max(images.length, 1)] || "";
  const contributions = reward.contributions || {};
  const readyMap = reward.ready || {};

  if (reward.visibleFor === "ALL+") {
    const kids = activePlusKids(reward);
    const targets = reward.targets || {};
    const allMet = allPlusGoalsMet(reward);

    const bars = kids.map(k => {
      const val = safeNumber(contributions[k]);
      const tgt = safeNumber(targets[k]);
      const pct = tgt > 0 ? Math.min(100, (val / tgt) * 100) : 0;
      const met = val >= tgt;
      return `
        <div class="reward-small"><b>${k}</b> ${met ? "✅" : ""}</div>
        <div class="bar-bg">
          <div class="bar" style="width:${pct}%">${val}/${tgt}</div>
        </div>
      `;
    }).join("");

    return `
      <div class="reward-card">
        <img class="reward-img" src="${image}" onerror="this.style.display='none'">
        <div>
          <div class="reward-title">${allMet ? "🎉 " : ""}${reward.title}</div>
          ${bars}
          ${allMet ? `<div class="purchase-notice">🎉 Alle Ziele erreicht!</div>` : ""}
          <div class="reward-controls">
            ${renderRewardButtons(reward, 0, allMet)}
            ${state.unlockedChild === "ADMIN" ? `<button class="save" data-edit-reward="${reward.id}" style="margin-top:6px">✏️ Bearbeiten</button>` : ""}
          </div>
        </div>
      </div>
    `;
  }

  const total = totalRewardPoints(reward);
  const percent = reward.target > 0
    ? Math.min(100, (total / reward.target) * 100)
    : 0;
  const ready = total >= reward.target;

  return `
    <div class="reward-card">
      <img class="reward-img" src="${image}" onerror="this.style.display='none'">
      <div>
        <div class="reward-title">${ready ? "🎉 " : ""}${reward.title}</div>
        <div class="bar-bg">
          <div class="bar" style="width:${percent}%">${total}/${reward.target}</div>
        </div>
        <div class="reward-small">
          ${reward.visibleFor === "ALL"
            ? `Luna: ${safeNumber(contributions.Luna)} ⭐ ${readyMap.Luna ? "✅" : ""}<br>
               Milo: ${safeNumber(contributions.Milo)} ⭐ ${readyMap.Milo ? "✅" : ""}<br>
               Finn: ${safeNumber(contributions.Finn)} ⭐ ${readyMap.Finn ? "✅" : ""}`
            : `${reward.visibleFor}: ${safeNumber(contributions[reward.visibleFor])} ⭐`
          }
        </div>
        ${ready ? `<div class="purchase-notice">🎉 Ziel erreicht!</div>` : ""}
        <div class="reward-controls">
          ${renderRewardButtons(reward, total, ready)}
          ${state.unlockedChild === "ADMIN" ? `<button class="save" data-edit-reward="${reward.id}" style="margin-top:6px">✏️ Bearbeiten</button>` : ""}
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

  // ALL+ — jedes Kind spielt nur auf seinen eigenen Balken
  if (reward.visibleFor === "ALL+") {
    const targets = reward.targets || {};
    const myTarget = safeNumber(targets[child]);
    if (myTarget <= 0) return ""; // Kind ist nicht dabei

    const myVal = safeNumber(contributions[child]);
    const myMet = myVal >= myTarget;
    const allMet = ready; // ready wird hier als allMet übergeben

    if (allMet && myMet) {
      return readyMap[child]
        ? `<div class="purchase-notice">✅ Du hast bestätigt</div>`
        : `<button class="save" data-ready-reward="${reward.id}">🎉 Kaufen bestätigen</button>`;
    }
    if (myMet) return `<div class="purchase-notice">✅ Dein Ziel erreicht! Warte auf die anderen.</div>`;
    return renderDonateButtons(reward);
  }

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
  document.querySelectorAll("[data-edit-reward]").forEach(btn => {
    btn.addEventListener("click", () => openEditRewardOverlay(btn.dataset.editReward));
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

  if (reward.visibleFor === "ALL+") {
    const targets = reward.targets || {};
    const myTarget = safeNumber(targets[child]);
    const myVal = safeNumber(contributions[child]);
    if (myVal < myTarget) { alert("Du hast dein Ziel noch nicht erreicht."); return; }

    await dbUpdate(`rewards/${rewardId}/ready`, { [child]: true });
    await loadRewards();

    const updated = state.rewardsData[rewardId];
    if (allPlusGoalsMet(updated) && activePlusKids(updated).every(k => (updated.ready || {})[k])) {
      await completeRewardPurchase(updated, activePlusKids(updated).join(", "));
    }
    return;
  }

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
  showOverlay({ text: `
    <div class="big-reward-show">
      ${(reward.images||[])[0] ? `<img src="${reward.images[0]}" class="big-reward-img">` : ""}
      <div>🎉 Geschafft!</div>
      <small>${reward.title}<br>Die Belohnung ist erreicht!</small>
    </div>
  ` });
}

function showRewardBoughtOverlay(reward) {
  showOverlay({ text: `
    <div class="big-reward-show">
      ${(reward.images||[])[0] ? `<img src="${reward.images[0]}" class="big-reward-img">` : ""}
      <div>🎁 Gekauft!</div>
      <small>${reward.title}<br>Bitte warte auf deine Belohnung.</small>
    </div>
  ` });
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

/* ========================================
   REWARD EDIT OVERLAY
======================================== */

function openEditRewardOverlay(rewardId) {
  const reward = state.rewardsData[rewardId];
  if (!reward) return;

  // Overlay falls schon vorhanden entfernen
  document.getElementById("rewardEditOverlay")?.remove();

  const targets = reward.targets || {};
  const isAllPlus = reward.visibleFor === "ALL+";

  const overlay = document.createElement("div");
  overlay.id = "rewardEditOverlay";
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.7);
    display:flex; align-items:center; justify-content:center;
    z-index:9999; padding:16px;
  `;

  overlay.innerHTML = `
    <div class="card" style="width:100%; max-width:420px; max-height:90vh; overflow-y:auto">
      <h3 style="margin-bottom:12px">✏️ Reward bearbeiten</h3>

      <div class="admin-grid">
        <input id="editRewardTitle" placeholder="Titel" value="${reward.title}">

        <select id="editRewardVisibleFor" onchange="handleEditTypeChange(this.value)">
          <option value="ALL" ${reward.visibleFor === "ALL" ? "selected" : ""}>Für alle (gemeinsames Ziel)</option>
          <option value="ALL+" ${reward.visibleFor === "ALL+" ? "selected" : ""}>Für alle (individuelle Ziele)</option>
          <option value="Luna" ${reward.visibleFor === "Luna" ? "selected" : ""}>Nur Luna</option>
          <option value="Milo" ${reward.visibleFor === "Milo" ? "selected" : ""}>Nur Milo</option>
          <option value="Finn" ${reward.visibleFor === "Finn" ? "selected" : ""}>Nur Finn</option>
        </select>

        <div id="editGoalBox" style="display:${isAllPlus ? "none" : "block"}">
          <input id="editRewardGoal" type="number" min="1" placeholder="Punkte-Ziel" value="${reward.target || ""}">
        </div>

        <div id="editAllPlusBox" style="display:${isAllPlus ? "block" : "none"}">
          <div style="margin-bottom:8px; font-size:0.85em; opacity:0.7">Welche Kinder machen mit?</div>
          ${["Luna", "Milo", "Finn"].map(k => {
            const active = safeNumber(targets[k]) > 0;
            return `
              <label style="display:flex; align-items:center; gap:8px; margin-bottom:4px">
                <input type="checkbox" id="editCheck${k}" ${active ? "checked" : ""} onchange="toggleEditAllPlusInput('${k}', this.checked)">
                <span>${k}</span>
                <input id="editTarget${k}" type="number" min="1" placeholder="Ziel" value="${safeNumber(targets[k]) || ""}" style="display:${active ? "block" : "none"}; flex:1">
              </label>
            `;
          }).join("")}
        </div>

        <input id="editRewardImage1" placeholder="Bild URL 1" value="${(reward.images || [])[0] || ""}">
        <input id="editRewardImage2" placeholder="Bild URL 2" value="${(reward.images || [])[1] || ""}">
        <input id="editRewardImage3" placeholder="Bild URL 3" value="${(reward.images || [])[2] || ""}">

        <button class="save" id="editRewardSaveBtn">💾 Speichern</button>
        <button class="minus" id="editRewardDeactivateBtn">🚫 Reward deaktivieren</button>
        <button id="editRewardCancelBtn" style="margin-top:4px">❌ Abbrechen</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("editRewardSaveBtn").addEventListener("click", () => saveEditedReward(rewardId));
  document.getElementById("editRewardDeactivateBtn").addEventListener("click", () => deactivateReward(rewardId));
  document.getElementById("editRewardCancelBtn").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

window.handleEditTypeChange = function(value) {
  document.getElementById("editGoalBox").style.display = value === "ALL+" ? "none" : "block";
  document.getElementById("editAllPlusBox").style.display = value === "ALL+" ? "block" : "none";
};

async function saveEditedReward(rewardId) {
  const title = document.getElementById("editRewardTitle")?.value.trim() || "";
  const visibleFor = document.getElementById("editRewardVisibleFor")?.value || "ALL";

  if (!title) { alert("Bitte Titel eintragen."); return; }

  const updates = { title, visibleFor };

  if (visibleFor === "ALL+") {
    updates.targets = {
      Luna: safeNumber(document.getElementById("editTargetLuna")?.value),
      Milo: safeNumber(document.getElementById("editTargetMilo")?.value),
      Finn: safeNumber(document.getElementById("editTargetFinn")?.value)
    };
    const activeKids = Object.values(updates.targets).filter(v => v > 0);
    if (!activeKids.length) { alert("Bitte mindestens ein Kind auswählen."); return; }
    updates.target = 0;
  } else {
    const target = safeNumber(document.getElementById("editRewardGoal")?.value);
    if (target <= 0) { alert("Bitte Punkte-Ziel eintragen."); return; }
    updates.target = target;
    updates.targets = { Luna: 0, Milo: 0, Finn: 0 };
  }

  updates.images = [
    document.getElementById("editRewardImage1")?.value.trim() || "",
    document.getElementById("editRewardImage2")?.value.trim() || "",
    document.getElementById("editRewardImage3")?.value.trim() || ""
  ].filter(Boolean);

  await dbUpdate(`rewards/${rewardId}`, updates);
  document.getElementById("rewardEditOverlay")?.remove();
  await loadRewards();
}

async function deactivateReward(rewardId) {
  if (!confirm("Reward wirklich deaktivieren? Er wird nicht mehr angezeigt.")) return;
  await dbUpdate(`rewards/${rewardId}`, { active: false });
  document.getElementById("rewardEditOverlay")?.remove();
  await loadRewards();
}
