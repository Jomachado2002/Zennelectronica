'use strict';

const CaptionVoice = require('../models/captionVoiceModel');
const Category = require('../models/categoryModel');
const { FAMILY_EMOJI } = require('./captionComposer');

const HOOKS = [
  { key: 'gamer', label: 'Setup gamer', lines: ['Nuevo ingreso para armar el setup 🎮', 'Llegó equipo para jugar en serio 🎮', 'Para el que arma la PC este finde 🎮'] },
  { key: 'office', label: 'Oficina y estudio', lines: ['Nuevo ingreso para estudiar y trabajar 💻', 'Equipo listo para la oficina y la facultad 💻', 'Llegó lo que se usa todos los días 💻'] },
  { key: 'phone', label: 'Celulares', lines: ['Nuevo ingreso en celulares 📱', 'Llegaron equipos para cambiar el teléfono 📱', 'Para el que estaba esperando este modelo 📱'] },
  { key: 'mix', label: 'Mix de tienda', lines: ['Nuevo ingreso en Zenn ✨', 'Acaba de entrar a la tienda ✨', 'Lo que llegó hoy al depósito ✨'] },
  { key: 'single', label: 'Un producto', lines: ['Nuevo ingreso ✨', 'Ya está en la tienda ✨', 'Entró hoy al depósito ✨'] }
];

const FAMILIES = {
  notebook: { label: 'Notebooks', emoji: '💻', hashtags: ['#notebook'] },
  monitor: { label: 'Monitores', emoji: '🖥️', hashtags: ['#monitor'] },
  celular: { label: 'Celulares', emoji: '📱', hashtags: ['#celular'] },
  tablet: { label: 'Tablets', emoji: '📱', hashtags: ['#tablet'] },
  auricular: { label: 'Auriculares', emoji: '🎧', hashtags: ['#auriculares'] },
  teclado: { label: 'Teclados', emoji: '⌨️', hashtags: ['#teclado'] },
  mouse: { label: 'Mouse', emoji: '🖱️', hashtags: ['#mouse'] },
  gabinete: { label: 'Gabinetes', emoji: '🖥️', hashtags: ['#gabinete'] },
  gamer: { label: 'Gamer', emoji: '🎮', hashtags: ['#notebookgamer', '#gamer'] }
};

function tag(raw) {
  const t = String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return t.length >= 2 ? `#${t}` : '';
}

async function seedCaptionVoices() {
  const ops = [];
  for (const hook of HOOKS) {
    ops.push({
      updateOne: {
        filter: { kind: 'hook', key: hook.key },
        update: { $setOnInsert: { kind: 'hook', key: hook.key, label: hook.label, lines: hook.lines, active: true } },
        upsert: true
      }
    });
  }
  ops.push({
    updateOne: {
      filter: { kind: 'closer', key: 'zenn' },
      update: {
        $setOnInsert: {
          kind: 'closer',
          key: 'zenn',
          label: 'Cierre de tienda',
          lines: [
            'Pedilo en www.zenn.com.py',
            'Entrega en Asunción en 24 horas',
            'Lunes a viernes, 08:00 a 17:00',
            'WhatsApp 0973 345 284'
          ],
          hashtags: ['#zenn', '#asuncion'],
          active: true
        }
      },
      upsert: true
    }
  });

  const categories = await Category.find({}, 'label value subcategories').lean();
  for (const cat of categories) {
    for (const sub of cat.subcategories || []) {
      if (!sub || !sub.value || sub.isActive === false) continue;
      const label = String(sub.label || sub.name || '').trim();
      const familyKey = Object.keys(FAMILIES).find((key) => label.toLowerCase().includes(key) || String(sub.value).includes(key));
      const family = FAMILIES[familyKey] || { emoji: '✨', hashtags: [] };
      const hashtags = [tag(label), ...(family.hashtags || [])].filter(Boolean);
      ops.push({
        updateOne: {
          filter: { kind: 'subcategory', key: sub.value },
          update: {
            $setOnInsert: {
              kind: 'subcategory',
              key: sub.value,
              label: label || sub.value,
              emoji: family.emoji || FAMILY_EMOJI.general,
              lines: [`Nuevo ingreso en ${label || 'Zenn'}`],
              hashtags: [...new Set(hashtags)].slice(0, 4),
              active: true
            }
          },
          upsert: true
        }
      });
    }
  }

  if (!ops.length) return { upserts: 0 };
  const result = await CaptionVoice.bulkWrite(ops, { ordered: false });
  return { upserts: result.upsertedCount || 0, matched: result.matchedCount || 0 };
}

module.exports = { seedCaptionVoices };
