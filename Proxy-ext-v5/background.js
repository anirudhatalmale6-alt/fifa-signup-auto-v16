// Background service worker for proxy management
// Handles proxy switching and state persistence

// Default proxy state - starts with custom proxy from config file
const DEFAULT_STATE = {
  mode: 'custom', // 'direct' or 'proxy' or 'custom'
  customProxy: null, // { host, port, username, password }
  originalProxy: null // Store original proxy settings
};

// Store current proxy credentials for webRequest authentication
let currentProxyAuth = null;

// Load proxy config from proxy.json file
async function loadProxyConfig() {
  try {
    const response = await fetch(chrome.runtime.getURL('proxy.json'));
    const config = await response.json();
    console.log('[Proxy] Loaded config:', config.host + ':' + config.port);
    return config;
  } catch (error) {
    console.error('[Proxy] Error loading proxy.json:', error);
    return null;
  }
}

// Set custom proxy from config
async function setCustomProxyFromConfig(config) {
  if (!config || !config.host || !config.port || config.host === 'your-proxy-host.com') {
    console.log('[Proxy] No valid config, using DIRECT');
    return false;
  }

  // Store credentials for auth
  currentProxyAuth = {
    username: config.username || '',
    password: config.password || ''
  };

  // Use fixed_servers mode for custom proxy
  await chrome.proxy.settings.set({
    value: {
      mode: 'fixed_servers',
      rules: {
        singleProxy: {
          scheme: 'http',
          host: config.host,
          port: parseInt(config.port)
        }
      }
    },
    scope: 'regular'
  });

  chrome.action.setBadgeText({ text: 'CUS' });
  chrome.action.setBadgeBackgroundColor({ color: '#ff9900' });

  console.log('[Proxy] ✅ Set custom proxy:', config.host + ':' + config.port);
  return true;
}

// Service worker wake up - load custom proxy from config
(async () => {
  console.log('[ServiceWorker] Woke up - loading proxy config');

  try {
    // Get saved state from storage
    const result = await chrome.storage.local.get(['proxyState']);
    const state = result.proxyState || DEFAULT_STATE;

    console.log('[ServiceWorker] Current mode:', state.mode);

    if (state.mode === 'proxy') {
      // Restore Multilogin proxy mode
      currentProxyAuth = null;
      await chrome.proxy.settings.clear({});
      chrome.action.setBadgeText({ text: 'PRX' });
      chrome.action.setBadgeBackgroundColor({ color: '#4444ff' });
      console.log('[ServiceWorker] ✅ Restored to Multilogin proxy');
    } else {
      // Load and set custom proxy from config file
      const config = await loadProxyConfig();
      if (config && config.host && config.host !== 'your-proxy-host.com') {
        await setCustomProxyFromConfig(config);
        await chrome.storage.local.set({
          proxyState: { mode: 'custom', customProxy: config, originalProxy: null }
        });
      } else {
        // No valid config - use DIRECT
        currentProxyAuth = null;
        const directPACScript = `
function FindProxyForURL(url, host) {
  return "DIRECT";
}
        `.trim();
        await chrome.proxy.settings.set({
          value: {
            mode: 'pac_script',
            pacScript: { data: directPACScript }
          },
          scope: 'regular'
        });
        chrome.action.setBadgeText({ text: 'DIR' });
        chrome.action.setBadgeBackgroundColor({ color: '#ff4444' });
        console.log('[ServiceWorker] ✅ No config, using DIRECT');
      }
    }

  } catch (error) {
    console.error('[ServiceWorker] Error during wake:', error);
  }
})();

// Listen for proxy authentication requests and inject credentials
// webRequestAuthProvider permission enables blocking mode for onAuthRequired in MV3
chrome.webRequest.onAuthRequired.addListener(
  function(details) {
    // Check if this is a proxy authentication request
    if (details.isProxy && currentProxyAuth) {
      const { username, password } = currentProxyAuth;
      if (username && password) {
        // Return credentials directly - Chrome handles the response
        return {
          authCredentials: {
            username: username,
            password: password
          }
        };
      }
    }
    // Return empty object to let Chrome handle it normally
    return {};
  },
  { urls: ["<all_urls>"] },
  ["blocking"] // webRequestAuthProvider enables blocking mode for auth
);

// Helper function to wrap Chrome proxy API callbacks in promises
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

