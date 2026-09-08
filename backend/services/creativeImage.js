'use strict';

const path = require('path');
const sharp = require('sharp');

const LOGO_SVG = path.join(__dirname, '../../frontend/public/logozenn.svg');
const photoCache = new Map();
let logoWhitePromise = null;

async function getLogoWhiteDataUri() {
  if (!logoWhitePromise) {
    logoWhitePromise = sharp(LOGO_SVG, { density: 360 })
      .resize({ width: 420 })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => {
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 10) continue;
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
        }
        return sharp(data, { raw: info }).png().toBuffer();
      })
      .then((buf) => `data:image/png;base64,${buf.toString('base64')}`)
      .catch(() => '');
  }
  return logoWhitePromise;
}

async function fetchBuffer(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { Accept: 'image/*,*/*' }
  });
  if (!res.ok) throw new Error(`image ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function getPhotoDataUri(url) {
  if (!url) return '';
  if (photoCache.has(url)) return photoCache.get(url);

  const pending = (async () => {
    const buf = await Promise.race([
      fetchBuffer(url),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000))
    ]);
    const jpeg = await sharp(buf, { failOn: 'none' })
      .rotate()
      .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
  })().catch(async () => {
    try {
      const buf = await fetchBuffer(url);
      return `data:image/jpeg;base64,${buf.toString('base64')}`;
    } catch {
      return '';
    }
  });

  photoCache.set(url, pending);
  if (photoCache.size > 220) {
    const first = photoCache.keys().next().value;
    photoCache.delete(first);
  }
  return pending;
}

module.exports = {
  getLogoWhiteDataUri,
  getPhotoDataUri,
  getCutoutDataUri: getPhotoDataUri
};
