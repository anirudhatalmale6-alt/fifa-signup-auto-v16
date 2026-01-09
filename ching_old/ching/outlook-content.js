/**
 * Outlook Auto-Login Content Script
 * Automatically logs into Outlook with account credentials from CSV
 */

console.log('[Outlook] Content script loaded');

let accountData = null;
let emailFilled = false;
let passwordFilled = false;

// Load account data from storage
chrome.storage.local.get(['accounts', 'selectedRow'], (r) => {
  const accounts = r.accounts || [];
  const selectedRow = r.selectedRow || 0;
  if (accounts[selectedRow]) {
    accountData = accounts[selectedRow];
    console.log('[Outlook] Account loaded:', accountData.email);
    setTimeout(checkAndLogin, 1500);
  }
});

const delay = ms => new Promise(r => setTimeout(r, ms));

// Type into input field
async function typeInto(el, text) {
  if (!el || !text) return false;
  el.focus();
  el.click();
  await delay(100);
  el.value = '';
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeInputValueSetter.call(el, text);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
  console.log('[Outlook] Typed:', text.substring(0, 20) + '...');
  return true;
}

// Click element
function clickEl(el) {
  if (!el) return;
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

// Check if we need to login and do it
async function checkAndLogin() {
  if (!accountData) return;

  const url = window.location.href;
  console.log('[Outlook] Checking URL:', url);

  // On login page or account protection page
  if (url.includes('login.live.com') || url.includes('login.microsoftonline.com') || url.includes('account.live.com')) {
    await performLogin();
  }
  // Already in Outlook inbox - set up code finder
  else if (url.includes('outlook.live.com/mail')) {
    console.log('[Outlook] In inbox - ready to find codes');
    chrome.runtime.sendMessage({ action: 'outlookReady' });
  }
}

// Perform auto-login
async function performLogin() {
  const email = accountData.email || '';
  const password = accountData.password || '';

  console.log('[Outlook] Attempting login for:', email);

  const pageText = document.body.innerText || '';

  // Check for "Let's protect your account" - click Skip
  if (pageText.includes('protect your account') || pageText.includes('Skip for now')) {
    console.log('[Outlook] Found "Let\'s protect your account" prompt');
    // Find and click "Skip for now" link
    const links = document.querySelectorAll('a');
    for (const link of links) {
      if (link.textContent.toLowerCase().includes('skip')) {
        await delay(300);
        clickEl(link);
        link.click();
        console.log('[Outlook] Clicked "Skip for now"');
        return;
      }
    }
    // Also try by ID
    const skipLink = document.querySelector('#iLooksGood, a[id*="skip"], a[id*="Skip"]');
    if (skipLink) {
      await delay(300);
      clickEl(skipLink);
      skipLink.click();
      console.log('[Outlook] Clicked skip link by ID');
      return;
    }
  }

  // Check for "Stay signed in?" prompt
  if (pageText.includes('Stay signed in')) {
    console.log('[Outlook] Found "Stay signed in" prompt');
    // Click Yes button
    const yesBtn = document.querySelector('#acceptButton, button[type="submit"], #idSIButton9');
    if (yesBtn) {
      await delay(300);
      clickEl(yesBtn);
      yesBtn.click();
      console.log('[Outlook] Clicked Yes on "Stay signed in"');
      return;
    }
    // Or click No button
    const noBtn = document.querySelector('#declineButton, #idBtn_Back');
    if (noBtn) {
      await delay(300);
      clickEl(noBtn);
      noBtn.click();
      console.log('[Outlook] Clicked No on "Stay signed in"');
      return;
    }
  }

  // Email input page
  const emailInput = document.querySelector('input[type="email"], input[name="loginfmt"], #i0116');
  if (emailInput && emailInput.offsetParent !== null && !emailFilled) {
    await typeInto(emailInput, email);
    emailFilled = true;
    await delay(500);

    // Click Next button
    const nextBtn = document.querySelector('#idSIButton9, input[type="submit"], button[type="submit"]');
    if (nextBtn) {
      clickEl(nextBtn);
      nextBtn.click();
      console.log('[Outlook] Clicked Next after email');
    }
    return;
  }

  // Password input page
  const passInput = document.querySelector('input[type="password"], input[name="passwd"], #i0118');
  if (passInput && passInput.offsetParent !== null && !passwordFilled) {
    console.log('[Outlook] Found password field, filling...');
    await delay(500);
    await typeInto(passInput, password);
    passwordFilled = true;
    await delay(500);

    // Click Sign in button
    const signInBtn = document.querySelector('#idSIButton9, input[type="submit"], button[type="submit"]');
    if (signInBtn) {
      clickEl(signInBtn);
      signInBtn.click();
      console.log('[Outlook] Clicked Sign In after password');
    }
    return;
  }
}

// Find verification code in emails
function findVerificationCode() {
  const bodyText = document.body.innerText || '';
  console.log('[Outlook] Searching for code in page text, length:', bodyText.length);

  // Common patterns for verification codes - ordered by specificity
  // FIFA format: "Verify My Code" followed by 6 digits on next line
  const patterns = [
    /Verify My Code[\s\n]*(\d{6})/i,
    /one-time pass code[\s\S]*?(\d{6})/i,
    /verification code[:\s]*(\d{6,8})/i,
    /security code[:\s]*(\d{6,8})/i,
    /your code is[:\s]*(\d{6,8})/i,
    /your code[:\s]*(\d{6,8})/i,
    /code is[:\s]*(\d{6,8})/i,
    /code[:\s\n]*(\d{6})/i,
    /\n(\d{6})\n/,  // 6 digit code on its own line
    /\s(\d{6})\s/,  // 6 digit code surrounded by whitespace
    /(\d{6})/  // Last resort - find any 6 digit number
  ];

  for (const pattern of patterns) {
    const match = bodyText.match(pattern);
    if (match && match[1]) {
      console.log('[Outlook] Found code with pattern:', pattern);
      return match[1];
    }
  }

  // Also look in iframes (email content might be in iframe)
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      const iframeText = iframeDoc.body.innerText || '';
      for (const pattern of patterns) {
        const match = iframeText.match(pattern);
        if (match && match[1]) {
          console.log('[Outlook] Found code in iframe');
          return match[1];
        }
      }
    } catch (e) {
      // Cross-origin iframe, skip
    }
  }

  return null;
}

