document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('toggle');
    
    // 同步初始状态
    chrome.storage.local.get(['enabled'], result => {
      const enabled = result.enabled ?? true;
      toggle.checked = enabled;
      // 立即通知后台
      chrome.runtime.sendMessage({ action: "toggle", state: enabled });
    });
  
    toggle.addEventListener('change', function() {
      const isChecked = this.checked;
      chrome.storage.local.set({ enabled: isChecked }, () => {
        // 带错误处理的通信
        chrome.runtime.sendMessage(
          { action: "toggle", state: isChecked },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('状态同步失败:', chrome.runtime.lastError);
              toggle.checked = !isChecked; // 回滚UI状态
            }
          }
        );
      });
    });
  });