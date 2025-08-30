// admin.js - 管理後台主邏輯
class AdminSystem {
  constructor() {
    this.roomId = this.getRoomIdFromURL();
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
        from: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      },
      schedule: [],
      theme: "default",
    };
    this.init();
  }

  getRoomIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("room");
  }

  init() {
    this.createAdminUI();
    this.bindEvents();
    this.loadRoomData();
  }

  createAdminUI() {
    const root = document.getElementById("admin-root");
    root.innerHTML = `
      <div class="admin-container">
        <div class="admin-sidebar">
          <div class="admin-header">
            <h1>Checkmate</h1>
            <button class="publish-btn">Publish</button>
          </div>
          
          <div class="tab-switcher">
            <button class="tab-btn active" data-tab="section">Section</button>
            <button class="tab-btn" data-tab="theme">Theme</button>
          </div>
          
          <div class="admin-content">
            <div class="tab-content active" data-tab="section">
              ${this.renderSectionTab()}
            </div>
            <div class="tab-content" data-tab="theme">
              ${this.renderThemeTab()}
            </div>
          </div>
        </div>
        
        <div class="admin-preview">
          ${this.renderPreview()}
        </div>
      </div>
      
      <div class="modal-overlay" id="modal-overlay" style="display: none;">
        <div class="modal-content" id="modal-content"></div>
      </div>
    `;
  }

  renderSectionTab() {
    const sections = [
      { key: "title", label: "Title", icon: "📝" },
      { key: "dateCountdown", label: "Date Countdown", icon: "⏰" },
      { key: "schedule", label: "Schedule", icon: "📅" },
      { key: "packingList", label: "Packaging list", icon: "📦" },
    ];

    return `
      <div class="section-list">
        ${sections
          .map(
            (section) => `
          <div class="section-item" data-section="${section.key}">
            <div class="section-info">
              <span class="section-icon">${section.icon}</span>
              <span class="section-name">${section.label}</span>
            </div>
            <span class="section-toggle">👁️</span>
          </div>
        `
          )
          .join("")}
      </div>
      
      <div class="section-controls">
        <h3>區塊顯示控制</h3>
        ${Object.entries(this.settings.sections)
          .map(
            ([key, enabled]) => `
          <label class="checkbox-control">
            <input type="checkbox" ${enabled ? "checked" : ""} data-section="${key}">
            <span>${key.charAt(0).toUpperCase() + key.slice(1)}</span>
          </label>
        `
          )
          .join("")}
      </div>
    `;
  }

  renderThemeTab() {
    return `
      <div class="theme-content">
        <p>主題設定功能開發中...</p>
      </div>
    `;
  }

  renderPreview() {
    return `
      <div class="preview-container">
        <div class="preview-phone">
          <div class="preview-content">
            <div class="preview-header">
              <h1>${this.settings.title}</h1>
              <div class="preview-subtitle">${this.settings.subtitle}</div>
            </div>
            
            <div class="preview-countdown">
              <div class="countdown-date">${this.getDateDisplay()}</div>
              <div class="countdown-numbers">
                <div class="countdown-item">
                  <div class="number">03</div>
                  <div class="label">Days</div>
                </div>
                <div class="countdown-item">
                  <div class="number">13</div>
                  <div class="label">Hours</div>
                </div>
                <div class="countdown-item">
                  <div class="number">30</div>
                  <div class="label">Minutes</div>
                </div>
                <div class="countdown-item">
                  <div class="number">58</div>
                  <div class="label">Seconds</div>
                </div>
              </div>
            </div>
            
            <div class="preview-schedule">
              <h3>Schedule</h3>
              <div class="schedule-content">
                ${
                  this.settings.schedule.length > 0
                    ? this.settings.schedule
                        .map(
                          (item) => `
                      <div class="schedule-item">
                        <span class="time">${item.time}</span>
                        <span class="activity">${item.activity}</span>
                      </div>
                    `
                        )
                        .join("")
                    : '<div class="empty-state">No Schedule yet</div>'
                }
              </div>
            </div>
            
            <div class="preview-packing">
              <h3>Packing list</h3>
              <div class="empty-state">No items yet</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  getDateDisplay() {
    if (!this.settings.dateCountdown.from) return "August 30, 2025";

    const fromDate = new Date(this.settings.dateCountdown.from);
    const toDate = new Date(this.settings.dateCountdown.to);

    const isSameDay = fromDate.toDateString() === toDate.toDateString();

    if (isSameDay) {
      return fromDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } else {
      const fromStr = fromDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });
      const toStr = toDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      return `${fromStr} - ${toStr}`;
    }
  }

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

    document.querySelector(`[data-tab="${tabName}"].tab-btn`).classList.add("active");
    document.querySelector(`[data-tab="${tabName}"].tab-content`).classList.add("active");
  }

  openSectionModal(sectionKey) {
    const modal = document.getElementById("modal-overlay");
    const content = document.getElementById("modal-content");

    content.innerHTML = this.getModalContent(sectionKey);
    modal.style.display = "flex";

    // 綁定表單事件
    this.bindModalEvents(sectionKey);
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

      case "dateCountdown":
        return `
          <div class="modal-header">
            <h3>Date Countdown</h3>
            <button class="modal-close">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>From</label>
              <input type="datetime-local" id="date-from" value="${this.settings.dateCountdown.from}">
            </div>
            <div class="form-group">
              <label>To</label>
              <input type="datetime-local" id="date-to" value="${this.settings.dateCountdown.to}">
            </div>
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
          </div>
          <div class="modal-body">
            <div id="schedule-list">
              ${this.settings.schedule
                .map(
                  (item, index) => `
                <div class="schedule-row">
                  <input type="time" value="${item.time}" data-index="${index}" data-field="time">
                  <input type="text" value="${item.activity}" data-index="${index}" data-field="activity" placeholder="Activity">
                  <button class="remove-btn" data-index="${index}">×</button>
                </div>
              `
                )
                .join("")}
            </div>
            <button class="add-schedule-btn">+ Add Schedule Item</button>
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
            <p>功能開發中...</p>
          </div>
        `;
    }
  }

  bindModalEvents(sectionKey) {
    const modal = document.getElementById("modal-content");

    modal.addEventListener("click", (e) => {
      if (e.target.matches('[data-action="save-title"]')) {
        this.settings.title = document.getElementById("title-input").value;
        this.settings.subtitle = document.getElementById("subtitle-input").value;
        this.updatePreview();
        this.closeModal();
      }

      if (e.target.matches('[data-action="save-dates"]')) {
        this.settings.dateCountdown.from = document.getElementById("date-from").value;
        this.settings.dateCountdown.to = document.getElementById("date-to").value;
        this.updatePreview();
        this.closeModal();
      }

      if (e.target.matches(".add-schedule-btn")) {
        this.settings.schedule.push({ time: "16:00", activity: "New Activity" });
        const content = e.target.closest(".modal-content");
        content.innerHTML = this.getModalContent("schedule");
        this.bindModalEvents("schedule");
      }

      if (e.target.matches(".remove-btn")) {
        const index = parseInt(e.target.dataset.index);
        this.settings.schedule.splice(index, 1);
        const content = e.target.closest(".modal-content");
        content.innerHTML = this.getModalContent("schedule");
        this.bindModalEvents("schedule");
      }
    });

    modal.addEventListener("input", (e) => {
      if (e.target.matches("input[data-index]")) {
        const index = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        this.settings.schedule[index][field] = e.target.value;
      }
    });
  }

  closeModal() {
    document.getElementById("modal-overlay").style.display = "none";
  }

  updatePreview() {
    const preview = document.querySelector(".preview-content");
    if (preview) {
      preview.innerHTML = this.renderPreview().match(/<div class="preview-content">([\s\S]*)<\/div>/)[1];
    }
  }

  async loadRoomData() {
    if (!this.roomId || !window.firebaseDB) return;

    try {
      const roomRef = window.firebaseRef(`rooms/${this.roomId}/settings`);
      window.firebaseOnValue(
        roomRef,
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            Object.assign(this.settings, data);
            this.updatePreview();
          }
        },
        { once: true }
      );
    } catch (error) {
      console.error("Failed to load room data:", error);
    }
  }

  async saveToFirebase() {
    if (!this.roomId || !window.firebaseDB) return;

    try {
      const roomRef = window.firebaseRef(`rooms/${this.roomId}/settings`);
      await window.firebaseSet(roomRef, {
        ...this.settings,
        lastUpdated: new Date().toISOString(),
      });
      console.log("Settings saved to Firebase");
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }
}

// 等待 Firebase 準備就緒後初始化
window.addEventListener("firebaseReady", () => {
  new AdminSystem();
});
