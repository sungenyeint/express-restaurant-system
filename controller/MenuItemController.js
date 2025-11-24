import MenuItem from "../models/MenuItem.js";

export const getAll = async (req, res) => {
  const items = await MenuItem.find().sort({ createdAt: -1 });
  res.json(items);
};

export const store = async (req, res) => {
  const payload = {
    name: req.body.name,
    category: req.body.category,
    price: req.body.price,
    isAvailable: req.body.isAvailable,
  };
  const base = `${req.protocol}://${req.get('host')}`
  if (req.file) {
    payload.image = `${base}/uploads/menus/${req.file.filename}`;
  }
  console.log(payload);
  const item = await MenuItem.create(payload);
  res.json(item);
};

export const update = async (req, res) => {
  const payload = {
    name: req.body.name,
    category: req.body.category,
    price: req.body.price,
    isAvailable: req.body.isAvailable,
  };
  if (req.file) {
    payload.image = `/uploads/menus/${req.file.filename}`;
  }
  const item = await MenuItem.findByIdAndUpdate(req.params.id, payload, {
    new: true,
  });
  res.json(item);
};

export const destroy = async (req, res) => {
  await MenuItem.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};