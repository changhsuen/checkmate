// js/index-main.js - index.html 的主要邏輯 (修復版)
// 包含從管理後台接收設定變更的功能

class MainApp {
  constructor() {
    this.roomId = this.getRoomIdFromURL();
    this.firebaseReady = false;
    this.settings = {
      title: "Trip",
      subtitle: "2025",
      dateFrom: "2025-03-15T11:30",
      dateTo: "2025-03-16T15:00",
      schedule: []
    };

    this.init();
  }

  getRoomIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('room');
  }

  init() {
    console.log('🚀 主應用程式初始化中...');
    this.setupBasicEventListeners();
    this.waitForFirebase();
  }

  waitForFirebase() {
    const checkFirebase = () => {
      if (typeof window.firebaseDB !== 'undefined') {
        console.log('🔥 Firebase 連接成功！');
        this.firebaseReady = true;
        if (this.roomId) {
          this.setupRealtimeSettingsListener();
        }
      } else {
        console.log('⏳ 等待 Firebase...');
        setTimeout(checkFirebase, 500);
      }
    };
    checkFirebase();
  }

  // ================================
  // Firebase 設定監聽
  // ================================

  setupRealtimeSettingsListener() {
    if (!this.firebaseReady || !window.firebaseDB) return;

    try {
      // 監聽管理後台的設定變更
      const settingsRef = window.firebaseRef(`rooms/${this.roomId}/app-settings`);
      
      window.firebaseOnValue(settingsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          console.log('📥 收到管理後台的設定更新:', data);
          this.updateAppSettings(data);
          this.showNotification('頁面內容已更新');
        }
      });

      console.log('👂 已設置即時設定監聽器');
      
    } catch (error) {
      console.error('❌ 設置設定監聽器失敗:', error);
    }
  }

  updateAppSettings(newSettings) {
    // 更新本地設定
    this.settings = { ...this.settings, ...newSettings };

    // 更新頁面內容
    this.updatePageContent();
    
    // 更新倒數計時
    this.updateCountdown();
  }

  updatePageContent() {
    // 更新標題
    const titleEl = document.querySelector('.title');
    const yearEl = document.querySelector('.year');
    
    if (titleEl && this.settings.title) {
      titleEl.textContent = this.settings.title;
    }
    
    if (yearEl && this.settings.subtitle) {
      yearEl.textContent = this.settings.subtitle;
    }

    // 更新日期顯示
    this.updateDateDisplay();
    
    // 更新行程
    this.updateScheduleDisplay();

    console.log('✅ 頁面內容已更新');
  }

  updateDateDisplay() {
    const countdownDateEl = document.getElementById('countdown-date');
    if (!countdownDateEl || !this.settings.dateFrom) return;

    try {
      const fromDate = new Date(this.settings.dateFrom);
      const toDate = new Date(this.settings.dateTo);
      const isSameDay = fromDate.toDateString() === toDate.toDateString();
      
      if (isSameDay) {
        countdownDateEl.textContent = fromDate.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        });
      } else {
        const fromStr = fromDate.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric' 
        });
        const toStr = toDate.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        });
        countdownDateEl.textContent = `${fromStr} - ${toStr}`;
      }
    } catch (error) {
      console.error('日期格式錯誤:', error);
    }
  }

  updateScheduleDisplay() {
    const scheduleContentEl = document.getElementById('schedule-content');
    if (!scheduleContentEl) return;

    if (this.settings.schedule && this.settings.schedule.length > 0) {
      scheduleContentEl.innerHTML = this.settings.schedule.map(item => 
        `<div class="schedule-item">
          <span class="schedule-time">${item.time}</span>
          <span class="schedule-activity">${item.activity}</span>
        </div>`
      ).join('');
    } else {
      scheduleContentEl.innerHTML = '<div class="empty-state">No Schedule yet</div>';
    }
  }

  updateCountdown() {
    // 重新設置倒數計時目標
    if (this.settings.dateFrom) {
      const newTargetDate = new Date(this.settings.dateFrom).getTime();
      
      // 如果有全域的倒數計時函數，更新目標時間
      if (window.updateCountdownTarget) {
        window.updateCountdownTarget(newTargetDate);
      }
    }
  }

  // ================================
  // 基本事件監聽器
  // ================================

  setupBasicEventListeners() {
    this.setupAdminButton();
    this.setupShareButton();
  }

  setupAdminButton() {
    const adminBtn = document.getElementById('admin-btn');
    if (adminBtn) {
      adminBtn.addEventListener('click', () => {
        let roomId = this.roomId;
        
        if (!roomId) {
          roomId = 'room-' + Date.now();
          // 更新當前頁面的URL，加入房間ID
          const newUrl = new URL(window.location);
          newUrl.searchParams.set('room', roomId);
          window.history.replaceState({}, '', newUrl);
          this.roomId = roomId;
          
          // 如果 Firebase 已準備好，設置監聽器
          if (this.firebaseReady) {
            this.setupRealtimeSettingsListener();
          }
        }
        
        // 跳轉到管理頁面
        window.location.href = `admin.html?room=${roomId}`;
      });
    }
  }

  setupShareButton() {
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        let roomId = this.roomId;
        
        if (!roomId) {
          roomId = 'room-' + Date.now();
          const newUrl = new URL(window.location);
          newUrl.searchParams.set('room', roomId);
          window.history.replaceState({}, '', newUrl);
          this.roomId = roomId;
          
          // 如果 Firebase 已準備好，設置監聽器
          if (this.firebaseReady) {
            this.setupRealtimeSettingsListener();
          }
        }
        
        const shareLink = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        
        if (navigator.clipboard) {
          navigator.clipboard.writeText(shareLink).then(() => {
            this.showNotification('分享連結已複製到剪貼板');
          }).catch(err => {
            this.fallbackCopyTextToClipboard(shareLink, '分享連結已複製');
          });
        } else {
          this.fallbackCopyTextToClipboard(shareLink, '分享連結已複製');
        }
      });
    }
  }

  // ================================
  // 工具函數
  // ================================

  fallbackCopyTextToClipboard(text, successMessage) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        this.showNotification(successMessage);
      } else {
        this.showLinkAlert(text);
      }
    } catch (err) {
      console.error('複製失敗:', err);
      this.showLinkAlert(text);
    }
    
    document.body.removeChild(textArea);
  }

  showLinkAlert(link) {
    alert(`請手動複製此連結:\n\n${link}`);
  }

  showNotification(message, type = 'success') {
    // 移除現有通知
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    const bgColor = type === 'error' ? '#dc3545' : '#4CAF50';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bgColor};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 1000;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 350px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }
}

// 全域主應用程式實例
let mainApp;

// DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('🎯 DOM 載入完成，初始化主應用程式...');
  mainApp = new MainApp();
});

// 等待 Firebase 準備完成
window.addEventListener('firebaseReady', function() {
  console.log('🔥 Firebase 已準備完成');
  if (!mainApp) {
    mainApp = new MainApp();
  }
});

console.log('📦 Main App 模組載入完成');
