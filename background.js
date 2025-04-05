'use strict';

// 域名敏感名单
const DOMAIN_KEYWORDS = [
  '1616', '163', '51cto', '58pic', 'alicdn', 'amap', 'apple', 'baidu', 'bilibili',
  'bit', 'c-ctrip', 'chinaunix', 'cnblogs', 'cndns', 'cnzz', 'com', 'comgithub',
  'csdn', 'ctfile', 'ctrip', 'dangdang', 'faloo', 'fastadmin', 'github', 'gnu',
  'growingio', 'hupu', 'huya', 'ifeng', 'ip', 'iqiyi', 'iqiyipic', 'iteye', 'itpub',
  'jd', 'jiyoujia', 'mgtv', 'mop', 'mths', 'pptv', 'qq', 'qy', 'renren',
  'scorecardresearch', 'sitestar', 'skylink', 'sogou', 'sohu', 'sougou', 'taihe',
  'thatscaptaintoyou', 'tianya', 'uc', 'weibo', 'youku', 'zbj', 'zhibo8'
];

// JSONP特征参数
const JSONP_KEYWORDS = ['callback', 'jsonp', 'cb', 'function', 'token', 'auth'];

// 域名白名单（支持通配符）
const WHITE_LIST = [
  '*.qq.com',
  '*.163.com',
  '*.baidu.com',
  '*.bilibili.com',
  '*.cnblogs.com',
  '*.weibo.com',
  '*.jd.com',
  '*.taobao.com',
  '*.csdn.net',
  '*.google.com',
  '*.bing.com',
  '*.moonshot.com',
  '*.deepseek.com',
  '*.n.com',
  '*.github.com'
];

// 预编译白名单正则表达式
const WHITE_LIST_REGEX = new RegExp(
  WHITE_LIST.map(domain => {
    if (domain.startsWith('*.')) {
      return `(^|\\.)${domain.slice(2).replace(/\./g, '\\.')}$`;
    }
    return `^${domain.replace(/\./g, '\\.')}$`;
  }).join('|'),
  'i'
);

let isEnabled = true;
const tabStates = new Map();

// 白名单检测
function isWhitelisted(hostname) {
  return WHITE_LIST_REGEX.test(hostname);
}

// 初始化标签页状态
function initTabState(tabId) {
  if (!tabStates.has(tabId)) {
    tabStates.set(tabId, {
      counter: 0,
      isLocked: false,
      hasAlerted: false, // 新增弹窗状态标记
      lockedHosts: new Set(),
      timer: null
    });
  }
  return tabStates.get(tabId);
}

// 蜜罐警报（优化单次触发逻辑）
function triggerHoneypotAlert(finding) {
  const state = tabStates.get(finding.tabId);
  if (!state || state.hasAlerted) return; // 防止重复触发

  state.hasAlerted = true; // 标记已触发
  
  chrome.storage.sync.get(["alerts"], result => {
    // 页面弹窗（仅触发一次）
    if (result.alerts !== false) {
      chrome.tabs.executeScript(finding.tabId, {
        code: `alert('疑似蜜罐: 检测到 ${finding.key} (特征:${finding.match}) 来自 ${finding.src}');`
      });
    }

    // 系统通知（同样仅一次）
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title: `嗅嗅闻到了蜜罐的味道 | ${finding.key}`,
      message: `${finding.match.substring(0,24)}... @ ${finding.src.replace(/^www\./, '')}`,
      priority: 2
    });
  });
}

// 主拦截逻辑（修改触发条件）
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (!isEnabled || details.tabId === -1) return;

    try {
      const originUrl = new URL(details.originUrl || details.url);
      if (isWhitelisted(originUrl.hostname)) return { cancel: false };
    } catch (e) {
      console.warn('URL解析失败:', e);
      return { cancel: false };
    }

    const tabId = details.tabId;
    const state = initTabState(tabId);
    const currentUrl = new URL(details.url);

    // 已锁定直接拦截（不重复弹窗）
    if (state.isLocked && state.lockedHosts.has(currentUrl.hostname)) {
      return { cancel: true };
    }

    // 特征检测（保持不变）
    const isCrossDomain = !details.url.startsWith(details.originUrl);
    const queryParams = Array.from(currentUrl.searchParams.keys());
    const isJsonp = queryParams.some(p => 
      JSONP_KEYWORDS.some(k => p.toLowerCase().includes(k))
    );
    const isSuspDomain = DOMAIN_KEYWORDS.some(k => 
      currentUrl.hostname.includes(k)
    );

    if (isCrossDomain && (isJsonp || isSuspDomain)) {
      state.counter++;

      // 初始化计时器（保持不变）
      if (!state.timer) {
        state.timer = setTimeout(() => {
          state.counter = 0;
          state.timer = null;
        }, 8000);
      }

      // 关键修改：仅首次达到阈值时触发
      if (state.counter === 4) { // 使用严格等于判断
        const detectedType = isJsonp ? 'JSONP参数' : '域名特征';
        const detectedValue = isJsonp 
          ? queryParams.find(p => JSONP_KEYWORDS.some(k => p.includes(k)))
          : DOMAIN_KEYWORDS.find(k => currentUrl.hostname.includes(k));

        triggerHoneypotAlert({
          key: `${detectedType}命中`,
          match: detectedValue,
          src: currentUrl.hostname,
          tabId: tabId
        });

        state.isLocked = true;
        state.lockedHosts.add(currentUrl.hostname);
        chrome.tabs.sendMessage(tabId, {
          action: "lockdown",
          blockedHost: currentUrl.hostname
        });
      }
      
      return { cancel: state.isLocked };
    }
    return { cancel: false };
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// 消息监听
chrome.runtime.onMessage.addListener((msg, _sender) => {
  if (msg.action === "toggle") {
    isEnabled = msg.state;
    chrome.storage.local.set({ enabled: msg.state });
  }

  if (msg.type === 'scriptCheck') {
    try {
      const url = new URL(msg.url);
      if (JSONP_KEYWORDS.some(k => url.searchParams.has(k))) {
        triggerHoneypotAlert({
          key: "动态脚本检测",
          match: "可疑参数",
          src: url.hostname,
          tabId: msg.tabId
        });
        return true;
      }
    } catch (e) {
      console.warn('脚本检测URL解析失败:', e);
    }
  }
});

// 标签页清理
chrome.tabs.onRemoved.addListener(tabId => tabStates.delete(tabId));

// 初始化
chrome.storage.local.get(['enabled'], res => {
  isEnabled = res.enabled ?? true;
});

// 调试模式
if (process.env.NODE_ENV === 'development') {
  chrome.runtime.onMessage.addListener((msg, _sender) => {
    if (msg.action === 'debug') {
      console.log('当前标签页状态:', tabStates);
    }
  });
}