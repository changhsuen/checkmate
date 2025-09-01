// js/admin.js - 修復版：後台預覽與前台完全一致

class AdminSystem {
  constructor() {
    this.roomId = this.getRoomIdFromURL();
    this.firebaseReady = false;
    this.currentSection = 'packingList'; // 預設顯示 Packing list
    
    // 設定資料結構
    this.settings = {
      title: "Trip",
      subtitle: "2025",
      googleMapLinks: [],
      dateCountdown: {
        from: this.getDefaultDate(),
        to: this.getDefaultDate()
      },
      schedule: [],
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
    console.log('管理系統初始化中...');
    this.bindEvents();
    this.updateMiddlePanel();
    this.updatePreview();
    this.waitForFirebase();
  }

  waitForFirebase() {
    const checkFirebase = () => {
      if (typeof window.firebaseDB !== 'undefined') {
        console.log('Firebase 連接成功！');
        this.firebaseReady = true;
        this.loadRoomData();
      } else {
        console.log('等待 Firebase...');
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
          console.log('從 Firebase 載入設定:', data);
          this.settings = { ...this.settings, ...data };
          this.updatePreview();
          this.updateMiddlePanel();
          this.showNotification('Settings loaded');
        }
      });
      
    } catch (error) {
      console.error('載入設定失敗:', error);
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
      console.log("Settings saved to Firebase");
      
      this.showShareModal();
      
    } catch (error) {
      console.error("Failed to save settings:", error);
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
      
      console.log('已同步設定到主應用程式');
    } catch (error) {
      console.error('同步失敗:', error);
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

      // Section 點擊
      if (e.target.matches(".section-item") || e.target.closest(".section-item")) {
        const section = e.target.dataset.section || e.target.closest(".section-item").dataset.section;
        this.currentSection = section;
        this.updateMiddlePanel();
      }
    });

    // 發布按鈕
    const publishBtn = document.getElementById('publish-btn');
    if (publishBtn) {
      publishBtn.addEventListener('click', () => {
        this.saveToFirebase();
      });
    }
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

  updateMiddlePanel() {
    const middleContainer = document.getElementById('admin-middle');
    if (!middleContainer) return;

    switch(this.currentSection) {
      case 'title':
        middleContainer.innerHTML = this.renderTitleEditor();
        this.setupTitleEvents();
        break;
        
      case 'googleMap':
        middleContainer.innerHTML = this.renderGoogleMapEditor();
        this.setupGoogleMapEvents();
        break;
        
      case 'countdown':
        middleContainer.innerHTML = this.renderCountdownEditor();
        this.setupCountdownEvents();
        break;
        
      case 'schedule':
        middleContainer.innerHTML = this.renderScheduleEditor();
        this.setupScheduleEvents();
        break;
        
      case 'packingList':
      default:
        middleContainer.innerHTML = this.renderPackingListEditor();
        this.setupPackingListEvents();
        this.renderPackingItems();
        this.updatePersonTags();
    }
  }

  // ================================
  // 編輯器 HTML 渲染
  // ================================

  renderTitleEditor() {
    return `
      <div class="middle-content">
        <div class="middle-header">
          <h2 class="middle-title">Title</h2>
        </div>
        
        <div class="form-section">
          <div class="form-row">
            <label>Title</label>
            <input type="text" class="form-input" id="title-input" value="${this.settings.title}" placeholder="Enter Title">
          </div>
          <div class="form-row">
            <label>Subtitle</label>
            <input type="text" class="form-input" id="subtitle-input" value="${this.settings.subtitle}" placeholder="Enter Subtitle">
          </div>
        </div>
      </div>
    `;
  }

  renderGoogleMapEditor() {
    return `
      <div class="middle-content">
        <div class="middle-header">
          <h2 class="middle-title">Google Map Link</h2>
          <button class="add-link-btn" id="add-map-link">+</button>
        </div>
        
        <div class="form-section" id="map-links-container">
          ${this.settings.googleMapLinks.map((link, index) => `
            <div class="map-link-row" data-index="${index}">
              <div class="form-row">
                <input type="text" class="form-input" value="${link.destination || ''}" data-field="destination" placeholder="Destination">
              </div>
              <div class="form-row">
                <input type="text" class="form-input" value="${link.url || ''}" data-field="url" placeholder="https://maps.google.com/...">
              </div>
              <button class="remove-link-btn" data-index="${index}">×</button>
            </div>
          `).join('')}
          ${this.settings.googleMapLinks.length === 0 ? '<div class="empty-state">No links added yet</div>' : ''}
        </div>
      </div>
    `;
  }

  renderCountdownEditor() {
    return `
      <div class="middle-content">
        <div class="middle-header">
          <h2 class="middle-title">Date Countdown</h2>
        </div>
        
        <div class="form-section">
          <div class="form-row">
            <label>From</label>
            <input type="datetime-local" class="form-input" id="date-from" value="${this.settings.dateCountdown?.from || this.getDefaultDate()}">
          </div>
          <div class="form-row">
            <label>To</label>
            <input type="datetime-local" class="form-input" id="date-to" value="${this.settings.dateCountdown?.to || this.getDefaultDate()}">
          </div>
        </div>
      </div>
    `;
  }

  renderScheduleEditor() {
    return `
      <div class="middle-content">
        <div class="middle-header">
          <h2 class="middle-title">Schedule</h2>
          <button class="add-day-btn" id="add-day">+ Day</button>
        </div>
        
        <div class="form-section" id="schedule-container">
          ${this.renderScheduleDays()}
        </div>
      </div>
    `;
  }

  renderScheduleDays() {
    if (!this.settings.schedule || this.settings.schedule.length === 0) {
      return '<div class="empty-state">No schedule yet</div>';
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
              <input type="time" class="form-input" value="${activity.time}" data-field="time">
              <input type="text" class="form-input" value="${activity.activity}" data-field="activity" placeholder="Activity">
              <button class="remove-activity-btn" data-day-index="${dayIndex}" data-activity-index="${actIndex}">×</button>
            </div>
          `).join('') : ''}
          <button class="add-activity-btn" data-day-index="${dayIndex}">+ Activity</button>
        </div>
      </div>
    `).join('');
  }

  renderPackingListEditor() {
    return `
      <div class="middle-content">
        <div class="middle-header">
          <h2 class="middle-title">Packaging list</h2>
        </div>
        
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

  // ================================
  // 事件設置方法
  // ================================

  setupTitleEvents() {
    const titleInput = document.getElementById('title-input');
    const subtitleInput = document.getElementById('subtitle-input');
    
    if (titleInput) {
      titleInput.addEventListener('input', (e) => {
        this.settings.title = e.target.value;
        this.updatePreview();
      });
    }
    
    if (subtitleInput) {
      subtitleInput.addEventListener('input', (e) => {
        this.settings.subtitle = e.target.value;
        this.updatePreview();
      });
    }
  }

  setupGoogleMapEvents() {
    const container = document.getElementById('map-links-container');
    
    const addBtn = document.getElementById('add-map-link');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.settings.googleMapLinks.push({ destination: '', url: '' });
        this.updateMiddlePanel();
        this.updatePreview();
      });
    }
    
    if (container) {
      container.addEventListener('input', (e) => {
        if (e.target.closest('.map-link-row')) {
          const row = e.target.closest('.map-link-row');
          const index = parseInt(row.dataset.index);
          const field = e.target.dataset.field;
          
          if (this.settings.googleMapLinks[index]) {
            this.settings.googleMapLinks[index][field] = e.target.value;
            this.updatePreview();
          }
        }
      });
      
      container.addEventListener('click', (e) => {
        if (e.target.matches('.remove-link-btn')) {
          const index = parseInt(e.target.dataset.index);
          this.settings.googleMapLinks.splice(index, 1);
          this.updateMiddlePanel();
          this.updatePreview();
        }
      });
    }
  }

  setupCountdownEvents() {
    const dateFromInput = document.getElementById('date-from');
    const dateToInput = document.getElementById('date-to');
    
    if (dateFromInput) {
      dateFromInput.addEventListener('change', (e) => {
        if (!this.settings.dateCountdown) this.settings.dateCountdown = {};
        this.settings.dateCountdown.from = e.target.value;
        this.updatePreview();
      });
    }
    
    if (dateToInput) {
      dateToInput.addEventListener('change', (e) => {
        if (!this.settings.dateCountdown) this.settings.dateCountdown = {};
        this.settings.dateCountdown.to = e.target.value;
        this.updatePreview();
      });
    }
  }

  setupScheduleEvents() {
    const container = document.getElementById('schedule-container');
    
    const addDayBtn = document.getElementById('add-day');
    if (addDayBtn) {
      addDayBtn.addEventListener('click', () => {
        this.settings.schedule.push({
          day: `Day${this.settings.schedule.length + 1}`,
          activities: []
        });
        this.updateMiddlePanel();
        this.updatePreview();
      });
    }
    
    if (container) {
      container.addEventListener('click', (e) => {
        if (e.target.matches('.remove-day-btn')) {
          const dayIndex = parseInt(e.target.dataset.dayIndex);
          this.settings.schedule.splice(dayIndex, 1);
          this.updateMiddlePanel();
          this.updatePreview();
        }
        
        if (e.target.matches('.add-activity-btn')) {
          const dayIndex = parseInt(e.target.dataset.dayIndex);
          if (!this.settings.schedule[dayIndex].activities) {
            this.settings.schedule[dayIndex].activities = [];
          }
          this.settings.schedule[dayIndex].activities.push({ time: '10:00', activity: 'New Activity' });
          this.updateMiddlePanel();
          this.updatePreview();
        }
        
        if (e.target.matches('.remove-activity-btn')) {
          const dayIndex = parseInt(e.target.dataset.dayIndex);
          const actIndex = parseInt(e.target.dataset.activityIndex);
          this.settings.schedule[dayIndex].activities.splice(actIndex, 1);
          this.updateMiddlePanel();
          this.updatePreview();
        }
      });
      
      container.addEventListener('input', (e) => {
        if (e.target.closest('.schedule-row')) {
          const row = e.target.closest('.schedule-row');
          const dayIndex = parseInt(row.dataset.dayIndex);
          const actIndex = parseInt(row.dataset.activityIndex);
          const field = e.target.dataset.field;
          
          if (this.settings.schedule[dayIndex] && this.settings.schedule[dayIndex].activities[actIndex]) {
            this.settings.schedule[dayIndex].activities[actIndex][field] = e.target.value;
            this.updatePreview();
          }
        }
      });
    }
  }

  setupPackingListEvents() {
    const addBtn = document.getElementById("add-unified-item");
    if (addBtn) {
      addBtn.replaceWith(addBtn.cloneNode(true));
      document.getElementById("add-unified-item").addEventListener("click", () => {
        this.addPackingItem();
      });
    }

    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach((input) => {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.addPackingItem();
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (e.target.matches('.person-tag')) {
        document.querySelectorAll('.person-tag').forEach(tag => tag.classList.remove('active'));
        e.target.classList.add('active');
        this.filterPackingItems(e.target.dataset.person);
      }

      if (e.target.matches('.item-delete-btn')) {
        this.deletePackingItem(e.target);
      }
    });
  }

  // ================================
  // Packing List 功能
  // ================================

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

    if (!this.settings.packingItems[categoryId]) {
      this.settings.packingItems[categoryId] = [];
    }
    this.settings.packingItems[categoryId].unshift(newItem);

    if (persons) {
      const personsList = persons.split(",").map(p => p.trim()).filter(p => p);
      personsList.forEach(person => this.allPersons.add(person));
    }

    nameInput.value = "";
    if (quantityInput) quantityInput.value = "";
    if (personInput) personInput.value = "";

    this.renderPackingItems();
    this.updatePersonTags();
    this.updatePreview();
  }

  deletePackingItem(deleteBtn) {
    if (!confirm("確定要刪除這個項目嗎？")) return;

    const itemElement = deleteBtn.closest('.packing-item');
    const itemId = itemElement.dataset.itemId;
    const category = itemElement.dataset.category;

    this.settings.packingItems[category] = this.settings.packingItems[category].filter(item => item.id !== itemId);

    this.renderPackingItems();
    this.updatePersonTags();
    this.updatePreview();
  }

  renderPackingItems() {
    const sharedDisplay = document.getElementById('shared-items-display');
    const personalDisplay = document.getElementById('personal-items-display');
    
    if (!sharedDisplay || !personalDisplay) return;

    if (this.settings.packingItems["shared-items"]) {
      sharedDisplay.innerHTML = this.settings.packingItems["shared-items"]
        .map(item => this.createPackingItemHTML(item, "shared-items"))
        .join('');
    }

    if (this.settings.packingItems["personal-items"]) {
      personalDisplay.innerHTML = this.settings.packingItems["personal-items"]
        .map(item => this.createPackingItemHTML(item, "personal-items"))
        .join('');
    }

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
  // 預覽更新 - 與前台完全一致
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
    
    // 清空並重新創建
    linksEl.innerHTML = '';
    
    // 添加分享按鈕
    const shareBtn = document.createElement('button');
    shareBtn.className = 'link-btn';
    shareBtn.innerHTML = '📤 分享活動';
    shareBtn.style.cssText = `
      background: var(--layer-02);
      color: var(--text-primary);
      height: 40px;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 8px 16px;
      border-radius: 20px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      border: none;
      margin-right: 8px;
      margin-bottom: 4px;
      cursor: pointer;
    `;
    linksEl.appendChild(shareBtn);
    
    // 添加 Google Map Links（去除圖標）
    if (this.settings.googleMapLinks && this.settings.googleMapLinks.length > 0) {
      this.settings.googleMapLinks.forEach(link => {
        if (link.destination && link.url) {
          const linkEl = document.createElement('a');
          linkEl.className = 'link-btn';
          linkEl.href = link.url;
          linkEl.target = '_blank';
          linkEl.textContent = link.destination; // 去除圖標
          linkEl.style.cssText = `
            background: var(--layer-02);
            color: var(--text-primary);
            height: 40px;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 8px 16px;
            border-radius: 20px;
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            margin-right: 8px;
            margin-bottom: 4px;
          `;
          linksEl.appendChild(linkEl);
        }
      });
    }
    
    // 設置彈性布局
    linksEl.style.cssText = `
      background-color: var(--layer-01);
      padding: var(--spacing-03);
      border-radius: 20px;
      margin-bottom: var(--spacing-03);
      display: flex;
      gap: var(--spacing-02);
      flex-wrap: wrap;
    `;
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
      
      scheduleEl.innerHTML = scheduleHTML || '<div class="empty-state">No Schedule yet</div>';
    } else {
      scheduleEl.innerHTML = '<div class="empty-state">No Schedule yet</div>';
    }
  }

  updatePackingPreview() {
    const packingEl = document.getElementById('packing-preview');
    if (!packingEl) return;
    
    // 檢查是否有項目
    const hasItems = this.settings.packingItems && 
      (this.settings.packingItems['shared-items']?.length > 0 || 
       this.settings.packingItems['personal-items']?.length > 0);
    
    let packingHTML = '';
    
    if (hasItems) {
      // 如果有項目，顯示完整的清單
      packingHTML = `
        <h2 class="section-title">Packing list</h2>
        <div class="progress-text">0/0 Packed</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%;"></div>
        </div>
        
        <div class="filter-buttons">
          <button class="filter-btn active">All</button>
        </div>
        
        <div class="category-section">
          <h3 class="category-title">Shared Gear</h3>
          <ul class="item-list">
            ${this.settings.packingItems['shared-items'] ? 
              this.settings.packingItems['shared-items'].map(item => 
                this.createPreviewItemHTML(item)
              ).join('') : ''}
          </ul>
        </div>
        
        <div class="category-section">
          <h3 class="category-title">Personal Gear</h3>
          <ul class="item-list">
            ${this.settings.packingItems['personal-items'] ? 
              this.settings.packingItems['personal-items'].map(item => 
                this.createPreviewItemHTML(item)
              ).join('') : ''}
          </ul>
        </div>
      `;
    } else {
      // 如果沒有項目，顯示空狀態 - 與前台完全一致
      packingHTML = `
        <h2 class="section-title" style="font-size: 18px; font-weight: 500; margin-bottom: 16px; color: var(--text-primary);">Packing list</h2>
        <div class="progress-text" style="font-size: 14px; color: var(--text-secondary); margin-bottom: 12px;">0/0 Packed</div>
        <div class="progress-bar" style="height: 8px; background: var(--grey30); border-radius: 4px; overflow: hidden; margin-bottom: 20px;">
          <div class="progress-fill" style="height: 100%; background: var(--grey100); border-radius: 4px; width: 0%; transition: width 0.3s ease;"></div>
        </div>
        
        <div class="filter-buttons" style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 20px;">
          <button class="filter-btn active" style="display: flex; align-items: center; height: 32px; padding: 0 12px; border-radius: 20px; border: 1px solid var(--button-primary); background: var(--button-primary); color: white; font-size: 14px; cursor: pointer;">All</button>
        </div>
        
        <div class="category-section" style="margin-bottom: 20px;">
          <h3 class="category-title" style="font-size: 16px; font-weight: 500; margin-bottom: 12px; color: var(--text-primary);">Shared Gear</h3>
          <ul class="item-list" style="list-style: none;"></ul>
        </div>
        
        <div class="category-section" style="margin-bottom: 20px;">
          <h3 class="category-title" style="font-size: 16px; font-weight: 500; margin-bottom: 12px; color: var(--text-primary);">Personal Gear</h3>
          <ul class="item-list" style="list-style: none;"></ul>
        </div>
        
        <div class="add-item-section" style="margin-top: 16px;">
          <div class="add-item-form" style="display: flex; flex-direction: column; gap: 8px;">
            <select class="form-select" style="height: 48px; padding: 8px 32px 8px 20px; border: none; border-radius: 24px; font-size: 14px; background: var(--field); cursor: pointer; border: 1px solid transparent; width: 100%;">
              <option value="Personal Gear">Personal Gear</option>
              <option value="Shared Gear">Shared Gear</option>
            </select>
            
            <div class="form-row-horizontal" style="display: flex; gap: 8px; width: 100%;">
              <input type="text" class="form-input item-input" placeholder="Item" style="height: 48px; padding: 8px 16px; border: none; border-radius: 24px; font-size: 14px; background: var(--field); border: 1px solid transparent; flex: 1; min-width: 0;" />
              <input type="text" class="form-input number-input" placeholder="Number" style="height: 48px; padding: 8px 16px; border: none; border-radius: 24px; font-size: 14px; background: var(--field); border: 1px solid transparent; width: 120px; flex-shrink: 0;" />
            </div>
            
            <input type="text" class="form-input" placeholder="Name, Name, Name" style="height: 48px; padding: 8px 16px; border: none; border-radius: 24px; font-size: 14px; background: var(--field); border: 1px solid transparent; width: 100%;" />
            
            <button class="add-btn" style="background: var(--button-primary); height: 48px; color: var(--text-on-color); padding: 0 16px; border: none; border-radius: 24px; font-size: 14px; font-weight: 500; cursor: pointer; width: 100%; margin-bottom: 12px;">Add Item</button>
          </div>
        </div>
      `;
    }
    
    packingEl.innerHTML = packingHTML;
    
    // 應用樣式使其與前台一致
    packingEl.style.cssText = `
      background-color: var(--layer-01);
      border-radius: 20px;
      padding: var(--spacing-05);
      margin-top: 16px;
    `;
  }

  createPreviewItemHTML(item) {
    const personsList = item.persons ? item.persons.split(",").map(p => p.trim()) : [];
    const personTags = personsList.map(person => 
      `<span class="person-tag">${person}</span>`
    ).join('');

    return `
      <li class="item" style="display: flex; align-items: center; height: 48px; border-bottom: 1px solid var(--border-subtle);">
        <div class="custom-checkbox" style="position: relative; display: inline-block; width: 16px; height: 16px; margin-right: 12px; flex-shrink: 0;">
          <input type="checkbox" style="opacity: 0; width: 0; height: 0; position: absolute;">
          <label class="checkbox-label" style="position: absolute; top: 0; left: 0; width: 16px; height: 16px; background-color: transparent; border: 1px solid var(--green100); border-radius: 2px; cursor: pointer;"></label>
        </div>
        <label class="item-label" style="flex: 1; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
          <span class="item-name" style="font-size: 14px; color: #1f2937; flex: 1;">${item.name}</span>
          ${item.quantity ? `<span class="item-quantity" style="margin-left: var(--spacing-02); font-size: 12px; color: var(--text-primary);">x${item.quantity}</span>` : ''}
          <span class="person-tags" style="display: flex; gap: var(--spacing-02); margin-left: var(--spacing-02);">
            ${personTags}
          </span>
        </label>
      </li>
    `;
  }

  // ================================
  // 分享連結功能
  // ================================

  showShareModal() {
    let modalOverlay = document.getElementById('share-modal-overlay');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'share-modal-overlay';
      modalOverlay.className = 'modal-overlay';
      modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        backdrop-filter: blur(4px);
      `;
      document.body.appendChild(modalOverlay);
    }
    
    const baseUrl = window.location.origin + window.location.pathname.replace('/admin.html', '');
    const adminLink = `${baseUrl}/admin.html?room=${this.roomId}`;
    const shareLink = `${baseUrl}/index.html?room=${this.roomId}`;
    
    modalOverlay.innerHTML = `
      <div class="share-modal-content" style="
        background: white;
        border-radius: 16px;
        width: 90%;
        max-width: 500px;
        overflow: hidden;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
      ">
        <div class="share-header" style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 32px 16px;
          border-bottom: 1px solid #f0f0f0;
        ">
          <h3 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 0;">Links</h3>
          <button class="modal-close" style="
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            transition: all 0.2s;
          ">×</button>
        </div>
        <div class="share-body" style="padding: 24px 32px;">
          <div class="share-link-section" style="margin-bottom: 24px;">
            <label style="
              display: block;
              font-size: 14px;
              font-weight: 500;
              color: #1a1a1a;
              margin-bottom: 8px;
            ">Admin link</label>
            <div class="share-link-row" style="display: flex; gap: 8px; align-items: center;">
              <input type="text" value="${adminLink}" readonly onclick="this.select()" style="
                flex: 1;
                padding: 12px 16px;
                border: 2px solid #e5e5e5;
                border-radius: 8px;
                font-size: 14px;
                background: #f8f9fa;
                color: #666;
              ">
              <button class="copy-link-btn" data-link="${adminLink}" style="
                background: #1a1a1a;
                color: white;
                border: none;
                width: 44px;
                height: 44px;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
              ">
                📋
              </button>
            </div>
          </div>
          
          <div class="share-link-section">
            <label style="
              display: block;
              font-size: 14px;
              font-weight: 500;
              color: #1a1a1a;
              margin-bottom: 8px;
            ">Share link</label>
            <div class="share-link-row" style="display: flex; gap: 8px; align-items: center;">
              <input type="text" value="${shareLink}" readonly onclick="this.select()" style="
                flex: 1;
                padding: 12px 16px;
                border: 2px solid #e5e5e5;
                border-radius: 8px;
                font-size: 14px;
                background: #f8f9fa;
                color: #666;
              ">
              <button class="copy-link-btn" data-link="${shareLink}" style="
                background: #1a1a1a;
                color: white;
                border: none;
                width: 44px;
                height: 44px;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
              ">
                📋
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    modalOverlay.style.display = 'flex';
    
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay || e.target.matches('.modal-close')) {
        modalOverlay.style.display = 'none';
      }
      
      if (e.target.matches('.copy-link-btn')) {
        const link = e.target.dataset.link;
        this.copyToClipboard(link);
      }
    });
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
  console.log('DOM 載入完成，等待 Firebase...');
});

// 等待 Firebase 準備完成
window.addEventListener('firebaseReady', function() {
  console.log('Firebase 已準備完成，初始化管理系統');
  adminSystem = new AdminSystem();
});

// 如果 Firebase 已經準備好了
if (typeof window.firebaseDB !== 'undefined') {
  adminSystem = new AdminSystem();
}

console.log('Complete Admin System 載入完成');
