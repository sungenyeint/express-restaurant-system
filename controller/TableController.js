import Table from "../models/Table.js";

export const getAll = async (req, res) => {
  const items = await Table.find().sort({ createdAt: -1 });
  res.json(items);
};

export const store = async (req, res) => {
  const item = await Table.create(req.body);
  res.json(item);
};

export const update = async (req, res) => {
  const item = await Table.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(item);
};

export const destroy = async (req, res) => {
  await Table.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};