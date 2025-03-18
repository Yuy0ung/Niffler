const DOMAIN_KEYWORDS = ['bilibili', 'qq', 'sougou', 'zhibo8', '163', 'sohu', 'ip', 'youku', 'csdn','cnblogs', 'baidu'];
const JSONP_KEYWORDS = ['callback', 'jsonp', 'cb', 'function', 'token', 'auth'];
let isEnabled = true;
let tabStates = new Map();

function initTabState(tabId) {
  if (!tabStates.has(tabId)) {
    tabStates.set(tabId, {
      counter: 0,
      isLocked: false,
      timer: null
    });
  }
  return tabStates.get(tabId);
}

// 精简后的警报函数
function triggerAlarm(host) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-96.png'),
    title: '⚠️ 嗅嗅闻到了蜜罐的味道',
    message: `检测到可疑跨站请求：${host}`,
    priority: 2
  });
}

chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (!isEnabled) return;
    
    const tabId = details.tabId;
    const state = initTabState(tabId);
    if (state.isLocked) return { cancel: true };

    const url = new URL(details.url);
    const isCrossDomain = !details.url.startsWith(details.originUrl);
    const isJsonp = Array.from(url.searchParams.keys())
      .some(p => JSONP_KEYWORDS.some(k => p.toLowerCase().includes(k)));
    const isSuspDomain = DOMAIN_KEYWORDS.some(k => url.hostname.includes(k));

    if (isCrossDomain && (isJsonp || isSuspDomain)) {
      state.counter++;
      
      if (!state.timer) {
        state.timer = setTimeout(() => state.counter = 0, 5000);
      }

      if (state.counter >= 3) {
        state.isLocked = true;
        triggerAlarm(url.hostname);
        chrome.tabs.sendMessage(tabId, { action: "lockdown" });
        return { cancel: true };
      }
    }
    return { cancel: false };
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === "toggle") isEnabled = msg.state;
  if (msg.type === 'scriptCheck') {
    const url = new URL(msg.url);
    if (JSONP_KEYWORDS.some(k => url.searchParams.has(k))) {
      triggerAlarm(url.hostname);
      return true;
    }
  }
});

chrome.tabs.onRemoved.addListener(tabId => tabStates.delete(tabId));
chrome.storage.local.get(['enabled'], res => isEnabled = res.enabled ?? true);