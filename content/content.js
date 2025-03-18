const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.tagName === 'SCRIPT' && node.src) {
          chrome.runtime.sendMessage({
            type: 'scriptCheck',
            url: node.src,
            host: window.location.hostname
          });
        }
      });
    });
  });
  
  // 创建简易系统级弹窗样式
  const alertStyle = `
  .niffler-alert {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    background: #dc3545;
    color: white;
    border-radius: 5px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
    z-index: 2147483647;
    animation: alertSlide 0.3s ease-out;
    font-family: Arial, sans-serif;
    font-size: 14px;
    max-width: 300px;
    border: 2px solid #ff4444;
  }
  
  @keyframes alertSlide {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  
  .niffler-alert strong {
    display: block;
    font-size: 16px;
    margin-bottom: 8px;
  }
  `;
  
  // 初始化警报系统
  function initAlertSystem() {
    // 注入样式
    const style = document.createElement('style');
    style.textContent = alertStyle;
    (document.head || document.documentElement).appendChild(style);
  }
  
  // 显示警报（新增核心方法）
  function showAlert(message) {
    const existingAlert = document.querySelector('.niffler-alert');
    if (existingAlert) existingAlert.remove();
  
    const alertDiv = document.createElement('div');
    alertDiv.className = 'niffler-alert';
    alertDiv.innerHTML = `
      <strong>⚠️ 安全警告</strong>
      ${message}
    `;
  
    // 插入到页面可见区域
    (document.body || document.documentElement).appendChild(alertDiv);
    
    // 自动消失
    setTimeout(() => {
      alertDiv.style.opacity = '0';
      setTimeout(() => alertDiv.remove(), 500);
    }, 3000);
  }
  
  // 初始化
  (function init() {
    // 确保DOM就绪
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initAlertSystem();
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true
        });
      });
    } else {
      initAlertSystem();
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  
    // 监听后台消息
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'showAlert') {
        showAlert(msg.message);
      }
    });
  })();
  
  // JS阻断逻辑保持原样
  chrome.runtime.onMessage.addListener(({ action }) => {
    if (action === "lockdown") {
      // 禁用eval
      window.eval = function() { 
        console.warn('[Niffler] 安全防护：eval已被禁用');
      };
      
      // 拦截动态脚本
      const originalAppend = Element.prototype.appendChild;
      Element.prototype.appendChild = function(node) {
        if (node.tagName === 'SCRIPT') {
          console.warn('[Niffler] 安全防护：脚本加载被阻止');
          return null;
        }
        return originalAppend.call(this, node);
      };
    }
  });