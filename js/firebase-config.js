// firebase-config.js - 請立即更換為新的 Firebase 專案配置
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

// ⚠️ 警告：這個配置已經暴露，請立即創建新的 Firebase 專案並更換配置
const firebaseConfig = {
  // 請更換為你的新 Firebase 專案配置
  apiKey: "YOUR_NEW_API_KEY",
  authDomain: "your-new-project.firebaseapp.com",
  databaseURL: "https://your-new-project-default-rtdb.region.firebasedatabase.app",
  projectId: "your-new-project",
  storageBucket: "your-new-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789",
  measurementId: "G-ABCDEF123456"
};

const allowedDomains = [
  "localhost",
  "127.0.0.1",
  "yourusername.github.io", // 替換為你的 GitHub 用戶名
  "your-new-project.web.app",
  "your-new-project.firebaseapp.com",
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
  // 即使 Firebase 失敗也要發送事件，讓應用能以離線模式運行
  window.dispatchEvent(new Event("firebaseReady"));
}
