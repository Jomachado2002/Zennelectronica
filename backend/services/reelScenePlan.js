'use strict';

const ALLOWED_HOSTS = new Set(['cdn.zenn.com.py', 'firebasestorage.googleapis.com']);
const MOTIONS = new Set(['slow_zoom', 'pan_right', 'pan_left', 'hold']);
const PURPOSES = new Set(['hook', 'product', 'detail', 'offer', 'close']);
const TRANSITIONS = new Set(['cut']);

function cleanText(value, max) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function allowedUrl(url) {
  try {
    const parsed = new URL(String(url || ''));
    return parsed.protocol === 'https:' && ALLOWED_HOSTS.has(parsed.host);
  } catch {
    return false;
  }
}

function catalogImages(product) {
  const seen = new Set();
  const urls = [];
  for (const url of product.productImage || []) {
    if (!allowedUrl(url) || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
    if (urls.length >= 4) break;
  }
  return urls;
}

function spokenTopic(product) {
  const brand = cleanText(product.brandName, 28);
  if (brand) return brand;
  const name = cleanText(product.productName, 32);
  if (name) return name.split(' ').slice(0, 3).join(' ');
  return 'esto';
}

function gs(amount) {
  return `Gs. ${Math.round(Number(amount) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

function firstFact(product) {
  const bags = [product.technicalSpecifications, product.specifications];
  for (const bag of bags) {
    if (!bag || typeof bag !== 'object') continue;
    for (const value of Object.values(bag)) {
      if (typeof value === 'string' && value.trim() && !/__/.test(value)) return cleanText(value, 42);
      if (value && typeof value === 'object') {
        const text = value.value || value.label || value.name;
        if (typeof text === 'string' && text.trim() && !/__/.test(text)) return cleanText(text, 42);
      }
    }
  }
  return spokenTopic(product);
}

function validatePlan(plan) {
  const errors = [];
  if (!plan || plan.schemaVersion !== 1) errors.push('schemaVersion');
  if (plan && plan.trialTag !== 'zenn-reels-dev') errors.push('trialTag');
  const scenes = plan && Array.isArray(plan.scenes) ? plan.scenes : [];
  if (scenes.length < 3 || scenes.length > 6) errors.push('scenes.length');
  let total = 0;
  scenes.forEach((scene, index) => {
    const duration = Number(scene && scene.durationSeconds);
    total += Number.isFinite(duration) ? duration : 0;
    if (!scene || !/^scene-\d{2}$/.test(scene.sceneId)) errors.push(`scenes.${index}.sceneId`);
    if (!PURPOSES.has(scene && scene.purpose)) errors.push(`scenes.${index}.purpose`);
    if (!Number.isFinite(duration) || duration < 3 || duration > 8) errors.push(`scenes.${index}.duration`);
    if (!MOTIONS.has(scene && scene.motion && scene.motion.type)) errors.push(`scenes.${index}.motion`);
    if (!TRANSITIONS.has(scene && scene.transitionIn) || !TRANSITIONS.has(scene && scene.transitionOut)) {
      errors.push(`scenes.${index}.transition`);
    }
    if (cleanText(scene && scene.overlayText, 48).length < 2) errors.push(`scenes.${index}.overlay`);
    const asset = scene && scene.assetRefs && scene.assetRefs[0];
    if (!allowedUrl(asset)) errors.push(`scenes.${index}.asset`);
    if ((scene && scene.filter) || (scene && scene.ffmpeg)) errors.push(`scenes.${index}.unsafe`);
  });
  if (total < 15 || total > 30) errors.push('duration');
  const product = plan && plan.productRefs && plan.productRefs[0];
  if (!product || !(product.stock > 0) || !(product.price > 0) || !product.productId) errors.push('productRef');
  if (plan && plan.render) {
    if (plan.render.width !== 1080 || plan.render.height !== 1920 || plan.render.fps !== 30) errors.push('render');
    if (plan.render.videoCodec !== 'h264' || plan.render.audioCodec !== 'aac') errors.push('codec');
  } else errors.push('render');
  return { ok: errors.length === 0, errors };
}

function buildPlan(product) {
  const images = catalogImages(product);
  if (!images.length) {
    throw Object.assign(new Error('El producto no tiene fotos autorizadas'), { statusCode: 400 });
  }
  const name = cleanText(product.productName, 72);
  const brand = cleanText(product.brandName, 32);
  const topic = spokenTopic(product);
  const price = Number(product.sellingPrice);
  const priceLabel = gs(price);
  const fact = firstFact(product);
  const hook = cleanText(`Si buscas ${topic}, mira esto`, 48);
  const motions = ['slow_zoom', 'pan_right', 'hold', 'slow_zoom'];
  const shots = [
    { purpose: 'hook', overlay: hook, duration: 5 },
    { purpose: 'product', overlay: cleanText(brand ? `${brand}. ${name}` : name, 48), duration: 5 },
    { purpose: 'detail', overlay: fact || cleanText(name, 48), duration: 5 },
    { purpose: 'close', overlay: cleanText(`${priceLabel} · Zenn Asunción`, 48), duration: 5 }
  ];
  const scenes = shots.map((shot, index) => ({
    sceneId: `scene-0${index + 1}`,
    startSeconds: index * shot.duration,
    durationSeconds: shot.duration,
    purpose: shot.purpose,
    assetRefs: [images[index % images.length]],
    overlayText: shot.overlay,
    motion: { type: motions[index], intensity: 'subtle' },
    transitionIn: 'cut',
    transitionOut: 'cut'
  }));
  const plan = {
    schemaVersion: 1,
    trialTag: 'zenn-reels-dev',
    objective: 'product_intro',
    platforms: ['instagram', 'facebook'],
    status: 'draft',
    productRefs: [{
      productId: String(product._id),
      codigo: product.codigo,
      verifiedAt: new Date().toISOString(),
      price,
      stock: Number(product.stock) || 0,
      currency: 'PYG'
    }],
    editorial: {
      concept: 'Presentación de un producto en stock con fotos del catálogo',
      hook,
      narrationText: '',
      caption: `${name}. ${priceLabel}. En Zenn, Asunción.`,
      hashtags: [],
      callToAction: 'Consultá stock en Zenn, Asunción'
    },
    render: {
      width: 1080,
      height: 1920,
      fps: 30,
      targetDurationSeconds: scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0),
      format: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac'
    },
    scenes,
    validation: {
      productDataVerified: true,
      assetRightsVerified: false,
      audioChecked: false,
      renderChecked: false,
      readyForReview: false
    }
  };
  const check = validatePlan(plan);
  if (!check.ok) {
    throw Object.assign(new Error('El plan de escenas no es válido'), { statusCode: 400, details: check.errors });
  }
  return plan;
}

module.exports = {
  buildPlan,
  validatePlan,
  catalogImages,
  ALLOWED_HOSTS
};
