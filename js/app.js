import { state } from "./state.js";

import {
  parentPin,
  kidsConfig
} from "./config.js";

import {
  setupSheet,
  setupRewards
} from "./setup.js";

import { loadKids } from "./kids.js";

import {
  loadRewards,
  renderRewards
} from "./rewards.js";

import {
  initAdminEvents,
  renderRewardAdmin
} from "./admin.js";

async function loadPartial(id, path) {
  const response = await fetch(path);

  const html = await response.text();

  document.getElementById(id).innerHTML = html;
}

async function loadPartials() {
  await loadPartial("loginMount", "partials/login.html");
  await loadPartial("adminMount", "partials/admin.html");
}

function initLogin() {
  const savedLogin = localStorage.getItem("unlockedChild");

  if (savedLogin) {
    state.unlockedChild = savedLogin;

    document
      .getElementById("loginOverlay")
      .classList.remove("visible");

    if (savedLogin === "ADMIN") {
      document
        .getElementById("adminPanel")
        .classList.add("visible");
    }
  }

  document
    .getElementById("loginButton")
    .addEventListener("click", unlock);

  document
    .getElementById("guestButton")
    .addEventListener("click", guestLogin);

  document
    .getElementById("logoutButton")
    .addEventListener("click", logout);
}

function guestLogin() {
  state.unlockedChild = "GAST";

  localStorage.setItem("unlockedChild", "GAST");

  document
    .getElementById("loginOverlay")
    .classList.remove("visible");

  loadAll();
}

function unlock() {
  const pin = document.getElementById("pinInput").value;

  if (pin === parentPin) {
    state.unlockedChild = "ADMIN";

    localStorage.setItem("unlockedChild", "ADMIN");

    document
      .getElementById("loginOverlay")
      .classList.remove("visible");

    document
      .getElementById("adminPanel")
      .classList.add("visible");

    loadAll();

    return;
  }

  const child = Object.keys(kidsConfig).find(
    k => kidsConfig[k].pin === pin
  );

  if (!child) {
    alert("Falsche PIN");
    return;
  }

  state.unlockedChild = child;

  localStorage.setItem("unlockedChild", child);

  document
    .getElementById("loginOverlay")
    .classList.remove("visible");

  loadAll();
}

function logout() {
  localStorage.removeItem("unlockedChild");

  location.reload();
}

async function loadAll() {
  try {
    await setupSheet();

    await setupRewards();

    await loadKids();

    await loadRewards();

    renderRewardAdmin();
  } catch (error) {
    console.error(error);

    document.getElementById("kidsContainer").innerHTML = `
      <div class="error">
        ${error.message}
      </div>
    `;
  }
}

async function start() {
  await loadPartials();

  initLogin();

  initAdminEvents();

  await loadAll();

  setInterval(() => {
    state.slideTick++;

    renderRewards();
  }, 3500);

  setInterval(loadAll, 15000);
}

start();