/**
 * FIFA Auto Flow - Background Service Worker
 * Coordinates between content scripts, handles TM AutoFill reload and extension triggering
 */

console.log('[FIFA Auto Flow] Background service worker started');

// TM AutoFill extension ID
const TM_AUTOFILL_ID = 'padhjnhbdkphbcbhdeecaffjpijbohme';

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[FIFA Auto Flow] Received message:', message);

  if (message.action === 'reloadTMAutoFill') {
    console.log('[FIFA Auto Flow] Reloading TM AutoFill extension...');

    // Disable then enable TM AutoFill to reload it
    chrome.management.setEnabled(TM_AUTOFILL_ID, false, () => {
      console.log('[FIFA Auto Flow] TM AutoFill disabled');

      setTimeout(() => {
        chrome.management.setEnabled(TM_AUTOFILL_ID, true, () => {
          console.log('[FIFA Auto Flow] TM AutoFill re-enabled');
          sendResponse({ success: true, message: 'TM AutoFill reloaded' });
        });
      }, 500);
    });

    return true; // Keep message channel open for async response
  }

  if (message.action === 'triggerFIFAUIAutomation') {
    console.log('[FIFA Auto Flow] Attempting to trigger FIFA UI Automation via keyboard simulation');

    if (sender.tab && sender.tab.id) {
      chrome.tabs.sendMessage(sender.tab.id, { action: 'simulateAltX' });
    }

    sendResponse({ success: true });
  }

  return true;
});

// When extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('[FIFA Auto Flow] Extension installed');
});
