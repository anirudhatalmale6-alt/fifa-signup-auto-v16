// Popup script for Proxy Switcher Pro

document.addEventListener('DOMContentLoaded', async () => {
  await loadState();
  setupEventListeners();
});

// Load current state from background
async function loadState() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getState' });

    if (response) {
      // Load proxy list into textarea
      if (response.proxyList && response.proxyList.length > 0) {
        document.getElementById('proxyList').value = response.proxyList.join('\n');
        document.getElementById('proxyCount').textContent = response.proxyList.length + ' proxies loaded';
      }

      // Show current proxy
      if (response.currentProxy) {
        document.getElementById('currentProxy').textContent =
          response.currentProxy.host + ':' + response.currentProxy.port;
      } else {
        document.getElementById('currentProxy').textContent = 'No proxy active';
      }
    }
  } catch (error) {
    console.error('Error loading state:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Save proxy list
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const text = document.getElementById('proxyList').value.trim();
    const lines = text.split('\n').filter(line => line.trim());

    try {
      await chrome.runtime.sendMessage({
        action: 'saveProxyList',
        proxyList: lines
      });

      document.getElementById('proxyCount').textContent = lines.length + ' proxies saved!';
      setTimeout(() => {
        document.getElementById('proxyCount').textContent = lines.length + ' proxies loaded';
      }, 2000);
    } catch (error) {
      console.error('Error saving:', error);
    }
  });

  // Switch to random proxy
  document.getElementById('switchBtn').addEventListener('click', async () => {
    const btn = document.getElementById('switchBtn');
    btn.disabled = true;
    btn.textContent = 'Switching...';

    try {
      await chrome.runtime.sendMessage({ action: 'switchRandomProxy' });
      window.close();
    } catch (error) {
      console.error('Error switching:', error);
      btn.disabled = false;
      btn.textContent = 'Switch to Random Proxy';
    }
  });

  // Disable proxy
  document.getElementById('disableBtn').addEventListener('click', async () => {
    const btn = document.getElementById('disableBtn');
    btn.disabled = true;
    btn.textContent = 'Disabling...';

    try {
      await chrome.runtime.sendMessage({ action: 'disableProxy' });
      window.close();
    } catch (error) {
      console.error('Error disabling:', error);
      btn.disabled = false;
      btn.textContent = 'Disable Proxy (Direct)';
    }
  });

  // Update count when textarea changes
  document.getElementById('proxyList').addEventListener('input', () => {
    const text = document.getElementById('proxyList').value.trim();
    const lines = text.split('\n').filter(line => line.trim());
    document.getElementById('proxyCount').textContent = lines.length + ' proxies (unsaved)';
  });
}
