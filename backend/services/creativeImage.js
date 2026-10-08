'use strict';

const path = require('path');
const sharp = require('sharp');

const LOGO_SVG = path.join(__dirname, '../../frontend/public/logozenn.svg');
const photoCache = new Map();
let logoWhitePromise = null;
let logoColorPromise = null;

async function getLogoColorDataUri() {
  if (!logoColorPromise) {
    logoColorPromise = sharp(LOGO_SVG, { density: 360 })
      .resize({ width: 520 })
      .png()
      .toBuffer()
      .then((buf) => `data:image/png;base64,${buf.toString('base64')}`)
      .catch(() => '');
  }
  return logoColorPromise;
}

async function paintLogo(rgb) {
  const { data, info } = await sharp(LOGO_SVG, { density: 360 })
    .resize({ width: 420 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) continue;
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
  }
  const buf = await sharp(data, { raw: info }).png().toBuffer();
  return `data:image/png;base64,${buf.toString('base64')}`;
}

async function getLogoWhiteDataUri() {
  if (!logoWhitePromise) {
    logoWhitePromise = paintLogo([255, 255, 255]).catch(() => '');
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

async function getCutoutDataUri(url) {
  if (!url) return '';
  const key = `cutout:v3:${url}`;
  if (photoCache.has(key)) return photoCache.get(key);

  const pending = (async () => {
    const buf = await Promise.race([
      fetchBuffer(url),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000))
    ]);
    const sized = sharp(buf, { failOn: 'none' })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .ensureAlpha();
    const { data, info } = await sized.raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;
    if (!width || !height || channels < 4) return '';
    const at = (x, y) => {
      const i = (y * width + x) * channels;
      return [data[i], data[i + 1], data[i + 2]];
    };
    const corners = [at(1, 1), at(width - 2, 1), at(1, height - 2), at(width - 2, height - 2)];
    const cr = corners.reduce((sum, pixel) => sum + pixel[0], 0) / 4;
    const cg = corners.reduce((sum, pixel) => sum + pixel[1], 0) / 4;
    const cb = corners.reduce((sum, pixel) => sum + pixel[2], 0) / 4;
    if ((cr + cg + cb) / 3 < 168) {
      const png = await sharp(data, { raw: info }).png().toBuffer();
      return `data:image/png;base64,${png.toString('base64')}`;
    }
    const tolerance = 32;
    const seen = new Uint8Array(width * height);
    const stack = [];
    const push = (x, y) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const pos = y * width + x;
      if (seen[pos]) return;
      const i = pos * channels;
      if (Math.abs(data[i] - cr) > tolerance || Math.abs(data[i + 1] - cg) > tolerance || Math.abs(data[i + 2] - cb) > tolerance) return;
      seen[pos] = 1;
      stack.push(pos);
    };
    for (let x = 0; x < width; x += 1) {
      push(x, 0);
      push(x, height - 1);
    }
    for (let y = 0; y < height; y += 1) {
      push(0, y);
      push(width - 1, y);
    }
    while (stack.length) {
      const pos = stack.pop();
      const x = pos % width;
      const y = Math.floor(pos / width);
      data[pos * channels + 3] = 0;
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }
    const fringe = tolerance + 18;
    for (let pass = 0; pass < 2; pass += 1) {
      const kill = [];
      for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
          const pos = y * width + x;
          const i = pos * channels;
          if (data[i + 3] === 0) continue;
          const near = data[((y - 1) * width + x) * channels + 3] === 0
            || data[((y + 1) * width + x) * channels + 3] === 0
            || data[(y * width + x - 1) * channels + 3] === 0
            || data[(y * width + x + 1) * channels + 3] === 0;
          if (!near) continue;
          if (Math.abs(data[i] - cr) > fringe || Math.abs(data[i + 1] - cg) > fringe || Math.abs(data[i + 2] - cb) > fringe) continue;
          kill.push(i + 3);
        }
      }
      kill.forEach((index) => { data[index] = 0; });
    }
    const png = await sharp(data, { raw: info }).trim({ threshold: 12 }).png().toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  })().catch(() => '');

  photoCache.set(key, pending);
  if (photoCache.size > 220) photoCache.delete(photoCache.keys().next().value);
  return pending;
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

