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

/* ========================================
   OVERLAY
======================================== */

let overlayCloseCallback = null;

export function showOverlay({ text, isStreak = false }) {
  const overlay = document.getElementById("rewardOverlay");
  const textEl = document.getElementById("rewardOverlayText");
  const btn = document.getElementById("rewardOverlayContinue");
  if (!overlay || !textEl || !btn) return;

  // Cleanup
  overlay.classList.remove("streak-fire");
  btn.style.display = "none";
  overlay.querySelectorAll(".particle").forEach(p => p.remove());
  if (overlayCloseCallback) {
    btn.removeEventListener("click", overlayCloseCallback);
    overlayCloseCallback = null;
  }

  if (isStreak) overlay.classList.add("streak-fire");
  textEl.innerHTML = text;
  overlay.classList.add("visible");

  // Partikel spawnen
  spawnParticles(overlay, isStreak);

  // Weiter-Button nach 1.5s
  const timer = setTimeout(() => {
    btn.style.display = "block";
  }, 1500);

  overlayCloseCallback = () => {
    clearTimeout(timer);
    overlay.classList.remove("visible");
    overlay.classList.remove("streak-fire");
    btn.style.display = "none";
    overlay.querySelectorAll(".particle").forEach(p => p.remove());
    btn.removeEventListener("click", overlayCloseCallback);
    overlayCloseCallback = null;
  };

  btn.addEventListener("click", overlayCloseCallback);
}

function spawnParticles(overlay, isStreak) {
  const emojis = isStreak
    ? ["🔥", "✨", "💥", "⚡", "🌟"]
    : ["⭐", "✨", "🌟", "💫", "⭐", "✨"];

  const count = 18;

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const p = document.createElement("span");
      p.className = "particle";

      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const size = 1.2 + Math.random() * 2.2;          // 1.2 – 3.4rem
      const startX = 20 + Math.random() * 60;           // 20% – 80% horizontal
      const startY = 40 + Math.random() * 30;           // 40% – 70% vertikal start
      const dx = (Math.random() - 0.5) * 260;           // seitliche Streuung
      const dy = -(120 + Math.random() * 320);          // nach oben
      const rot = (Math.random() - 0.5) * 720;          // Rotation
      const dur = 0.9 + Math.random() * 1.0;            // Dauer
      const delay = Math.random() * 0.6;                // Versatz

      p.textContent = emoji;
      p.style.cssText = `
        position: absolute;
        left: ${startX}%;
        top: ${startY}%;
        font-size: ${size}rem;
        pointer-events: none;
        z-index: 10;
        animation: particleFly ${dur}s ease-out ${delay}s forwards;
        --dx: ${dx}px;
        --dy: ${dy}px;
        --rot: ${rot}deg;
        opacity: 0;
      `;

      overlay.appendChild(p);

      // nach Animation entfernen
      setTimeout(() => p.remove(), (dur + delay + 0.1) * 1000);
    }, i * 60);
  }
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