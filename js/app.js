import { state } from "./state.js";
import { parentPin, kidsConfig } from "./config.js";
import { loadKids } from "./kids.js";
import { loadRewards, renderRewards } from "./rewards.js";
import { loadStreaks, initChildAdminEvents } from "./streaks.js";
import { loadPurchases, renderPurchases } from "./purchases.js";
import { initAdminEvents, renderRewardAdmin } from "./admin.js";

// Global: wird von admin.html onchange gebraucht
window.toggleAllPlusTargets = function(value) {
  const box = document.getElementById("allPlusTargets");
  const goalInput = document.getElementById("rewardGoal");
  if (!box || !goalInput) return;
  if (value === "ALL+") {
    box.style.display = "block";
    goalInput.style.display = "none";
    // Checkboxen & Inputs zurücksetzen
    ["Luna", "Milo", "Finn"].forEach(k => {
      const cb = document.getElementById(`check${k}`);
      const inp = document.getElementById(`rewardTarget${k}`);
      if (cb) cb.checked = false;
      if (inp) { inp.style.display = "none"; inp.value = ""; }
    });
  } else {
    box.style.display = "none";
    goalInput.style.display = "";
  }
};

window.toggleAllPlusInput = function(child, checked) {
  const inp = document.getElementById(`rewardTarget${child}`);
  if (!inp) return;
  inp.style.display = checked ? "block" : "none";
  if (!checked) inp.value = "";
};

window.toggleEditAllPlusInput = function(child, checked) {
  const inp = document.getElementById(`editTarget${child}`);
  if (!inp) return;
  inp.style.display = checked ? "block" : "none";
  if (!checked) inp.value = "";
};

/* ========================================
   PARTIALS
======================================== */

async function loadPartial(mountId, path) {
  const response = await fetch(path);
  const html = await response.text();
  const mount = document.getElementById(mountId);
  if (!mount) { console.error(`Mount nicht gefunden: ${mountId}`); return; }
  mount.innerHTML = html;
}

async function loadChildAdminPartial() {
  const response = await fetch("partials/child-admin.html");
  const html = await response.text();
  document.body.insertAdjacentHTML("beforeend", html);
}

async function loadPartials() {
  await loadPartial("loginMount", "partials/login.html");
  await loadPartial("adminMount", "partials/admin.html");
  await loadChildAdminPartial();
}

/* ========================================
   LOGIN
======================================== */

function initLogin() {
  const loginButton = document.getElementById("loginButton");
  const guestButton = document.getElementById("guestButton");
  const logoutButton = document.getElementById("logoutButton");
  const pinInput = document.getElementById("pinInput");

  if (!loginButton || !guestButton || !logoutButton) {
    console.error("Login Elemente fehlen");
    return;
  }

  const savedLogin = localStorage.getItem("unlockedChild");

  if (savedLogin) {
    state.unlockedChild = savedLogin;
    document.getElementById("loginOverlay")?.classList.remove("visible");
    if (savedLogin === "ADMIN") {
      document.querySelector(".admin-panel")?.classList.add("visible");
    }
  }

  loginButton.addEventListener("click", unlock);
  guestButton.addEventListener("click", guestLogin);
  logoutButton.addEventListener("click", logout);
  pinInput?.addEventListener("keydown", e => { if (e.key === "Enter") unlock(); });

  document.getElementById("hardReloadButtonUser")
    ?.addEventListener("click", hardReload);
}

function guestLogin() {
  state.unlockedChild = "GUEST";
  localStorage.setItem("unlockedChild", "GUEST");
  document.getElementById("loginOverlay")?.classList.remove("visible");
  hideAdmin();
  loadAll();
}

function unlock() {
  const pin = document.getElementById("pinInput")?.value?.trim();

  if (pin === parentPin) {
    state.unlockedChild = "ADMIN";
    localStorage.setItem("unlockedChild", "ADMIN");
    document.getElementById("loginOverlay")?.classList.remove("visible");
    showAdmin();
    loadAll();
    return;
  }

  const child = Object.keys(kidsConfig).find(key => kidsConfig[key].pin === pin);

  if (!child) { alert("Falsche PIN"); return; }

  state.unlockedChild = child;
  localStorage.setItem("unlockedChild", child);
  document.getElementById("loginOverlay")?.classList.remove("visible");
  hideAdmin();
  loadAll();
}

function logout() {
  localStorage.removeItem("unlockedChild");
  state.unlockedChild = null;
  hideAdmin();
  document.getElementById("loginOverlay")?.classList.add("visible");
  loadAll();
}

function showAdmin() {
  document.querySelector(".admin-panel")?.classList.add("visible");
}

function hideAdmin() {
  document.querySelector(".admin-panel")?.classList.remove("visible");
}

/* ========================================
   LOAD ALL
======================================== */

async function loadAll() {
  try {
    await loadPurchases();
    await loadStreaks();
    await loadKids();
    await loadRewards();
    renderRewardAdmin();
    renderPurchases();
  } catch (error) {
    console.error(error);
    document.getElementById("kidsContainer").innerHTML = `
      <div class="error">${error.message}</div>
    `;
  }
}

/* ========================================
   START
======================================== */

async function start() {
  try {
    await loadPartials();
    initLogin();
    initAdminEvents();
    initChildAdminEvents();
    await loadAll();

    setInterval(() => {
      state.slideTick++;
      renderRewards();
    }, 3500);

    setInterval(loadAll, 15000);
  } catch (error) {
    console.error("App Start Fehler:", error);
  }
}

start();

/* ========================================
   HARD RELOAD (global)
======================================== */

export async function hardReload() {
  if (!confirm("Cache leeren und App neu laden?")) return;

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  }

  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
  }

  location.reload(true);
}
