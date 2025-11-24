import User from "../models/User.js";
import bcrypt from "bcryptjs";

export const list = async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).select("-password");
  res.json(users);
};

export const create = async (req, res) => {
  const { name, email, password, role } = req.body;
  const exist = await User.findOne({ email });
  if (exist) return res.status(400).json({ message: "User exists" });
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const user = await User.create({ name, email, password: hash, role });
  res.json({ ...user.toObject(), password: undefined });
};

export const update = async (req, res) => {
  const { name, email, password, role } = req.body;
  const update = { name, email, role };
  if (password) {
    const salt = await bcrypt.genSalt(10);
    update.password = await bcrypt.hash(password, salt);
  }
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select("-password");
  res.json(user);
};

export const destroy = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};