'use strict';

let timer = null;
let running = false;
let cooldownUntil = 0;

function startNewsletterSchedule() {
    if (process.env.VERCEL) return;
    if (timer) return;
    const { syncStoreContacts, runScheduledSend } = require('./newsletterService');
    syncStoreContacts().catch((error) => {
        console.error('[newsletter lista]', error.message || error);
    });
    const tick = async () => {
        if (running || Date.now() < cooldownUntil) return;
        running = true;
        try {
            const result = await runScheduledSend();
            if (result?.retry) cooldownUntil = Date.now() + 10 * 60 * 1000;
        } catch (error) {
            cooldownUntil = Date.now() + 10 * 60 * 1000;
            console.error('[newsletter 22:00]', error.message || error);
        } finally {
            running = false;
        }
    };
    timer = setInterval(tick, 60 * 1000);
    if (typeof timer.unref === 'function') timer.unref();
}

module.exports = { startNewsletterSchedule };
