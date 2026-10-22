'use strict';

const fs = require('fs');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://searchconsole.googleapis.com/webmasters/v3';

const SETUP_STEPS = [
  'En Google Cloud activá la API “Google Search Console API” en el proyecto del sitio.',
  'Creá una cuenta de servicio y descargá la clave JSON. No la subas al repositorio.',
  'En Search Console abrí la propiedad de zenn.com.py, entrá a Ajustes → Usuarios y permisos, y agregá el email de la cuenta de servicio con permiso Completo.',
  'En el servidor definí GOOGLE_SEARCH_CONSOLE_CREDENTIALS con el JSON (o en base64) y GOOGLE_SEARCH_CONSOLE_SITE_URL. Dominio: sc-domain:zenn.com.py. Prefijo: https://www.zenn.com.py/',
  'Reiniciá el backend y volvé a abrir este informe.'
];

let tokenCache = null;

function normalizePrivateKey(key) {
  let value = String(key || '').trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value.replace(/\\n/g, '\n');
}

function loadCredentials() {
  const raw = String(process.env.GOOGLE_SEARCH_CONSOLE_CREDENTIALS || '').trim();
  if (raw) {
    const jsonText = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    let json;
    try {
      json = JSON.parse(jsonText);
    } catch {
      const error = new Error('GOOGLE_SEARCH_CONSOLE_CREDENTIALS no es un JSON válido.');
      error.code = 'SEARCH_CONSOLE_CONFIG';
      throw error;
    }
    return {
      clientEmail: json.client_email,
      privateKey: normalizePrivateKey(json.private_key)
    };
  }

  if (process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL && process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY) {
    return {
      clientEmail: String(process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL).trim(),
      privateKey: normalizePrivateKey(process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY)
    };
  }

  const keyFile = process.env.GOOGLE_SEARCH_CONSOLE_KEY_FILE;
  if (keyFile && fs.existsSync(keyFile)) {
    const json = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
    return {
      clientEmail: json.client_email,
      privateKey: normalizePrivateKey(json.private_key)
    };
  }

  return null;
}

function siteUrl() {
  return String(process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || 'sc-domain:zenn.com.py').trim();
}

function configStatus() {
  try {
    const credentials = loadCredentials();
    return {
      configured: Boolean(credentials?.clientEmail && credentials?.privateKey),
      siteUrl: siteUrl(),
      clientEmail: credentials?.clientEmail || '',
      steps: SETUP_STEPS,
      configError: ''
    };
  } catch (error) {
    return {
      configured: false,
      siteUrl: siteUrl(),
      clientEmail: '',
      steps: SETUP_STEPS,
      configError: error.message
    };
  }
}

async function accessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.email === credentials.clientEmail && tokenCache.exp > now + 60) {
    return tokenCache.token;
  }

  const assertion = jwt.sign(
    {
      iss: credentials.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600
    },
    credentials.privateKey,
    { algorithm: 'RS256' }
  );

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  });

  const response = await axios.post(TOKEN_URL, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 20000
  });

  tokenCache = {
    email: credentials.clientEmail,
    token: response.data.access_token,
    exp: now + Number(response.data.expires_in || 3600)
  };
  return tokenCache.token;
}

function explainError(error) {
  const status = error.response?.status;
  const message = error.response?.data?.error?.message || error.message;
  if (error.code === 'SEARCH_CONSOLE_CONFIG') return error.message;
  if (status === 401) return 'Google rechazó la credencial. Revisá el JSON de la cuenta de servicio.';
  if (status === 403) {
    return 'La cuenta de servicio no tiene acceso a esta propiedad. Agregala en Search Console → Ajustes → Usuarios y permisos.';
  }
  if (status === 404) return 'Esa propiedad no existe para esta cuenta. Revisá GOOGLE_SEARCH_CONSOLE_SITE_URL.';
  if (status === 429) return 'Search Console limitó las consultas de hoy. Reintentá más tarde: el informe queda guardado unas horas.';
  return message || 'No se pudo leer Search Console.';
}

async function apiGet(path) {
  const credentials = loadCredentials();
  if (!credentials) {
    const error = new Error('Search Console no está configurado.');
    error.code = 'SEARCH_CONSOLE_CONFIG';
    throw error;
  }
  const token = await accessToken(credentials);
  const response = await axios.get(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30000
  });
  return response.data;
}

async function apiPost(path, payload) {
  const credentials = loadCredentials();
  if (!credentials) {
    const error = new Error('Search Console no está configurado.');
    error.code = 'SEARCH_CONSOLE_CONFIG';
    throw error;
  }
  const token = await accessToken(credentials);
  const response = await axios.post(`${API}${path}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30000
  });
  return response.data;
}

async function listSites() {
  const data = await apiGet('/sites');
  return (data.siteEntry || []).map((site) => ({
    siteUrl: site.siteUrl,
    permissionLevel: site.permissionLevel
  }));
}

function sameSite(left, right) {
  return String(left || '').replace(/\/$/, '') === String(right || '').replace(/\/$/, '');
}

async function searchAnalytics(property, body) {
  const path = `/sites/${encodeURIComponent(property)}/searchAnalytics/query`;
  const data = await apiPost(path, body);
  return data.rows || [];
}

async function listSitemaps(property) {
  const data = await apiGet(`/sites/${encodeURIComponent(property)}/sitemaps`);
  return (data.sitemap || []).map((sitemap) => ({
    path: sitemap.path,
    lastSubmitted: sitemap.lastSubmitted || '',
    lastDownloaded: sitemap.lastDownloaded || '',
    isPending: Boolean(sitemap.isPending),
    warnings: Number(sitemap.warnings || 0),
    errors: Number(sitemap.errors || 0),
    contents: (sitemap.contents || []).map((item) => ({
      type: item.type,
      submitted: Number(item.submitted || 0),
      indexed: Number(item.indexed || 0)
    }))
  }));
}

function dateRange(days) {
  const span = Math.min(Math.max(Number(days) || 28, 7), 90);
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() - 2);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (span - 1));
  const previousEnd = new Date(start);
  previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setUTCDate(previousStart.getUTCDate() - (span - 1));
  const iso = (date) => date.toISOString().slice(0, 10);
  return {
    days: span,
    startDate: iso(start),
    endDate: iso(end),
    previousStart: iso(previousStart),
    previousEnd: iso(previousEnd)
  };
}

module.exports = {
  SETUP_STEPS,
  configStatus,
  explainError,
  listSites,
  listSitemaps,
  searchAnalytics,
  sameSite,
  siteUrl,
  dateRange
};
