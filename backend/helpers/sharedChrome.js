'use strict';

const fs = require('fs');

let sharedBrowser = null;
let browserLaunch = null;

function resolveChromePath() {
  const fromEnv = String(process.env.PUPPETEER_EXECUTABLE_PATH || '').trim();
  if (fromEnv) return fromEnv;
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser'
  ];
  return candidates.find((p) => fs.existsSync(p)) || '';
}

async function getSharedBrowser() {
  if (sharedBrowser) {
    try {
      if (sharedBrowser.connected !== false) return sharedBrowser;
    } catch {
      sharedBrowser = null;
    }
  }
  if (browserLaunch) return browserLaunch;

  const launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--no-first-run',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--mute-audio'
    ]
  };
  const chromePath = resolveChromePath();
  if (chromePath) launchOptions.executablePath = chromePath;

  const puppeteer = require('puppeteer');
  browserLaunch = puppeteer
    .launch(launchOptions)
    .then((browser) => {
      sharedBrowser = browser;
      browserLaunch = null;
      browser.on('disconnected', () => {
        sharedBrowser = null;
      });
      return browser;
    })
    .catch((err) => {
      browserLaunch = null;
      throw err;
    });

  return browserLaunch;
}

module.exports = { getSharedBrowser, resolveChromePath };
