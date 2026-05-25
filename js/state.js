// Global Application State
// Stores all the app data that needs to be shared across modules

export const state = {
  // User & Authentication
  unlockedChild: null,  // Current user: "Luna", "Milo", "Finn", "ADMIN", "GAST", or null
  
  // Kids Data
  kidsData: [],  // Array of kids with points and loot slots
  // Example: [{ name: "Luna", points: 50, unclaimed: 2, slots: [0,5,0,...] }]
  
  // Rewards Data
  rewardsData: [],  // Array of available rewards from Google Sheet
  // Example: [{ id: "R123", title: "Nintendo Switch", target: 500, Luna: 100, Milo: 150, Finn: 250 }]
  
  // UI State
  slideTick: 0,  // Counter for cycling through reward images (increments every 3.5s)
  isSaving: false,  // Prevent multiple simultaneous save operations
  rewardCooldown: false  // Cooldown timer for reward actions
};