// Initialize extension state - Load custom proxy from config file
chrome.runtime.onInstalled.addListener(async () => {
  try {
    console.log('[onInstalled] Extension install/update - loading proxy from config');

    // Load and set custom proxy from config file
    const config = await loadProxyConfig();
    if (config && config.host && config.host !== 'your-proxy-host.com') {
      await setCustomProxyFromConfig(config);
      await chrome.storage.local.set({
        proxyState: { mode: 'custom', customProxy: config, originalProxy: null }
      });
      console.log('[onInstalled] ✅ Set custom proxy from config:', config.host);
    } else {
      // No valid config - use DIRECT as fallback
      currentProxyAuth = null;
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

      await chrome.storage.local.set({
        proxyState: { ...DEFAULT_STATE, mode: 'direct' }
      });
      updateBadge('direct');
      console.log('[onInstalled] ⚠️ No valid config, using DIRECT');
    }

  } catch (error) {
    console.error('[onInstalled] Error during initialization:', error);
    // Fallback to DIRECT mode
    currentProxyAuth = null;
    updateBadge('direct');
    await chrome.storage.local.set({
      proxyState: { ...DEFAULT_STATE, mode: 'direct' }
    }).catch(() => {});
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleProxy') {
    handleProxyToggle(request.mode, request.customProxy)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getState') {
    chrome.storage.local.get(['proxyState']).then(result => {
      sendResponse({ state: result.proxyState || DEFAULT_STATE });
    });
    return true;
  }
});

