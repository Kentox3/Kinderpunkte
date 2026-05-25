// Utility Functions
// Helper functions used across the application

import { firstLootColumn, lootSlots } from "./config.js";

/**
 * Count how many loot slots are filled (not empty)
 * @param {number[]} slots - Array of loot values
 * @returns {number} Count of filled slots
 */
export function countOpen(slots) {
  return slots.filter(slot => slot > 0).length;
}

/**
 * Find the highest filled loot slot index
 * Used when a kid claims a reward
 * @param {number[]} slots - Array of loot values
 * @returns {number} Index of highest filled slot, or -1 if none
 */
export function highestFilled(slots) {
  for (let i = slots.length - 1; i >= 0; i--) {
    if (slots[i] > 0) {
      return i;
    }
  }
  return -1;
}

/**
 * Find the next free (empty) loot slot index
 * Used when admin gives loot to a kid
 * @param {number[]} slots - Array of loot values
 * @returns {number} Index of first empty slot, or -1 if none
 */
export function nextFree(slots) {
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === 0) {
      return i;
    }
  }
  return -1;
}

/**
 * Calculate the Google Sheets cell reference for a loot slot
 * Converts row and slot index to a column letter
 * @param {number} row - Row number (2, 3, or 4 for kids)
 * @param {number} slotIndex - Index in slots array (0-19)
 * @returns {string} Cell reference like "D2", "E2", etc.
 */
export function lootCell(row, slotIndex) {
  // firstLootColumn is 4, which corresponds to column D (A=1, B=2, C=3, D=4)
  const colNumber = firstLootColumn + slotIndex;
  
  // Convert column number to letter
  const colLetter = String.fromCharCode(64 + colNumber); // 64 + 4 = 68 = 'D'
  
  return `${colLetter}${row}`;
}
