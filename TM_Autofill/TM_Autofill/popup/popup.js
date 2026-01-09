/**
 * TM AutoFill - CSV-Based Popup Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const csvInput = document.getElementById('csvInput');
  const loadBtn = document.getElementById('loadBtn');
  const accountSelect = document.getElementById('accountSelect');
  const statusDiv = document.getElementById('status');
  const csvStatusDiv = document.getElementById('csvStatus');
  const accountPreview = document.getElementById('accountPreview');
  const previewEmail = document.getElementById('previewEmail');
  const previewName = document.getElementById('previewName');
  const previewPhone = document.getElementById('previewPhone');
  const previewCard = document.getElementById('previewCard');

  const storage = chrome.storage.local;

  // Load accounts from embedded CSV file
  async function loadEmbeddedCSV() {
    try {
      const response = await fetch(chrome.runtime.getURL('accounts.csv'));
      const csvText = await response.text();
      return parseCSV(csvText);
    } catch (err) {
      console.error('[TM] Error loading accounts.csv:', err);
      return [];
    }
  }

  // Initialize - load from accounts.csv file first
  async function init() {
    // Try to load from accounts.csv file
    const accounts = await loadEmbeddedCSV();

    if (accounts.length > 0) {
      storage.get(['selectedRow'], (result) => {
        const selectedRow = Math.min(result.selectedRow || 0, accounts.length - 1);
        storage.set({ accounts, selectedRow }, () => {
          populateAccountSelect(accounts, selectedRow);
          console.log('[TM] Loaded', accounts.length, 'accounts from accounts.csv');
        });
      });
    } else {
      // Fallback to storage if no accounts.csv file
      storage.get(['accounts', 'selectedRow', 'csvData'], async (result) => {
        if (result.accounts && result.accounts.length > 0) {
          if (result.csvData) csvInput.value = result.csvData;
          populateAccountSelect(result.accounts, result.selectedRow || 0);
        }
      });
    }

    // Load debug logs
    loadDebugLogs();
  }

  init();

  // Parse CSV
  function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    let headerLine = lines[0].toLowerCase();
    if (headerLine.endsWith(',')) headerLine = headerLine.slice(0, -1);
    let headers = headerLine.split(',').map(h => h.trim().replace(/['"]/g, ''));

    const headerMap = {
      'email': 'email', 'password': 'password',
      'last name': 'last_name', 'last_name': 'last_name', 'lastname': 'last_name',
      'first name': 'first_name', 'first_name': 'first_name', 'firstname': 'first_name',
      'full name': 'full_name', 'full_name': 'full_name', 'fullname': 'full_name',
      'country': 'country', 'address': 'address', 'city': 'city',
      'zip code': 'zip_code', 'zip_code': 'zip_code', 'zipcode': 'zip_code', 'zip': 'zip_code',
      'province': 'province', 'state': 'province',
      'phone': 'phone', 'phone #': 'phone', 'phone_number': 'phone',
      'card_number': 'card_number', 'card number': 'card_number',
      'cvc': 'cvc', 'cvv': 'cvc',
      'card_expiry': 'card_expiry', 'card expiry': 'card_expiry', 'expiry': 'card_expiry',
      'expiration date': 'card_expiry', 'expiration_date': 'card_expiry',
      'card_name': 'card_name', 'card name': 'card_name', 'cardholder': 'card_name',
      'gender': 'gender', 'language': 'language',
      'tm_pass': 'tm_pass', 'tm_password': 'tm_pass', 'ticketmaster_password': 'tm_pass'
    };

    let normalizedHeaders = headers.map(h => headerMap[h] || h);

    const accounts = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      const account = {};

      normalizedHeaders.forEach((header, index) => {
        if (header && header.trim()) {
          account[header] = values[index] || '';
        }
      });

      if (!account.full_name && account.first_name && account.last_name) {
        account.full_name = account.first_name + ' ' + account.last_name;
      }
      if (!account.card_name && account.full_name) {
        account.card_name = account.full_name;
      }

      accounts.push(account);
    }
    return accounts;
  }

  function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else current += char;
    }
    values.push(current.trim());
    return values;
  }

  function populateAccountSelect(accounts, selectedRow) {
    accountSelect.innerHTML = '';
    accounts.forEach((account, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${index + 1}. ${account.email || 'No email'} - ${account.full_name || account.first_name || 'Unknown'}`;
      accountSelect.appendChild(option);
    });
    accountSelect.value = selectedRow;
    updatePreview(accounts[selectedRow]);
  }

  function updatePreview(account) {
    if (account) {
      accountPreview.style.display = 'block';
      previewEmail.textContent = account.email || '-';
      previewName.textContent = account.full_name || `${account.first_name || ''} ${account.last_name || ''}`.trim() || '-';
      previewPhone.textContent = account.phone || '-';
      previewCard.textContent = account.card_number ? `****${account.card_number.slice(-4)}` : '-';
    } else {
      accountPreview.style.display = 'none';
    }
  }

  function showStatus(element, message, isError = false) {
    element.textContent = message;
    element.className = 'status ' + (isError ? 'error' : 'success');
    element.style.display = 'block';
    setTimeout(() => { element.style.display = 'none'; }, 3000);
  }

  // Tab switching
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      this.classList.add('active');

      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
      document.getElementById(`${this.dataset.tab}-content`).classList.add('active');
    });
  });

  // Load CSV button
  loadBtn.addEventListener('click', () => {
    const csv = csvInput.value.trim();
    if (!csv) { showStatus(csvStatusDiv, 'Please paste CSV data first', true); return; }

    const accounts = parseCSV(csv);
    if (accounts.length === 0) { showStatus(csvStatusDiv, 'No valid accounts found', true); return; }

    storage.set({ accounts, selectedRow: 0, csvData: csv }, () => {
      populateAccountSelect(accounts, 0);
      showStatus(csvStatusDiv, `Loaded ${accounts.length} accounts!`);

      // Switch to accounts tab
      document.querySelector('[data-tab="accounts"]').click();
    });
  });

  // Account select change
  accountSelect.addEventListener('change', () => {
    const selectedRow = parseInt(accountSelect.value);
    storage.get(['accounts'], (result) => {
      storage.set({ selectedRow });
      updatePreview(result.accounts[selectedRow]);

      // Notify background script about account change
      chrome.runtime.sendMessage({
        action: 'accountChanged',
        data: result.accounts[selectedRow],
        selectedRow: selectedRow
      });
    });
  });

  // Autofill button
  document.getElementById('autofillBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { action: 'autofill' });
      showStatus(statusDiv, 'Autofill triggered!');
    }
  });

  // Debug logs
  function loadDebugLogs() {
    chrome.storage.local.get(['debug_logs'], function (result) {
      const logsContainer = document.getElementById('debug-logs');
      const logs = result.debug_logs || [];

      if (logs.length === 0) {
        logsContainer.innerHTML = 'No debug logs yet.';
        return;
      }

      const logsHtml = logs.slice(-50).map((log) => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        return `<div class="log-entry"><div class="timestamp">${time}</div><div>${escapeHtml(log.message)}</div></div>`;
      }).join('');

      logsContainer.innerHTML = logsHtml;
      logsContainer.scrollTop = logsContainer.scrollHeight;
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Clear logs button
  document.getElementById('clear-logs').addEventListener('click', function () {
    chrome.storage.local.remove('debug_logs', function () {
      document.getElementById('debug-logs').innerHTML = 'Logs cleared.';
    });
  });

  // Auto-refresh logs every 2 seconds
  setInterval(loadDebugLogs, 2000);
});
