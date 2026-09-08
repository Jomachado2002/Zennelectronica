'use strict';

const fs = require('fs');

let sharedBrowser = null;
let browserLaunch = null;

function isServerless() {
  return Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.AWS_EXECUTION_ENV
  );
}

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

function loadPuppeteer(preferCore) {
  if (preferCore) {
    try {
      return require('puppeteer-core');
    } catch {
      /* el paquete completo también acepta executablePath */
    }
  }
  return require('puppeteer');
}

async function launchLocalBrowser() {
  const puppeteer = loadPuppeteer(false);
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
  return puppeteer.launch(launchOptions);
}

async function launchServerlessBrowser() {
  const chromium = require('@sparticuz/chromium');
  const puppeteer = loadPuppeteer(true);
  chromium.setGraphicsMode = false;
  const executablePath = await chromium.executablePath();
  const args = typeof puppeteer.defaultArgs === 'function'
    ? puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' })
    : chromium.args;
  return puppeteer.launch({
    args,
    defaultViewport: chromium.defaultViewport || { width: 1080, height: 1350 },
    executablePath,
    headless: 'shell',
    ignoreHTTPSErrors: true
  });
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

  const start = isServerless() ? launchServerlessBrowser() : launchLocalBrowser();
  browserLaunch = start
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

module.exports = { getSharedBrowser, resolveChromePath, isServerless };
