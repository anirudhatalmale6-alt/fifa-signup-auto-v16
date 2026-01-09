(async function() {
    console.log("🚀 FIFA Turbo: Carting + Auto-Continue (Background Active)");

    // 1. WEB WORKER TIMER (Para hindi mag-freeze sa background)
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

    // 2. AUDIO HACK (Keep process high priority)
    const audio = document.createElement('audio');
    audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    audio.loop = true;
    audio.play().catch(() => console.log("⚠️ Click the page to enable background mode!"));

    const targetMatches = ["75", "79", "80", "83", "86", "89", "91", "93", "95", "100"];

    // STEP 1: CARTING PROCESS
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
                    await backgroundDelay(200); 
                }
                console.log(`✅ Match ${matchNum} added.`);
            }
        }
        await backgroundDelay(400); 
    }

    // STEP 2: WAIT AND CLICK CONTINUE
    console.log("🛒 Waiting for Continue button to appear...");

    const clickContinue = () => {
        // Gamit ang specific attributes na binigay mo
        const continueBtn = document.querySelector('button[aria-label="Continue"]') || 
                           document.querySelector('button.stx-p-button[data-pc-name="button"]');

        if (continueBtn && !continueBtn.disabled) {
            console.log("🚀 Continue Button Found! Moving to next page...");
            continueBtn.click();
            return true;
        }
        return false;
    };

    // Polling: Titingnan bawat 500ms kung lumitaw na ang button
    let found = false;
    for (let i = 0; i < 20; i++) { // Maghihintay hanggang 10 seconds
        if (clickContinue()) {
            found = true;
            break;
        }
        await backgroundDelay(500);
    }

    if (!found) console.log("⚠️ Hindi agad lumitaw ang Continue button. Paki-click manual kung nandyan na.");

    worker.terminate();
    console.log("🏁 Script process finished.");
})();