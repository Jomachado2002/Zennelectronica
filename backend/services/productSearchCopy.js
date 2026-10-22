'use strict';

const { askClaudeText, askGeminiText, parseJson } = require('./communityAi');

function formatGuaranies(value) {
  const amount = Math.round(Number(value) || 0);
  if (!amount) return '';
  const formatted = new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(amount);
  return `Gs. ${formatted}`;
}

function priceDigits(priceLabel) {
  return String(priceLabel || '').replace(/\D/g, '');
}

function clip(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= 155) return text;
  return text.slice(0, 152).replace(/\s+\S*$/, '').trim();
}

async function writeProductSearchCopy(product) {
  const name = String(product?.productName || '').replace(/\s+/g, ' ').trim();
  const price = formatGuaranies(product?.sellingPrice);
  if (!name || !price) return '';

  const draft = await askGeminiText(
    `Escribí la meta descripción de Google para esta ficha de Zenn, tienda de Paraguay.
Una sola frase, máximo 150 caracteres, en español.
Nombre: ${name}
Precio que tiene que aparecer tal cual, sin redondear ni cambiar: ${price}
No inventes descuento, cuotas, envío gratis ni comparación con otra tienda.
Decí el producto, ese precio y que se compra en Paraguay.
Devolvé solo la frase.`,
    false
  );

  const review = await askClaudeText(
    `Revisá esta meta descripción para Google.
El precio obligatorio es exactamente "${price}". Si falta, si está cambiado, si hay un descuento inventado o si promete ser el más barato del país, devolvé {"ok":false}.
Si sirve, acortala a 150 caracteres como máximo y devolvé {"ok":true,"description":"..."}.
No agregues nada que no esté en el texto, salvo corregir puntuación.
Texto:
${String(draft || '').slice(0, 400)}`,
    { maxTokens: 300, timeout: 25000 }
  );

  const parsed = parseJson(review);
  const description = clip(parsed?.description);
  if (!parsed?.ok || !description) return '';
  if (!priceDigits(description).includes(priceDigits(price))) return '';
  return description;
}

module.exports = {
  formatGuaranies,
  writeProductSearchCopy
};
