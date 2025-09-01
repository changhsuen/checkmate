// js/index-main.js - 完整修復版：整合所有功能
class MainApp {
  constructor() {
    this.roomId = this.getRoomIdFromURL();
    this.firebaseReady = false;
    this.packingListLoaded = false;
    this.settings = {
      title: "Trip",
      subtitle: "2025",
      googleMapLinks: [],
      dateFrom: "2025-03-15T11:30",
      dateTo: "2025-03-16T15:00",
      schedule: [],
      packingItems: {}
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
        } else {
          // 沒有房間ID時載入預設內容
          this.loadDefaultContent();
        }
        // 確保 Packing List 功能載入
        this.ensurePackingListFunctionality();
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
        } else {
          // 沒有設定時載入預設內容
          this.loadDefaultContent();
        }
      });

      console.log('👂 已設置即時設定監聽器');
      
    } catch (error) {
      console.error('❌ 設置設定監聽器失敗:', error);
      this.loadDefaultContent();
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

    // 更新 Google Map Links
    this.updateGoogleMapLinks();
    
    // 更新日期顯示
    this.updateDateDisplay();
    
    // 更新行程
    this.updateScheduleDisplay();

    console.log('✅ 頁面內容已更新');
  }

  updateGoogleMapLinks() {
    const quickLinksEl = document.getElementById('quick-links');
    if (!quickLinksEl) return;

    // 清空現有連結
    quickLinksEl.innerHTML = '';

    // 添加分享按鈕（永遠保留）
    const shareBtn = document.createElement('button');
    shareBtn.className = 'link-btn';
    shareBtn.id = 'share-btn';
    shareBtn.innerHTML = '📤 分享活動';
    quickLinksEl.appendChild(shareBtn);

    // 重新綁定分享按鈕事件
    this.setupShareButton();

    // 添加 Google Map 連結（去除圖標）
    if (this.settings.googleMapLinks && this.settings.googleMapLinks.length > 0) {
      this.settings.googleMapLinks.forEach(link => {
        if (link.destination && link.url) {
          const linkBtn = document.createElement('a');
          linkBtn.className = 'link-btn';
          linkBtn.href = link.url;
          linkBtn.target = '_blank';
          linkBtn.textContent = link.destination; // 去除圖標，只顯示文字
          quickLinksEl.appendChild(linkBtn);
        }
      });
    }

    console.log('✅ Google Map Links 已更新');
  }

  updateDateDisplay() {
    const countdownDateEl = document.getElementById('countdown-date');
    if (!countdownDateEl) return;

    if (this.settings.dateFrom) {
      try {
        const fromDate = new Date(this.settings.dateFrom);
        const toDate = new Date(this.settings.dateTo || this.settings.dateFrom);
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
  }

  updateScheduleDisplay() {
    const scheduleContentEl = document.getElementById('schedule-content');
    if (!scheduleContentEl) return;

    if (this.settings.schedule && this.settings.schedule.length > 0) {
      let scheduleHTML = '';
      
      this.settings.schedule.forEach(day => {
        if (day.activities && day.activities.length > 0) {
          day.activities.forEach(activity => {
            scheduleHTML += `
              <div class="schedule-item">
                <div class="schedule-time">${activity.time}</div>
                <div class="schedule-activity">${activity.activity}</div>
              </div>
            `;
          });
        }
      });

      scheduleContentEl.innerHTML = scheduleHTML || '<div class="empty-state">No Schedule yet</div>';
    } else {
      scheduleContentEl.innerHTML = '<div class="empty-state">No Schedule yet</div>';
    }

    console.log('✅ Schedule 已更新');
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
  // 確保 Packing List 功能載入
  // ================================

  ensurePackingListFunctionality() {
    // 檢查是否需要重新初始化 packing list
    if (!window.packingListLoaded && !this.packingListLoaded) {
      console.log('📦 初始化 Packing List 功能...');
      this.packingListLoaded = true;
      window.packingListLoaded = true;
      
      // 設置一個小延遲確保所有腳本都載入完成
      setTimeout(() => {
        this.initializePackingList();
      }, 1000);
    }
  }

  initializePackingList() {
    console.log('📋 設置 Packing List 功能...');
    
    // 如果 script.js 中的功能還沒載入，載入預設項目
    if (!window.packingInitialized) {
      this.loadDefaultPackingItems();
    }
  }

  loadDefaultPackingItems() {
    console.log('📦 初始化空的 Packing List...');
    
    // 不載入預設項目，保持空狀態
    const emptyPackingData = {
      "shared-items": [],
      "personal-items": []
    };

    // 如果有可用的渲染函數，使用它
    if (typeof window.renderItemsFromFirebase === 'function') {
      window.renderItemsFromFirebase(emptyPackingData);
    } else {
      // 手動渲染空項目
      this.renderPackingItems(emptyPackingData);
    }
    
    // 初始化基本的人員篩選按鈕
    this.createPersonFilters(emptyPackingData);
  }

  renderPackingItems(data) {
    console.log('🎨 手動渲染 Packing List 項目');
    
    // 渲染到各自的列表
    for (const categoryId in data) {
      const list = document.getElementById(categoryId);
      if (list && data[categoryId] && Array.isArray(data[categoryId])) {
        list.innerHTML = '';
        data[categoryId].forEach(item => {
          this.createItemElement(list, item);
        });
      }
    }
    
    // 創建人員篩選按鈕
    this.createPersonFilters(data);
  }

  createItemElement(list, item) {
    const li = document.createElement('li');
    li.className = 'item';
    li.dataset.person = item.personData || item.persons;

    // Checkbox 容器
    const customCheckbox = document.createElement('div');
    customCheckbox.className = 'custom-checkbox';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = item.id;

    const checkboxLabel = document.createElement('label');
    checkboxLabel.className = 'checkbox-label';
    checkboxLabel.setAttribute('for', item.id);

    customCheckbox.appendChild(checkbox);
    customCheckbox.appendChild(checkboxLabel);
    li.appendChild(customCheckbox);

    // 項目標籤
    const itemLabel = document.createElement('label');
    itemLabel.className = 'item-label';
    itemLabel.setAttribute('for', item.id);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'item-name';
    nameSpan.textContent = item.name;
    itemLabel.appendChild(nameSpan);

    if (item.quantity) {
      const quantitySpan = document.createElement('span');
      quantitySpan.className = 'item-quantity';
      quantitySpan.textContent = `x${item.quantity}`;
      itemLabel.appendChild(quantitySpan);
    }

    // 負責人標籤
    const personTags = document.createElement('span');
    personTags.className = 'person-tags';

    if (item.persons) {
      const personsList = item.persons.split(',');
      personsList.forEach(person => {
        if (person.trim()) {
          const personTag = document.createElement('span');
          personTag.className = 'person-tag';
          personTag.textContent = person.trim();
          personTags.appendChild(personTag);
        }
      });
    }
    itemLabel.appendChild(personTags);

    li.appendChild(itemLabel);
    list.appendChild(li);
  }

  createPersonFilters(data) {
    const personFilter = document.getElementById('person-filter');
    if (!personFilter) return;

    const allPersons = new Set(['All']);

    // 收集所有人員
    Object.values(data).forEach(categoryItems => {
      if (Array.isArray(categoryItems)) {
        categoryItems.forEach(item => {
          if (item.persons) {
            const persons = item.persons.split(',').map(p => p.trim());
            persons.forEach(person => {
              if (person && person !== 'All') {
                allPersons.add(person);
              }
            });
          }
        });
      }
    });

    // 清空並重新創建篩選按鈕
    personFilter.innerHTML = '';
    
    const allButton = document.createElement('button');
    allButton.className = 'filter-btn active';
    allButton.dataset.person = 'all';
    allButton.textContent = 'All';
    personFilter.appendChild(allButton);

    // 按字母順序排序其他人員
    const sortedPersons = Array.from(allPersons).filter(p => p !== 'All').sort();
    
    sortedPersons.forEach(person => {
      const button = document.createElement('button');
      button.className = 'filter-btn';
      button.textContent = person;
      button.dataset.person = person;
      personFilter.appendChild(button);
    });

    // 設置篩選功能（簡化版）
    personFilter.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-btn')) {
        // 移除所有 active 類別
        personFilter.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        // 添加到當前點擊的按鈕
        e.target.classList.add('active');
        
        const selectedPerson = e.target.dataset.person;
        this.filterItems(selectedPerson);
      }
    });
  }

  filterItems(person) {
    const items = document.querySelectorAll('.item');

    items.forEach(item => {
      if (person === 'all') {
        item.style.display = '';
      } else {
        const itemPersons = item.dataset.person ? item.dataset.person.split(',').map(p => p.trim()) : [];
        
        if (itemPersons.includes(person) || itemPersons.includes('All')) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      }
    });
  }

  // ================================
  // 載入預設內容
  // ================================

  loadDefaultContent() {
    console.log('📋 載入預設內容');
    
    // 載入預設的 Google Map Links（去除圖標）
    this.settings.googleMapLinks = [
      { destination: "Camping Gear Rental", url: "https://maps.app.goo.gl/17ijdqNEz8eBcPr39" },
      { destination: "Campground", url: "https://maps.app.goo.gl/qcHmgWCcvEGAaVCQ6" }
    ];

    // 載入預設 Schedule
    this.settings.schedule = [
      {
        day: "Day1",
        activities: [
          { time: "11:20", activity: "Meet up" },
          { time: "13:20", activity: "Lunch" },
          { time: "13:50", activity: "Shop for food at PX Mart" },
          { time: "15:00", activity: "Campground check-in" }
        ]
      }
    ];

    // 更新頁面內容
    this.updatePageContent();
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
      // 移除舊的事件監聽器
      const newShareBtn = shareBtn.cloneNode(true);
      shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
      
      newShareBtn.addEventListener('click', () => {
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

console.log('📦 Complete Main App 模組載入完成');
