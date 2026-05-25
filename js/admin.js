import { api } from "./api.js";

import {
  kidsConfig,
  rewardsStartRow,
  rewardsEndRow
} from "./config.js";

import { state } from "./state.js";

import {
  nextFree,
  lootCell,
  countOpen,
  safeNumber
} from "./utils.js";

import { loadKids } from "./kids.js";
import { loadRewards } from "./rewards.js";

export function initAdminEvents() {

  document
    .getElementById("giveLootButton")
    ?.addEventListener("click", giveLoot);

  document
    .getElementById("rewardSelect")
    ?.addEventListener("change", fillRewardForm);

  document
    .getElementById("saveRewardButton")
    ?.addEventListener("click", saveReward);

  document
    .getElementById("deactivateRewardButton")
    ?.addEventListener("click", deactivateReward);

}

export async function giveLoot() {

  const selected = [
    ...document.querySelectorAll(
      'input[name="lootChild"]:checked'
    )
  ].map(input => input.value);

  const amount = safeNumber(
    document.getElementById("lootAmount")?.value
  );

  if (!selected.length) {
    alert("Bitte mindestens ein Kind auswählen.");
    return;
  }

  if (amount <= 0) {
    alert("Bitte Loot-Wert eingeben.");
    return;
  }

  const updates = [];
  const messages = [];

  for (const name of selected) {

    const row = kidsConfig[name]?.row;

    if (!row) {
      messages.push(`${name}: unbekanntes Kind`);
      continue;
    }

    const res = await api("getRange", {
      range: `D${row}:W${row}`
    });

    const slots =
      (res.values?.[0] || [])
        .map(value => safeNumber(value));

    const free = nextFree(slots);

    if (free === -1) {
      messages.push(`${name}: keine freien Slots`);
      continue;
    }

    slots[free] = amount;

    updates.push({
      cell: lootCell(row, free),
      value: amount
    });

    updates.push({
      cell: `C${row}`,
      value: countOpen(slots)
    });

    messages.push(
      `${name}: +${amount} in U${free + 1}`
    );

  }

  if (updates.length) {

    await api("setMany", {
      data: updates
    });

  }

  const adminMessage =
    document.getElementById("adminMessage");

  if (adminMessage) {

    adminMessage.innerHTML = `
      <div class="success">
        ${messages.join("<br>")}
      </div>
    `;

  }

  await loadKids();

}

export function renderRewardAdmin() {

  const select =
    document.getElementById("rewardSelect");

  if (!select) {
    return;
  }

  const currentValue = select.value;

  select.innerHTML = `
    <option value="">
      Neue Belohnung
    </option>
  `;

  state.rewardsData.forEach(reward => {

    select.innerHTML += `
      <option value="${reward.row}">
        ${reward.title}
      </option>
    `;

  });

  if (currentValue) {
    select.value = currentValue;
  }

  const info =
    document.getElementById("rewardAdminInfo");

  if (!info) {
    return;
  }

  if (!state.rewardsData.length) {

    info.innerHTML =
      "Noch keine Belohnungen.";

    return;

  }

  info.innerHTML =
    state.rewardsData.map(reward => {

      const total =
        safeNumber(reward.Luna) +
        safeNumber(reward.Milo) +
        safeNumber(reward.Finn);

      return `
        <b>${reward.title}</b><br>

        Ziel: ${reward.target}<br>

        Sichtbar für:
        ${reward.visibleFor}<br>

        Aktiv:
        ${reward.active ? "Ja" : "Nein"}<br>

        Luna: ${reward.Luna}<br>
        Milo: ${reward.Milo}<br>
        Finn: ${reward.Finn}<br>

        Gesamt: ${total}

        <hr>
      `;

    }).join("");

}

export function fillRewardForm() {

  const row = Number(
    document.getElementById("rewardSelect")?.value
  );

  const reward =
    state.rewardsData.find(
      item => item.row === row
    );

  document.getElementById("rewardTitle").value =
    reward?.title || "";

  document.getElementById("rewardTarget").value =
    reward?.target || "";

  document.getElementById("rewardImg1").value =
    reward?.images?.[0] || "";

  document.getElementById("rewardImg2").value =
    reward?.images?.[1] || "";

  document.getElementById("rewardImg3").value =
    reward?.images?.[2] || "";

  document.getElementById("rewardVisibleFor").value =
    reward?.visibleFor || "ALL";

}

export async function saveReward() {

  const selectedRow = Number(
    document.getElementById("rewardSelect")?.value
  );

  const title =
    document.getElementById("rewardTitle")
      ?.value
      .trim() || "";

  const target = safeNumber(
    document.getElementById("rewardTarget")?.value
  );

  const img1 =
    document.getElementById("rewardImg1")
      ?.value
      .trim() || "";

  const img2 =
    document.getElementById("rewardImg2")
      ?.value
      .trim() || "";

  const img3 =
    document.getElementById("rewardImg3")
      ?.value
      .trim() || "";

  const visibleFor =
    document.getElementById("rewardVisibleFor")
      ?.value || "ALL";

  if (!title) {
    alert("Titel fehlt.");
    return;
  }

  if (target <= 0) {
    alert("Zielpunkte fehlen.");
    return;
  }

  let row = selectedRow;

  if (!row) {

    const usedRows =
      state.rewardsData.map(
        reward => reward.row
      );

    for (
      let r = rewardsStartRow;
      r <= rewardsEndRow;
      r++
    ) {

      if (!usedRows.includes(r)) {
        row = r;
        break;
      }

    }

  }

  if (!row) {
    alert("Keine freien Reward-Zeilen mehr.");
    return;
  }

  const existing =
    state.rewardsData.find(
      reward => reward.row === row
    );

  const id =
    existing?.id ||
    `R${Date.now()}`;

  const luna =
    safeNumber(existing?.Luna);

  const milo =
    safeNumber(existing?.Milo);

  const finn =
    safeNumber(existing?.Finn);

  await api("setRange", {

    range: `A${row}:K${row}`,

    values: [[

      id,
      title,
      target,
      img1,
      img2,
      img3,
      true,
      visibleFor,
      luna,
      milo,
      finn

    ]]

  });

  await loadRewards();

  renderRewardAdmin();

  document.getElementById(
    "rewardSelect"
  ).value = row;

  alert("Belohnung gespeichert.");

}

export async function deactivateReward() {

  const row = Number(
    document.getElementById("rewardSelect")?.value
  );

  if (!row) {
    alert("Bitte Belohnung auswählen.");
    return;
  }

  await api("set", {
    cell: `G${row}`,
    value: false
  });

  await loadRewards();

  renderRewardAdmin();

  alert("Belohnung deaktiviert.");

}