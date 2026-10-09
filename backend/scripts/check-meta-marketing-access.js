'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const VERSION = process.env.META_API_VERSION || 'v21.0';

const KEYS = [
  'META_PIXEL_ID',
  'META_ACCESS_TOKEN',
  'META_API_VERSION',
  'META_MARKETING_ACCESS_TOKEN',
  'META_AD_ACCOUNT_ID',
  'META_BUSINESS_ID',
  'META_CATALOG_ID',
  'FACEBOOK_PAGE_ID',
  'FACEBOOK_PAGE_ACCESS_TOKEN',
  'INSTAGRAM_BUSINESS_ACCOUNT_ID',
  'INSTAGRAM_ACCESS_TOKEN'
];

function present(key) {
  return Boolean(String(process.env[key] || '').trim());
}

async function graph(path, token) {
  const url = `https://graph.facebook.com/${VERSION}/${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && !data.error, data };
}

async function inspect(label, token) {
  if (!token) {
    console.log(`\n${label}: no cargado`);
    return;
  }
  console.log(`\n${label}: cargado`);
  const perms = await graph('me/permissions', token);
  if (!perms.ok) {
    const message = perms.data.error && (perms.data.error.message || perms.data.error.type);
    console.log(`  permisos: ${message || 'sin acceso'}`);
    return;
  }
  const granted = (perms.data.data || [])
    .filter((item) => item.status === 'granted')
    .map((item) => item.permission);
  const needed = ['ads_management', 'ads_read', 'catalog_management', 'business_management'];
  console.log(`  permisos de marketing: ${needed.map((name) => `${name}=${granted.includes(name) ? 'si' : 'no'}`).join(', ')}`);

  const accounts = await graph('me/adaccounts?fields=id,name,account_status,currency,timezone_name&limit=20', token);
  if (!accounts.ok) {
    const message = accounts.data.error && accounts.data.error.message;
    console.log(`  cuentas publicitarias: ${message || 'sin acceso'}`);
  } else {
    const rows = accounts.data.data || [];
    console.log(`  cuentas publicitarias: ${rows.length}`);
    rows.forEach((row) => {
      console.log(`    - ${row.id} | ${row.name} | ${row.currency} | ${row.timezone_name} | estado ${row.account_status}`);
    });
  }

  const catalogs = await graph('me/businesses?fields=id,name&limit=10', token);
  if (catalogs.ok) {
    const rows = catalogs.data.data || [];
    console.log(`  negocios: ${rows.length}`);
    rows.forEach((row) => console.log(`    - ${row.id} | ${row.name}`));
  }
}

function relatedKeys() {
  const fs = require('fs');
  const text = fs.readFileSync(require('path').join(__dirname, '..', '.env'), 'utf8');
  const names = [];
  text.split(/\n/).forEach((line) => {
    const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (!match) return;
    if (!/META|FACEBOOK|INSTAGRAM|PIXEL|ADS|CATALOG|PAGE|IG_/i.test(match[1])) return;
    names.push(`${match[1]}: ${String(match[2] || '').trim() ? 'cargada' : 'vacia'}`);
  });
  return names;
}

async function debugToken(label, token) {
  const appId = process.env.FACEBOOK_APP_ID;
  const secret = process.env.FACEBOOK_APP_SECRET;
  if (!token || !appId || !secret) return;
  const url = `https://graph.facebook.com/${VERSION}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(`${appId}|${secret}`)}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!data.data) {
    console.log(`  ${label} debug: ${(data.error && data.error.message) || 'sin datos'}`);
    return;
  }
  const scopes = data.data.scopes || [];
  const needed = ['ads_management', 'ads_read', 'catalog_management', 'business_management', 'pages_manage_ads'];
  console.log(`  ${label} tipo: ${data.data.type || 'desconocido'}, valido: ${data.data.is_valid ? 'si' : 'no'}`);
  console.log(`  ${label} marketing: ${needed.map((name) => `${name}=${scopes.includes(name) ? 'si' : 'no'}`).join(', ')}`);
}

async function businessAssets() {
  const businessId = process.env.FACEBOOK_BUSINESS_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!businessId || !token) return;
  console.log(`\nNegocio ${businessId}:`);
  for (const edge of ['owned_ad_accounts?fields=id,name,currency,account_status', 'owned_product_catalogs?fields=id,name,product_count']) {
    const result = await graph(`${businessId}/${edge}&limit=20`, token);
    const name = edge.split('?')[0];
    if (!result.ok) {
      console.log(`  ${name}: ${(result.data.error && result.data.error.message) || 'sin acceso'}`);
      continue;
    }
    const rows = result.data.data || [];
    console.log(`  ${name}: ${rows.length}`);
    rows.forEach((row) => console.log(`    - ${row.id} | ${row.name || ''} | ${row.currency || row.product_count || ''}`));
  }
}

async function main() {
  console.log('Claves relacionadas en .env:');
  relatedKeys().forEach((line) => console.log(`  ${line}`));
  console.log('Variables que el marketing espera:');
  KEYS.forEach((key) => console.log(`  ${key}: ${present(key) ? 'cargada' : 'falta'}`));
  await inspect('META_ACCESS_TOKEN', process.env.META_ACCESS_TOKEN);
  await inspect('META_MARKETING_ACCESS_TOKEN', process.env.META_MARKETING_ACCESS_TOKEN);
  await inspect('FACEBOOK_PAGE_ACCESS_TOKEN', process.env.FACEBOOK_PAGE_ACCESS_TOKEN);
  await debugToken('pagina', process.env.FACEBOOK_PAGE_ACCESS_TOKEN);
  await debugToken('instagram', process.env.INSTAGRAM_ACCESS_TOKEN);
  await businessAssets();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
