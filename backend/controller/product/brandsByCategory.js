const productModel = require("../../models/productModel");

let cache = { at: 0, data: null };
const TTL_MS = 5 * 60 * 1000;

function uniqueBrandNames(names) {
  const groups = new Map();
  names.forEach((raw) => {
    const name = String(raw || "").trim();
    const key = name.toLowerCase();
    if (!key) return;
    const list = groups.get(key) || [];
    list.push(name);
    groups.set(key, list);
  });

  return [...groups.values()]
    .map((variants) => {
      const mixed = variants.find((name) => name !== name.toUpperCase() && name !== name.toLowerCase());
      return mixed || variants[0];
    })
    .sort((a, b) => a.localeCompare(b, "es"));
}

const brandsByCategoryController = async (req, res) => {
  try {
    if (cache.data && Date.now() - cache.at < TTL_MS) {
      return res.json({ success: true, data: cache.data, error: false });
    }

    const rows = await productModel.aggregate([
      {
        $match: {
          category: { $type: "string", $ne: "" },
          brandName: { $type: "string", $ne: "" },
          $or: [
            { stock: { $exists: false } },
            { stock: null },
            { stock: { $gt: 0 } }
          ]
        }
      },
      { $group: { _id: { category: "$category", brand: "$brandName" } } },
      { $group: { _id: "$_id.category", brands: { $addToSet: "$_id.brand" } } }
    ]);

    const data = {};
    rows.forEach((row) => {
      data[row._id] = uniqueBrandNames(row.brands || []);
    });

    cache = { at: Date.now(), data };
    res.set('Cache-Control', 'private, max-age=300');
    return res.json({ success: true, data, error: false });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: err.message || "No se pudieron cargar las marcas"
    });
  }
};

module.exports = brandsByCategoryController;
