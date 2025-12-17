import Category from "../models/Category.js";

export const getAll = async (req, res) => {
  const items = await Category.find().sort({ createdAt: -1 });
  res.json(items);
};

export const store = async (req, res) => {
  const item = await Category.create(req.body);
  res.json(item);
};

export const update = async (req, res) => {
  const item = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(item);
};

export const destroy = async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};
