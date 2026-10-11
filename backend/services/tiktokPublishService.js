'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const sharp = require('sharp');
const { getAccount } = require('./tiktokAuth');

function isVideoUrl(url) {
  return /\.(mp4|webm|mov)($|\?)/i.test(String(url || ''));
}

function ffmpegBin() {
  return process.env.FFMPEG_PATH || 'ffmpeg';
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegBin(), args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    child.stderr.on('data', (chunk) => {
      err += chunk.toString();
    });
    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(Object.assign(new Error('Falta ffmpeg para armar el video de TikTok'), { code: 'SKIP' }));
        return;
      }
      reject(error);
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim().split('\n').pop() || 'ffmpeg no pudo armar el video'));
    });
  });
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudo bajar el archivo para TikTok');
  return Buffer.from(await res.arrayBuffer());
}

async function imageToMp4(urls) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zenn-tt-'));
  try {
    const frames = urls.filter((url) => !isVideoUrl(url)).slice(0, 6);
    if (!frames.length) throw new Error('No hay foto para TikTok');
    const list = [];
    for (let i = 0; i < frames.length; i += 1) {
      const jpeg = await sharp(await download(frames[i]))
        .rotate()
        .resize(1080, 1920, { fit: 'contain', background: { r: 0, g: 0, b: 0 } })
        .jpeg({ quality: 90 })
        .toBuffer();
      const file = path.join(dir, `f${String(i).padStart(3, '0')}.jpg`);
      fs.writeFileSync(file, jpeg);
      list.push(file);
    }
    const out = path.join(dir, 'out.mp4');
    if (list.length === 1) {
      await runFfmpeg([
        '-y', '-loop', '1', '-i', list[0], '-t', '5',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30',
        '-movflags', '+faststart', out
      ]);
    } else {
      const concat = path.join(dir, 'list.txt');
      fs.writeFileSync(concat, list.map((file) => `file '${file.replace(/'/g, "'\\''")}'\nduration 2.5`).join('\n') + `\nfile '${list[list.length - 1].replace(/'/g, "'\\''")}'\n`);
      await runFfmpeg([
        '-y', '-f', 'concat', '-safe', '0', '-i', concat,
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30',
        '-movflags', '+faststart', out
      ]);
    }
    return fs.readFileSync(out);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function mediaBuffer(urls) {
  const video = (urls || []).find(isVideoUrl);
  if (video) return download(video);
  return imageToMp4(urls || []);
}

async function initInbox(token, size) {
  const res = await fetch('https://open.tiktokapis.com/v2/post/publish/inbox/video/init/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8'
    },
    body: JSON.stringify({
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: size,
        chunk_size: size,
        total_chunk_count: 1
      }
    })
  });
  const data = await res.json().catch(() => ({}));
  const err = data.error || {};
  if (!res.ok || (err.code && err.code !== 'ok')) {
    throw new Error(err.message || 'TikTok no aceptó el video');
  }
  return data.data || {};
}

async function putVideo(uploadUrl, buffer) {
  const end = buffer.length - 1;
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(buffer.length),
      'Content-Range': `bytes 0-${end}/${buffer.length}`
    },
    body: buffer
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `TikTok no recibió el archivo (${res.status})`);
  }
}

async function publishToTikTok({ urls }) {
  const account = await getAccount();
  if (!account) {
    const error = new Error('TikTok no está conectado');
    error.code = 'SKIP';
    throw error;
  }
  const list = (urls || []).filter(Boolean);
  if (!list.length) {
    const error = new Error('No hay archivo para TikTok');
    error.code = 'SKIP';
    throw error;
  }
  const buffer = await mediaBuffer(list);
  const started = await initInbox(account.accessToken, buffer.length);
  if (!started.upload_url) throw new Error('TikTok no dio URL de carga');
  await putVideo(started.upload_url, buffer);
  return started.publish_id || 'inbox';
}

module.exports = {
  publishToTikTok,
  isVideoUrl
};
