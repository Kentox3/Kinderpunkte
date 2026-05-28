async function addLootToChild(child, amount) {
  if (!child || amount <= 0) {
    return true;
  }

  const kid = state.kidsData.find(k => k.name === child);

  if (!kid) {
    return false;
  }

  const res = await api("getRange", {
    sheet: SHEETS.kids,
    range: `D${kid.row}:W${kid.row}`
  });

  const slots = (res.values?.[0] || [])
    .map(safeNumber);

  const free =
    slots.findIndex(value => value <= 0);

  if (free === -1) {
    return false;
  }

  slots[free] = amount;

  await api("setMany", {
    sheet: SHEETS.kids,
    data: [
      {
        cell: lootCell(kid.row, free),
        value: amount
      },
      {
        cell: `C${kid.row}`,
        value: countOpen(slots)
      }
    ]
  });

  return true;
}