// Click on EA/FIFA email to open it (newest first)
async function findAndClickEAEmail() {
  console.log('[Outlook] Looking for EA/FIFA emails...');

  // Outlook web uses various selectors - try multiple approaches
  const selectors = [
    '[role="option"]',
    '[data-convid]',
    'div[class*="hcptT"]',  // Outlook message list item
    'div[class*="customScrollBar"] > div > div',  // Message container
    '[aria-label*="message"]',
    '[class*="ItemCell"]',
    '[class*="jGG6V"]'  // Another Outlook class
  ];

  let allItems = [];
  for (const sel of selectors) {
    const items = document.querySelectorAll(sel);
    if (items.length > 0) {
      console.log('[Outlook] Found', items.length, 'items with selector:', sel);
      allItems = [...allItems, ...items];
    }
  }

  // Remove duplicates
  allItems = [...new Set(allItems)];
  console.log('[Outlook] Total email items found:', allItems.length);

  // Keywords to look for
  const keywords = ['fifa id', 'fifa', 'ea', 'electronic arts', 'verify my code', 'verification', 'verify', 'confirm your email'];

  for (const item of allItems) {
    const text = (item.textContent || '').toLowerCase();
    for (const kw of keywords) {
      if (text.includes(kw)) {
        console.log('[Outlook] Found email matching keyword:', kw);
        item.click();
        await delay(2000);
        return true;
      }
    }
  }

  // If no match, click the first/newest email
  if (allItems.length > 0) {
    console.log('[Outlook] No keyword match, clicking first email');
    allItems[0].click();
    await delay(2000);
    return true;
  }

  return false;
}

// Listen for requests from background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'findCode') {
    console.log('[Outlook] Finding code...');

    (async () => {
      // First check current view (maybe email is already open)
      let code = findVerificationCode();

      if (!code) {
        // Try clicking on EA email first
        const clicked = await findAndClickEAEmail();
        if (clicked) {
          await delay(2000);
          code = findVerificationCode();
        }
      }

      // Try again with longer delay if still not found
      if (!code) {
        await delay(1500);
        code = findVerificationCode();
      }

      if (code) {
        console.log('[Outlook] Found code:', code);
        sendResponse({ code: code });
      } else {
        console.log('[Outlook] No code found in page');
        sendResponse({ code: null });
      }
    })();

    return true; // Keep channel open for async response
  }

  if (msg.action === 'getLoginStatus') {
    const isLoggedIn = window.location.href.includes('outlook.live.com/mail');
    sendResponse({ loggedIn: isLoggedIn });
    return true;
  }
});

// Re-check when URL changes or periodically
let lastUrl = window.location.href;
setInterval(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    // Reset flags on URL change
    emailFilled = false;
    passwordFilled = false;
    console.log('[Outlook] URL changed, resetting flags');
    setTimeout(checkAndLogin, 1000);
  }
}, 500);

// Also check periodically in case DOM changed
setInterval(() => {
  const url = window.location.href;
  if (url.includes('login.live.com') || url.includes('login.microsoftonline.com') || url.includes('account.live.com')) {
    checkAndLogin();
  }
}, 2000);

console.log('[Outlook] Content script ready');
