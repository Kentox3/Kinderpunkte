import { api } from "./api.js";

import {
  lootSlots,
  rewardsStartRow
} from "./config.js";

/* =========================================
   KIDS
========================================= */

export async function setupSheet() {

  const res = await api(
    "getRange",
    {
      range: "A1:W1"
    }
  );

  if (
    res.values?.[0]?.[0] === "Name"
  ) {
    return;
  }

  const headers = [
    "Name",
    "Punkte",
    "Unclaimed"
  ];

  for (
    let i = 1;
    i <= lootSlots;
    i++
  ) {

    headers.push(`U${i}`);

  }

  await api(
    "setRange",
    {

      range: "A1:W1",

      values: [
        headers
      ]

    }
  );

}

/* =========================================
   REWARDS
========================================= */

export async function setupRewards() {

  const res = await api(
    "getRange",
    {
      range:
        `A${rewardsStartRow - 1}:K${rewardsStartRow - 1}`
    }
  );

  if (
    res.values?.[0]?.[0]
  ) {
    return;
  }

  await api(
    "setRange",
    {

      range:
        `A${rewardsStartRow - 1}:K${rewardsStartRow - 1}`,

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

    }
  );

}

/* =========================================
   STREAKS
========================================= */

export async function setupStreaks() {

  const res = await api(
    "getRange",
    {
      range: "O10:X10"
    }
  );

  if (
    res.values?.[0]?.[0]
  ) {
    return;
  }

  await api(
    "setRange",
    {

      range: "O10:X10",

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

    }
  );

}