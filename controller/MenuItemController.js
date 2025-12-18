import MenuItem from "../models/MenuItem.js";
import { deleteCloudinaryImage } from '../utils/cloudinary.js';

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

  if (req.file) {
    payload.image = req.file.path; // Cloudinary URL
  }
  const item = await MenuItem.create(payload);
  res.json(item);
};

export const update = async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });

  // Delete old image if new uploaded
  if (req.file && item.image) {
    await deleteCloudinaryImage(item.image);
  }

  const payload = {
    name: req.body.name,
    category: req.body.category,
    price: req.body.price,
    isAvailable: req.body.isAvailable,
  };

  if (req.file) {
    payload.image = req.file.path; // Cloudinary URL
  }

  const updated = await MenuItem.findByIdAndUpdate(
    req.params.id,
    payload,
    { new: true }
  );

  res.json(updated);
};

export const destroy = async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });

  // Delete image from Cloudinary
  if (item.image) {
    await deleteCloudinaryImage(item.image);
  }

  await MenuItem.findByIdAndDelete(req.params.id);

  res.json({ success: true });
};
