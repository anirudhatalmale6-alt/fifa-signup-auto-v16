/**
 * WhoerIP Content Script
 * Detects when multilogin profile opens, triggers TM AutoFill to load profile, then opens FIFA
 */

(function() {
  console.log('[FIFA Auto Flow] WhoerIP page detected');

  const FIFA_TICKETS_URL = 'https://access.tickets.fifa.com/pkpcontroller/selectqueue.do?source=https%3A%2F%2Ffifa-fwc26-us.tickets.fifa.com/&queueName=10-FWC26-LotteryFCFS';

  // Try to extract profile name from URL
  const urlMatch = window.location.href.match(/multilogin\/([A-Za-z0-9]+)/);
  const profileName = urlMatch ? urlMatch[1] : null;

  console.log('[FIFA Auto Flow] Profile name from URL:', profileName);

  // If we found a profile name, save it to storage so TM AutoFill can use it
  if (profileName) {
    chrome.storage.sync.set({ profile_name: profileName }, () => {
      console.log('[FIFA Auto Flow] Saved profile name to storage:', profileName);
    });
  }

  // Tell background script to reload TM AutoFill and fetch profile data
  console.log('[FIFA Auto Flow] Requesting TM AutoFill reload and profile fetch...');

  chrome.runtime.sendMessage({ action: 'reloadTMAutoFill' }, (response) => {
    console.log('[FIFA Auto Flow] TM AutoFill reload response:', response);

    // Also try to send message directly to TM AutoFill to fetch profile data
    try {
      chrome.runtime.sendMessage(TM_AUTOFILL_ID, { action: 'fetchProfileData' }, (res) => {
        console.log('[FIFA Auto Flow] Direct TM AutoFill message response:', res);
      });
    } catch (e) {
      console.log('[FIFA Auto Flow] Could not send direct message to TM AutoFill');
    }

    // Wait for TM AutoFill to initialize and fetch profile data, then open FIFA
    setTimeout(() => {
      console.log('[FIFA Auto Flow] Opening FIFA tickets URL...');
      window.open(FIFA_TICKETS_URL, '_blank');
    }, 4000);  // Wait 4 seconds for profile data to load
  });
})();
