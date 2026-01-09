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

  // Run ticket automation directly (instead of trying to trigger external extension)
  if (message.action === 'sendCtrlShiftF' || message.action === 'runTicketAutomation') {
    console.log('[FIFA Auto Flow] Running ticket automation directly');

    if (sender.tab && sender.tab.id) {
      const tabId = sender.tab.id;

      // First zoom to 35%
      chrome.tabs.setZoom(tabId, 0.35).then(() => {
        console.log('[FIFA Auto Flow] Zoomed to 35%');

        // Wait for zoom to apply, then run automation script
        setTimeout(() => {
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['automation-tickets.js']
          }).then(() => {
            console.log('[FIFA Auto Flow] Ticket automation script executed');
            sendResponse({ success: true });
          }).catch((err) => {
            console.log('[FIFA Auto Flow] Script execution error:', err);
            sendResponse({ success: false, error: err.message });
          });
        }, 150);
      }).catch((err) => {
        console.log('[FIFA Auto Flow] Zoom error:', err);
        sendResponse({ success: false, error: err.message });
      });

      return true; // Keep message channel open
    }
  }

  return true;
});

// When extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('[FIFA Auto Flow] Extension installed');
});

// Ctrl+Shift+F keyboard shortcut (manual trigger)
chrome.commands.onCommand.addListener((command, tab) => {
  if (!tab || !tab.id) return;
  if (command === 'run-ticket-automation') {
    console.log('[FIFA Auto Flow] Ctrl+Shift+F pressed - running ticket automation');

    // First zoom to 35%
    chrome.tabs.setZoom(tab.id, 0.35).then(() => {
      console.log('[FIFA Auto Flow] Zoomed to 35%');

      // Wait for zoom to apply, then run automation script
      setTimeout(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['automation-tickets.js']
        }).then(() => {
          console.log('[FIFA Auto Flow] Ticket automation script executed');
        }).catch((err) => {
          console.log('[FIFA Auto Flow] Script execution error:', err);
        });
      }, 150);
    }).catch((err) => {
      console.log('[FIFA Auto Flow] Zoom error:', err);
    });
  }
});

// Auto-refresh on connection errors - DISABLED by user request
// Was causing homepage redirect issues
// chrome.webNavigation.onErrorOccurred.addListener((details) => { ... });
