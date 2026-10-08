'use strict';

let timer = null;
let running = false;
let lastMorning = '';

function startSocialScheduleIfEnabled() {
  if (process.env.VERCEL) return;
  if (timer) return;
  const { runDueSocialPosts } = require('../controller/product/socialStudioController');
  const { planCommunityDays, refreshScheduledStock, zonedParts } = require('./communityPlanner');
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runDueSocialPosts();
      const parts = zonedParts();
      const key = `${parts.year}-${parts.month}-${parts.day}`;
      const minute = Number(parts.hour) * 60 + Number(parts.minute);
      if (minute >= 7 * 60 && minute < 7 * 60 + 15 && lastMorning !== key) {
        lastMorning = key;
        try {
          await refreshScheduledStock();
          await planCommunityDays({ days: 3 });
        } catch (error) {
          lastMorning = '';
          console.error('[social plan]', error.message || error);
        }
      }
    } catch (error) {
      console.error('[social schedule]', error.message || error);
    } finally {
      running = false;
    }
  };
  timer = setInterval(tick, 60 * 1000);
  if (typeof timer.unref === 'function') timer.unref();
}

module.exports = { startSocialScheduleIfEnabled };
