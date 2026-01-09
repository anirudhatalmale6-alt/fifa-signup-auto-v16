// Background service worker for proxy management
// Handles proxy switching with Alt+Q shortcut and auto-authentication

// Store current proxy credentials for webRequest authentication
let currentProxyAuth = null;

// Listen for keyboard shortcut (Alt+Q)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'switch-random-proxy') {
    console.log('[ProxySwitcher] Alt+Q pressed - switching to random proxy');
    await switchToRandomProxy();
  }
});

// Switch to a random proxy from the stored list
async function switchToRandomProxy() {
  try {
    // Get proxy list from storage
    const result = await chrome.storage.local.get(['proxyList']);
    const proxyList = result.proxyList || [];

    if (proxyList.length === 0) {
      // Show notification that no proxies are configured
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            alert('No proxies configured!\\n\\nClick the extension icon and paste your proxy list first.');
          }
        });
      }
      return;
    }

    // Pick random proxy
    const randomIndex = Math.floor(Math.random() * proxyList.length);
    const proxyString = proxyList[randomIndex];
    const proxyConfig = parseProxyString(proxyString);

    if (!proxyConfig) {
      console.error('[ProxySwitcher] Invalid proxy format:', proxyString);
      return;
    }

    console.log('[ProxySwitcher] Selected proxy:', proxyConfig.host, proxyConfig.port);

    // Store credentials for authentication FIRST
    if (proxyConfig.username && proxyConfig.password) {
      currentProxyAuth = {
        username: proxyConfig.username,
        password: proxyConfig.password
      };
      console.log('[ProxySwitcher] Auth credentials stored for:', proxyConfig.username);
    } else {
      currentProxyAuth = null;
    }

    // Small delay to ensure auth is ready
    await new Promise(r => setTimeout(r, 50));

    // Set proxy configuration
    await setProxySettings({
      value: {
        mode: 'fixed_servers',
        rules: {
          singleProxy: {
            scheme: 'http',
            host: proxyConfig.host,
            port: proxyConfig.port
          }
        }
      },
      scope: 'regular'
    });

    // Update badge
    chrome.action.setBadgeText({ text: 'PRX' });
    chrome.action.setBadgeBackgroundColor({ color: '#44aa44' });

    // Save current proxy state
    await chrome.storage.local.set({
      currentProxy: proxyConfig,
      proxyState: { mode: 'custom', customProxy: proxyConfig }
    });

    // Get active tab and show notification + refresh
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      // Show notification
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (host, port, user) => {
          const n = document.createElement('div');
          n.style.cssText = 'position:fixed;top:20px;right:20px;background:#28a745;color:white;padding:16px 24px;border-radius:8px;z-index:999999;font-family:sans-serif;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
          n.innerHTML = '🔄 Proxy: ' + host + ':' + port + '<br><small style="font-weight:normal;">' + (user ? 'Auth: ' + user : 'No auth') + ' - Refreshing...</small>';
          document.body.appendChild(n);
          setTimeout(() => n.remove(), 2000);
        },
        args: [proxyConfig.host, proxyConfig.port, proxyConfig.username || '']
      });

      // Refresh page after short delay
      setTimeout(() => {
        chrome.tabs.reload(tab.id);
      }, 800);
    }

    console.log('[ProxySwitcher] ✅ Proxy switched successfully');

  } catch (error) {
    console.error('[ProxySwitcher] Error switching proxy:', error);
  }
}

// Listen for proxy authentication requests and inject credentials
chrome.webRequest.onAuthRequired.addListener(
  function(details) {
    console.log('[ProxySwitcher] Auth required, isProxy:', details.isProxy);

    // Handle proxy authentication
    if (details.isProxy && currentProxyAuth) {
      const { username, password } = currentProxyAuth;
      if (username && password) {
        console.log('[ProxySwitcher] Providing auth for:', username);
        return {
          authCredentials: {
            username: username,
            password: password
          }
        };
      }
    }
    return {};
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// Helper function to set proxy settings
function setProxySettings(config) {
  return new Promise((resolve, reject) => {
    chrome.proxy.settings.set(config, (details) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(details);
      }
    });
  });
}

// Helper function to clear proxy settings
function clearProxySettings() {
  return new Promise((resolve, reject) => {
    chrome.proxy.settings.clear({}, (details) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(details);
      }
    });
  });
}

// Parse proxy string format: host:port:user:pass
function parseProxyString(proxyString) {
  if (!proxyString || typeof proxyString !== 'string') {
    return null;
  }

  const parts = proxyString.trim().split(':');

  if (parts.length < 2) {
    return null;
  }

  const host = parts[0];
  const port = parseInt(parts[1], 10);

  if (!host || isNaN(port) || port < 1 || port > 65535) {
    return null;
  }

  const username = parts.length >= 3 ? parts[2] : null;
  const password = parts.length >= 4 ? parts[3] : null;

  return {
    host,
    port,
    username: username || null,
    password: password || null
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'switchRandomProxy') {
    switchToRandomProxy().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (request.action === 'disableProxy') {
    disableProxy().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (request.action === 'getState') {
    chrome.storage.local.get(['proxyList', 'currentProxy']).then(result => {
      sendResponse({
        proxyList: result.proxyList || [],
        currentProxy: result.currentProxy || null
      });
    });
    return true;
  }

  if (request.action === 'saveProxyList') {
    chrome.storage.local.set({ proxyList: request.proxyList }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Disable proxy (go direct)
async function disableProxy() {
  currentProxyAuth = null;

  // Use PAC script to force direct connection
  const directPACScript = `
function FindProxyForURL(url, host) {
  return "DIRECT";
}
  `.trim();

  await setProxySettings({
    value: {
      mode: 'pac_script',
      pacScript: {
        data: directPACScript
      }
    },
    scope: 'regular'
  });

  chrome.action.setBadgeText({ text: 'DIR' });
  chrome.action.setBadgeBackgroundColor({ color: '#ff4444' });

  await chrome.storage.local.set({
    currentProxy: null,
    proxyState: { mode: 'direct' }
  });

  // Refresh active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const n = document.createElement('div');
        n.style.cssText = 'position:fixed;top:20px;right:20px;background:#dc3545;color:white;padding:16px 24px;border-radius:8px;z-index:999999;font-family:sans-serif;font-weight:bold;';
        n.textContent = '🚫 Proxy disabled - Refreshing...';
        document.body.appendChild(n);
      }
    });

    setTimeout(() => {
      chrome.tabs.reload(tab.id);
    }, 800);
  }
}

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[ProxySwitcher] Extension installed/updated');
  chrome.action.setBadgeText({ text: 'OFF' });
  chrome.action.setBadgeBackgroundColor({ color: '#666666' });
});

// Handle proxy errors
chrome.proxy.onProxyError.addListener((details) => {
  if (details.fatal) {
    console.warn('[ProxySwitcher] Proxy error (fatal):', details);
  }
});

console.log('[ProxySwitcher] Background script loaded');
