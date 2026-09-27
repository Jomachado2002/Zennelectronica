'use strict';

const sharp = require('sharp');
const { uploadBufferToR2 } = require('./r2StorageService');

const IG_VERSION = process.env.META_API_VERSION || 'v21.0';

function igConfig() {
  return {
    token: process.env.INSTAGRAM_ACCESS_TOKEN || '',
    userId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || ''
  };
}

function fbConfig() {
  return {
    token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
    pageId: process.env.FACEBOOK_PAGE_ID || ''
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntilReady(containerId, token) {
  const url = `https://graph.instagram.com/${IG_VERSION}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    const code = data.status_code;
    if (code === 'FINISHED' || code === 'PUBLISHED') return;
    if (code === 'ERROR' || code === 'EXPIRED') {
      throw new Error(data.status || 'Instagram no pudo preparar la imagen');
    }
    await sleep(2000);
  }
  throw new Error('Instagram tardó demasiado en preparar la historia');
}

async function graph(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const message = data.error?.message || `Error ${res.status} en Meta`;
    const err = new Error(message);
    err.meta = data.error || null;
    throw err;
  }
  return data;
}

async function jpegFromPng(png) {
  return sharp(png).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}

async function uploadJpeg(png, name) {
  const jpeg = await jpegFromPng(png);
  const key = `social/${new Date().toISOString().slice(0, 10)}/${name}.jpg`;
  return uploadBufferToR2(jpeg, key, {
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=86400'
  });
}

async function publishInstagramFeed({ urls, caption, alts }) {
  const { token, userId } = igConfig();
  if (!token || !userId) throw new Error('Falta el token o el id de Instagram');
  const base = `https://graph.instagram.com/${IG_VERSION}/${userId}`;
  if (urls.length === 1) {
    const created = await graph(`${base}/media`, {
      image_url: urls[0],
      caption,
      alt_text: alts[0] || '',
      access_token: token
    });
    const published = await graph(`${base}/media_publish`, {
      creation_id: created.id,
      access_token: token
    });
    return published.id || created.id;
  }
  const children = [];
  for (let i = 0; i < urls.length; i += 1) {
    const child = await graph(`${base}/media`, {
      image_url: urls[i],
      is_carousel_item: true,
      alt_text: alts[i] || '',
      access_token: token
    });
    children.push(child.id);
  }
  const parent = await graph(`${base}/media`, {
    media_type: 'CAROUSEL',
    children: children.join(','),
    caption,
    access_token: token
  });
  const published = await graph(`${base}/media_publish`, {
    creation_id: parent.id,
    access_token: token
  });
  return published.id || parent.id;
}

async function publishInstagramStories({ urls }) {
  const { token, userId } = igConfig();
  if (!token || !userId) throw new Error('Falta el token o el id de Instagram');
  const base = `https://graph.instagram.com/${IG_VERSION}/${userId}`;
  const ids = [];
  for (const url of urls) {
    const created = await graph(`${base}/media`, {
      image_url: url,
      media_type: 'STORIES',
      access_token: token
    });
    await waitUntilReady(created.id, token);
    const published = await graph(`${base}/media_publish`, {
      creation_id: created.id,
      access_token: token
    });
    ids.push(published.id || created.id);
  }
  return ids.join(',');
}

async function publishFacebookFeed({ urls, caption }) {
  const { token, pageId } = fbConfig();
  if (!token || !pageId) throw new Error('Falta el token o el id de la página de Facebook');
  const base = `https://graph.facebook.com/${IG_VERSION}/${pageId}`;
  if (urls.length === 1) {
    const photo = await graph(`${base}/photos`, {
      url: urls[0],
      caption,
      published: true,
      access_token: token
    });
    return photo.post_id || photo.id;
  }
  const media = [];
  for (const url of urls) {
    const photo = await graph(`${base}/photos`, {
      url,
      published: false,
      access_token: token
    });
    media.push({ media_fbid: photo.id });
  }
  const post = await graph(`${base}/feed`, {
    message: caption,
    attached_media: media,
    access_token: token
  });
  return post.id;
}

async function publishFacebookStories({ urls }) {
  const { token, pageId } = fbConfig();
  if (!token || !pageId) throw new Error('Falta el token o el id de la página de Facebook');
  const base = `https://graph.facebook.com/${IG_VERSION}/${pageId}`;
  const ids = [];
  for (const url of urls) {
    const photo = await graph(`${base}/photos`, {
      url,
      published: false,
      access_token: token
    });
    const story = await graph(`${base}/photo_stories`, {
      photo_id: photo.id,
      access_token: token
    });
    ids.push(story.post_id || story.id || photo.id);
  }
  return ids.join(',');
}

module.exports = {
  uploadJpeg,
  publishInstagramFeed,
  publishInstagramStories,
  publishFacebookFeed,
  publishFacebookStories
};
