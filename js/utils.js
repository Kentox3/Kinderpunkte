export function safeNumber(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const number =
    Number(value);

  return Number.isNaN(number)
    ? 0
    : number;

}

export function nextFree(slots) {

  return slots.findIndex(
    value => safeNumber(value) <= 0
  );

}

export function countOpen(slots) {

  return slots.filter(
    value => safeNumber(value) > 0
  ).length;

}

export function lootCell(
  row,
  slotIndex
) {

  const column =
    4 + slotIndex;

  return `${columnToLetter(column)}${row}`;

}

export function columnToLetter(
  column
) {

  let temp = "";
  let letter = "";

  while (column > 0) {

    temp =
      (column - 1) % 26;

    letter =
      String.fromCharCode(
        temp + 65
      ) + letter;

    column =
      (column - temp - 1) / 26;

  }

  return letter;

}

export function clamp(
  value,
  min,
  max
) {

  return Math.min(
    max,
    Math.max(min, value)
  );

}

export function sleep(ms) {

  return new Promise(
    resolve =>
      setTimeout(resolve, ms)
  );

}