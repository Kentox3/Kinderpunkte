import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getDatabase,
  ref,
  get,
  set,
  update,
  push,
  remove,
  onValue,
  off
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCse7ZqdinNvdIE81aLlrM-T9mhmLQbfNM",
  authDomain: "kinderpunkte.firebaseapp.com",
  databaseURL: "https://kinderpunkte-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "kinderpunkte",
  storageBucket: "kinderpunkte.firebasestorage.app",
  messagingSenderId: "692809846345",
  appId: "1:692809846345:web:7f768feca0a0a5f7ee3998"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);

/* ========================================
   HELPERS
======================================== */

export async function dbGet(path) {
  const snapshot = await get(ref(db, path));
  return snapshot.val();
}

export async function dbSet(path, value) {
  await set(ref(db, path), value);
}

export async function dbUpdate(path, value) {
  await update(ref(db, path), value);
}

export async function dbPush(path, value) {
  const r = await push(ref(db, path), value);
  return r.key;
}

export async function dbRemove(path) {
  await remove(ref(db, path));
}

export function dbListen(path, callback) {
  const r = ref(db, path);
  onValue(r, snapshot => callback(snapshot.val()));
  return () => off(r);
}