async function getBrandLogoDataUri(url) {
  if (!url) return '';
  if (photoCache.has(url)) return photoCache.get(url);

  const pending = (async () => {
    const buf = await Promise.race([
      fetchBuffer(url),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000))
    ]);
    const png = await sharp(buf, { failOn: 'none' })
      .rotate()
      .resize({ width: 360, height: 360, fit: 'inside', withoutEnlargement: true })
      .ensureAlpha()
      .png({ compressionLevel: 6 })
      .toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  })().catch(async () => {
    try {
      const buf = await fetchBuffer(url);
      return `data:image/png;base64,${buf.toString('base64')}`;
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

let logoInkPromise = null;

async function getLogoInkDataUri() {
  if (!logoInkPromise) {
    logoInkPromise = paintLogo([22, 22, 22]).catch(() => '');
  }
  return logoInkPromise;
}

const LOGO_LIGHT_FILE = path.join(__dirname, '../../frontend/logozenn.png');
const LOGO_DARK_FILE = path.join(__dirname, '../../frontend/logoblanco.jpeg');
let communityLightPromise = null;
let communityDarkPromise = null;

async function cutLogoFile(file) {
  const sized = sharp(file).rotate().resize({ width: 640 }).ensureAlpha();
  const { data, info } = await sized.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const at = (x, y) => {
    const i = (y * width + x) * channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const corners = [at(2, 2), at(width - 3, 2), at(2, height - 3), at(width - 3, height - 3)];
  const cr = corners.reduce((sum, pixel) => sum + pixel[0], 0) / 4;
  const cg = corners.reduce((sum, pixel) => sum + pixel[1], 0) / 4;
  const cb = corners.reduce((sum, pixel) => sum + pixel[2], 0) / 4;
  const tolerance = 42;
  const seen = new Uint8Array(width * height);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pos = y * width + x;
    if (seen[pos]) return;
    const i = pos * channels;
    if (Math.abs(data[i] - cr) > tolerance || Math.abs(data[i + 1] - cg) > tolerance || Math.abs(data[i + 2] - cb) > tolerance) return;
    seen[pos] = 1;
    stack.push(pos);
  };
  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }
  while (stack.length) {
    const pos = stack.pop();
    const x = pos % width;
    const y = Math.floor(pos / width);
    data[pos * channels + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  for (let i = 0; i < data.length; i += channels) {
    if (data[i + 3] === 0) continue;
    if (Math.abs(data[i] - cr) > tolerance || Math.abs(data[i + 1] - cg) > tolerance || Math.abs(data[i + 2] - cb) > tolerance) continue;
    data[i + 3] = 0;
  }
  const owner = new Int32Array(width * height);
  const boxes = [];
  let nextId = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (owner[start] || data[start * channels + 3] < 20) continue;
      nextId += 1;
      const pile = [start];
      owner[start] = nextId;
      let count = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      while (pile.length) {
        const pos = pile.pop();
        count += 1;
        const px = pos % width;
        const py = Math.floor(pos / width);
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        const near = [
          px < width - 1 ? pos + 1 : -1,
          px > 0 ? pos - 1 : -1,
          py < height - 1 ? pos + width : -1,
          py > 0 ? pos - width : -1
        ];
        for (const next of near) {
          if (next < 0 || owner[next] || data[next * channels + 3] < 20) continue;
          owner[next] = nextId;
          pile.push(next);
        }
      }
      boxes.push({ id: nextId, count, minX, maxX, minY, maxY });
    }
  }
  const main = boxes.reduce((best, box) => (box.count > best.count ? box : best), { count: 0 });
  if (main.count) {
    const padX = Math.round((main.maxX - main.minX) * 2.4);
    const padY = Math.round((main.maxY - main.minY) * 3);
    const keep = new Set(boxes.filter((box) => (
      box.maxX >= main.minX - padX
      && box.minX <= main.maxX + padX
      && box.maxY >= main.minY - padY
      && box.minY <= main.maxY + padY
    )).map((box) => box.id));
    for (let pos = 0; pos < owner.length; pos += 1) {
      if (owner[pos] && !keep.has(owner[pos])) data[pos * channels + 3] = 0;
    }
  }
  const png = await sharp(data, { raw: info }).trim({ threshold: 10 }).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

function getCommunityLogoLight() {
  if (!communityLightPromise) {
    communityLightPromise = cutLogoFile(LOGO_LIGHT_FILE).catch(() => getLogoColorDataUri());
  }
  return communityLightPromise;
}

function getCommunityLogoDark() {
  if (!communityDarkPromise) {
    communityDarkPromise = cutLogoFile(LOGO_DARK_FILE).catch(() => getLogoWhiteDataUri());
  }
  return communityDarkPromise;
}

module.exports = {
  getLogoWhiteDataUri,
  getLogoInkDataUri,
  getLogoColorDataUri,
  getCommunityLogoLight,
  getCommunityLogoDark,
  getPhotoDataUri,
  getBrandLogoDataUri,
  getCutoutDataUri
};
