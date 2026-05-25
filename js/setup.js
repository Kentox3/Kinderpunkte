import { api } from "./api.js";
import { lootSlots } from "./config.js";

export async function setupSheet() {
  const res = await api("getRange", {
    range: "A1:W4"
  });

  if (res.values?.[0]?.[0]) {
    return;
  }

  const headers = ["Name", "Punkte", "Unclaimed"];

  for (let i = 1; i <= lootSlots; i++) {
    headers.push("U" + i);
  }

  await api("setRange", {
    range: "A1:W4",
    values: [
      headers,
      ["Luna", 0, 0, ...Array(lootSlots).fill(0)],
      ["Milo", 0, 0, ...Array(lootSlots).fill(0)],
      ["Finn", 0, 0, ...Array(lootSlots).fill(0)]
    ]
  });
}

export async function setupRewards() {
  const res = await api("getRange", {
    range: "A10:K10"
  });

  if (res.values?.[0]?.[0]) {
    return;
  }

  await api("setRange", {
    range: "A10:K10",
    values: [
      [
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
      ]
    ]
  });
}