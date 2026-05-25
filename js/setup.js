// Setup & Initialization Functions
// Handles initial data loading and setup from Google Sheets

import { api } from "./api.js";
import { state } from "./state.js";
import { kidsConfig, rewardsStartRow, rewardsEndRow } from "./config.js";

/**
 * Load and initialize the Google Sheet structure
 * Fetches kid data and prepares the sheet if needed
 * Called once at app startup
 */
export async function setupSheet() {
  try {
    // Fetch the header row and kids data from the sheet
    const res = await api("getRange", {
      range: "A1:W4"
    });

    if (!res.values || res.values.length === 0) {
      throw new Error("Sheet ist leer oder nicht erreichbar");
    }

    // Validate that we have the expected structure
    const headerRow = res.values[0];
    if (!headerRow || headerRow.length === 0) {
      throw new Error("Sheet-Header nicht gefunden");
    }

    // If we reach here, the sheet is properly initialized
    console.log("✅ Sheet erfolgreich initialisiert");
    return true;

  } catch (error) {
    console.error("❌ Sheet-Setup Fehler:", error);
    throw new Error(`Sheet-Initialisierung fehlgeschlagen: ${error.message}`);
  }
}

/**
 * Load and initialize rewards data
 * Fetches reward data from the rewards section of the sheet
 * Called once at app startup
 */
export async function setupRewards() {
  try {
    // Fetch rewards data from the configured range
    const res = await api("getRange", {
      range: `A${rewardsStartRow}:K${rewardsEndRow}`
    });

    if (!res.values || res.values.length === 0) {
      console.warn("⚠️ Keine Belohnungen gefunden");
      return true;
    }

    // Validate reward data structure
    // Each reward row should have at least: ID, Title, Target, Images...
    const validRewards = res.values.filter(row => {
      return row && row.length > 2 && row[1]; // Must have title
    });

    console.log(`✅ ${validRewards.length} Belohnungen geladen`);
    return true;

  } catch (error) {
    console.error("❌ Rewards-Setup Fehler:", error);
    throw new Error(`Rewards-Initialisierung fehlgeschlagen: ${error.message}`);
  }
}

/**
 * Verify that all required kids are configured
 * Makes sure kidsConfig has the right structure
 */
