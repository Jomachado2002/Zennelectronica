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
  let last = '';
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (data.error) {
      throw new Error(data.error.error_user_msg || data.error.message || 'Instagram no pudo preparar la imagen');
    }
    const code = data.status_code;
    last = data.status || code || last;
    if (code === 'FINISHED' || code === 'PUBLISHED') return;
    if (code === 'ERROR' || code === 'EXPIRED') {
      throw new Error(data.status || 'Instagram no pudo preparar la imagen');
    }
    await sleep(2000);
  }
  throw new Error(last ? `Instagram no dejó lista la imagen: ${last}` : 'Instagram tardó demasiado en preparar la imagen');
}

function metaErrorMessage(data, status) {
  const err = data && data.error;
  if (!err) return `Error ${status} en Meta`;
  return err.error_user_msg || err.message || `Error ${status} en Meta`;
}

async function graph(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const err = new Error(metaErrorMessage(data, res.status));
    err.meta = data.error || null;
    throw err;
  }
  return data;
}

async function graphForm(url, fields) {
  const params = fields instanceof URLSearchParams ? fields : new URLSearchParams();
  if (!(fields instanceof URLSearchParams)) {
    Object.entries(fields || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      params.set(key, String(value));
    });
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const err = new Error(metaErrorMessage(data, res.status));
    err.meta = data.error || null;
    throw err;
  }
  return data;
}

async function publishInstagramContainer(base, creationId, token) {
  await waitUntilReady(creationId, token);
  const published = await graph(`${base}/media_publish`, {
    creation_id: creationId,
    access_token: token
  });
  return published.id || creationId;
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
    return publishInstagramContainer(base, created.id, token);
  }
  const children = [];
  for (let i = 0; i < urls.length; i += 1) {
    const child = await graph(`${base}/media`, {
      image_url: urls[i],
      is_carousel_item: true,
      alt_text: alts[i] || '',
      access_token: token
    });
    await waitUntilReady(child.id, token);
    children.push(child.id);
  }
  const parent = await graph(`${base}/media`, {
    media_type: 'CAROUSEL',
    children: children.join(','),
    caption,
    access_token: token
  });
  return publishInstagramContainer(base, parent.id, token);
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
    ids.push(await publishInstagramContainer(base, created.id, token));
  }
  return ids.join(',');
}

async function publishFacebookFeed({ urls, caption }) {
  const { token, pageId } = fbConfig();
  if (!token || !pageId) throw new Error('Falta el token o el id de la página de Facebook');
  const base = `https://graph.facebook.com/${IG_VERSION}/${pageId}`;
  if (urls.length === 1) {
    const photo = await graphForm(`${base}/photos`, {
      url: urls[0],
      caption,
      published: 'true',
      access_token: token
    });
    return photo.post_id || photo.id;
  }
  const media = [];
  for (const url of urls) {
    const photo = await graphForm(`${base}/photos`, {
      url,
      published: 'false',
      access_token: token
    });
    media.push(photo.id);
  }
  const params = new URLSearchParams();
  params.set('message', caption);
  params.set('access_token', token);
  media.forEach((id, index) => {
    params.set(`attached_media[${index}]`, JSON.stringify({ media_fbid: id }));
  });
  const post = await graphForm(`${base}/feed`, params);
  return post.id;
}

async function publishFacebookStories({ urls }) {
  const { token, pageId } = fbConfig();
  if (!token || !pageId) throw new Error('Falta el token o el id de la página de Facebook');
  const base = `https://graph.facebook.com/${IG_VERSION}/${pageId}`;
  const ids = [];
  for (const url of urls) {
    const photo = await graphForm(`${base}/photos`, {
      url,
      published: 'false',
      access_token: token
    });
    const story = await graphForm(`${base}/photo_stories`, {
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
