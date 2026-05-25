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
  countOpen
} from "./utils.js";

import { loadKids } from "./kids.js";

import { loadRewards } from "./rewards.js";

export function initAdminEvents(){

  const giveLootButton =
    document.getElementById(
      "giveLootButton"
    );

  const rewardSelect =
    document.getElementById(
      "rewardSelect"
    );

  const saveRewardButton =
    document.getElementById(
      "saveRewardButton"
    );

  const deactivateRewardButton =
    document.getElementById(
      "deactivateRewardButton"
    );

  if(giveLootButton){

    giveLootButton.addEventListener(
      "click",
      giveLoot
    );
  }

  if(rewardSelect){

    rewardSelect.addEventListener(
      "change",
      fillRewardForm
    );
  }

  if(saveRewardButton){

    saveRewardButton.addEventListener(
      "click",
      saveReward
    );
  }

  if(deactivateRewardButton){

    deactivateRewardButton.addEventListener(
      "click",
      deactivateReward
    );
  }

}

export async function giveLoot(){

  const selected =
    [
      ...document.querySelectorAll(
        'input[name="lootChild"]:checked'
      )
    ]
    .map(input => input.value);

  const amount =
    Number(
      document.getElementById(
        "lootAmount"
      ).value
    ) || 0;

  if(!selected.length){

    alert(
      "Bitte mindestens ein Kind auswählen."
    );

    return;
  }

  if(amount <= 0){

    alert(
      "Bitte Loot-Wert eingeben."
    );

    return;
  }

  const updates = [];

  const messages = [];

  for(const name of selected){

    const row =
      kidsConfig[name].row;

    const res =
      await api(
        "getRange",
        {
          range:`D${row}:W${row}`
        }
      );

    const slots =
      res.values[0]
      .map(v => Number(v) || 0);

    const free =
      nextFree(slots);

    if(free === -1){

      messages.push(
        `${name}: keine freien Slots`
      );

      continue;
    }

    slots[free] = amount;

    updates.push({
      cell: lootCell(row, free),
      value: amount
    });

    updates.push({
      cell:`C${row}`,
      value: countOpen(slots)
    });

    messages.push(
      `${name}: +${amount} in U${free + 1}`
    );
  }

  if(updates.length){

    await api(
      "setMany",
      {
        data: updates
      }
    );
  }

  const adminMessage =
    document.getElementById(
      "adminMessage"
    );

  adminMessage.innerHTML = `
    <div class="success">
      ${messages.join("<br>")}
    </div>
  `;

  await loadKids();

}

export function renderRewardAdmin(){

  const select =
    document.getElementById(
      "rewardSelect"
    );

  if(!select){
    return;
  }

  const currentValue =
    select.value;

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

  if(currentValue){

    select.value = currentValue;
  }

  const info =
    document.getElementById(
      "rewardAdminInfo"
    );

  if(!info){
    return;
  }

  if(!state.rewardsData.length){

    info.innerHTML =
      "Noch keine Belohnungen.";

    return;
  }

  info.innerHTML =
    state.rewardsData.map(reward => {

      const total =
        reward.Luna +
        reward.Milo +
        reward.Finn;

      return `

        <b>${reward.title}</b><br>

        Ziel:
        ${reward.target}<br>

        Sichtbar für:
        ${reward.visibleFor}<br>

        Aktiv:
        ${reward.active ? "Ja" : "Nein"}<br>

        Luna:
        ${reward.Luna}<br>

        Milo:
        ${reward.Milo}<br>

        Finn:
        ${reward.Finn}<br>

        Gesamt:
        ${total}

        <hr>

      `;

    }).join("");

}

export function fillRewardForm(){

  const row =
    Number(
      document.getElementById(
        "rewardSelect"
      ).value
    );

  const reward =
    state.rewardsData.find(
      r => r.row === row
    );

  document.getElementById(
    "rewardTitle"
  ).value =
    reward?.title || "";

  document.getElementById(
    "rewardTarget"
  ).value =
    reward?.target || "";

  document.getElementById(
    "rewardImg1"
  ).value =
    reward?.images?.[0] || "";

  document.getElementById(
    "rewardImg2"
  ).value =
    reward?.images?.[1] || "";

  document.getElementById(
    "rewardImg3"
  ).value =
    reward?.images?.[2] || "";

  document.getElementById(
    "rewardVisibleFor"
  ).value =
    reward?.visibleFor || "ALL";

}

export async function saveReward(){

  const selectedRow =
    Number(
      document.getElementById(
        "rewardSelect"
      ).value
    );

  const title =
    document.getElementById(
      "rewardTitle"
    ).value.trim();

  const target =
    Number(
      document.getElementById(
        "rewardTarget"
      ).value
    ) || 0;

  const img1 =
    document.getElementById(
      "rewardImg1"
    ).value.trim();

  const img2 =
    document.getElementById(
      "rewardImg2"
    ).value.trim();

  const img3 =
    document.getElementById(
      "rewardImg3"
    ).value.trim();

  const visibleFor =
    document.getElementById(
      "rewardVisibleFor"
    ).value;

  if(!title){

    alert(
      "Titel fehlt."
    );

    return;
  }

  if(target <= 0){

    alert(
      "Zielpunkte fehlen."
    );

    return;
  }

  let row =
    selectedRow;

  if(!row){

    const usedRows =
      state.rewardsData.map(
        r => r.row
      );

    for(
      let r = rewardsStartRow;
      r <= rewardsEndRow;
      r++
    ){

      if(!usedRows.includes(r)){

        row = r;
        break;
      }

    }

  }

  if(!row){

    alert(
      "Keine freien Reward-Zeilen mehr."
    );

    return;
  }

  const existing =
    state.rewardsData.find(
      r => r.row === row
    );

  const id =
    existing?.id ||
    `R${Date.now()}`;

  const luna =
    existing?.Luna || 0;

  const milo =
    existing?.Milo || 0;

  const finn =
    existing?.Finn || 0;

  await api(
    "setRange",
    {
      range:`A${row}:K${row}`,

      values:[[
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
    }
  );

  await loadRewards();

  renderRewardAdmin();

  document.getElementById(
    "rewardSelect"
  ).value = row;

  alert(
    "Belohnung gespeichert."
  );

}

export async function deactivateReward(){

  const row =
    Number(
      document.getElementById(
        "rewardSelect"
      ).value
    );

  if(!row){

    alert(
      "Bitte Belohnung auswählen."
    );

    return;
  }

  await api(
    "set",
    {
      cell:`G${row}`,
      value:false
    }
  );

  await loadRewards();

  renderRewardAdmin();

  alert(
    "Belohnung deaktiviert."
  );

}