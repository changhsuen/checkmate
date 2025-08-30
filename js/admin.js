// js/admin.js - 管理後台主要邏輯 (修復版 - 取代現有檔案)

class AdminSystem {
  constructor() {
    this.roomId = this.getRoomIdFromURL();
    this.firebaseReady = false;
    this.settings = {
      title: "Trip",
      subtitle: "2025",
      sections: {
        title: true,
        countdown: true,
        schedule: true,
        packingList: true,
      },
      dateCountdown: {
        from: "2025-03-15T11:30",
        to: "2025-03-16T15:00",
      },
      schedule: [],
      theme: "default",
    };
    this.init();
  }

  getRoomIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("room") || 'demo-room-' + Date.now();
  }

  init() {
    console.log('🚀 管理系統初始化中...');
    this.bindEvents();
    this.updatePreview();
    this.waitForFirebase();
  }

  waitForFirebase() {
    const checkFirebase = () => {
      if (typeof window.firebaseDB !== 'undefined') {
        console.log('🔥 Firebase 連接成功！');
        this.firebaseReady = true;
        this.loadRoomData();
      } else {
        console.log('⏳ 等待 Firebase...');
        setTimeout(checkFirebase, 500);
      }
    };
    checkFirebase();
  }

  // ================================
  // Firebase 資料同步 - 核心修復
  // ================================

  async loadRoomData() {
    if (!this.firebaseReady || !window.firebaseDB) return;

    try {
      const settingsRef = window.firebaseRef(`rooms/${this.roomId}/settings`);
      
      // 設置即時監聽器
      window.firebaseOnValue(settingsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          console.log('📥 從 Firebase 載入設定:', data);
          
          // 更新本地設定
          this.settings = { ...this.settings, ...data };
          this.updatePreview();
          
          this.showNotification('設定已載入');
        } else {
          console.log('📋 沒有找到雲端設定，使用預設值');
        }
      });
      
    } catch (error) {
      console.error('❌ 載入設定失敗:', error);
      this.showNotification('載入設定失敗', 'error');
    }
  }

  async saveToFirebase() {
    if (!this.firebaseReady || !window.firebaseDB) {
      console.log('⚠️ Firebase 未準備完成，無法儲存');
      this.showNotification('Firebase 連接中，請稍後再試', 'warning');
      return;
    }

    try {
      // 儲存到管理設定
      const settingsRef = window.firebaseRef(`rooms/${this.roomId}/settings`);
      await window.firebaseSet(settingsRef, {
        ...this.settings,
        lastUpdated: new Date().toISOString(),
      });

      // 同步到主應用程式設定
      await this.syncToMainApp();
      
      console.log("✅ Settings saved to Firebase");
      this.showNotification('設定已儲存！');
      
    } catch (error) {
      console.error("❌ Failed to save settings:", error);
      this.showNotification('儲存失敗，請稍後再試', 'error');
    }
  }

  // 同步設定到主應用程式
  async syncToMainApp() {
    try {
      const mainSettingsRef = window.firebaseRef(`rooms/${this.roomId}/app-settings`);
      await window.firebaseSet(mainSettingsRef, {
        title: this.settings.title,
        subtitle: this.settings.subtitle,
        dateFrom: this.settings.dateCountdown?.from || this.settings.dateFrom,
        dateTo: this.settings.dateCountdown?.to || this.settings.dateTo,
        schedule: this.settings.schedule,
        lastUpdated: new Date().toISOString()
      });
      
      console.log('🔄 已同步設定到主應用程式');
    } catch (error) {
      console.error('❌ 同步到主應用程式失敗:', error);
    }
  }

  // ================================
  // 事件處理
  // ================================

  bindEvents() {
    // 頁籤切換
    document.addEventListener("click", (e) => {
      if (e.target.matches(".tab-btn")) {
        const tab = e.target.dataset.tab;
        this.switchTab(tab);
      }

      if (e.target.matches(".section-item") || e.target.closest(".section-item")) {
        const section = e.target.dataset.section || e.target.closest(".section-item").dataset.section;
        this.openSectionModal(section);
      }

      if (e.target.matches(".modal-overlay") || e.target.matches(".modal-close")) {
        this.closeModal();
      }
    });

    // 發布按鈕 - 修復為儲存到 Firebase
    const publishBtn = document.getElementById('publish-btn');
    if (publishBtn) {
      publishBtn.addEventListener('click', () => {
        this.saveToFirebase();
      });
    }

    // 複製連結按鈕
    const copyUserBtn = document.getElementById('copy-user-link');
    const copyAdminBtn = document.getElementById('copy-admin-link');
    
    if (copyUserBtn) copyUserBtn.addEventListener('click', () => this.copyUserLink());
    if (copyAdminBtn) copyAdminBtn.addEventListener('click', () => this.copyAdminLink());

    // 區塊開關
    document.addEventListener("change", (e) => {
      if (e.target.matches('input[type="checkbox"][data-section]')) {
        const section = e.target.dataset.section;
        this.settings.sections[section] = e.target.checked;
        this.updatePreview();
      }
    });
  }

  switchTab(tabName) {
    document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"));

    const tabBtn = document.querySelector(`[data-tab="${tabName}"].tab-btn`);
    const tabContent = document.querySelector(`[data-tab="${tabName}"].tab-content`);
    
    if (tabBtn) tabBtn.classList.add("active");
    if (tabContent) tabContent.classList.add("active");
  }

  // ================================
  // 彈出視窗管理
  // ================================

  openSectionModal(sectionKey) {
    const modal = document.getElementById("modal-overlay");
    const content = document.getElementById("modal-content");

    if (modal && content) {
      content.innerHTML = this.getModalContent(sectionKey);
      modal.style.display = "flex";

      // 綁定表單事件
      this.bindModalEvents(sectionKey);
    }
  }

  closeModal() {
    const modal = document.getElementById("modal-overlay");
    if (modal) {
      modal.style.display = "none";
    }
  }

  getModalContent(sectionKey) {
    switch (sectionKey) {
      case "title":
        return `
          <div class="modal-header">
            <h3>標題設定</h3>
            <button class="modal-close">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>主標題</label>
              <input type="text" id="title-input" value="${this.settings.title}" placeholder="輸入主標題">
            </div>
            <div class="form-group">
              <label>副標題</label>
              <input type="text" id="subtitle-input" value="${this.settings.subtitle}" placeholder="輸入副標題">
            </div>
          </div>
          <div class="modal-footer">
            <button class="save-btn" data-action="save-title">儲存</button>
          </div>
        `;

      case "dateCountdown":
        const dateFrom = this.settings.dateCountdown?.from || this.settings.dateFrom || "2025-03-15T11:30";
        const dateTo = this.settings.dateCountdown?.to || this.settings.dateTo || "2025-03-16T15:00";
        
        return `
          <div class="modal-header">
            <h3>倒數計時設定</h3>
            <button class="modal-close">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>開始時間</label>
              <input type="datetime-local" id="date-from" value="${dateFrom}">
            </div>
            <div class="form-group">
              <label>結束時間</label>
              <input type="datetime-local" id="date-to" value="${dateTo}">
            </div>
          </div>
          <div class="modal-footer">
            <button class="save-btn" data-action="save-dates">儲存</button>
          </div>
        `;

      case "schedule":
        return `
          <div class="modal-header">
            <h3>行程設定</h3>
            <button class="modal-close">×</button>
          </div>
          <div class="modal-body">
            <div id="schedule-list">
              ${this.settings.schedule
                .map(
                  (item, index) => `
                <div class="schedule-row">
                  <input type="time" value="${item.time}" data-index="${index}" data-field="time">
                  <input type="text" value="${item.activity}" data-index="${index}" data-field="activity" placeholder="活動">
                  <button class="remove-btn" data-index="${index}">×</button>
                </div>
              `
                )
                .join("")}
            </div>
            <button class="add-schedule-btn">+ 新增行程</button>
          </div>
          <div class="modal-footer">
            <button class="save-btn" data-action="save-schedule">儲存</button>
          </div>
        `;

      default:
        return `
          <div class="modal-header">
            <h3>${sectionKey}</h3>
            <button class="modal-close">×</button>
          </div>
          <div class="modal-body">
            <p>功能開發中...</p>
          </div>
        `;
    }
  }

  bindModalEvents(sectionKey) {
    const modal = document.getElementById("modal-content");
    if (!modal) return;

    modal.addEventListener("click", (e) => {
      if (e.target.matches('[data-action="save-title"]')) {
        this.saveTitleSettings();
      }

      if (e.target.matches('[data-action="save-dates"]')) {
        this.saveDateSettings();
      }

      if (e.target.matches('[data-action="save-schedule"]')) {
        this.saveScheduleSettings();
      }

      if (e.target.matches(".add-schedule-btn")) {
        this.addScheduleItem();
      }

      if (e.target.matches(".remove-btn")) {
        const index = parseInt(e.target.dataset.index);
        this.removeScheduleItem(index);
      }
    });

    modal.addEventListener("input", (e) => {
      if (e.target.matches("input[data-index]")) {
        const index = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        if (this.settings.schedule[index]) {
          this.settings.schedule[index][field] = e.target.value;
        }
      }
    });
  }

  // ================================
  // 設定儲存函數
  // ================================

  saveTitleSettings() {
    const titleInput = document.getElementById("title-input");
    const subtitleInput = document.getElementById("subtitle-input");
    
    if (titleInput && subtitleInput) {
      this.settings.title = titleInput.value;
      this.settings.subtitle = subtitleInput.value;
      
      this.updatePreview();
      this.closeModal();
      this.showNotification('標題已更新');
      
      // 立即儲存到 Firebase
      this.saveToFirebase();
    }
  }

  saveDateSettings() {
    const dateFromInput = document.getElementById("date-from");
    const dateToInput = document.getElementById("date-to");
    
    if (dateFromInput && dateToInput) {
      // 更新兩種格式以保持兼容性
      this.settings.dateCountdown = {
        from: dateFromInput.value,
        to: dateToInput.value
      };
      this.settings.dateFrom = dateFromInput.value;
      this.settings.dateTo = dateToInput.value;
      
      this.updatePreview();
      this.closeModal();
      this.showNotification('日期已更新');
      
      // 立即儲存到 Firebase
      this.saveToFirebase();
    }
  }

  saveScheduleSettings() {
    this.updatePreview();
    this.closeModal();
    this.showNotification('行程已更新');
    
    // 立即儲存到 Firebase
    this.saveToFirebase();
  }

  addScheduleItem() {
    this.settings.schedule.push({ 
      time: "16:00", 
      activity: "新活動" 
    });
    
    const content = document.getElementById("modal-content");
    if (content) {
      content.innerHTML = this.getModalContent("schedule");
      this.bindModalEvents("schedule");
    }
  }

  removeScheduleItem(index) {
    this.settings.schedule.splice(index, 1);
    const content = document.getElementById("modal-content");
    if (content) {
      content.innerHTML = this.getModalContent("schedule");
      this.bindModalEvents("schedule");
    }
  }

  // ================================
  // 預覽更新
  // ================================

  updatePreview() {
    // 更新標題
    const titleEl = document.getElementById('preview-title');
    const subtitleEl = document.getElementById('preview-subtitle');
    
    if (titleEl) titleEl.textContent = this.settings.title;
    if (subtitleEl) subtitleEl.textContent = this.settings.subtitle;
    
    // 更新日期顯示
    this.updateDatePreview();
    
    // 更新行程預覽
    this.updateSchedulePreview();
  }

  updateDatePreview() {
    const dateEl = document.getElementById('preview-date');
    if (!dateEl) return;
    
    const dateFrom = this.settings.dateCountdown?.from || this.settings.dateFrom;
    if (!dateFrom) return;
    
    try {
      const fromDate = new Date(dateFrom);
      const dateTo = this.settings.dateCountdown?.to || this.settings.dateTo;
      const toDate = new Date(dateTo);
      const isSameDay = fromDate.toDateString() === toDate.toDateString();
      
      if (isSameDay) {
        dateEl.textContent = fromDate.toLocaleDateString('en-US', { 
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
        dateEl.textContent = `${fromStr} - ${toStr}`;
      }
    } catch (error) {
      console.error('日期格式錯誤:', error);
      dateEl.textContent = 'Invalid Date';
    }
  }

  updateSchedulePreview() {
    const scheduleEl = document.getElementById('schedule-preview');
    if (!scheduleEl) return;
    
    if (this.settings.schedule.length > 0) {
      scheduleEl.innerHTML = this.settings.schedule.map(item => 
        `<div class="schedule-item">
          <span class="time">${item.time}</span>
          <span class="activity">${item.activity}</span>
        </div>`
      ).join('');
    } else {
      scheduleEl.innerHTML = '<div class="empty-state">No Schedule yet</div>';
    }
  }

  // ================================
  // 連結複製功能
  // ================================

  copyUserLink() {
    const baseUrl = window.location.origin;
    const pathName = window.location.pathname.replace('/admin.html', '');
    const userLink = `${baseUrl}${pathName}/index.html?room=${this.roomId}`;
    
    this.copyToClipboard(userLink, '用戶連結已複製到剪貼板');
  }

  copyAdminLink() {
    const adminLink = `${window.location.origin}${window.location.pathname}?room=${this.roomId}`;
    this.copyToClipboard(adminLink, '管理連結已複製到剪貼板');
  }

  copyToClipboard(text, successMessage) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.showNotification(successMessage);
      }).catch(err => {
        this.fallbackCopyTextToClipboard(text, successMessage);
      });
    } else {
      this.fallbackCopyTextToClipboard(text, successMessage);
    }
  }

  fallbackCopyTextToClipboard(text, successMessage) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        this.showNotification(successMessage);
      } else {
        this.showLinkInModal(text, '請手動複製此連結');
      }
    } catch (err) {
      console.error('複製失敗:', err);
      this.showLinkInModal(text, '請手動複製此連結');
    }
    
    document.body.removeChild(textArea);
  }

  showLinkInModal(link, title) {
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    
    if (modal && content) {
      content.innerHTML = `
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>連結:</label>
            <input type="text" value="${link}" readonly onclick="this.select()" 
                   style="width: 100%; padding: 10px; margin-top: 5px; box-sizing: border-box;">
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 10px;">
            請選取上方文字框中的連結並複製 (Ctrl+C 或 Cmd+C)
          </p>
        </div>
      `;
      
      modal.style.display = 'flex';
    }
  }

  // ================================
  // 通知系統
  // ================================

  showNotification(message, type = 'success') {
    // 移除現有通知
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    let bgColor = '#28a745'; // success
    if (type === 'error') bgColor = '#dc3545';
    if (type === 'warning') bgColor = '#ffc107';
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bgColor};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      z-index: 1001;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.2);
      max-width: 350px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 4000);
  }
}

// 全域管理系統實例
let adminSystem;

// DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('🎯 DOM 載入完成，等待 Firebase...');
});

// 等待 Firebase 準備完成
window.addEventListener('firebaseReady', function() {
  console.log('🔥 Firebase 已準備完成，初始化管理系統');
  adminSystem = new AdminSystem();
});

// 如果 Firebase 已經準備好了
if (typeof window.firebaseDB !== 'undefined') {
  adminSystem = new AdminSystem();
}

console.log('📦 Admin System 模組載入完成');