// Handle proxy toggle
async function handleProxyToggle(mode, customProxy = null) {
  try {
    const currentState = await chrome.storage.local.get(['proxyState']);
    const state = currentState.proxyState || DEFAULT_STATE;
    
    let newState = { ...state };
    
    if (mode === 'direct') {
      // Switch to direct connection (no proxy)
      // Clear proxy auth when switching to direct
      currentProxyAuth = null;
      
      // Use PAC script that returns "DIRECT" to bypass all proxies including Multilogin's
      // This approach works similar to Bart Proxy Switcher and other proxy extensions
      const directPACScript = `
function FindProxyForURL(url, host) {
  // Force direct connection - bypass all proxies
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
      
      newState.mode = 'direct';
      newState.customProxy = null;
      updateBadge('direct');
    } 
    else if (mode === 'custom' && customProxy) {
      // Switch to custom HTTP proxy
      const proxyConfig = parseProxyString(customProxy);
      if (!proxyConfig) {
        throw new Error('Invalid proxy format. Use: host:port:user:pass');
      }
      
      // Store credentials for webRequest authentication
      if (proxyConfig.username && proxyConfig.password) {
        currentProxyAuth = {
          username: proxyConfig.username,
          password: proxyConfig.password
        };
      } else {
        currentProxyAuth = null;
      }
      
      // Use fixed_servers mode - webRequestAuthProvider will handle authentication automatically
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
      
      newState.mode = 'custom';
      newState.customProxy = proxyConfig;
      updateBadge('custom');
    }
    else if (mode === 'proxy') {
      // Restore to Multilogin default proxy
      // Clear proxy auth when switching to Multilogin proxy
      currentProxyAuth = null;
      
      // Clearing extension proxy settings restores browser-level proxy
      // In Multilogin 6, this restores the profile's configured proxy
      // Note: whoer.net may show "Proxy: No" but IP changes confirm proxy is working
      await clearProxySettings();
      newState.mode = 'proxy';
      newState.customProxy = null;
      updateBadge('proxy');
    }
    
    // Save state
    await chrome.storage.local.set({ proxyState: newState });
    
    return { success: true, state: newState };
  } catch (error) {
    console.error('Proxy toggle error:', error);
    return { success: false, error: error.message };
  }
}

// Apply proxy settings from stored state
async function applyProxySettings(state) {
  if (!state) return;
  
  try {
    if (state.mode === 'direct') {
      // Restore direct connection using PAC script
      const directPACScript = `
function FindProxyForURL(url, host) {
  // Force direct connection - bypass all proxies
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
      updateBadge('direct');
    } else if (state.mode === 'custom' && state.customProxy) {
      // Restore custom proxy settings
      // Store credentials for webRequest authentication
      if (state.customProxy.username && state.customProxy.password) {
        currentProxyAuth = {
          username: state.customProxy.username,
          password: state.customProxy.password
        };
      } else {
        currentProxyAuth = null;
      }
      
      // Use fixed_servers mode - webRequestAuthProvider will handle authentication automatically
      await setProxySettings({
        value: {
          mode: 'fixed_servers',
          rules: {
            singleProxy: {
              scheme: 'http',
              host: state.customProxy.host,
              port: state.customProxy.port
            }
          }
        },
        scope: 'regular'
      });
      updateBadge('custom');
    } else {
      // Default proxy mode - restore Multilogin profile proxy
      // Clearing extension override restores Multilogin's browser-level proxy
      await clearProxySettings();
      updateBadge('proxy');
    }
  } catch (error) {
    console.error('Error applying proxy settings:', error);
    // Don't throw - allow extension to continue even if proxy restore fails
  }
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

// Generate PAC script for authenticated proxies
// Note: Chrome's PAC scripts don't support authentication directly
// This PAC script routes traffic through the proxy
// Chrome will prompt for authentication credentials when needed
// For HTTP proxies, authentication is typically handled via Proxy-Authorization header
// which Chrome manages automatically when credentials are provided
function generatePACScript(proxyConfig) {
  const proxyUrl = `PROXY ${proxyConfig.host}:${proxyConfig.port}`;
  
  return `
function FindProxyForURL(url, host) {
  // Route all traffic through the specified proxy
  // Authentication will be handled by Chrome's built-in mechanisms
  return "${proxyUrl}";
}
  `.trim();
}

// Update badge to show current proxy state
function updateBadge(mode) {
  const badgeText = mode === 'direct' ? 'DIR' : mode === 'custom' ? 'CST' : 'PRX';
  const badgeColor = mode === 'direct' ? '#ff4444' : mode === 'custom' ? '#44aa44' : '#4444ff';
  
  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({ color: badgeColor });
}

// Handle proxy errors
// Note: These errors are normal when:
// - Testing without a real proxy server
// - Proxy server is unreachable
// - Proxy authentication fails
// - Network connectivity issues
chrome.proxy.onProxyError.addListener((details) => {
  // Log error details in a more readable format
  const errorInfo = {
    error: details.error || 'Unknown proxy error',
    details: details.details || 'No additional details',
    fatal: details.fatal || false
  };
  
  // Only log if it's a fatal error or if we're in a custom proxy mode
  // This reduces noise during normal operation
  if (errorInfo.fatal) {
    console.warn('Proxy error (fatal):', errorInfo);
  } else {
    // Non-fatal errors are common and can be ignored during testing
    console.debug('Proxy error (non-fatal):', errorInfo);
  }
});

// Initialize badge on startup - Load custom proxy from config file
chrome.runtime.onStartup.addListener(async () => {
  try {
    console.log('[onStartup] Browser restart - loading proxy from config');

    // Load and set custom proxy from config file
    const config = await loadProxyConfig();
    if (config && config.host && config.host !== 'your-proxy-host.com') {
      await setCustomProxyFromConfig(config);
      await chrome.storage.local.set({
        proxyState: { mode: 'custom', customProxy: config, originalProxy: null }
      });
      console.log('[onStartup] ✅ Set custom proxy from config:', config.host);
    } else {
      // No valid config - use DIRECT as fallback
      currentProxyAuth = null;
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

      await chrome.storage.local.set({
        proxyState: { ...DEFAULT_STATE, mode: 'direct' }
      });
      updateBadge('direct');
      console.log('[onStartup] ⚠️ No valid config, using DIRECT');
    }

  } catch (error) {
    console.error('[onStartup] Error during initialization:', error);
    // Fallback to DIRECT mode
    currentProxyAuth = null;
    updateBadge('direct');
    await chrome.storage.local.set({
      proxyState: { ...DEFAULT_STATE, mode: 'direct' }
    }).catch(() => {});
  }
});

// Alt+Q keyboard shortcut to switch to Multilogin proxy
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'switch-proxy') {
    console.log('[Shortcut] Alt+Q pressed - switching to Multilogin proxy');

    try {
      // Clear extension proxy settings to restore Multilogin's browser-level proxy
      currentProxyAuth = null;
      await clearProxySettings();
      await chrome.storage.local.set({
        proxyState: { mode: 'proxy', customProxy: null, originalProxy: null }
      });
      updateBadge('proxy');
      console.log('[Shortcut] ✅ Switched to Multilogin proxy');

      // Show sticky notification on current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              // Remove existing notification if any
              const existing = document.getElementById('proxy-notification');
              if (existing) existing.remove();

              // Create sticky notification icon
              const notification = document.createElement('div');
              notification.id = 'proxy-notification';
              notification.innerHTML = 'PRX';
              notification.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: #4444ff;
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-family: Arial, sans-serif;
                font-size: 12px;
                font-weight: bold;
                z-index: 999999;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              `;
              document.body.appendChild(notification);
            }
          });
        } catch (e) {
          console.log('[Shortcut] Could not inject notification:', e);
        }
      }
    } catch (error) {
      console.error('[Shortcut] Error:', error);
    }
  }
});

