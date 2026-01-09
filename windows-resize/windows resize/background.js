/**
 * Window Size + Zoom - ALWAYS 35%
 * Sets size to 350x480 when window opens
 * Zoom stays at 35% on ALL page navigations
 */

const DEFAULT_WIDTH = 350;
const DEFAULT_HEIGHT = 480;
const DEFAULT_ZOOM = 0.35;  // 35%

// Track windows we've already set size (only set once)
const sizedWindows = new Set();

// Set size once - preserves position, only runs once per window
async function setSizeOnce(windowId) {
  if (sizedWindows.has(windowId)) return;

  try {
    const win = await chrome.windows.get(windowId);
    await chrome.windows.update(windowId, {
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      left: win.left,
      top: win.top,
      state: 'normal'
    });
    sizedWindows.add(windowId);
  } catch (err) {}
}

// Set zoom - ALWAYS apply (not just once)
async function setZoom(tabId) {
  try {
    await chrome.tabs.setZoom(tabId, DEFAULT_ZOOM);
  } catch (err) {}
}

// New window created - set size once and zoom tabs
chrome.windows.onCreated.addListener(async (window) => {
  if (window.type !== 'normal') return;
  setTimeout(async () => {
    await setSizeOnce(window.id);
    const tabs = await chrome.tabs.query({ windowId: window.id });
    for (const tab of tabs) {
      await setZoom(tab.id);
    }
  }, 1000);
});

// New tab created - zoom
chrome.tabs.onCreated.addListener(async (tab) => {
  setTimeout(() => setZoom(tab.id), 500);
});

// Tab updated (page loaded) - ALWAYS zoom on every page load
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Always set zoom when page finishes loading
    setTimeout(() => setZoom(tabId), 300);
  }
});

// Window removed - clean up
chrome.windows.onRemoved.addListener((windowId) => {
  sizedWindows.delete(windowId);
});

// On startup - set size and zoom for existing windows
chrome.runtime.onStartup.addListener(async () => {
  setTimeout(async () => {
    const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
    for (const win of windows) {
      await setSizeOnce(win.id);
      const tabs = await chrome.tabs.query({ windowId: win.id });
      for (const tab of tabs) {
        await setZoom(tab.id);
      }
    }
  }, 2000);
});

// On install - set size and zoom for current window
chrome.runtime.onInstalled.addListener(async () => {
  setTimeout(async () => {
    const win = await chrome.windows.getCurrent();
    await setSizeOnce(win.id);
    const tabs = await chrome.tabs.query({ windowId: win.id });
    for (const tab of tabs) {
      await setZoom(tab.id);
    }
  }, 1000);
});
