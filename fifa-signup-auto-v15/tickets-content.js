/**
 * FIFA Tickets Content Script
 * Handles account registration pages, verification, card payment, and lottery application
 * FULLY AUTOMATIC - fills forms directly using TM AutoFill's logic
 */

(function() {
  // Skip if we're inside an iframe (payment processors like Stripe, Adyen, etc.)
  if (window.self !== window.top) {
    console.log('[FIFA Auto Flow] Inside iframe, skipping to avoid payment interference');
    return;
  }

  // Skip if URL contains payment processor domains
  const currentUrl = window.location.href.toLowerCase();
  if (currentUrl.includes('stripe') || currentUrl.includes('adyen') || currentUrl.includes('checkout.') ||
      currentUrl.includes('payment-iframe') || currentUrl.includes('secure-payment') ||
      currentUrl.includes('paypal') || currentUrl.includes('braintree') ||
      currentUrl.includes('payment') || currentUrl.includes('card')) {
    console.log('[FIFA Auto Flow] Payment/card page detected, skipping entirely');
    return;
  }

  // Skip if session expired page or social-login/OIDC callback
  if (currentUrl.includes('social-login') || currentUrl.includes('oidc') ||
      document.title.toLowerCase().includes('session') || document.title.toLowerCase().includes('expired')) {
    console.log('[FIFA Auto Flow] Session expired or OIDC callback page, skipping');
    return;
  }

  console.log('[FIFA Auto Flow] FIFA Tickets page detected:', window.location.href);

  let actionTaken = false;
  let verificationTriggered = false;
  let cardTriggered = false;
  let completeAccountTriggered = false;

  // Simulate Alt+X keypress to trigger TM_Autofill
  function triggerAltX() {
    console.log('[FIFA Auto Flow] Triggering Alt+X...');
    const event = new KeyboardEvent('keydown', {
      key: 'x',
      code: 'KeyX',
      altKey: true,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
  }

  // Trigger Ctrl+Shift+F via background script (uses debugger API for real key events)
  function triggerCtrlShiftF() {
    console.log('[FIFA Auto Flow] Triggering Ctrl+Shift+F via debugger API...');

    // Send message to background script to use debugger API
    chrome.runtime.sendMessage({ action: 'sendCtrlShiftF' }, (response) => {
      if (response && response.success) {
        console.log('[FIFA Auto Flow] Ctrl+Shift+F sent via debugger API');
      } else {
        console.log('[FIFA Auto Flow] Debugger API failed, trying JavaScript events...');
        // Fallback to JavaScript events
        const eventConfig = {
          key: 'F',
          code: 'KeyF',
          keyCode: 70,
          which: 70,
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
          cancelable: true
        };
        document.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
        window.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
        document.body.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
      }
    });
  }

  const FIFA_PWD = 'NicketsFootbol24#';

  // Helper functions from TM AutoFill
  function setReactValue(element, value) {
    if (!element) return;
    if (element.type && element.type.toLowerCase() === 'hidden') return;

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype, 'value'
    )?.set;

    const nativeCheckboxSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype, 'checked'
    )?.set;

    const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype, 'value'
    )?.set;

    if (element.type === 'checkbox') {
      if (nativeCheckboxSetter) nativeCheckboxSetter.call(element, !!value);
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    if (element.tagName === 'SELECT') {
      if (nativeSelectValueSetter) nativeSelectValueSetter.call(element, value);
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    const lastValue = element.value;
    element.value = value;
    const tracker = element._valueTracker;
    if (tracker) tracker.setValue(lastValue);
    const event = new Event('input', { bubbles: true });
    event.simulated = true;
    element.dispatchEvent(event);
  }

  function changeValueReact(el, value) {
    if (!el) return;
    let lastValue = el.value;
    el.value = value;
    let event = new Event('input', { bubbles: true });
    event.simulated = true;
    let tracker = el._valueTracker;
    if (tracker) tracker.setValue(lastValue);
    el.dispatchEvent(event);
  }

  function fillCompleteAccountForm(profileInfo) {
    console.log('[FIFA Auto Flow] Filling Complete Account form');

    // Fan of dropdown
    setReactValue(document.querySelector('#contactCriteriaFanOF26\\.values0'), 'USA');

    // Address fields
    changeValueReact(document.querySelector('#address_line_1'),
      (profileInfo['address_address'] || '').replace('#', ''));
    changeValueReact(document.querySelector('#address_town_standalone'),
      profileInfo['address_city']);
    changeValueReact(document.querySelector('#address_zipcode_standalone'),
      profileInfo['address_zip']);
    changeValueReact(document.querySelector('#locality_STATE'),
      profileInfo['address_state']);
    changeValueReact(document.querySelector('#mobile_number'),
      (profileInfo['tel'] || '').replace(/[^0-9]/g, ''));

    // Checkboxes
    const consent18Yo = document.querySelector('#contactCriteria\\[AGEVAL\\]');
    if (consent18Yo) setReactValue(consent18Yo, true);

    const agreeTermCheckbox = document.querySelector("#contactCriteriaEXTDELlD\\.values1");
    if (agreeTermCheckbox) setReactValue(agreeTermCheckbox, true);

    console.log('[FIFA Auto Flow] Complete Account form filled!');
  }

  function fillCardPaymentForm(profileInfo) {
    console.log('[FIFA Auto Flow] Filling card payment form');

    const card = {
      holder: profileInfo['full_name'],
      num: profileInfo['visa_num'],
      exp: profileInfo['visa_exp'],
      cvv: profileInfo['visa_cvv']
    };

    // Card holder name
    changeValueReact(document.querySelector("input[name='cardholderName']"), card.holder);

    // Try different card number field selectors
    changeValueReact(document.querySelector("input[name='cardNumber']"), card.num);
    changeValueReact(document.querySelector("#card-number"), card.num);
    changeValueReact(document.querySelector("input[name='card-number']"), card.num);

    // Expiration
    changeValueReact(document.querySelector("input[name='expDate']"), card.exp);
    changeValueReact(document.querySelector("#expiration"), card.exp);

    // CVV
    changeValueReact(document.querySelector("input[name='cvv']"), card.cvv);
    changeValueReact(document.querySelector("#cvv"), card.cvv);

    console.log('[FIFA Auto Flow] Card payment form filled!');
  }

  function clickButton(texts) {
    const buttons = document.querySelectorAll('button, input[type="submit"], a.btn, a.button, a[role="button"]');
    for (const btn of buttons) {
      const btnText = (btn.textContent || btn.value || '').trim().toLowerCase();
      for (const text of texts) {
        if (btnText.includes(text.toLowerCase())) {
          console.log('[FIFA Auto Flow] Found button:', btnText, '- clicking...');
          btn.click();
          return true;
        }
      }
    }
    return false;
  }

  function clickLink(texts) {
    const links = document.querySelectorAll('a, button, span[role="button"]');
    for (const link of links) {
      const linkText = (link.textContent || '').trim().toLowerCase();
      for (const text of texts) {
        if (linkText.includes(text.toLowerCase())) {
          console.log('[FIFA Auto Flow] Found link:', linkText, '- clicking...');
          link.click();
          return true;
        }
      }
    }
    return false;
  }

  function checkCheckboxes() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:not(:checked)');
    checkboxes.forEach(cb => {
      console.log('[FIFA Auto Flow] Checking checkbox');
      cb.click();
    });
    return checkboxes.length > 0;
  }

  function isVerificationPage() {
    const pageText = document.body.innerText.toLowerCase();
    return pageText.includes('verification') ||
           pageText.includes('verify your email') ||
           pageText.includes('enter the code') ||
           pageText.includes('enter code');
  }

  function isCompleteAccountPage() {
    const pageText = document.body.innerText;
    return pageText.includes('Complete your account') ||
           pageText.includes('Your primary address') ||
           pageText.includes('Town/City') ||
           pageText.includes('Postcode');
  }

  function isRandomSelectionDrawConfirmPage() {
    // Page that says "By clicking Continue, you agree..." with Continue button
    // This is the page AFTER clicking Random Selection Draw, NOT the Draw Overview page
    const pageText = document.body.innerText;
    const hasByClickingContinue = pageText.includes('By clicking') && pageText.includes('Continue') && pageText.includes('you agree');
    const hasContinueButton = document.querySelector('button[aria-label="Continue"]') ||
                               Array.from(document.querySelectorAll('button')).some(btn => btn.textContent.trim() === 'Continue');
    // Draw Overview page has "Enter access code" and "Supporter Ticket" text - confirm page doesn't
    const notDrawOverview = !pageText.includes('Enter access code') && !pageText.includes('Supporter Ticket');
    // Confirm page has "If you are successful" text
    const hasSuccessText = pageText.includes('If you are successful');

    return hasByClickingContinue && hasContinueButton && notDrawOverview && hasSuccessText;
  }

  function isDrawOverviewPage() {
    // "My Application" / "Draw Overview" page with list of draws to choose from
    const pageText = document.body.innerText;
    return pageText.includes('Draw Overview') ||
           (pageText.includes('My Application') && pageText.includes('Random Selection Draw') && !pageText.includes('By clicking'));
  }

  function isBlankMyApplicationPage() {
    // Page says "My Application" but content didn't load (blank/empty)
    const pageText = document.body.innerText;
    const url = window.location.href;
    const isMyAppUrl = url.includes('lotteryApplication') || url.includes('lottery');
    const hasMyAppText = pageText.includes('My Application');
    const hasNoContent = !pageText.includes('Draw Overview') &&
                         !pageText.includes('Random Selection Draw') &&
                         !pageText.includes('Category') &&
                         !pageText.includes('Match');
    return isMyAppUrl && hasMyAppText && hasNoContent;
  }

  function isBlankPage() {
    // Generic blank page detection - FIFA page loaded but main content missing
    const pageText = document.body.innerText;
    const url = window.location.href;
    const isFifaUrl = url.includes('fifa.com') || url.includes('tickets.fifa');

    // Page seems blank if it has very little text content
    const textLength = pageText.replace(/\s+/g, '').length;
    const hasMinimalContent = textLength < 500;

    // Or page has FIFA header but no main content
    const hasFifaHeader = pageText.includes('FIFA') || pageText.includes('VISA');
    const hasNoMainContent = !pageText.includes('Draw') &&
                              !pageText.includes('Match') &&
                              !pageText.includes('Category') &&
                              !pageText.includes('Ticket') &&
                              !pageText.includes('Account') &&
                              !pageText.includes('Sign') &&
                              !pageText.includes('Password') &&
                              !pageText.includes('Email');

    return isFifaUrl && (hasMinimalContent || (hasFifaHeader && hasNoMainContent));
  }

  function isMyApplicationPage() {
    const pageText = document.body.innerText;
    const url = window.location.href;
    return (pageText.includes('My Application') && !isCardPaymentPage() && !isDrawOverviewPage()) ||
           (url.includes('lotteryApplication') && !isCardPaymentPage() && !isDrawOverviewPage());
  }

  function isTicketBuyingPage() {
    // Ticket selection page - has match cards, categories, ticket quantities
    const pageText = document.body.innerText;
    const url = window.location.href;
    const hasMatches = pageText.includes('Match') || pageText.includes('Category') || pageText.includes('tickets');
    const hasSelectTickets = pageText.includes('Select') || pageText.includes('Add to cart') || pageText.includes('Ticket');
    const isTicketPage = url.includes('ticket') || url.includes('lottery') || url.includes('selection');
    // Make sure we're not on other pages
    const notOtherPages = !isCompleteAccountPage() && !isDrawOverviewPage() && !isRandomSelectionDrawConfirmPage() && !isCardPaymentPage();
    return notOtherPages && (hasMatches || hasSelectTickets) && isTicketPage;
  }

  function isCardPaymentPage() {
    // DISABLED - card payment handling was causing white screen issues
    // Let the user handle card input manually
    return false;
  }

  function handleVerificationPage() {
    if (verificationTriggered) return;
    verificationTriggered = true;

    console.log('[FIFA Auto Flow] Verification page - getting OTP from storage...');

    // Get profile data and request OTP
    chrome.storage.sync.get(['profileInfo'], function(data) {
      if (!data.profileInfo) {
        console.log('[FIFA Auto Flow] No profile data found');
        return;
      }

      const profileInfo = JSON.parse(data.profileInfo);
      const email = profileInfo['acc_email'];

      console.log('[FIFA Auto Flow] Requesting OTP for:', email);

      // Wait for OTP to be fetched and filled by TM AutoFill
      // Since we can't fetch OTP ourselves, just wait and try to click continue
      setTimeout(() => {
        console.log('[FIFA Auto Flow] Waiting for manual OTP entry or TM AutoFill...');
        // Try clicking continue after user enters code
        setTimeout(() => {
          clickButton(['continue', 'verify', 'submit']);
        }, 10000); // Wait 10 seconds for code entry
      }, 5000);
    });
  }

  function handleCompleteAccountPage() {
    if (completeAccountTriggered) return;
    completeAccountTriggered = true;

    console.log('[FIFA Auto Flow] Complete Account page detected - AUTO triggering Alt+X...');

    // Wait for page to load, then trigger Alt+X to fill via TM_Autofill
    setTimeout(() => {
      triggerAltX();

      // After Alt+X fills the form, check checkboxes and click Save
      setTimeout(() => {
        checkCheckboxes();
        setTimeout(() => {
          clickButton(['save', 'continue', 'submit', 'next']);
          actionTaken = true;
        }, 1500);
      }, 3000);
    }, 2000);
  }

  let drawOverviewHandled = false;
  function handleDrawOverviewPage() {
    if (drawOverviewHandled) return;
    drawOverviewHandled = true;

    console.log('[FIFA Auto Flow] Draw Overview page - clicking Random Selection Draw...');

    setTimeout(() => {
      // Approach 1 (BEST): Find the selection container with class "stx-lt-selection-container" and "flag-fifa"
      // This is the actual clickable ballot row with the FIFA logo
      const selectionContainers = document.querySelectorAll('.stx-lt-selection-container, [class*="selection-container"]');
      for (const container of selectionContainers) {
        const text = container.textContent || '';
        const className = container.className || '';
        // Look for the FIFA flag container (not team flags)
        if ((className.includes('flag-fifa') || container.querySelector('img[alt*="fifa"]') || container.querySelector('img[src*="fifa"]')) &&
            text.includes('Random Selection Draw') && !text.includes('My Team')) {
          console.log('[FIFA Auto Flow] Found stx-lt-selection-container with FIFA flag, clicking...');
          container.click();
          return;
        }
      }

      // Approach 2: Find role="button" elements with "flag-fifa" class
      const buttonElements = document.querySelectorAll('[role="button"]');
      for (const btn of buttonElements) {
        const text = btn.textContent || '';
        const className = btn.className || '';
        if (className.includes('flag-fifa') && text.includes('Random Selection Draw')) {
          console.log('[FIFA Auto Flow] Found role=button with flag-fifa class, clicking...');
          btn.click();
          return;
        }
      }

      // Approach 3: Find the <p> element with class "stx-ballot-name" containing EXACTLY "Random Selection Draw"
      const ballotNames = document.querySelectorAll('p.stx-ballot-name, p[class*="ballot-name"]');
      for (const p of ballotNames) {
        const text = p.textContent.trim();
        if (text === 'Random Selection Draw') {
          // Click the parent selection container or li
          const container = p.closest('.stx-lt-selection-container') || p.closest('[role="button"]') || p.closest('li');
          if (container) {
            console.log('[FIFA Auto Flow] Found via stx-ballot-name, clicking container...');
            container.click();
            return;
          }
        }
      }

      // Approach 4: Find elements with tabindex="0" that contain the FIFA image and text
      const tabbableElements = document.querySelectorAll('[tabindex="0"]');
      for (const el of tabbableElements) {
        const text = el.textContent || '';
        const hasImage = el.querySelector('img');
        if (hasImage && text.includes('Random Selection Draw') && !text.includes('My Team') && !text.includes('Official') && text.length < 100) {
          console.log('[FIFA Auto Flow] Found tabindex=0 element with image and text, clicking...');
          el.click();
          return;
        }
      }

      // Approach 5: Find <li> elements with an image (ballot rows have FIFA logo) and "Random Selection Draw" text
      const listItems = document.querySelectorAll('li');
      for (const li of listItems) {
        const hasImage = li.querySelector('img');
        const text = li.textContent || '';
        if (hasImage && text.includes('Random Selection Draw') && !text.includes('My Team') && text.length < 100) {
          console.log('[FIFA Auto Flow] Found <li> with image and Random Selection Draw, clicking...');
          li.click();
          return;
        }
      }

      // Approach 6: Find elements with EXACT text "Random Selection Draw" and click nearest clickable parent
      const allElements = document.querySelectorAll('p, span, div');
      for (const el of allElements) {
        const text = el.textContent.trim();
        if (text === 'Random Selection Draw') {
          // Skip if inside an <a> tag (PDF link)
          const parentLink = el.closest('a');
          if (parentLink) continue;
          // Find clickable parent
          const clickable = el.closest('[role="button"]') || el.closest('[tabindex="0"]') || el.closest('.stx-lt-selection-container') || el.closest('li');
          if (clickable) {
            console.log('[FIFA Auto Flow] Found exact text, clicking parent...');
            clickable.click();
            return;
          }
        }
      }

      console.log('[FIFA Auto Flow] Could not find Random Selection Draw to click');
    }, 5000);
  }

  let randomDrawConfirmHandled = false;
  function handleRandomDrawConfirmPage() {
    if (randomDrawConfirmHandled) return;
    randomDrawConfirmHandled = true;

    console.log('[FIFA Auto Flow] Random Selection Draw confirm page - clicking Continue in 5 seconds...');

    setTimeout(() => {
      console.log('[FIFA Auto Flow] Now attempting to click Continue button...');

      // Try specific selectors first for the Continue button
      let clicked = false;

      // Approach 1: Button with aria-label="Continue"
      const ariaBtn = document.querySelector('button[aria-label="Continue"]');
      if (ariaBtn) {
        console.log('[FIFA Auto Flow] Found Continue button via aria-label, clicking...');
        ariaBtn.click();
        clicked = true;
      }

      // Approach 2: Button with class stx-p-button containing "Continue"
      if (!clicked) {
        const stxButtons = document.querySelectorAll('button.stx-p-button, button[class*="p-button"]');
        for (const btn of stxButtons) {
          if (btn.textContent.includes('Continue')) {
            console.log('[FIFA Auto Flow] Found Continue button via stx-p-button class, clicking...');
            btn.click();
            clicked = true;
            break;
          }
        }
      }

      // Approach 3: Any button with exact text "Continue"
      if (!clicked) {
        const allButtons = document.querySelectorAll('button');
        for (const btn of allButtons) {
          if (btn.textContent.trim() === 'Continue') {
            console.log('[FIFA Auto Flow] Found Continue button via text match, clicking...');
            btn.click();
            clicked = true;
            break;
          }
        }
      }

      // Approach 4: Fallback to generic clickButton
      if (!clicked) {
        console.log('[FIFA Auto Flow] Trying generic clickButton fallback...');
        clicked = clickButton(['continue']);
      }

      if (!clicked) {
        console.log('[FIFA Auto Flow] WARNING: Could not find Continue button!');
      }

      // After clicking Continue, trigger Ctrl+Shift+F for ticket selection
      setTimeout(() => {
        console.log('[FIFA Auto Flow] Triggering Ctrl+Shift+F after Continue...');
        triggerCtrlShiftF();
      }, 3000);
    }, 5000);
  }

  let ticketBuyingHandled = false;
  function handleTicketBuyingPage() {
    if (ticketBuyingHandled) return;
    ticketBuyingHandled = true;

    console.log('[FIFA Auto Flow] Ticket buying page detected - AUTO triggering Ctrl+Shift+F in 3 seconds...');

    // Wait for page to fully load, then trigger Ctrl+Shift+F
    setTimeout(() => {
      triggerCtrlShiftF();
    }, 3000);
  }

  let blankPageRefreshAttempts = 0;
  function handleBlankPage() {
    // Only try refresh up to 3 times
    if (blankPageRefreshAttempts >= 3) {
      console.log('[FIFA Auto Flow] Blank page - max refresh attempts reached');
      return;
    }

    blankPageRefreshAttempts++;
    console.log('[FIFA Auto Flow] Blank/broken page detected - refreshing in 3 seconds... (attempt ' + blankPageRefreshAttempts + ')');

    setTimeout(() => {
      // Double check it's still blank before refreshing
      if (isBlankMyApplicationPage() || isBlankPage()) {
        console.log('[FIFA Auto Flow] Still blank, refreshing page...');
        window.location.reload();
      } else {
        console.log('[FIFA Auto Flow] Page loaded after wait, continuing...');
        // Reset actionTaken so performAction can run again
        actionTaken = false;
        performAction();
      }
    }, 3000);
  }

  function handleCardPaymentPage() {
    if (cardTriggered) return;
    cardTriggered = true;

    console.log('[FIFA Auto Flow] Card payment page detected');

    chrome.storage.sync.get(['profileInfo'], function(data) {
      if (!data.profileInfo) {
        console.log('[FIFA Auto Flow] No profile data found');
        return;
      }

      const profileInfo = JSON.parse(data.profileInfo);

      setTimeout(() => {
        // Click Downgrade if present
        if (clickLink(['downgrade'])) {
          setTimeout(() => {
            if (clickLink(['add new card', 'add card', 'new card'])) {
              setTimeout(() => {
                fillCardPaymentForm(profileInfo);
                setTimeout(() => {
                  clickButton(['add now', 'add card', 'save', 'confirm']);
                }, 2000);
              }, 2000);
            }
          }, 2000);
        } else {
          // No downgrade, try add card directly
          if (clickLink(['add new card', 'add card', 'new card'])) {
            setTimeout(() => {
              fillCardPaymentForm(profileInfo);
              setTimeout(() => {
                clickButton(['add now', 'add card', 'save', 'confirm']);
              }, 2000);
            }, 2000);
          }
        }
      }, 2000);
    });
  }

  function performAction() {
    if (actionTaken) return;

    // Verification page - wait for manual code entry
    if (isVerificationPage()) {
      console.log('[FIFA Auto Flow] Detected Verification page');
      handleVerificationPage();
      actionTaken = true;
      return;
    }

    // Card Payment page
    if (isCardPaymentPage()) {
      console.log('[FIFA Auto Flow] Detected Card Payment page');
      handleCardPaymentPage();
      actionTaken = true;
      return;
    }

    // Complete Account page
    if (isCompleteAccountPage()) {
      console.log('[FIFA Auto Flow] Detected Complete Account page');
      handleCompleteAccountPage();
      return;
    }

    // Random Selection Draw confirm page - click Continue (check BEFORE Draw Overview!)
    if (isRandomSelectionDrawConfirmPage()) {
      console.log('[FIFA Auto Flow] Detected Random Selection Draw confirm page');
      handleRandomDrawConfirmPage();
      return;
    }

    // Draw Overview page - click Random Selection Draw
    if (isDrawOverviewPage()) {
      console.log('[FIFA Auto Flow] Detected Draw Overview page');
      handleDrawOverviewPage();
      // Don't set actionTaken here - let the observer continue watching for page changes
      return;
    }

    // Ticket buying page - trigger Ctrl+Shift+F
    if (isTicketBuyingPage()) {
      console.log('[FIFA Auto Flow] Detected Ticket buying page');
      handleTicketBuyingPage();
      return;
    }

    // Blank page - auto refresh (DISABLED - user requested removal)
    // if (isBlankMyApplicationPage() || isBlankPage()) {
    //   console.log('[FIFA Auto Flow] Detected Blank/broken page');
    //   handleBlankPage();
    //   return;
    // }

    // My Application page - done!
    if (isMyApplicationPage()) {
      console.log('[FIFA Auto Flow] Detected My Application page - DONE!');
      actionTaken = true;
      return;
    }

    // Generic page - try checkboxes and continue
    setTimeout(() => {
      checkCheckboxes();
      setTimeout(() => {
        clickButton(['continue', 'submit', 'next']);
      }, 500);
    }, 2000);
  }

  // Initial check
  setTimeout(performAction, 2000);

  // Observe for page changes
  const observer = new MutationObserver(() => {
    if (!actionTaken) {
      setTimeout(performAction, 1500);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Also run a periodic check every 3 seconds for the Continue confirmation page
  // This is a backup in case the MutationObserver misses it
  setInterval(() => {
    if (!randomDrawConfirmHandled && isRandomSelectionDrawConfirmPage()) {
      console.log('[FIFA Auto Flow] Periodic check detected Random Selection Draw confirm page');
      handleRandomDrawConfirmPage();
    }
    // Also check for ticket buying page
    if (!ticketBuyingHandled && isTicketBuyingPage()) {
      console.log('[FIFA Auto Flow] Periodic check detected Ticket buying page');
      handleTicketBuyingPage();
    }
  }, 3000);
})();
