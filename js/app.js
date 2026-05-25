import { state } from "./state.js";

import {
  parentPin,
  kidsConfig
} from "./config.js";

import {
  setupSheet,
  setupRewards,
  setupStreaks,
  setupPurchases
} from "./setup.js";

import { loadKids } from "./kids.js";

import {
  loadRewards,
  renderRewards
} from "./rewards.js";

import {
  loadStreaks,
  initChildAdminEvents
} from "./streaks.js";

import {
  loadPurchases,
  renderPurchaseAdminList
} from "./purchases.js";

import {
  initAdminEvents,
  renderRewardAdmin
} from "./admin.js";

async function loadPartial(mountId, path) {
  const response = await fetch(path);
  const html = await response.text();

  const mount =
    document.getElementById(mountId);

  if (!mount) {
    console.error(
      `Mount nicht gefunden: ${mountId}`
    );
    return;
  }

  mount.innerHTML = html;
}

async function loadChildAdminPartial() {
  const response =
    await fetch("partials/child-admin.html");

  const html =
    await response.text();

  document.body.insertAdjacentHTML(
    "beforeend",
    html
  );
}

async function loadPartials() {
  await loadPartial(
    "loginMount",
    "partials/login.html"
  );

  await loadPartial(
    "adminMount",
    "partials/admin.html"
  );

  await loadChildAdminPartial();
}

function initLogin() {
  const loginButton =
    document.getElementById("loginButton");

  const guestButton =
    document.getElementById("guestButton");

  const logoutButton =
    document.getElementById("logoutButton");

  if (
    !loginButton ||
    !guestButton ||
    !logoutButton
  ) {
    console.error("Login Elemente fehlen");
    return;
  }

  const savedLogin =
    localStorage.getItem("unlockedChild");

  if (savedLogin) {
    state.unlockedChild = savedLogin;

    document
      .getElementById("loginOverlay")
      ?.classList.remove("visible");

    if (savedLogin === "ADMIN") {
      document
        .getElementById("adminPanel")
        ?.classList.add("visible");
    }
  }

  loginButton.addEventListener(
    "click",
    unlock
  );

  guestButton.addEventListener(
    "click",
    guestLogin
  );

  logoutButton.addEventListener(
    "click",
    logout
  );
}

function guestLogin() {
  state.unlockedChild = "GAST";

  localStorage.setItem(
    "unlockedChild",
    "GAST"
  );

  document
    .getElementById("loginOverlay")
    ?.classList.remove("visible");

  loadAll();
}

function unlock() {
  const pin =
    document.getElementById("pinInput")?.value;

  if (pin === parentPin) {
    state.unlockedChild = "ADMIN";

    localStorage.setItem(
      "unlockedChild",
      "ADMIN"
    );

    document
      .getElementById("loginOverlay")
      ?.classList.remove("visible");

    document
      .getElementById("adminPanel")
      ?.classList.add("visible");

    loadAll();

    return;
  }

  const child =
    Object.keys(kidsConfig).find(
      key => kidsConfig[key].pin === pin
    );

  if (!child) {
    alert("Falsche PIN");
    return;
  }

  state.unlockedChild = child;

  localStorage.setItem(
    "unlockedChild",
    child
  );

  document
    .getElementById("loginOverlay")
    ?.classList.remove("visible");

  loadAll();
}

function logout() {
  localStorage.removeItem(
    "unlockedChild"
  );

  location.reload();
}

async function loadAll() {
  try {
    await setupSheet();
    await setupRewards();
    await setupStreaks();
    await setupPurchases();

    await loadPurchases();
    await loadStreaks();
    await loadKids();
    await loadRewards();

    renderRewardAdmin();
    renderPurchaseAdminList();

  } catch (error) {
    console.error(error);

    document
      .getElementById("kidsContainer")
      .innerHTML = `
        <div class="error">
          ${error.message}
        </div>
      `;
  }
}

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

    setInterval(
      loadAll,
      15000
    );

  } catch (error) {
    console.error(
      "App Start Fehler:",
      error
    );
  }
}

start();