export function validateKidsConfig() {
  const requiredFields = ["row", "pin", "className", "contributionCol"];

  for (const [kidName, config] of Object.entries(kidsConfig)) {
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Kind "${kidName}" fehlt Feld: ${field}`);
      }
    }
  }

  console.log("✅ Kinder-Konfiguration validiert");
  return true;
}

/**
 * Initialize the login overlay HTML structure
 * This creates all the login/admin panel UI elements
 */
export function initLoginUI() {
  const body = document.body;

  // Create login overlay
  const loginOverlay = document.createElement("div");
  loginOverlay.id = "loginOverlay";
  loginOverlay.className = "login-overlay visible";
  loginOverlay.innerHTML = `
    <div class="login-box">
      <h1>🔐 Kinderpunkte</h1>
      <div class="login-form">
        <input 
          type="password" 
          id="pinInput" 
          placeholder="PIN eingeben" 
          inputmode="numeric"
        >
        <button id="loginButton">Anmelden</button>
        <button id="guestButton" class="guest-btn">Gast-Modus</button>
      </div>
    </div>
  `;

  // Create loot overlay (reward notification)
  const lootOverlay = document.createElement("div");
  lootOverlay.id = "lootOverlay";
  lootOverlay.className = "reward-overlay";
  lootOverlay.innerHTML = `
    <div class="big-star">⭐</div>
    <div id="lootText" class="reward-text">+10 Punkte</div>
  `;

  // Create admin panel
  const adminPanel = document.createElement("div");
  adminPanel.id = "adminPanel";
  adminPanel.className = "admin-box";
  adminPanel.innerHTML = `
    <h2>🛠️ Admin Panel</h2>
    
    <div class="admin-grid">
      <div>
        <h3>Loot verteilen</h3>
        <div class="checkbox-group" id="lootChildCheckboxes"></div>
        <input type="number" id="lootAmount" placeholder="Loot-Betrag" value="5">
        <button id="giveLootButton" class="save">Loot geben</button>
        <div id="adminMessage"></div>
      </div>

      <hr>

      <div>
        <h3>Belohnung verwalten</h3>
        <select id="rewardSelect"></select>
        
        <input type="text" id="rewardTitle" placeholder="Titel">
        <input type="number" id="rewardTarget" placeholder="Zielpunkte">
        
        <input type="text" id="rewardImg1" placeholder="Bild 1 URL">
        <input type="text" id="rewardImg2" placeholder="Bild 2 URL">
        <input type="text" id="rewardImg3" placeholder="Bild 3 URL">
        
        <select id="rewardVisibleFor">
          <option value="ALL">Für alle sichtbar</option>
          <option value="Luna">Nur Luna</option>
          <option value="Milo">Nur Milo</option>
          <option value="Finn">Nur Finn</option>
        </select>
        
        <button id="saveRewardButton" class="save">Speichern</button>
        <button id="deactivateRewardButton" class="minus">Deaktivieren</button>
      </div>

      <hr>

      <div>
        <h3>Belohnungen Übersicht</h3>
        <div id="rewardAdminInfo"></div>
      </div>
    </div>
  `;

  // Append all overlays to body
  body.appendChild(loginOverlay);
  body.appendChild(lootOverlay);
  body.appendChild(adminPanel);

  // Populate loot checkboxes
  const checkboxContainer = document.getElementById("lootChildCheckboxes");
  for (const kidName of Object.keys(kidsConfig)) {
    const label = document.createElement("label");
    label.innerHTML = `
      <input type="checkbox" name="lootChild" value="${kidName}">
      ${kidName}
    `;
    checkboxContainer.appendChild(label);
  }

  console.log("✅ Login UI initialisiert");
}

/**
 * Add CSS styles for login overlay and admin panel
 * Injects necessary styles if not already present
 */
export function initLoginStyles() {
  // Check if styles already exist
  if (document.getElementById("loginStyles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "loginStyles";
  style.innerHTML = `
    .login-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: Arial, sans-serif;
    }

    .login-overlay.visible {
      display: flex;
    }

    .login-overlay:not(.visible) {
      display: none;
    }

    .login-box {
      background: rgba(255, 255, 255, 0.13);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 26px;
      padding: 40px;
      backdrop-filter: blur(12px);
      text-align: center;
      color: white;
      box-shadow: 0 14px 40px rgba(0, 0, 0, 0.28);
    }

    .login-box h1 {
      margin-top: 0;
      font-size: 2.5rem;
      margin-bottom: 30px;
    }

    .login-form {
      display: grid;
      gap: 12px;
    }

    .login-form input {
      padding: 12px;
      border: none;
      border-radius: 14px;
      font-size: 1rem;
    }

    .login-form button {
      padding: 12px;
      border: none;
      border-radius: 14px;
      font-weight: bold;
      cursor: pointer;
      transition: transform 0.15s, opacity 0.2s;
      color: white;
    }

    .login-form button:hover {
      transform: scale(1.03);
    }

    #loginButton {
      background: #3498db;
    }

    #guestButton {
      background: rgba(255, 255, 255, 0.15);
    }

    .admin-box {
      display: none;
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      max-width: 500px;
      background: rgba(0, 0, 0, 0.95);
      border-left: 1px solid rgba(255, 255, 255, 0.18);
      overflow-y: auto;
      z-index: 9999;
      padding: 20px;
      color: white;
    }

    .admin-box.visible {
      display: block;
    }

    @media (max-width: 700px) {
      .admin-box {
        max-width: 100%;
      }
    }
  `;

  document.head.appendChild(style);
  console.log("✅ Login Styles hinzugefügt");
}
