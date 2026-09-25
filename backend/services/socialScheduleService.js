'use strict';

let timer = null;
let running = false;

function startSocialScheduleIfEnabled() {
  if (process.env.VERCEL) return;
  if (timer) return;
  const { runDueSocialPosts } = require('../controller/product/socialStudioController');
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runDueSocialPosts();
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
