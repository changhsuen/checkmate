// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  set,
  push,
  remove,
  off,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCxU1oul267oJxSDwp5pSYbQugx487eFHM",
  authDomain: "checkmate-80c76.firebaseapp.com",
  databaseURL: "https://checkmate-80c76-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "checkmate-80c76",
  storageBucket: "checkmate-80c76.firebasestorage.app",
  messagingSenderId: "214846552967",
  appId: "1:214846552967:web:333c937ea54a828b80b122",
  measurementId: "G-DK9DDYEH8H"
};

const allowedDomains = [
  "localhost",
  "127.0.0.1",
  "changhsuen.github.io", // 替換為你的 GitHub 用戶名
  "checkmate-80c76.web.app",
  "checkmate-80c76.firebaseapp.com",
];

const currentDomain = window.location.hostname;
const isDomainAllowed = allowedDomains.some((domain) => currentDomain === domain || currentDomain.includes(domain));

if (!isDomainAllowed && window.location.hostname !== "localhost") {
  console.warn("警告：當前域名未被授權");
}

try {
  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);

  window.firebaseDB = database;
  window.firebaseRef = (path) => ref(database, path);
  window.firebaseOnValue = onValue;
  window.firebaseSet = set;
  window.firebasePush = push;
  window.firebaseRemove = remove;
  window.firebaseOff = off;

  window.dispatchEvent(new Event("firebaseReady"));
  console.log("Firebase 初始化成功！");
} catch (error) {
  console.error("Firebase 初始化錯誤:", error);
  window.dispatchEvent(new Event("firebaseReady"));
}
