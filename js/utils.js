import { firstLootColumn } from "./config.js";

export function col(n) {
  let s = "";

  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }

  return s;
}

export function lootCell(row, index) {
  return `${col(firstLootColumn + index)}${row}`;
}

export function countOpen(slots) {
  return slots.filter(v => Number(v) > 0).length;
}

export function highestFilled(slots) {
  for (let i = slots.length - 1; i >= 0; i--) {
    if (Number(slots[i]) > 0) {
      return i;
    }
  }

  return -1;
}

export function nextFree(slots) {
  return slots.findIndex(v => Number(v) <= 0);
}