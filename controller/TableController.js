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

export const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!status) return res.status(400).json({ message: "status is required" });
  const item = await Table.findByIdAndUpdate(id, { status }, { new: true });
  res.json(item);
};
