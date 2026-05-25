import { api } from "./api.js";

import {
  lootSlots,
  streaksStartRow,
  rewardsStartRow
} from "./config.js";

export async function setupSheet() {

  const res =
    await api(
      "getRange",
      {
        range: "A1:W4"
      }
    );

  if (
    res.values?.[0]?.[0]
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
      range: "A1:W4",

      values: [

        headers,

        [
          "Luna",
          0,
          0,
          ...Array(lootSlots).fill(0)
        ],

        [
          "Milo",
          0,
          0,
          ...Array(lootSlots).fill(0)
        ],

        [
          "Finn",
          0,
          0,
          ...Array(lootSlots).fill(0)
        ]

      ]
    }
  );

}

export async function setupRewards() {

  const res =
    await api(
      "getRange",
      {
        range: `A${rewardsStartRow - 1}:K${rewardsStartRow - 1}`
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

export async function setupStreaks() {

  const res =
    await api(
      "getRange",
      {
        range:
          `O${streaksStartRow - 1}:W${streaksStartRow - 1}`
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
        `O${streaksStartRow - 1}:W${streaksStartRow - 1}`,

      values: [[

        "StreakID",
        "Kind",
        "Titel",
        "Emoji",
        "Aktuell",
        "Ziel",
        "PunkteProKlick",
        "BonusBeiAbschluss",
        "Aktiv"

      ]]
    }
  );

}