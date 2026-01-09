(async function() {
    console.log("🚀 FIFA: Ticket Selection Started");

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
    audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    audio.loop = true;
    audio.play().catch(() => console.log("⚠️ Click the page to enable background mode!"));

    const targetMatches = ["75", "79", "80", "83", "86", "89", "91", "93", "95", "100"];

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
