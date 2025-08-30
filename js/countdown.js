// js/countdown.js - 倒數計時功能（修復版 - 支援動態更新）

class CountdownManager {
  constructor() {
    // 預設目標日期：2025年3月15日 11:30
    this.targetDate = new Date(2025, 2, 15, 11, 30, 0).getTime();
    this.countdownInterval = null;
    this.isRunning = false;
    
    this.init();
  }

  init() {
    console.log('⏰ 倒數計時初始化中...');
    this.startCountdown();
    
    // 提供全域函數供外部調用
    window.updateCountdownTarget = (newTargetDate) => {
      this.updateTarget(newTargetDate);
    };
  }

  // 更新目標時間
  updateTarget(newTargetDate) {
    console.log('🔄 更新倒數計時目標時間:', new Date(newTargetDate));
    this.targetDate = newTargetDate;
    
    // 如果計時器正在運行，重新開始
    if (this.isRunning) {
      this.stopCountdown();
      this.startCountdown();
    }
  }

  // 開始倒數計時
  startCountdown() {
    if (this.isRunning) {
      return;
    }

    console.log('▶️ 開始倒數計時');
    this.isRunning = true;
    
    // 立即執行一次
    this.updateDisplay();
    
    // 設定每秒更新一次
    this.countdownInterval = setInterval(() => {
      this.updateDisplay();
    }, 1000);
  }

  // 停止倒數計時
  stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.isRunning = false;
    console.log('⏸️ 倒數計時已停止');
  }

  // 更新顯示
  updateDisplay() {
    const now = new Date().getTime();
    const timeRemaining = this.targetDate - now;

    // 獲取顯示元素
    const daysEl = document.getElementById("days");
    const hoursEl = document.getElementById("hours");
    const minutesEl = document.getElementById("minutes");
    const secondsEl = document.getElementById("seconds");

    // 如果已經到達或超過目標時間
    if (timeRemaining <= 0) {
      if (daysEl) daysEl.textContent = "00";
      if (hoursEl) hoursEl.textContent = "00";
      if (minutesEl) minutesEl.textContent = "00";
      if (secondsEl) secondsEl.textContent = "00";
      
      this.stopCountdown();
      console.log('🎉 倒數計時結束！');
      return;
    }

    // 計算天、小時、分鐘和秒數
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

    // 更新HTML元素 - 確保元素存在且總是有兩位數字
    if (daysEl) daysEl.textContent = days.toString().padStart(2, "0");
    if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, "0");
    if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, "0");
    if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, "0");
  }

  // 從日期字串設置目標時間（供外部調用）
  setTargetFromDateString(dateString) {
    try {
      const targetDate = new Date(dateString).getTime();
      if (!isNaN(targetDate)) {
        this.updateTarget(targetDate);
      } else {
        console.error('❌ 無效的日期格式:', dateString);
      }
    } catch (error) {
      console.error('❌ 設置目標時間失敗:', error);
    }
  }

  // 獲取目前狀態
  getStatus() {
    return {
      isRunning: this.isRunning,
      targetDate: this.targetDate,
      timeRemaining: this.targetDate - new Date().getTime()
    };
  }
}

// 全域倒數計時管理器實例
let countdownManager;

// 等待 DOM 載入完成後再啟動
document.addEventListener('DOMContentLoaded', function() {
  console.log('📅 DOM 已載入，初始化倒數計時...');
  countdownManager = new CountdownManager();
  
  // 提供全域函數供外部調用
  window.countdownManager = countdownManager;
  window.setCountdownTarget = (dateString) => {
    if (countdownManager) {
      countdownManager.setTargetFromDateString(dateString);
    }
  };
});

// 頁面可見性變化處理（避免背景時浪費資源）
document.addEventListener('visibilitychange', function() {
  if (!countdownManager) return;
  
  if (document.hidden) {
    console.log('⏸️ 頁面隱藏，暫停倒數計時');
    countdownManager.stopCountdown();
  } else {
    console.log('▶️ 頁面顯示，恢復倒數計時');
    countdownManager.startCountdown();
  }
});

console.log('📦 Countdown Manager 模組載入完成');
