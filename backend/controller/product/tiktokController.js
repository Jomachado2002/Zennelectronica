'use strict';

const {
  configured,
  authorizeUrl,
  validState,
  exchangeCode,
  saveFromOAuth,
  getTikTokStatus,
  frontendBase
} = require('../../services/tiktokAuth');

function back(query) {
  const params = new URLSearchParams(query);
  return `${frontendBase()}/panel-admin/calendario-ig?${params.toString()}`;
}

const startTikTokConnect = async (req, res) => {
  if (!configured()) {
    return res.status(400).json({
      success: false,
      message: 'Falta la clave de TikTok en el servidor. Poné TIKTOK_CLIENT_KEY y TIKTOK_CLIENT_SECRET en el .env.'
    });
  }
  return res.json({ success: true, url: authorizeUrl() });
};

const tiktokOAuthCallback = async (req, res) => {
  try {
    if (req.query.error) {
      return res.redirect(back({ tiktok: 'error', reason: 'denied' }));
    }
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    if (!code || !validState(state)) {
      return res.redirect(back({ tiktok: 'error', reason: 'state' }));
    }
    const token = await exchangeCode(code);
    await saveFromOAuth(token);
    return res.redirect(back({ tiktok: 'ok' }));
  } catch (error) {
    console.error('[tiktok] oauth', error.message || error);
    return res.redirect(back({ tiktok: 'error', reason: 'token' }));
  }
};

const getTikTokAccount = async (req, res) => {
  try {
    const status = await getTikTokStatus();
    return res.json({ success: true, ...status });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'No se pudo leer TikTok' });
  }
};

module.exports = {
  startTikTokConnect,
  tiktokOAuthCallback,
  getTikTokAccount
};
