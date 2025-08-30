// js/admin.js - 完整管理後台系統 (基於 Camping2025)

class AdminSystem {
  constructor() {
    this.roomId = this.getRoomIdFromURL();
    this.firebaseReady = false;
    this.currentMiddleSection = 'packingList'; // 當前中間面板顯示的內容
    
    // 設定資料結構
    this.settings = {
      title: "Trip",
      subtitle: "2025",
      googleMapLinks: [], // 支援多個地圖連結
      dateCountdown: {
        from: this.getDefaultDate(), // 預設當天
        to: this.getDefaultDate()    // 預設當天 
      },
      schedule: [], // 支援多天行程
      packingItems: {
        "shared-items": [],
        "personal-items": []
      }
    };
    
    // Packing list 相關
    this.personCheckedItems = {};
    this.allPersons = new Set(['All']);
    
    this.init();
  }

  getRoomIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("room") || 'room-' + Date.now();
  }

  getDefaultDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T10:00`;
  }

  init() {
    console.log('🚀 管理系統初始化中...');
    this.bindEvents();
    this.updatePreview();
    this.updateMiddleContent();
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
  // Firebase 資料同步
  // ================================

  async loadRoomData() {
    if (!this.firebaseReady || !window.firebaseDB) return;

    try {
      const settingsRef = window.firebaseRef(`rooms/${this.roomId}/settings`);
      
      window.firebaseOnValue(settingsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          console.log('📥 從 Firebase 載入設定:', data);
          this.settings = { ...this.settings, ...data };
          this.updatePreview();
          this.updateMiddleContent();
          this.showNotification('Settings loaded');
        }
      });
      
    } catch (error) {
      console.error('❌ 載入設定失敗:', error);
    }
  }

  async saveToFirebase() {
    if (!this.firebaseReady || !window.firebaseDB) {
      this.showNotification('Firebase connecting...', 'warning');
      return;
    }

    try {
      const settingsRef = window.firebaseRef(`rooms/${this.roomId}/settings`);
      await window.firebaseSet(settingsRef, {
        ...this.settings,
        lastUpdated: new Date().toISOString(),
      });

      await this.syncToMainApp();
      console.log("✅ Settings saved to Firebase");
      
      // 顯示分享連結彈窗
      this.showShareModal();
      
    } catch (error) {
      console.error("❌ Failed to save settings:", error);
      this.showNotification('Save failed', 'error');
    }
  }

  async syncToMainApp() {
    try {
      const mainSettingsRef = window.firebaseRef(`rooms/${this.roomId}/app-settings`);
      await window.firebaseSet(mainSettingsRef, {
        title: this.settings.title,
        subtitle: this.settings.subtitle,
        googleMapLinks: this.settings.googleMapLinks,
        dateFrom: this.settings.dateCountdown?.from,
        dateTo: this.settings.dateCountdown?.to,
        schedule: this.settings.schedule,
        packingItems: this.settings.packingItems,
        lastUpdated: new Date().toISOString()
      });
      
      console.log('🔄 已同步設定到主應用程式');
    } catch (error) {
      console.error('❌ 同步失敗:', error);
    }
  }

  // ================================
  // 事件處理
  // ================================

  bindEvents() {
    // Tab 切換
    document.addEventListener("click", (e) => {
      if (e.target.matches(".tab-btn")) {
        const tab = e.target.dataset.tab;
        this.switchTab(tab);
      }

      // Section 點擊 - 切換中間面板內容
      if (e.target.matches(".section-item") || e.target.closest(".section-item")) {
        const section = e.target.dataset.section || e.target.closest(".section-item").dataset.section;
        
        // 如果是 packingList，直接切換中間面板，不開 modal
        if (section === 'packingList') {
          this.currentMiddleSection = 'packingList';
          this.updateMiddleContent();
        } else {
          // 其他功能開啟編輯 modal
          this.openSectionModal(section);
        }
      }

      if (e.target.matches(".modal-overlay") || e.target.matches(".modal-close")) {
        this.closeModal();
      }
    });

    // 發布按鈕
    const publishBtn = document.getElementById('publish-btn');
    if (publishBtn) {
      publishBtn.addEventListener('click', () => {
        this.saveToFirebase();
      });
    }

    // 設置 Packing List 的事件處理
    this.setupPackingListEvents();
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
  // 中間面板內容管理
  // ================================

  updateMiddleContent() {
    const middleContainer = document.getElementById('admin-middle');
    if (!middleContainer) return;

    switch(this.currentMiddleSection) {
      case 'packingList':
        middleContainer.innerHTML = this.renderPackingListContent();
        this.setupPackingListEvents();
        this.renderPackingItems();
        this.updatePersonTags();
        break;
      
      default:
        middleContainer.innerHTML = this.renderDefaultMiddleContent();
    }
  }

  renderPackingListContent() {
    return `
      <div class="middle-content" id="middle-packaging">
        <div class="middle-header">
          <h2 class="middle-title">Packaging list</h2>
        </div>
        
        <!-- 人員標籤 -->
        <div class="person-tags-section" id="person-tags">
          <div class="person-tag active" data-person="All">All</div>
        </div>
        
        <div class="form-section">
          <div class="form-row">
            <select class="form-select" id="category-select">
              <option value="Personal Gear">Personal Gear</option>
              <option value="Shared Gear">Shared Gear</option>
            </select>
          </div>
          
          <div class="form-row-horizontal">
            <input type="text" class="form-input item-input" id="new-item-name" placeholder="Item" />
            <input type="text" class="form-input number-input" id="new-item-quantity" placeholder="Number" />
          </div>
          
          <div class="form-row">
            <input type="text" class="form-input" id="new-item-person" placeholder="Name, Name, Name" />
          </div>
          
          <button class="add-btn" id="add-unified-item">Add Item</button>
        </div>

        <!-- 物品清單顯示區域 -->
        <div class="items-display-section">
          <div class="category-section">
            <h4>Shared Gear</h4>
            <div class="items-list" id="shared-items-display"></div>
          </div>
          
          <div class="category-section">
            <h4>Personal Gear</h4>
            <div class="items-list" id="personal-items-display"></div>
          </div>
        </div>
      </div>
    `;
  }

  renderDefaultMiddleContent() {
    return `
      <div class="middle-content">
        <div class="middle-header">
          <h2 class="middle-title">Settings</h2>
        </div>
        <p style="text-align: center; color: #666; padding: 40px 20px;">
          Select an item from the left panel to edit
        </p>
      </div>
    `;
  }

  // ================================
  // Packing List 功能 (基於 Camping2025)
  // ================================

  setupPackingListEvents() {
    // 添加物品按鈕
    const addBtn = document.getElementById("add-unified-item");
    if (addBtn) {
      addBtn.replaceWith(addBtn.cloneNode(true));
      document.getElementById("add-unified-item").addEventListener("click", () => {
        this.addPackingItem();
      });
    }

    // Enter 鍵支援
    const inputs = document.querySelectorAll('#middle-packaging input[type="text"]');
    inputs.forEach((input) => {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.addPackingItem();
        }
      });
    });

    // 人員標籤點擊
    document.addEventListener('click', (e) => {
      if (e.target.matches('.person-tag')) {
        document.querySelectorAll('.person-tag').forEach(tag => tag.classList.remove('active'));
        e.target.classList.add('active');
        this.filterPackingItems(e.target.dataset.person);
      }

      // 刪除物品按鈕
      if (e.target.matches('.item-delete-btn')) {
        this.deletePackingItem(e.target);
      }
    });
  }

  addPackingItem() {
    const categorySelect = document.getElementById("category-select");
    const nameInput = document.getElementById("new-item-name");
    const quantityInput = document.getElementById("new-item-quantity");
    const personInput = document.getElementById("new-item-person");

    if (!categorySelect || !nameInput) return;

    const category = categorySelect.value.trim();
    const name = nameInput.value.trim();
    const quantity = quantityInput ? quantityInput.value.trim() : "";
    const persons = personInput ? personInput.value.trim() : "";

    if (!name) {
      alert("請輸入項目名稱");
      return;
    }

    const categoryId = category === "Shared Gear" ? "shared-items" : "personal-items";
    
    const newItem = {
      id: this.generateSafeId("item"),
      name: name,
      quantity: quantity,
      persons: persons || "All",
      personData: persons || "All",
    };

    // 添加到設定中 (新的在前面)
    if (!this.settings.packingItems[categoryId]) {
      this.settings.packingItems[categoryId] = [];
    }
    this.settings.packingItems[categoryId].unshift(newItem);

    // 更新人員列表
    if (persons) {
      const personsList = persons.split(",").map(p => p.trim()).filter(p => p);
      personsList.forEach(person => this.allPersons.add(person));
    }

    // 清空輸入欄位
    nameInput.value = "";
    if (quantityInput) quantityInput.value = "";
    if (personInput) personInput.value = "";

    // 重新渲染
    this.renderPackingItems();
    this.updatePersonTags();
    this.updatePreview();
  }

  deletePackingItem(deleteBtn) {
    if (!confirm("確定要刪除這個項目嗎？")) return;

    const itemElement = deleteBtn.closest('.packing-item');
    const itemId = itemElement.dataset.itemId;
    const category = itemElement.dataset.category;

    // 從設定中移除
    this.settings.packingItems[category] = this.settings.packingItems[category].filter(item => item.id !== itemId);

    // 重新渲染
    this.renderPackingItems();
    this.updatePersonTags();
    this.updatePreview();
  }

  renderPackingItems() {
    const sharedDisplay = document.getElementById('shared-items-display');
    const personalDisplay = document.getElementById('personal-items-display');
    
    if (!sharedDisplay || !personalDisplay) return;

    // 渲染 Shared Gear
    if (this.settings.packingItems["shared-items"]) {
      sharedDisplay.innerHTML = this.settings.packingItems["shared-items"]
        .map(item => this.createPackingItemHTML(item, "shared-items"))
        .join('');
    }

    // 渲染 Personal Gear  
    if (this.settings.packingItems["personal-items"]) {
      personalDisplay.innerHTML = this.settings.packingItems["personal-items"]
        .map(item => this.createPackingItemHTML(item, "personal-items"))
        .join('');
    }

    // 應用目前的篩選
    const activePerson = document.querySelector('.person-tag.active')?.dataset.person || 'All';
    this.filterPackingItems(activePerson);
  }

  createPackingItemHTML(item, category) {
    const personsList = item.persons.split(",").map(p => p.trim());
    const personTags = personsList.map(person => 
      `<span class="person-tag-small">${person}</span>`
    ).join('');

    return `
      <div class="packing-item" data-item-id="${item.id}" data-category="${category}" data-persons="${item.persons}">
        <div class="item-content">
          <span class="item-name">${item.name}</span>
          ${item.quantity ? `<span class="item-quantity">x${item.quantity}</span>` : ''}
          <div class="item-persons">${personTags}</div>
        </div>
        <button class="item-delete-btn">×</button>
      </div>
    `;
  }

  filterPackingItems(person) {
    const items = document.querySelectorAll('.packing-item');
    
    items.forEach(item => {
      if (person === 'All') {
        item.style.display = '';
      } else {
        const itemPersons = item.dataset.persons.split(',').map(p => p.trim());
        item.style.display = itemPersons.includes(person) || itemPersons.includes('All') ? '' : 'none';
      }
    });
  }

  updatePersonTags() {
    const personTagsContainer = document.getElementById('person-tags');
    if (!personTagsContainer) return;

    // 收集所有人員
    this.allPersons.clear();
    this.allPersons.add('All');

    Object.values(this.settings.packingItems).forEach(categoryItems => {
      if (Array.isArray(categoryItems)) {
        categoryItems.forEach(item => {
          if (item.persons) {
            const persons = item.persons.split(',').map(p => p.trim()).filter(p => p && p !== 'All');
            persons.forEach(person => this.allPersons.add(person));
          }
        });
      }
    });

    // 只有當有其他人員時才顯示標籤
    if (this.allPersons.size <= 1) {
      personTagsContainer.style.display = 'none';
      return;
    }

    personTagsContainer.style.display = '';
    const currentActive = personTagsContainer.querySelector('.person-tag.active')?.dataset.person || 'All';
    
    personTagsContainer.innerHTML = Array.from(this.allPersons)
      .sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b))
      .map(person => 
        `<div class="person-tag ${person === currentActive ? 'active' : ''}" data-person="${person}">${person}</div>`
      ).join('');
  }

  // ================================
  // Modal 編輯功能
  // ================================

  openSectionModal(sectionKey) {
    const modal = document.getElementById("modal-overlay");
    const content = document.getElementById("modal-content");

    if (modal && content) {
      content.innerHTML = this.getModalContent(sectionKey);
      modal.style.display = "flex";
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
            <h3>Title Settings</h3>
            <button class="modal-close">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Title</label>
              <input type="text" id="title-input" value="${this.settings.title}" placeholder="Enter Title">
            </div>
            <div class="form-group">
              <label>Subtitle</label>
              <input type="text" id="subtitle-input" value="${this.settings.subtitle}" placeholder="Enter Subtitle">
            </div>
          </div>
          <div class="modal-footer">
            <button class="save-btn" data-action="save-title">Save</button>
          </div>
        `;

      case "googleMap":
        return `
          <div class="modal-header">
            <h3>Google Map Link</h3>
            <button class="modal-close">×</button>
            <button class="add-link-btn" data-action="add-map-link">+</button>
          </div>
          <div class="modal-body">
            <div id="map-links-list">
              ${this.settings.googleMapLinks.map((link, index) => `
                <div class="map-link-row" data-index="${index}">
                  <input type="text" value="${link.destination || ''}" data-field="destination" placeholder="Destination">
                  <input type="text" value="${link.url || ''}" data-field="url" placeholder="https://maps.google.com/...">
                  <button class="remove-link-btn" data-index="${index}">×</button>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="modal-footer">
            <button class="save-btn" data-action="save-map-links">Save</button>
          </div>
        `;

      case "countdown":
        return `
          <div class="modal-header">
            <h3>Date Countdown</h3>
            <button class="modal-close">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>From</label>
              <input type="datetime-local" id="date-from" value="${this.settings.dateCountdown?.from || this.getDefaultDate()}">
            </div>
            <div class="form-group">
              <label>To</label>
              <input type="datetime-local" id="date-to" value="${this.settings.dateCountdown?.to || this.getDefaultDate()}">
            </div>
            <p style="font-size: 12px; color: #666; margin-top: 8px;">預設為當天行程</p>
          </div>
          <div class="modal-footer">
            <button class="save-btn" data-action="save-dates">Save</button>
          </div>
        `;

      case "schedule":
        return `
          <div class="modal-header">
            <h3>Schedule</h3>
            <button class="modal-close">×</button>
            <button class="add-day-btn" data-action="add-day">+ Day</button>
          </div>
          <div class="modal-body">
            <div id="schedule-days-list">
              ${this.renderScheduleDays()}
            </div>
          </div>
          <div class="modal-footer">
            <button class="save-btn" data-action="save-schedule">Save</button>
          </div>
        `;

      default:
        return `
          <div class="modal-header">
            <h3>${sectionKey}</h3>
            <button class="modal-close">×</button>
          </div>
          <div class="modal-body">
            <p style="color: #666; text-align: center; padding: 20px;">Feature coming soon...</p>
          </div>
        `;
    }
  }

  renderScheduleDays() {
    if (!this.settings.schedule || this.settings.schedule.length === 0) {
      return '<div class="empty-schedule">No schedule yet</div>';
    }

    return this.settings.schedule.map((day, dayIndex) => `
      <div class="schedule-day" data-day-index="${dayIndex}">
        <div class="day-header">
          <h4>Day${dayIndex + 1}</h4>
          <button class="remove-day-btn" data-day-index="${dayIndex}">×</button>
        </div>
        <div class="day-activities">
          ${day.activities ? day.activities.map((activity, actIndex) => `
            <div class="schedule-row" data-day-index="${dayIndex}" data-activity-index="${actIndex}">
              <input type="time" value="${activity.time}" data-field="time">
              <input type="text" value="${activity.activity}" data-field="activity" placeholder="Activity">
              <button class="remove-activity-btn" data-day-index="${dayIndex}" data-activity-index="${actIndex}">×</button>
            </div>
          `).join('') : ''}
          <button class="add-activity-btn" data-day-index="${dayIndex}">+ Activity</button>
        </div>
      </div>
    `).join('');
  }

  bindModalEvents(sectionKey) {
    const modal = document.getElementById("modal-content");
    if (!modal) return;

    modal.addEventListener("click", (e) => {
      const action = e.target.dataset.action;
      
      switch(action) {
        case "save-title":
          this.saveTitleSettings();
          break;
        case "save-map-links":
          this.saveMapSettings();
          break;
        case "add-map-link":
          this.addMapLink();
          break;
        case "save-dates":
          this.saveDateSettings();
          break;
        case "save-schedule":
          this.saveScheduleSettings();
          break;
        case "add-day":
          this.addScheduleDay();
          break;
      }

      // Google Map Links 移除按鈕
      if (e.target.matches('.remove-link-btn')) {
        const index = parseInt(e.target.dataset.index);
        this.settings.googleMapLinks.splice(index, 1);
        modal.innerHTML = this.getModalContent(sectionKey);
        this.bindModalEvents(sectionKey);
      }

      // Schedule 相關按鈕
      if (e.target.matches('.remove-day-btn')) {
        const dayIndex = parseInt(e.target.dataset.dayIndex);
        this.settings.schedule.splice(dayIndex, 1);
        modal.innerHTML = this.getModalContent(sectionKey);
        this.bindModalEvents(sectionKey);
      }

      if (e.target.matches('.add-activity-btn')) {
        const dayIndex = parseInt(e.target.dataset.dayIndex);
        if (!this.settings.schedule[dayIndex].activities) {
          this.settings.schedule[dayIndex].activities = [];
        }
        this.settings.schedule[dayIndex].activities.push({ time: '10:00', activity: 'New Activity' });
        modal.innerHTML = this.getModalContent(sectionKey);
        this.bindModalEvents(sectionKey);
      }

      if (e.target.matches('.remove-activity-btn')) {
        const dayIndex = parseInt(e.target.dataset.dayIndex);
        const actIndex = parseInt(e.target.dataset.activityIndex);
        this.settings.schedule[dayIndex].activities.splice(actIndex, 1);
        modal.innerHTML = this.getModalContent(sectionKey);
        this.bindModalEvents(sectionKey);
      }
    });

    // 輸入監聽
    modal.addEventListener("input", (e) => {
      // Google Map Links 輸入
      if (e.target.closest('.map-link-row')) {
        const row = e.target.closest('.map-link-row');
        const index = parseInt(row.dataset.index);
        const field = e.target.dataset.field;
        
        if (this.settings.googleMapLinks[index]) {
          this.settings.googleMapLinks[index][field] = e.target.value;
        }
      }

      // Schedule 輸入
      if (e.target.closest('.schedule-row')) {
        const row = e.target.closest('.schedule-row');
        const dayIndex = parseInt(row.dataset.dayIndex);
        const actIndex = parseInt(row.dataset.activityIndex);
        const field = e.target.dataset.field;
        
        if (this.settings.schedule[dayIndex] && this.settings.schedule[dayIndex].activities[actIndex]) {
          this.settings.schedule[dayIndex].activities[actIndex][field] = e.target.value;
        }
      }
    });
  }

  // ================================
  // 各功能的儲存方法
  // ================================

  saveTitleSettings() {
    const titleInput = document.getElementById("title-input");
    const subtitleInput = document.getElementById("subtitle-input");
    
    if (titleInput && subtitleInput) {
      this.settings.title = titleInput.value;
      this.settings.subtitle = subtitleInput.value;
      
      this.updatePreview();
      this.closeModal();
      this.showNotification('Title updated');
    }
  }

  saveMapSettings() {
    // Google Map Links 已經通過 input 事件即時更新
    this.updatePreview();
    this.closeModal();
    this.showNotification('Google Map links updated');
  }

  addMapLink() {
    this.settings.googleMapLinks.push({ destination: '', url: '' });
    const modal = document.getElementById("modal-content");
    modal.innerHTML = this.getModalContent('googleMap');
    this.bindModalEvents('googleMap');
  }

  saveDateSettings() {
    const dateFromInput = document.getElementById("date-from");
    const dateToInput = document.getElementById("date-to");
    
    if (dateFromInput && dateToInput) {
      this.settings.dateCountdown = {
        from: dateFromInput.value,
        to: dateToInput.value
      };
      
      this.updatePreview();
      this.closeModal();
      this.showNotification('Date countdown updated');
    }
  }

  saveScheduleSettings() {
    // Schedule 已經通過 input 事件即時更新
    this.updatePreview();
    this.closeModal();
    this.showNotification('Schedule updated');
  }

  addScheduleDay() {
    this.settings.schedule.push({
      day: `Day${this.settings.schedule.length + 1}`,
      activities: []
    });
    const modal = document.getElementById("modal-content");
    modal.innerHTML = this.getModalContent('schedule');
    this.bindModalEvents('schedule');
  }

  // ================================
  // 預覽更新
  // ================================

  updatePreview() {
    this.updateTitlePreview();
    this.updateLinksPreview();
    this.updateDatePreview();
    this.updateSchedulePreview();
    this.updatePackingPreview();
  }

  updateTitlePreview() {
    const titleEl = document.getElementById('preview-title');
    const subtitleEl = document.getElementById('preview-subtitle');
    
    if (titleEl) titleEl.textContent = this.settings.title;
    if (subtitleEl) subtitleEl.textContent = this.settings.subtitle;
  }

  updateLinksPreview() {
    const linksEl = document.querySelector('.preview-links');
    if (!linksEl) return;
    
    if (this.settings.googleMapLinks && this.settings.googleMapLinks.length > 0) {
      const validLinks = this.settings.googleMapLinks.filter(link => link.destination && link.url);
      
      if (validLinks.length > 0) {
        linksEl.innerHTML = validLinks.map(link => 
          `<div class="preview-link-item">
            <a href="${link.url}" target="_blank">🗺️ ${link.destination}</a>
          </div>`
        ).join('');
      } else {
        linksEl.innerHTML = '<div class="empty-state">Add a link on the left</div>';
      }
    } else {
      linksEl.innerHTML = '<div class="empty-state">Add a link on the left</div>';
    }
  }

  updateDatePreview() {
    const dateEl = document.getElementById('preview-date');
    if (!dateEl) return;
    
    const dateFrom = this.settings.dateCountdown?.from;
    const dateTo = this.settings.dateCountdown?.to;
    
    if (!dateFrom) return;
    
    try {
      const fromDate = new Date(dateFrom);
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
    
    if (this.settings.schedule && this.settings.schedule.length > 0) {
      const scheduleHTML = this.settings.schedule.map(day => {
        if (!day.activities || day.activities.length === 0) return '';
        
        return `
          <div class="schedule-day-preview">
            <h4>${day.day || 'Day'}</h4>
            ${day.activities.map(activity => `
              <div class="schedule-item">
                <span class="time">${activity.time}</span>
                <span class="activity">${activity.activity}</span>
              </div>
            `).join('')}
          </div>
        `;
      }).join('');
      
      scheduleEl.innerHTML = scheduleHTML || '<div class="empty-state">Add a schedule on the left</div>';
    } else {
      scheduleEl.innerHTML = '<div class="empty-state">Add a schedule on the left</div>';
    }
  }

  updatePackingPreview() {
    const packingEl = document.getElementById('packing-preview');
    if (!packingEl) return;
    
    const hasItems = this.settings.packingItems && 
      (this.settings.packingItems['shared-items']?.length > 0 || 
       this.settings.packingItems['personal-items']?.length > 0);
    
    if (hasItems) {
      packingEl.innerHTML = '<div class="empty-state">Add items on the left</div>';
    } else {
      packingEl.innerHTML = '<div class="empty-state">Add items on the left</div>';
    }
  }

  // ================================
  // 分享連結功能
  // ================================

  showShareModal() {
    const modal = document.getElementById("modal-overlay");
    const content = document.getElementById("modal-content");
    
    if (modal && content) {
      const baseUrl = window.location.origin;
      const adminLink = `${baseUrl}/admin.html?room=${this.roomId}`;
      const shareLink = `${baseUrl}/index.html?room=${this.roomId}`;
      
      content.innerHTML = `
        <div class="share-modal-content">
          <div class="share-header">
            <h3>Links</h3>
            <button class="modal-close">×</button>
          </div>
          <div class="share-body">
            <div class="share-link-section">
              <label>Admin link</label>
              <div class="share-link-row">
                <input type="text" value="${adminLink}" readonly onclick="this.select()">
                <button class="copy-link-btn" data-link="${adminLink}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M8 5H6C4.9 5 4 5.9 4 7v10c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-2M8 5c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2M8 5h8v4l-1-1-1 1V5z" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <div class="share-link-section">
              <label>Share link</label>
              <div class="share-link-row">
                <input type="text" value="${shareLink}" readonly onclick="this.select()">
                <button class="copy-link-btn" data-link="${shareLink}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M8 5H6C4.9 5 4 5.9 4 7v10c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-2M8 5c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2M8 5h8v4l-1-1-1 1V5z" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      modal.style.display = 'flex';
      
      // 綁定複製按鈕事件
      content.addEventListener('click', (e) => {
        if (e.target.matches('.copy-link-btn') || e.target.closest('.copy-link-btn')) {
          const btn = e.target.matches('.copy-link-btn') ? e.target : e.target.closest('.copy-link-btn');
          const link = btn.dataset.link;
          this.copyToClipboard(link);
        }
      });
    }
  }

  copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.showNotification('Link copied!');
      }).catch(err => {
        this.fallbackCopyTextToClipboard(text);
      });
    } else {
      this.fallbackCopyTextToClipboard(text);
    }
  }

  fallbackCopyTextToClipboard(text) {
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
        this.showNotification('Link copied!');
      }
    } catch (err) {
      console.error('複製失敗:', err);
    }
    
    document.body.removeChild(textArea);
  }

  // ================================
  // 工具函數
  // ================================

  generateSafeId(prefix = "item") {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100)}`;
  }

  showNotification(message, type = 'success') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    let bgColor = '#10b981'; // success
    if (type === 'error') bgColor = '#ef4444';
    if (type === 'warning') bgColor = '#f59e0b';
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bgColor};
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      z-index: 1001;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.2);
      max-width: 380px;
      backdrop-filter: blur(8px);
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

console.log('📦 Complete Admin System 載入完成');
