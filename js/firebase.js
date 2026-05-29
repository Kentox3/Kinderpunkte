import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getDatabase,
  ref,
  get,
  set,
  update,
  onValue
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCse7ZqdinNvdIE81aLlrM-T9mhmLQbfNM",
  authDomain: "kinderpunkte.firebaseapp.com",
  databaseURL: "https://kinderpunkte-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "kinderpunkte",
  storageBucket: "kinderpunkte.firebasestorage.app",
  messagingSenderId: "692809846345",
  appId: "1:692809846345:web:7f768feca0a0a5f7ee3998",
  measurementId: "G-ZMRWCHR0YX"
};

const app =
  initializeApp(firebaseConfig);

export const db =
  getDatabase(app);

export async function dbGet(path) {
  const snapshot =
    await get(ref(db, path));

  return snapshot.val();
}

export async function dbSet(path, value) {
  await set(
    ref(db, path),
    value
  );
}

export async function dbUpdate(path, value) {
  await update(
    ref(db, path),
    value
  );
}

export function dbListen(path, callback) {
  onValue(
    ref(db, path),
    snapshot => {
      callback(snapshot.val());
    }
  );
}