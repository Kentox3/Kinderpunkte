export const API_URL =
  "https://script.google.com/macros/s/AKfycbz1dpJirxQil5jMHxD-Tp-ee7Bpi6-vMsetNING8R5NsmCizuA9szlhev5okPP5oEDh/exec";

export const SHEETS = {
  kids: "1",
  rewards: "2",
  streaks: "3",
  purchases: "4"
};

/* ========================================
   LOGIN
======================================== */

export const parentPin = "272520";

/* ========================================
   KIDS
======================================== */

export const kidsConfig = {

  Luna: {
    row: 2,
    pin: "271",
    className: "luna",
    contributionCol: "I"
  },

  Milo: {
    row: 3,
    pin: "254",
    className: "milo",
    contributionCol: "J"
  },

  Finn: {
    row: 4,
    pin: "207",
    className: "finn",
    contributionCol: "K"
  }

};

/* ========================================
   LIMITS
======================================== */

export const lootSlots = 20;

export const maxPoints = 500;

/* ========================================
   REWARD SHEET
======================================== */

export const rewardsStartRow = 2;
export const rewardsEndRow = 200;

/* ========================================
   STREAK SHEET
======================================== */

export const streaksStartRow = 2;
export const streaksEndRow = 200;

/* ========================================
   PURCHASE SHEET
======================================== */

export const purchasesStartRow = 2;
export const purchasesEndRow = 400;