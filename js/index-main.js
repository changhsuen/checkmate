// js/index-main.js - index.html 的主要邏輯
document.addEventListener('DOMContentLoaded', function() {
  setupAdminButton();
  setupShareButton();
});

function setupAdminButton() {
  const adminBtn = document.getElementById('admin-btn');
  if (adminBtn) {
    adminBtn.addEventListener('click', function() {
      // 從 URL 獲取現有的房間ID，或生成新的
      const urlParams = new URLSearchParams(window.location.search);
      let roomId = urlParams.get('room');
      
      if (!roomId) {
        roomId = 'room-' + Date.now();
        // 更新當前頁面的URL，加入房間ID
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('room', roomId);
        window.history.replaceState({}, '', newUrl);
      }
      
      // 跳轉到管理頁面
      window.location.href = `admin.html?room=${roomId}`;
    });
  }
}

function setupShareButton() {
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', function() {
      const urlParams = new URLSearchParams(window.location.search);
      let roomId = urlParams.get('room');
      
      if (!roomId) {
        roomId = 'room-' + Date.now();
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('room', roomId);
        window.history.replaceState({}, '', newUrl);
      }
      
      const shareLink = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
      
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareLink).then(() => {
          showNotification('分享連結已複製到剪貼板');
        }).catch(err => {
          fallbackCopyTextToClipboard(shareLink, '分享連結已複製');
        });
      } else {
        fallbackCopyTextToClipboard(shareLink, '分享連結已複製');
      }
    });
  }
}

function fallbackCopyTextToClipboard(text, successMessage) {
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
      showNotification(successMessage);
    } else {
      showLinkAlert(text);
    }
  } catch (err) {
    console.error('複製失敗:', err);
    showLinkAlert(text);
  }
  
  document.body.removeChild(textArea);
}

function showLinkAlert(link) {
  alert(`請手動複製此連結:\n\n${link}`);
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 1000;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}
