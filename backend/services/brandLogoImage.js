'use strict';

const sharp = require('sharp');

const MAX_PROCESS_EDGE = 1800;
const MIN_SIZE = 64;
const MAX_SIZE = 1024;
const DEFAULT_SIZE = 512;
const WHITE_THRESHOLD = 242;
const WHITE_CHROMA = 22;
const FEATHER_THRESHOLD = 220;

function clampSize(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SIZE;
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(n)));
}

function isNearWhite(r, g, b, threshold = WHITE_THRESHOLD, chroma = WHITE_CHROMA) {
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  return min >= threshold && max - min <= chroma;
}

function countTransparent(data, info) {
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) transparent += 1;
  }
  return transparent / Math.max(1, info.width * info.height);
}

function floodFillWhite(data, info, threshold = WHITE_THRESHOLD) {
  const { width, height } = info;
  const visited = new Uint8Array(width * height);
  const queue = [];

  const tryPush = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (visited[p]) return;
    const i = p * 4;
    if (data[i + 3] < 8) {
      visited[p] = 1;
      return;
    }
    if (!isNearWhite(data[i], data[i + 1], data[i + 2], threshold)) return;
    visited[p] = 1;
    queue.push(x, y);
  };

  for (let x = 0; x < width; x += 1) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }

  let cleared = 0;
  while (queue.length) {
    const y = queue.pop();
    const x = queue.pop();
    const i = (y * width + x) * 4;
    data[i + 3] = 0;
    cleared += 1;
    tryPush(x + 1, y);
    tryPush(x - 1, y);
    tryPush(x, y + 1);
    tryPush(x, y - 1);
  }

  return cleared;
}

function featherWhiteEdges(data, info) {
  const { width, height } = info;
  const copy = Buffer.from(data);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (copy[i + 3] < 8) continue;
      if (!isNearWhite(copy[i], copy[i + 1], copy[i + 2], FEATHER_THRESHOLD, 36)) continue;

      let neighborClear = false;
      for (let dy = -1; dy <= 1 && !neighborClear; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (copy[(ny * width + nx) * 4 + 3] < 8) {
            neighborClear = true;
            break;
          }
        }
      }
      if (!neighborClear) continue;

      const minC = Math.min(copy[i], copy[i + 1], copy[i + 2]);
      const fade = Math.max(0, Math.min(1, (255 - minC) / (255 - FEATHER_THRESHOLD)));
      data[i + 3] = Math.round(copy[i + 3] * fade);
    }
  }
}

async function removeWhiteBackground(buffer) {
  const { data, info } = await sharp(buffer, { failOn: 'none' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const alreadyTransparent = countTransparent(data, info);
  if (alreadyTransparent >= 0.08) {
    return buffer;
  }

  const cleared = floodFillWhite(data, info);
  const remaining = info.width * info.height - cleared;
  const remainingRatio = remaining / Math.max(1, info.width * info.height);

  if (cleared < 20 || remainingRatio < 0.012) {
    return buffer;
  }

  featherWhiteEdges(data, info);

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
    .png()
    .toBuffer();
}

async function processBrandLogo(buffer, { size = DEFAULT_SIZE, removeBackground = true } = {}) {
  const target = clampSize(size);

  let working = await sharp(buffer, { failOn: 'none', density: 320 })
    .rotate()
    .resize({
      width: MAX_PROCESS_EDGE,
      height: MAX_PROCESS_EDGE,
      fit: 'inside',
      withoutEnlargement: true
    })
    .ensureAlpha()
    .png()
    .toBuffer();

  if (removeBackground) {
    working = await removeWhiteBackground(working);
  }

  let pipeline = sharp(working, { failOn: 'none' }).ensureAlpha();
  try {
    pipeline = pipeline.trim({ threshold: 12 });
  } catch {
    pipeline = sharp(working, { failOn: 'none' }).ensureAlpha();
  }

  const out = await pipeline
    .resize({
      width: target,
      height: target,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  const meta = await sharp(out).metadata();
  return {
    buffer: out,
    width: meta.width || target,
    height: meta.height || target,
    contentType: 'image/png',
    size: target
  };
}

module.exports = {
  processBrandLogo,
  clampSize,
  DEFAULT_SIZE
};
