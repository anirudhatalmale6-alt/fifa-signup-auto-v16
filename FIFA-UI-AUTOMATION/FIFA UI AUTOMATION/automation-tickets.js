(async function() {
    console.log("🚀 FIFA: Ticket Selection Started");

    // Zoom out to 35%
    document.body.style.zoom = '35%';
    console.log("🔍 Zoomed out to 35%");

    // Add green price labels to all categories
    function addGreenPriceLabels() {
        // Find all price elements and add green labels
        const priceElements = document.querySelectorAll('[class*="price"], [class*="tariff"], [class*="category"]');

        // Look for USD prices in the page
        const allElements = document.querySelectorAll('div, span, p');
        allElements.forEach(el => {
            const text = el.innerText;
            if (text && text.includes('USD') && text.match(/[\d,]+\.?\d*\s*USD/)) {
                // Check if already has green label
                if (!el.querySelector('.green-price-label') && !el.classList.contains('green-price-label')) {
                    const priceMatch = text.match(/([\d,]+\.?\d*)\s*USD/);
                    if (priceMatch) {
                        const label = document.createElement('span');
                        label.className = 'green-price-label';
                        label.innerHTML = ` ${priceMatch[1]} USD`;
                        label.style.cssText = `
                            color: #00cc00 !important;
                            font-size: 24px !important;
                            font-weight: bold !important;
                            margin-left: 10px;
                            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                        `;
                        el.appendChild(label);
                    }
                }
            }
        });

        // Find category labels and add prices next to them
        const categories = ['Category 1', 'Category 2', 'Category 3', 'Easy Access', 'Standard'];
        const categoryPrices = {
            'Category 1': '1,265.00',
            'Category 2': '940.00',
            'Category 3': '535.00',
            'Easy Access': '1,265.00',
            'Standard': '940.00'
        };

        categories.forEach(cat => {
            const catElements = Array.from(document.querySelectorAll('div, span, p'))
                .filter(el => el.innerText.trim() === cat);

            catElements.forEach(el => {
                if (!el.querySelector('.green-price-cat')) {
                    const price = categoryPrices[cat] || '0.00';
                    const priceLabel = document.createElement('span');
                    priceLabel.className = 'green-price-cat';
                    priceLabel.innerHTML = ` ${price} USD`;
                    priceLabel.style.cssText = `
                        color: #00cc00 !important;
                        font-size: 28px !important;
                        font-weight: bold !important;
                        margin-left: 15px;
                        text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                    `;
                    el.style.display = 'inline-flex';
                    el.style.alignItems = 'center';
                    el.appendChild(priceLabel);
                }
            });
        });
    }

    // Create sticky total counter at bottom
    let totalTickets = 0;
    let totalPrice = 0;

    function updateTotalDisplay() {
        let display = document.getElementById('fifa-total-display');
        if (!display) {
            display = document.createElement('div');
            display.id = 'fifa-total-display';
            display.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: #00ff00;
                padding: 20px 40px;
                border-radius: 10px;
                font-family: Arial, sans-serif;
                font-size: 36px;
                font-weight: bold;
                z-index: 999999;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                border: 2px solid #00ff00;
            `;
            document.body.appendChild(display);
        }
        display.innerHTML = `${totalTickets} tickets ${totalPrice.toLocaleString('en-US', {minimumFractionDigits: 2})} USD`;
    }

    // Initialize display
    updateTotalDisplay();
    addGreenPriceLabels();

    const workerCode = `
        self.onmessage = function(e) {
            setTimeout(() => self.postMessage('done'), e.data);
        };
    `;
    const blob = new Blob([workerCode], {type: 'application/javascript'});
    const worker = new Worker(URL.createObjectURL(blob));

    const backgroundDelay = (ms) => new Promise(res => {
        worker.onmessage = () => res();
        worker.postMessage(ms);
    });

    const audio = document.createElement('audio');
    audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    audio.loop = true;
    audio.play().catch(() => console.log("⚠️ Click the page to enable background mode!"));

    const targetMatches = ["75", "79", "80", "83", "86", "89", "91", "93", "95", "100"];
    const ticketPrice = 1265.00; // Category 1 price

    // CARTING PROCESS
    for (const matchNum of targetMatches) {
        const matchElements = Array.from(document.querySelectorAll('div, p, span'))
            .filter(el => el.innerText.trim() === `Match ${matchNum}`);

        if (matchElements.length === 0) continue;

        const currentMatch = matchElements[0].closest('.p-card') || matchElements[0].parentElement.parentElement.parentElement;
        currentMatch.scrollIntoView({ block: 'center' });

        const showMoreBtn = Array.from(currentMatch.querySelectorAll('span.p-button-label'))
            .find(el => el.innerText.includes('Show more'))?.parentElement;

        if (showMoreBtn) {
            showMoreBtn.click();
            await backgroundDelay(500);
            addGreenPriceLabels(); // Refresh labels after expanding
        }

        const cat1Label = Array.from(currentMatch.querySelectorAll('div, span, p'))
            .find(el => el.innerText.trim() === 'Category 1');

        if (cat1Label) {
            cat1Label.click();
            await backgroundDelay(400);

            const plusBtn = currentMatch.querySelector('button.stx-tariff-quantity-increase-button') ||
                            currentMatch.querySelector('button[data-pc-section="incrementbutton"]') ||
                            currentMatch.querySelector('.pi-plus')?.parentElement;

            if (plusBtn) {
                for (let i = 0; i < 4; i++) {
                    plusBtn.click();
                    totalTickets++;
                    totalPrice += ticketPrice;
                    updateTotalDisplay();
                    await backgroundDelay(200);
                }
                console.log(`✅ Match ${matchNum} added.`);
            }
        }
        await backgroundDelay(400);
    }

    // CLICK CONTINUE
    console.log("🛒 Looking for Continue button...");
    for (let i = 0; i < 20; i++) {
        const continueBtn = document.querySelector('button[aria-label="Continue"]') ||
                           document.querySelector('button.stx-p-button[data-pc-name="button"]');

        if (continueBtn && !continueBtn.disabled) {
            console.log("🚀 Continue clicked! Card automation will run automatically on next page.");
            continueBtn.click();
            break;
        }
        await backgroundDelay(500);
    }

    worker.terminate();
    audio.pause();
    console.log("🎫 Ticket automation finished!");
})();
