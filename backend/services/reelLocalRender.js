'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const sharp = require('sharp');
const { validatePlan, ALLOWED_HOSTS } = require('./reelScenePlan');

const ROOT = path.resolve(__dirname, '../var/reels-dev');
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
  if (response.status >= 300 && response.status < 400 || !response.ok) {
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

function runFfmpeg(args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const bin = process.env.FFMPEG_PATH || 'ffmpeg';
    const child = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(Object.assign(new Error('El render superó el tiempo límite'), { statusCode: 500 }));
    }, timeoutMs || 120000);
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

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/ /g, '&#160;');
}

function wrapLines(text, max) {
  const words = cleanWords(text);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

function cleanWords(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
}

function textSvg(kicker, overlay) {
  const lines = wrapLines(overlay, 28);
  const title = lines.map((line, index) => (
    `<text x="540" y="${148 + index * 52}" text-anchor="middle" font-size="40" fill="#FFFFFF" font-family="Helvetica Neue, Helvetica, Arial, sans-serif">${escapeXml(line)}</text>`
  )).join('');
  const brand = `<text x="540" y="82" text-anchor="middle" font-size="22" fill="#94A3B8" font-family="Helvetica Neue, Helvetica, Arial, sans-serif">${escapeXml(kicker)}</text>`;
  return Buffer.from(`<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">${brand}${title}</svg>`);
}

function motionFilter(type, frames) {
  const last = Math.max(1, frames - 1);
  if (type === 'pan_right') {
    return `zoompan=z=1.16:x='(iw-iw/zoom)*on/${last}':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30`;
  }
  if (type === 'pan_left') {
    return `zoompan=z=1.16:x='(iw-iw/zoom)*(1-on/${last})':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30`;
  }
  if (type === 'hold') {
    return `zoompan=z=1.04:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30`;
  }
  return `zoompan=z='min(1.0+on*0.0013,1.16)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=30`;
}

async function composeCard({ jpeg, overlay, kicker }) {
  const photo = await sharp(jpeg).resize(1080, 1420, { fit: 'contain', background: '#0B1220' }).jpeg().toBuffer();
  return sharp({
    create: { width: 1080, height: 1920, channels: 3, background: '#0B1220' }
  }).composite([
    { input: photo, top: 250, left: 0 },
    { input: textSvg(kicker || 'ZENN', overlay), top: 0, left: 0 }
  ]).jpeg({ quality: 90 }).toBuffer();
}

async function renderPlan(id, plan) {
  assertId(id);
  const check = validatePlan(plan);
  if (!check.ok) {
    throw Object.assign(new Error('El plan de escenas no es válido'), { statusCode: 400 });
  }
  ensureRoot();
  const cardPaths = [];
  const clipPaths = [];
  for (let index = 0; index < plan.scenes.length; index += 1) {
    const scene = plan.scenes[index];
    const jpeg = await sharp(await downloadImage(scene.assetRefs[0])).rotate().jpeg({ quality: 90 }).toBuffer();
    const card = await composeCard({
      jpeg,
      overlay: scene.overlayText,
      kicker: scene.purpose === 'close' ? 'ZENN · ASUNCIÓN' : 'ZENN'
    });
    const cardPath = safeJoin(`${id}.s${index}.jpg`);
    const clipPath = safeJoin(`${id}.c${index}.mp4`);
    await fs.promises.writeFile(cardPath, card);
    const frames = Math.round(scene.durationSeconds * plan.render.fps);
    await runFfmpeg([
      '-y',
      '-loop', '1',
      '-i', cardPath,
      '-t', String(scene.durationSeconds),
      '-vf', `scale=1350:2400:force_original_aspect_ratio=increase,crop=1350:2400,${motionFilter(scene.motion.type, frames)}`,
      '-r', '30',
      '-an',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      clipPath
    ], 45000);
    cardPaths.push(cardPath);
    clipPaths.push(clipPath);
  }
  const videoPath = safeJoin(`${id}.mp4`);
  const args = ['-y'];
  clipPaths.forEach((file) => {
    args.push('-i', file);
  });
  args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
  const labels = clipPaths.map((_, index) => `[${index}:v]`).join('');
  args.push(
    '-filter_complex',
    `${labels}concat=n=${clipPaths.length}:v=1:a=0[v]`,
    '-map', '[v]',
    '-map', `${clipPaths.length}:a`,
    '-t', String(plan.render.targetDurationSeconds),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-shortest',
    '-movflags', '+faststart',
    videoPath
  );
  await runFfmpeg(args, 120000);
  const stat = await fs.promises.stat(videoPath);
  return {
    bytes: stat.size,
    durationMs: plan.render.targetDurationSeconds * 1000,
    fileName: `${id}.mp4`,
    sceneCount: plan.scenes.length
  };
}

function resolveMp4(fileName) {
  if (!/^[0-9a-f-]{36}\.mp4$/i.test(String(fileName || ''))) return null;
  const full = safeJoin(fileName);
  if (!full || !fs.existsSync(full)) return null;
  return full;
}

function filesForJob(id) {
  if (!ID_RE.test(String(id || ''))) return [];
  ensureRoot();
  return fs.readdirSync(ROOT).filter((name) => name.startsWith(`${id}.`) && !name.includes('..')).sort();
}

module.exports = {
  renderPlan,
  resolveMp4,
  filesForJob
};
