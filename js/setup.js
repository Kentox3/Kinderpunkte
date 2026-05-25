import { api } from "./api.js";

import {
  SHEETS,
  lootSlots
} from "./config.js";

/* =========================================
   KIDS = Sheet 1
========================================= */

export async function setupSheet() {
  const res = await api("getRange", {
    sheet: SHEETS.kids,
    range: "A1:W1"
  });

  if (res.values?.[0]?.[0] === "Name") {
    return;
  }

  const headers = [
    "Name",
    "Punkte",
    "Unclaimed"
  ];

  for (let i = 1; i <= lootSlots; i++) {
    headers.push(`U${i}`);
  }

  await api("setRange", {
    sheet: SHEETS.kids,
    range: "A1:W1",
    values: [headers]
  });
}

/* =========================================
   REWARDS = Sheet 2
========================================= */

export async function setupRewards() {
  const res = await api("getRange", {
    sheet: SHEETS.rewards,
    range: "A1:K1"
  });

  if (res.values?.[0]?.[0] === "RewardID") {
    return;
  }

  await api("setRange", {
    sheet: SHEETS.rewards,
    range: "A1:K1",
    values: [[
      "RewardID",
      "Titel",
      "Zielpunkte",
      "Bild1",
      "Bild2",
      "Bild3",
      "Aktiv",
      "SichtbarFür",
      "Luna",
      "Milo",
      "Finn"
    ]]
  });
}

/* =========================================
   STREAKS = Sheet 3
========================================= */

export async function setupStreaks() {
  const res = await api("getRange", {
    sheet: SHEETS.streaks,
    range: "A1:J1"
  });

  if (res.values?.[0]?.[0] === "StreakID") {
    return;
  }

  await api("setRange", {
    sheet: SHEETS.streaks,
    range: "A1:J1",
    values: [[
      "StreakID",
      "Kind",
      "Titel",
      "Emoji",
      "Aktuell",
      "Ziel",
      "LootProKlick",
      "BonusLoot",
      "Aktiv",
      "Abgeschlossen"
    ]]
  });
}

/* =========================================
   PURCHASES = Sheet 4
========================================= */

export async function setupPurchases() {
  const res = await api("getRange", {
    sheet: SHEETS.purchases,
    range: "A1:J1"
  });

  if (res.values?.[0]?.[0] === "PurchaseID") {
    return;
  }

  await api("setRange", {
    sheet: SHEETS.purchases,
    range: "A1:J1",
    values: [[
      "PurchaseID",
      "RewardID",
      "RewardTitel",
      "Kind",
      "Kosten",
      "Status",
      "GekauftAm",
      "BestätigtAm",
      "Bild",
      "Notiz"
    ]]
  });
}