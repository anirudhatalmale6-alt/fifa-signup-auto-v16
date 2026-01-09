// Ctrl+Shift+F = Ticket automation
// Card automation runs automatically via content script on application page

chrome.action.onClicked.addListener((tab) => {
  if (!tab || !tab.id) return;
  chrome.scripting.executeScript({target: {tabId: tab.id}, files: ["automation-tickets.js"]});
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (!tab || !tab.id) return;
  if (command === "run-automation") {
    chrome.scripting.executeScript({target: {tabId: tab.id}, files: ["automation-tickets.js"]});
  }
});
