// Card automation - runs on Alt+C keypress
(function() {
    console.log('[FIFA] Card automation content script loaded');

    function showNotification(message) {
        const notif = document.createElement('div');
        notif.style.cssText = 'position:fixed;top:20px;right:20px;background:#1a472a;color:white;padding:16px 24px;border-radius:8px;z-index:999999;font-family:sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
        notif.textContent = message;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 4000);
    }

    async function autoClickCheckoutElements() {
        const delay = (ms) => new Promise(r => setTimeout(r, ms));
        let clickedDowngrade = false;
        let clickedAddCard = false;
        let clickedTerms = false;

        console.log('[FIFA] Starting auto-click for checkout elements...');

        // ========== 1. ACCEPT TICKET DOWNGRADE ==========
        console.log('[FIFA] Looking for downgrade checkbox...');

        // FIFA-SPECIFIC: Direct ID selector
        const downgradeCheckbox = document.querySelector('#stx-lt-changeSeatCatApproval-downgrade-checkbox') ||
                                  document.querySelector('input[id*="changeSeatCatApproval-downgrade"]') ||
                                  document.querySelector('input[id*="downgrade-checkbox"]');

        if (downgradeCheckbox) {
            console.log('[FIFA] Found downgrade checkbox by ID');
            if (!downgradeCheckbox.checked) {
                downgradeCheckbox.click();
                showNotification('Accepted ticket downgrade');
                clickedDowngrade = true;
            } else {
                console.log('[FIFA] Already checked');
                clickedDowngrade = true;
            }
        }

        // FIFA-SPECIFIC: Click the p-checkbox-box div (PrimeNG style checkbox)
        if (!clickedDowngrade) {
            const checkboxBoxes = document.querySelectorAll('.p-checkbox-box, div[class*="p-checkbox-box"]');
            for (const box of checkboxBoxes) {
                const container = box.closest('[class*="downgrade"]') || box.closest('[class*="changeSeatCatApproval"]');
                if (container) {
                    console.log('[FIFA] Found PrimeNG checkbox box in downgrade container');
                    box.click();
                    showNotification('Accepted ticket downgrade');
                    clickedDowngrade = true;
                    break;
                }
            }
        }

        // Fallback: Find by container class
        if (!clickedDowngrade) {
            const container = document.querySelector('[class*="changeSeatCatApproval"]') ||
                             document.querySelector('[class*="downgrade-container"]');
            if (container) {
                console.log('[FIFA] Found container, looking for checkbox...');
                const cb = container.querySelector('input[type="checkbox"]') ||
                          container.querySelector('.p-checkbox-box');
                if (cb) {
                    cb.click();
                    showNotification('Clicked downgrade element');
                    clickedDowngrade = true;
                }
            }
        }

        // Last resort: Find label with "Accept ticket(s) downgrade" text
        if (!clickedDowngrade) {
            const labels = document.querySelectorAll('label');
            for (const label of labels) {
                if (label.textContent.includes('Accept ticket') && label.textContent.includes('downgrade')) {
                    console.log('[FIFA] Found downgrade label, clicking...');
                    label.click();
                    showNotification('Clicked downgrade label');
                    clickedDowngrade = true;
                    break;
                }
            }
        }

        await delay(500);

        // ========== 2. ADD A NEW CARD ==========
        console.log('[FIFA] Looking for Add a new card...');

        // FIFA uses p-button with span inside
        const pButtons = document.querySelectorAll('button.p-button, a.p-button, [class*="p-button"]');
        for (const btn of pButtons) {
            const text = (btn.textContent || '').trim().toLowerCase();
            if (text.includes('add') && text.includes('card')) {
                console.log('[FIFA] Found p-button Add card');
                btn.click();
                showNotification('Clicked Add a new card');
                clickedAddCard = true;
                break;
            }
        }

        // Look for span.p-button-label
        if (!clickedAddCard) {
            const buttonLabels = document.querySelectorAll('span.p-button-label');
            for (const label of buttonLabels) {
                const text = (label.textContent || '').toLowerCase();
                if (text.includes('add') && text.includes('card')) {
                    console.log('[FIFA] Found p-button-label Add card');
                    const btn = label.closest('button') || label.closest('a') || label.parentElement;
                    if (btn) {
                        btn.click();
                        showNotification('Clicked Add a new card');
                        clickedAddCard = true;
                        break;
                    }
                }
            }
        }

        // Look for "+ Add a new card" text anywhere
        if (!clickedAddCard) {
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
                // Get direct text content only (not children)
                const directText = Array.from(el.childNodes)
                    .filter(n => n.nodeType === 3)
                    .map(n => n.textContent.trim())
                    .join('');
                const fullText = (el.textContent || '').trim();

                if (fullText === '+ Add a new card' || fullText === 'Add a new card' ||
                    directText === '+ Add a new card' || directText === 'Add a new card') {
                    console.log('[FIFA] Found exact Add a new card text in:', el.tagName);
                    el.click();
                    showNotification('Clicked Add a new card');
                    clickedAddCard = true;
                    break;
                }
            }
        }

        await delay(500);

        // ========== 3. ACCEPT TERMS ==========
        console.log('[FIFA] Looking for Accept Terms...');

        // FIFA-SPECIFIC: Look for stx-confirmation-terms-and-conditions container
        const termsContainer = document.querySelector('[class*="stx-confirmation-terms-and-conditions"]') ||
                              document.querySelector('[class*="confirmation-terms"]') ||
                              document.querySelector('[class*="terms-and-conditions"]');

        if (termsContainer) {
            console.log('[FIFA] Found terms container');
            const checkbox = termsContainer.querySelector('input[type="checkbox"]') ||
                           termsContainer.querySelector('.p-checkbox-box') ||
                           termsContainer.querySelector('[class*="p-checkbox"]');
            if (checkbox) {
                checkbox.click();
                showNotification('Accepted terms');
                clickedTerms = true;
            }
        }

        // FIFA-SPECIFIC: Look for checkbox with aria-label="Accept terms and conditions"
        if (!clickedTerms) {
            const termsCheckbox = document.querySelector('[aria-label*="Accept terms"]') ||
                                 document.querySelector('[aria-label*="terms and conditions"]') ||
                                 document.querySelector('input[aria-label*="Accept terms"]');
            if (termsCheckbox) {
                console.log('[FIFA] Found terms checkbox by aria-label');
                termsCheckbox.click();
                showNotification('Accepted terms');
                clickedTerms = true;
            }
        }

        // Look for p-checkbox inside confirmation section
        if (!clickedTerms) {
            const confirmationSection = document.querySelector('[class*="confirmation"]');
            if (confirmationSection) {
                const checkbox = confirmationSection.querySelector('.p-checkbox-box') ||
                               confirmationSection.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    console.log('[FIFA] Found checkbox in confirmation section');
                    checkbox.click();
                    showNotification('Accepted terms');
                    clickedTerms = true;
                }
            }
        }

        // Fallback: Find any unchecked checkbox near "terms" or "accept" text
        if (!clickedTerms) {
            const checkboxes = document.querySelectorAll('input[type="checkbox"], .p-checkbox-box');
            for (const cb of checkboxes) {
                let parent = cb.parentElement;
                for (let i = 0; i < 8 && parent; i++) {
                    const text = (parent.textContent || '').toLowerCase();
                    if ((text.includes('accept') && text.includes('terms')) ||
                        text.includes('by clicking') || text.includes('i agree')) {
                        console.log('[FIFA] Found terms checkbox via parent text');
                        cb.click();
                        showNotification('Accepted terms');
                        clickedTerms = true;
                        break;
                    }
                    parent = parent.parentElement;
                }
                if (clickedTerms) break;
            }
        }

        console.log('[FIFA] Results - Downgrade:', clickedDowngrade, 'Add Card:', clickedAddCard, 'Terms:', clickedTerms);

        if (!clickedDowngrade && !clickedAddCard && !clickedTerms) {
            showNotification('Could not find elements. Try clicking manually.');
        }
    }

    // Listen for Alt+C keypress
    document.addEventListener('keydown', function(e) {
        if (e.altKey && e.key.toLowerCase() === 'c') {
            e.preventDefault();
            console.log('[FIFA] Alt+C pressed - triggering checkout auto-click');
            showNotification('Running card automation...');
            autoClickCheckoutElements();
        }
    });

    console.log('[FIFA] Alt+C listener registered. Press Alt+C to run card automation.');
})();
