// Popup script for proxy toggle UI

let currentState = {
  mode: 'proxy',
  customProxy: null
};

let proxies = [];

// DOM elements
const directBtn = document.getElementById('directBtn');
const proxyBtn = document.getElementById('proxyBtn');
const proxySelect = document.getElementById('proxySelect');
const loadProxiesBtn = document.getElementById('loadProxiesBtn');
const useSelectedBtn = document.getElementById('useSelectedBtn');
const proxyCount = document.getElementById('proxyCount');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentState();
  await loadProxiesFromFile();
  setupEventListeners();
  updateUI();
});

// Load current proxy state
async function loadCurrentState() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getState' });

    if (chrome.runtime.lastError) {
      console.warn('Service worker not available:', chrome.runtime.lastError.message);
      currentState = { mode: 'proxy', customProxy: null };
      return;
    }

    if (response && response.state) {
      currentState = response.state;
    }
  } catch (error) {
    console.error('Error loading state:', error);
    currentState = { mode: 'proxy', customProxy: null };
  }
}

// Load proxies from proxy.txt file
async function loadProxiesFromFile() {
  try {
    const response = await fetch(chrome.runtime.getURL('proxy.txt'));
    const text = await response.text();

    proxies = text.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    populateProxySelect();
    proxyCount.textContent = `${proxies.length} proxies loaded`;
  } catch (error) {
    console.error('Error loading proxy.txt:', error);
    proxyCount.textContent = 'Error loading proxy.txt';
  }
}

// Populate the proxy dropdown
function populateProxySelect() {
  proxySelect.innerHTML = '';

  if (proxies.length === 0) {
    proxySelect.innerHTML = '<option value="">-- No proxies in proxy.txt --</option>';
    return;
  }

  proxies.forEach((proxy, index) => {
    const option = document.createElement('option');
    option.value = proxy;
    // Show shortened version in dropdown
    const parts = proxy.split(':');
    const displayText = `${index + 1}. ${parts[0]}:${parts[1]}`;
    option.textContent = displayText;
    proxySelect.appendChild(option);
  });

  // Select current proxy if it matches
  if (currentState.mode === 'custom' && currentState.customProxy) {
    const { host, port, username, password } = currentState.customProxy;
    let currentProxyStr = `${host}:${port}`;
    if (username) currentProxyStr += `:${username}`;
    if (password) currentProxyStr += `:${password}`;

    for (let i = 0; i < proxySelect.options.length; i++) {
      if (proxySelect.options[i].value === currentProxyStr) {
        proxySelect.selectedIndex = i;
        break;
      }
    }
  }
}

// Setup event listeners
function setupEventListeners() {
  directBtn.addEventListener('click', () => toggleProxy('direct'));
  proxyBtn.addEventListener('click', () => toggleProxy('proxy'));
  loadProxiesBtn.addEventListener('click', loadProxiesFromFile);
  useSelectedBtn.addEventListener('click', useSelectedProxy);
}

// Use selected proxy from dropdown
async function useSelectedProxy() {
  const selectedProxy = proxySelect.value;

  if (!selectedProxy) {
    showError('Please select a proxy');
    return;
  }

  setButtonsEnabled(false);

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'toggleProxy',
      mode: 'custom',
      customProxy: selectedProxy
    });

    if (chrome.runtime.lastError) {
      throw new Error(chrome.runtime.lastError.message || 'Service worker not available');
    }

    if (response && response.success) {
      currentState = response.state;
      updateUI();
      showSuccess('Proxy activated!');
    } else {
      throw new Error(response?.error || 'Failed to set proxy');
    }
  } catch (error) {
    console.error('Proxy error:', error);
    showError(error.message || 'Failed to set proxy');
  } finally {
    setButtonsEnabled(true);
  }
}

// Toggle proxy mode
async function toggleProxy(mode) {
  setButtonsEnabled(false);

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'toggleProxy',
      mode: mode
    });

    if (chrome.runtime.lastError) {
      throw new Error(chrome.runtime.lastError.message || 'Service worker not available');
    }

    if (response && response.success) {
      currentState = response.state;
      updateUI();
      showSuccess(`Switched to ${getModeLabel(mode)}`);
    } else {
      throw new Error(response?.error || 'Failed to toggle proxy');
    }
  } catch (error) {
    console.error('Toggle error:', error);
    showError(error.message || 'Failed to toggle proxy');
  } finally {
    setButtonsEnabled(true);
  }
}

// Update UI based on current state
function updateUI() {
  statusDot.className = 'status-dot';
  statusDot.classList.add(`active-${currentState.mode}`);

  statusText.textContent = getStatusText(currentState.mode);

  directBtn.classList.remove('active');
  proxyBtn.classList.remove('active');

  if (currentState.mode === 'direct') {
    directBtn.classList.add('active');
  } else if (currentState.mode === 'proxy') {
    proxyBtn.classList.add('active');
  }
}

// Get status text
function getStatusText(mode) {
  switch (mode) {
    case 'direct':
      return 'Direct Connection';
    case 'custom':
      if (currentState.customProxy) {
        return `Proxy: ${currentState.customProxy.host}:${currentState.customProxy.port}`;
      }
      return 'Custom Proxy Active';
    case 'proxy':
    default:
      return 'Multilogin Proxy';
  }
}

// Get mode label
function getModeLabel(mode) {
  switch (mode) {
    case 'direct':
      return 'Direct Connection';
    case 'custom':
      return 'Custom Proxy';
    case 'proxy':
    default:
      return 'Multilogin Proxy';
  }
}

// Enable/disable buttons
function setButtonsEnabled(enabled) {
  directBtn.disabled = !enabled;
  proxyBtn.disabled = !enabled;
  loadProxiesBtn.disabled = !enabled;
  useSelectedBtn.disabled = !enabled;
  proxySelect.disabled = !enabled;
}

// Show success message
function showSuccess(message) {
  statusText.textContent = message;
  setTimeout(() => {
    statusText.textContent = getStatusText(currentState.mode);
  }, 2000);
}

// Show error message
function showError(message) {
  statusText.textContent = `Error: ${message}`;
  statusText.style.color = '#ff4444';
  setTimeout(() => {
    statusText.textContent = getStatusText(currentState.mode);
    statusText.style.color = '';
  }, 3000);
}
