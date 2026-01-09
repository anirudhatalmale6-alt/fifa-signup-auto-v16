// Ctrl+Shift+Alt = Ticket automation (auto zoom to 35% first)
// Alt+C = Card automation (handled by content script)

async function zoomAndRunTickets(tabId) {
  try {
    // First zoom to 35%
    await chrome.tabs.setZoom(tabId, 0.35);
    console.log('[FIFA] Zoomed to 35%');

    // Wait for zoom to apply
    await new Promise(resolve => setTimeout(resolve, 150));

    // Then run the ticket automation script
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["automation-tickets.js"]
    });
    console.log('[FIFA] Ticket automation started');
  } catch (err) {
    console.log('[FIFA] Error:', err);
  }
}

// Click extension icon
chrome.action.onClicked.addListener((tab) => {
  if (!tab || !tab.id) return;
  zoomAndRunTickets(tab.id);
});

// Ctrl+Shift+F keyboard shortcut
chrome.commands.onCommand.addListener((command, tab) => {
  if (!tab || !tab.id) return;
  if (command === "run-automation") {
    zoomAndRunTickets(tab.id);
  }
});
