'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '../var/reels-dev');
const FONT = path.resolve(__dirname, '../assets/fonts/Inter-Regular.ttf');
const ALLOWED_HOSTS = new Set(['cdn.zenn.com.py', 'firebasestorage.googleapis.com']);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ensureRoot() {
  fs.mkdirSync(ROOT, { recursive: true });
}

function assertId(id) {
  if (!ID_RE.test(String(id || ''))) {
    throw Object.assign(new Error('Identificador de trabajo inválido'), { statusCode: 400 });
  }
}

function sidecarNames(id) {
  return [
    `${id}.image.jpg`,
    `${id}.name.txt`,
    `${id}.price.txt`,
    `${id}.filter.txt`,
    `${id}.mp4`
  ];
}

function safeJoin(name) {
  const base = path.basename(String(name || ''));
  if (base !== name) return null;
  const full = path.resolve(ROOT, base);
  if (!full.startsWith(`${ROOT}${path.sep}`)) return null;
  return full;
}

async function downloadImage(url) {
  let parsed;
  try {
    parsed = new URL(String(url || ''));
  } catch {
    throw Object.assign(new Error('La foto del producto no es válida'), { statusCode: 400 });
  }
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.host)) {
    throw Object.assign(new Error('La foto del producto no está en un host permitido'), { statusCode: 400 });
  }
  const response = await fetch(parsed.toString(), {
    redirect: 'manual',
    signal: AbortSignal.timeout(15000)
  });
  if (response.status >= 300 && response.status < 400) {
    throw Object.assign(new Error('La foto del producto no se pudo leer'), { statusCode: 400 });
  }
  if (!response.ok) {
    throw Object.assign(new Error('La foto del producto no se pudo leer'), { statusCode: 400 });
  }
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > MAX_IMAGE_BYTES) {
    throw Object.assign(new Error('La foto del producto supera 8 MB'), { statusCode: 400 });
  }
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length > MAX_IMAGE_BYTES) {
    throw Object.assign(new Error('La foto del producto supera 8 MB'), { statusCode: 400 });
  }
  return body;
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const bin = process.env.FFMPEG_PATH || 'ffmpeg';
    const child = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(Object.assign(new Error('El render superó 60 segundos'), { statusCode: 500 }));
    }, 60000);
    child.stderr.on('data', (chunk) => {
      stderr = `${stderr}${chunk.toString()}`.slice(-1500);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(Object.assign(new Error(stderr.trim() || 'FFmpeg no pudo generar el video'), { statusCode: 500 }));
    });
  });
}

async function renderStill({ id, productName, priceLabel, imageUrl }) {
  assertId(id);
  ensureRoot();
  const imagePath = safeJoin(`${id}.image.jpg`);
  const namePath = safeJoin(`${id}.name.txt`);
  const pricePath = safeJoin(`${id}.price.txt`);
  const filterPath = safeJoin(`${id}.filter.txt`);
  const videoPath = safeJoin(`${id}.mp4`);
  const jpeg = await sharp(await downloadImage(imageUrl)).rotate().jpeg({ quality: 90 }).toBuffer();
  await fs.promises.writeFile(imagePath, jpeg);
  await fs.promises.writeFile(namePath, String(productName || '').replace(/\s+/g, ' ').trim().slice(0, 80));
  await fs.promises.writeFile(pricePath, String(priceLabel || '').replace(/\s+/g, ' ').trim().slice(0, 40));
  const filter = [
    'scale=1080:1920:force_original_aspect_ratio=decrease',
    'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x0B1220',
    `drawtext=fontfile=${FONT}:textfile=${namePath}:fontsize=52:fontcolor=white:x=(w-text_w)/2:y=120`,
    `drawtext=fontfile=${FONT}:textfile=${pricePath}:fontsize=46:fontcolor=0x7DD3FC:x=(w-text_w)/2:y=h-200`
  ].join(',');
  await fs.promises.writeFile(filterPath, filter);
  await runFfmpeg([
    '-y',
    '-loop', '1',
    '-i', imagePath,
    '-f', 'lavfi',
    '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-t', '12',
    '-filter_script:v', filterPath,
    '-r', '30',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    videoPath
  ]);
  const stat = await fs.promises.stat(videoPath);
  return { bytes: stat.size, durationMs: 12000, fileName: `${id}.mp4` };
}

function resolveMp4(fileName) {
  if (!/^[0-9a-f-]{36}\.mp4$/i.test(String(fileName || ''))) return null;
  const full = safeJoin(fileName);
  if (!full || !fs.existsSync(full)) return null;
  return full;
}

function filesForJob(id) {
  if (!ID_RE.test(String(id || ''))) return [];
  return sidecarNames(id).filter((name) => {
    const full = safeJoin(name);
    return full && fs.existsSync(full);
  });
}

module.exports = {
  renderStill,
  resolveMp4,
  filesForJob
};
