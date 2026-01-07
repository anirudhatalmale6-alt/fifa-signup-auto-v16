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

  // Use debugger API to send REAL Ctrl+Shift+F keypress
  if (message.action === 'sendCtrlShiftF') {
    console.log('[FIFA Auto Flow] Sending REAL Ctrl+Shift+F via debugger API');

    if (sender.tab && sender.tab.id) {
      const tabId = sender.tab.id;

      // Attach debugger
      chrome.debugger.attach({ tabId: tabId }, '1.3', () => {
        if (chrome.runtime.lastError) {
          console.log('[FIFA Auto Flow] Debugger attach error:', chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }

        // Send Ctrl+Shift+F key events
        // Key down for Ctrl
        chrome.debugger.sendCommand({ tabId: tabId }, 'Input.dispatchKeyEvent', {
          type: 'keyDown',
          key: 'Control',
          code: 'ControlLeft',
          windowsVirtualKeyCode: 17,
          modifiers: 0
        }, () => {
          // Key down for Shift
          chrome.debugger.sendCommand({ tabId: tabId }, 'Input.dispatchKeyEvent', {
            type: 'keyDown',
            key: 'Shift',
            code: 'ShiftLeft',
            windowsVirtualKeyCode: 16,
            modifiers: 2 // Ctrl
          }, () => {
            // Key down for F
            chrome.debugger.sendCommand({ tabId: tabId }, 'Input.dispatchKeyEvent', {
              type: 'keyDown',
              key: 'f',
              code: 'KeyF',
              windowsVirtualKeyCode: 70,
              modifiers: 3 // Ctrl+Shift
            }, () => {
              // Key up for F
              chrome.debugger.sendCommand({ tabId: tabId }, 'Input.dispatchKeyEvent', {
                type: 'keyUp',
                key: 'f',
                code: 'KeyF',
                windowsVirtualKeyCode: 70,
                modifiers: 3
              }, () => {
                // Key up for Shift
                chrome.debugger.sendCommand({ tabId: tabId }, 'Input.dispatchKeyEvent', {
                  type: 'keyUp',
                  key: 'Shift',
                  code: 'ShiftLeft',
                  windowsVirtualKeyCode: 16,
                  modifiers: 2
                }, () => {
                  // Key up for Ctrl
                  chrome.debugger.sendCommand({ tabId: tabId }, 'Input.dispatchKeyEvent', {
                    type: 'keyUp',
                    key: 'Control',
                    code: 'ControlLeft',
                    windowsVirtualKeyCode: 17,
                    modifiers: 0
                  }, () => {
                    // Detach debugger after a short delay
                    setTimeout(() => {
                      chrome.debugger.detach({ tabId: tabId }, () => {
                        console.log('[FIFA Auto Flow] Ctrl+Shift+F sent successfully, debugger detached');
                      });
                    }, 500);
                  });
                });
              });
            });
          });
        });

        sendResponse({ success: true });
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

// Auto-refresh on connection errors - DISABLED by user request
// Was causing homepage redirect issues
// chrome.webNavigation.onErrorOccurred.addListener((details) => { ... });
