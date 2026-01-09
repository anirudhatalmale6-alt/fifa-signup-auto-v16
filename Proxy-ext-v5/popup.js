// Popup script for proxy toggle UI

let currentState = {
  mode: 'proxy',
  customProxy: null
};

// DOM elements
const directBtn = document.getElementById('directBtn');
const proxyBtn = document.getElementById('proxyBtn');
const customProxyBtn = document.getElementById('customProxyBtn');
const proxyInput = document.getElementById('proxyInput');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentState();
  setupEventListeners();
  updateUI();
});

// Load current proxy state
async function loadCurrentState() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getState' });
    
    // Check if service worker responded
    if (chrome.runtime.lastError) {
      console.warn('Service worker not available:', chrome.runtime.lastError.message);
      // Use default state if service worker unavailable
      currentState = { mode: 'proxy', customProxy: null };
      return;
    }
    
    if (response && response.state) {
      currentState = response.state;
      
      // Populate custom proxy input if in custom mode
      if (currentState.mode === 'custom' && currentState.customProxy) {
        const { host, port, username, password } = currentState.customProxy;
        let proxyString = `${host}:${port}`;
        if (username) proxyString += `:${username}`;
        if (password) proxyString += `:${password}`;
        proxyInput.value = proxyString;
      }
    }
  } catch (error) {
    console.error('Error loading state:', error);
    // Don't show error on initial load - just use defaults
    currentState = { mode: 'proxy', customProxy: null };
  }
}

// Setup event listeners
function setupEventListeners() {
  directBtn.addEventListener('click', () => toggleProxy('direct'));
  proxyBtn.addEventListener('click', () => toggleProxy('proxy'));
  customProxyBtn.addEventListener('click', () => toggleCustomProxy());
  
  // Allow Enter key to submit custom proxy
  proxyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      toggleCustomProxy();
    }
  });
}

// Toggle proxy mode
async function toggleProxy(mode) {
  // Disable buttons during operation
  setButtonsEnabled(false);
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'toggleProxy',
      mode: mode
    });
    
    // Check if service worker responded
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
    showError(error.message || 'Failed to toggle proxy. Try reloading the extension.');
  } finally {
    setButtonsEnabled(true);
  }
}

// Toggle custom proxy
async function toggleCustomProxy() {
  const proxyString = proxyInput.value.trim();
  
  if (!proxyString) {
    showError('Please enter a proxy string');
    proxyInput.focus();
    return;
  }
  
  // Validate format
  const parts = proxyString.split(':');
  if (parts.length < 2) {
    showError('Invalid format. Use: host:port:user:pass');
    proxyInput.focus();
    return;
  }
  
  const port = parseInt(parts[1], 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    showError('Invalid port number');
    proxyInput.focus();
    return;
  }
  
  setButtonsEnabled(false);
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'toggleProxy',
      mode: 'custom',
      customProxy: proxyString
    });
    
    // Check if service worker responded
    if (chrome.runtime.lastError) {
      throw new Error(chrome.runtime.lastError.message || 'Service worker not available');
    }
    
    if (response && response.success) {
      currentState = response.state;
      updateUI();
      
      // Check if proxy has authentication
      if (proxyString.includes(':') && proxyString.split(':').length >= 4) {
        showSuccess('Custom proxy set. If page reloads, check for Chrome authentication prompt. If no prompt appears, this proxy may not work with Chrome extensions.');
      } else {
        showSuccess('Switched to custom proxy');
      }
    } else {
      throw new Error(response?.error || 'Failed to set custom proxy');
    }
  } catch (error) {
    console.error('Custom proxy error:', error);
    showError(error.message || 'Failed to set custom proxy. Try reloading the extension.');
  } finally {
    setButtonsEnabled(true);
  }
}

// Update UI based on current state
function updateUI() {
  // Update status indicator
  statusDot.className = 'status-dot';
  statusDot.classList.add(`active-${currentState.mode}`);
  
  statusText.textContent = getStatusText(currentState.mode);
  
  // Update button states
  directBtn.classList.remove('active');
  proxyBtn.classList.remove('active');
  customProxyBtn.classList.remove('active');
  
  if (currentState.mode === 'direct') {
    directBtn.classList.add('active');
  } else if (currentState.mode === 'proxy') {
    proxyBtn.classList.add('active');
  } else if (currentState.mode === 'custom') {
    customProxyBtn.classList.add('active');
  }
}

// Get status text
function getStatusText(mode) {
  switch (mode) {
    case 'direct':
      return 'Direct Connection';
    case 'custom':
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
  customProxyBtn.disabled = !enabled;
  proxyInput.disabled = !enabled;
}

// Show success message
function showSuccess(message) {
  // Simple visual feedback - could be enhanced with toast notification
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

