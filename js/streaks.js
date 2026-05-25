// Streaks Management Module
// Handles tracking and displaying streaks (consecutive days/weeks)

import { api } from "./api.js";
import { state } from "./state.js";
import { kidsConfig } from "./config.js";

/**
 * Load streaks data for all kids
 * Streaks track consecutive days or weeks of activity/achievement
 */
export async function loadStreaks() {
  try {
    // Fetch streaks data from the sheet
    // Assuming streaks are stored in a specific range, e.g., rows 45+
    const res = await api("getRange", {
      range: "A45:D50"  // Adjust range based on your sheet structure
    });

    if (!res.values || res.values.length === 0) {
      console.warn("⚠️ Keine Streaks-Daten gefunden");
      state.streaksData = [];
      return;
    }

    // Parse streaks data
    state.streaksData = res.values
      .map((row, i) => ({
        row: 45 + i,
        kidName: row[0],
        currentStreak: Number(row[1]) || 0,
        longestStreak: Number(row[2]) || 0,
        lastActivityDate: row[3] || null
      }))
      .filter(streak => streak.kidName && kidsConfig[streak.kidName]);

    console.log("✅ Streaks geladen:", state.streaksData.length);
    renderStreaks();

  } catch (error) {
    console.error("❌ Fehler beim Laden der Streaks:", error);
  }
}

/**
 * Render streaks UI for all kids
 * Shows current and longest streaks
 */
export function renderStreaks() {
  const streaksContainer = document.getElementById("streaksContainer");

  if (!streaksContainer) {
    return; // Container doesn't exist yet
  }

  streaksContainer.innerHTML = "";

  if (state.streaksData.length === 0) {
    streaksContainer.innerHTML = `
      <div class="loading">
        Noch keine Streaks vorhanden.
      </div>
    `;
    return;
  }

  state.streaksData.forEach(streak => {
    const kidConfig = kidsConfig[streak.kidName];
    
    const card = document.createElement("div");
    card.className = `card ${kidConfig?.className || ""}`;
    card.innerHTML = `
      <div class="top">
        <div class="name">
          🔥 ${streak.kidName}
        </div>
        <div class="points">
          Streak: ${streak.currentStreak}
        </div>
      </div>

      <div class="bar-bg">
        <div
          class="bar"
          style="width: ${Math.min(streak.currentStreak * 5, 100)}%"
        >
          ${streak.currentStreak}
        </div>
      </div>

      <div class="info">
        Längster Streak: ${streak.longestStreak}
        <br>
        Letzte Aktivität: ${streak.lastActivityDate || "Keine"}
      </div>
    `;

    streaksContainer.appendChild(card);
  });
}

/**
 * Update a kid's streak
 * Called when a kid completes a daily/weekly task
 * @param {string} kidName - The kid's name
 * @param {number} newStreakValue - New streak count
 */
export async function updateStreak(kidName, newStreakValue) {
  try {
    const streak = state.streaksData.find(s => s.kidName === kidName);

    if (!streak) {
      throw new Error(`Streak für ${kidName} nicht gefunden`);
    }

    // Update longest streak if current exceeds it
    const longestStreak = Math.max(streak.longestStreak, newStreakValue);

    await api("setMany", {
      data: [
        {
          cell: `B${streak.row}`,
          value: newStreakValue
        },
        {
          cell: `C${streak.row}`,
          value: longestStreak
        },
        {
          cell: `D${streak.row}`,
          value: new Date().toISOString().split("T")[0] // Today's date
        }
      ]
    });

    // Reload streaks to reflect changes
    await loadStreaks();
    console.log(`✅ Streak für ${kidName} aktualisiert: ${newStreakValue}`);

  } catch (error) {
    console.error("❌ Fehler beim Aktualisieren der Streak:", error);
    throw error;
  }
}

/**
 * Reset a kid's streak to 0
 * Called when a kid breaks the streak
 * @param {string} kidName - The kid's name
 */
export async function resetStreak(kidName) {
  try {
    await updateStreak(kidName, 0);
    console.log(`⚠️ Streak für ${kidName} zurückgesetzt`);
  } catch (error) {
    console.error("❌ Fehler beim Zurücksetzen der Streak:", error);
    throw error;
  }
}

/**
 * Get streak statistics for a specific kid
 * @param {string} kidName - The kid's name
 * @returns {object} Streak statistics
 */
export function getStreakStats(kidName) {
  const streak = state.streaksData.find(s => s.kidName === kidName);

  if (!streak) {
    return {
      kidName,
      currentStreak: 0,
      longestStreak: 0,
      isOnStreak: false
    };
  }

  return {
    kidName,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    isOnStreak: streak.currentStreak > 0,
    lastActivityDate: streak.lastActivityDate
  };
}
