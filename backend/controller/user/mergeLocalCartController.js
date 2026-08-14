const mongoose = require('mongoose');
const addToCartModel = require('../../models/cartProduct');

function extractProductId(raw) {
  if (!raw) return null;
  if (raw.productId && typeof raw.productId === 'object' && raw.productId._id) {
    return String(raw.productId._id);
  }
  if (raw.productId) return String(raw.productId);
  if (raw._id && mongoose.Types.ObjectId.isValid(raw._id) && !String(raw._id).startsWith('local-')) {
    return String(raw._id);
  }
  return null;
}

async function mergeLocalCartController(req, res) {
  try {
    if (!req.isAuthenticated || !req.userId || String(req.userId).startsWith('guest-')) {
      return res.status(401).json({
        success: false,
        error: true,
        message: 'Iniciá sesión para unir el carrito',
      });
    }

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const userId = String(req.userId);
    const sessionId = `user-${userId}`;
    let merged = 0;

    for (const raw of items) {
      const productId = extractProductId(raw);
      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) continue;
      const quantity = Math.max(1, Math.min(100, Number(raw.quantity) || 1));
      const existing = await addToCartModel.findOne({ productId, userId });
      if (existing) {
        existing.quantity = Math.min(100, existing.quantity + quantity);
        existing.isGuest = false;
        existing.sessionId = sessionId;
        await existing.save();
      } else {
        await addToCartModel.create({
          productId,
          quantity,
          userId,
          sessionId,
          isGuest: false,
        });
      }
      merged += 1;
    }

    return res.json({ success: true, error: false, merged });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: err.message || 'No se pudo unir el carrito',
    });
  }
}

module.exports = mergeLocalCartController;
