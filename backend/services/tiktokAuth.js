'use strict';

const crypto = require('crypto');
const TiktokAccount = require('../models/tiktokAccountModel');

const SCOPES = 'user.info.basic,video.upload';

function clientKey() {
  return String(process.env.TIKTOK_CLIENT_KEY || '').trim();
}

function clientSecret() {
  return String(process.env.TIKTOK_CLIENT_SECRET || '').trim();
}

function redirectUri() {
  return String(process.env.TIKTOK_REDIRECT_URI || 'https://www.zenn.com.py/api/tiktok/oauth').trim();
}

function frontendBase() {
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:3000';
  return process.env.FRONTEND_URL || 'https://www.zenn.com.py';
}

function configured() {
  return Boolean(clientKey() && clientSecret());
}

function stateSecret() {
  return process.env.TOKEN_SECRET_KEY || process.env.SESSION_SECRET || 'tiktok-state';
}

function makeState() {
  const payload = `${crypto.randomBytes(16).toString('hex')}.${Date.now() + 15 * 60 * 1000}`;
  const sig = crypto.createHmac('sha256', stateSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function validState(state) {
  const raw = String(state || '');
  const last = raw.lastIndexOf('.');
  if (last <= 0) return false;
  const payload = raw.slice(0, last);
  const sig = raw.slice(last + 1);
  const expected = crypto.createHmac('sha256', stateSecret()).update(payload).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  const exp = Number(payload.split('.')[1]);
  return Number.isFinite(exp) && exp >= Date.now();
}

function authorizeUrl() {
  const params = new URLSearchParams({
    client_key: clientKey(),
    response_type: 'code',
    scope: SCOPES,
    redirect_uri: redirectUri(),
    state: makeState()
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

async function tiktokForm(url, fields) {
  const body = new URLSearchParams();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) body.set(key, String(value));
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error || data.error_description) {
    throw new Error(data.error_description || data.error || `TikTok no respondió (${res.status})`);
  }
  return data;
}

async function exchangeCode(code) {
  return tiktokForm('https://open.tiktokapis.com/v2/oauth/token/', {
    client_key: clientKey(),
    client_secret: clientSecret(),
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri()
  });
}

async function refreshTokens(refreshToken) {
  return tiktokForm('https://open.tiktokapis.com/v2/oauth/token/', {
    client_key: clientKey(),
    client_secret: clientSecret(),
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });
}

async function fetchUser(accessToken) {
  const url = 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name';
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json().catch(() => ({}));
  const err = data.error || {};
  if (!res.ok || (err.code && err.code !== 'ok')) {
    throw new Error(err.message || 'TikTok no devolvió el perfil');
  }
  return data.data?.user || {};
}

function applyToken(doc, token) {
  const now = Date.now();
  doc.accessToken = token.access_token || doc.accessToken;
  doc.refreshToken = token.refresh_token || doc.refreshToken;
  doc.openId = token.open_id || doc.openId;
  doc.scope = token.scope || doc.scope;
  if (token.expires_in) doc.expiresAt = new Date(now + Number(token.expires_in) * 1000);
  if (token.refresh_expires_in) {
    doc.refreshExpiresAt = new Date(now + Number(token.refresh_expires_in) * 1000);
  }
  return doc;
}

async function saveFromOAuth(token) {
  const user = await fetchUser(token.access_token).catch(() => ({}));
  const doc = await TiktokAccount.findOneAndUpdate(
    { key: 'store' },
    { $setOnInsert: { key: 'store' } },
    { upsert: true, new: true }
  );
  applyToken(doc, token);
  if (user.open_id) doc.openId = user.open_id;
  if (user.display_name) doc.displayName = user.display_name;
  if (user.avatar_url) doc.avatarUrl = user.avatar_url;
  await doc.save();
  return publicStatus(doc);
}

async function getAccount() {
  const doc = await TiktokAccount.findOne({ key: 'store' });
  if (!doc || !doc.accessToken) return null;
  if (doc.expiresAt && doc.expiresAt.getTime() > Date.now() + 60 * 1000) return doc;
  if (!doc.refreshToken) return doc;
  const token = await refreshTokens(doc.refreshToken);
  applyToken(doc, token);
  await doc.save();
  return doc;
}

function publicStatus(doc) {
  if (!doc || !doc.accessToken) {
    return { connected: false, configured: configured(), name: '' };
  }
  return {
    connected: true,
    configured: configured(),
    name: doc.displayName || 'TikTok de Zenn',
    openId: doc.openId || ''
  };
}

async function getTikTokStatus() {
  const doc = await TiktokAccount.findOne({ key: 'store' }).lean();
  return publicStatus(doc);
}

module.exports = {
  configured,
  redirectUri,
  frontendBase,
  authorizeUrl,
  validState,
  exchangeCode,
  saveFromOAuth,
  getAccount,
  getTikTokStatus
};
