import { api } from "./api.js";

import {
  SHEETS,
  lootSlots
} from "./config.js";

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

export async function setupRewards() {
  const res = await api("getRange", {
    sheet: SHEETS.rewards,
    range: "A1:N1"
  });

  if (res.values?.[0]?.[0] === "RewardID") {
    return;
  }

  await api("setRange", {
    sheet: SHEETS.rewards,
    range: "A1:N1",
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
      "Finn",
      "LunaReady",
      "MiloReady",
      "FinnReady"
    ]]
  });
}

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
      "BonusDirekt",
      "Aktiv",
      "Abgeschlossen"
    ]]
  });
}

export async function setupPurchases() {
  const res = await api("getRange", {
    sheet: SHEETS.purchases,
    range: "A1:H1"
  });

  if (res.values?.[0]?.[0] === "PurchaseID") {
    return;
  }

  await api("setRange", {
    sheet: SHEETS.purchases,
    range: "A1:H1",
    values: [[
      "PurchaseID",
      "Kind",
      "Reward",
      "Kosten",
      "Status",
      "GekauftAm",
      "BestätigtAm",
      "Notiz"
    ]]
  });
}