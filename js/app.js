import { state } from "./state.js";

import { loadKids } from "./kids.js";

import { loadRewards } from "./rewards.js";

import {
  loadStreaks,
  initChildAdminEvents
} from "./streaks.js";

import {
  loadPurchases
} from "./purchases.js";

import {
  adminPin,
  childPins
} from "./config.js";

/* ========================================
   INIT
======================================== */

window.addEventListener("DOMContentLoaded", async () => {

  await loadPartials();

  bindLogin();

  bindLogout();

  initChildAdminEvents();

  await boot();

});

/* ========================================
   BOOT
======================================== */

async function boot() {

  try {

    await loadStreaks();

    await loadPurchases();

    await loadKids();

    await loadRewards();

  } catch (error) {

    console.error(error);

    alert("Fehler beim Laden.");

  }

}

/* ========================================
   PARTIALS
======================================== */

async function loadPartials() {

  await loadPartial(
    "partials/login.html",
    "loginMount"
  );

  await loadPartial(
    "partials/admin.html",
    "adminMount"
  );

  await loadPartial(
    "partials/child-admin.html",
    "adminMount",
    true
  );

}

async function loadPartial(
  path,
  targetId,
  append = false
) {

  try {

    const res = await fetch(path);

    const html = await res.text();

    const target =
      document.getElementById(targetId);

    if (!target) {
      return;
    }

    if (append) {
      target.innerHTML += html;
    } else {
      target.innerHTML = html;
    }

  } catch (error) {

    console.error("Partial Fehler:", path);

  }

}

/* ========================================
   LOGIN
======================================== */

function bindLogin() {

  const loginButton =
    document.getElementById("loginButton");

  const guestButton =
    document.getElementById("guestButton");

  const pinInput =
    document.getElementById("pinInput");

  if (loginButton) {

    loginButton.addEventListener(
      "click",
      tryLogin
    );

  }

  if (pinInput) {

    pinInput.addEventListener(
      "keydown",
      event => {

        if (event.key === "Enter") {
          tryLogin();
        }

      }
    );

  }

  if (guestButton) {

    guestButton.addEventListener(
      "click",
      () => {

        unlock("GUEST");

      }
    );

  }

}

function tryLogin() {

  const pin =
    document.getElementById("pinInput")
      ?.value
      ?.trim();

  if (!pin) {

    alert("PIN fehlt.");

    return;

  }

  if (pin === adminPin) {

    unlock("ADMIN");

    return;

  }

  const child =
    Object.keys(childPins)
      .find(name =>
        String(childPins[name]) === pin
      );

  if (!child) {

    alert("Falsche PIN.");

    return;

  }

  unlock(child);

}

function unlock(role) {

  state.unlockedChild = role;

  localStorage.setItem(
    "kinderpunkte_role",
    role
  );

  closeLogin();

  updateRoleUI();

  reloadEverything();

}

function closeLogin() {

  document
    .getElementById("loginOverlay")
    ?.classList
    .remove("visible");

}

function openLogin() {

  document
    .getElementById("loginOverlay")
    ?.classList
    .add("visible");

}

/* ========================================
   LOGOUT
======================================== */

function bindLogout() {

  const logoutButton =
    document.getElementById("logoutButton");

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener(
    "click",
    logout
  );

}

function logout() {

  state.unlockedChild = null;

  localStorage.removeItem(
    "kinderpunkte_role"
  );

  hideAdmin();

  openLogin();

  reloadEverything();

}

/* ========================================
   ROLE UI
======================================== */

function updateRoleUI() {

  if (state.unlockedChild === "ADMIN") {

    showAdmin();

  } else {

    hideAdmin();

  }

}

function showAdmin() {

  document
    .querySelector(".admin-panel")
    ?.classList
    .add("visible");

}

function hideAdmin() {

  document
    .querySelector(".admin-panel")
    ?.classList
    .remove("visible");

}

/* ========================================
   RELOAD
======================================== */

async function reloadEverything() {

  await loadStreaks();

  await loadPurchases();

  await loadKids();

  await loadRewards();

}

/* ========================================
   AUTO LOGIN
======================================== */

(() => {

  const saved =
    localStorage.getItem(
      "kinderpunkte_role"
    );

  if (!saved) {
    return;
  }

  state.unlockedChild = saved;

  setTimeout(() => {

    closeLogin();

    updateRoleUI();

    reloadEverything();

  }, 100);

})();