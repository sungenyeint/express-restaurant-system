import Order from "../models/Order.js";
import Table from "../models/Table.js";
import { resolveRange, dateFormat } from "../helpers/format.js";

export const getAll = async (req, res) => {
  const orders = await Order.find()
    .populate("table")
    .populate("items.menu")
    .populate("paidBy")
    .sort({ createdAt: -1 });
  res.json(orders);
};

export const getActive = async (req, res) => {
  const orders = await Order.find({ status: { $ne: "paid" } })
    .populate("table")
    .populate("items.menu")
    .populate("paidBy")
    .sort({ createdAt: -1 });
  res.json(orders);
};

export const store = async (req, res) => {
  const order = await Order.create({
    ...req.body,
    notes: req.body?.notes || "",
  });

  // If dine-in and table present, mark table as occupied
  try {
    if (order?.orderType === "dine-in" && order?.table) {
      await Table.findByIdAndUpdate(order.table, { status: "occupied" });
    }
  } catch (e) {
    // ignore table update errors to not block order creation
  }

  // populate before emitting/returning so clients see full data
  const populated = await Order.findById(order._id)
    .populate("table")
    .populate("items.menu");

  // emit via socket.io if available
  if (global.io) global.io.emit("order-created", [populated, req.user.role]);
  res.json(populated);
};

export const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status, amountPaid } = req.body || {};

  if (!status) return res.status(400).json({ message: "status is required" });

  const updatePayload = { status };
  if (status === "paid") {
    // attach payment details if provided
    if (typeof amountPaid === "number") updatePayload.amountPaid = amountPaid;
    updatePayload.paidAt = new Date();
    if (req.user && req.user._id) updatePayload.paidBy = req.user._id;
  }

  const updated = await Order.findByIdAndUpdate(id, updatePayload, {
    new: true,
  })
    .populate("table")
    .populate("items.menu")
    .populate("paidBy");

  if (!updated) return res.status(404).json({ message: "Order not found" });

  // Free the table when an order is paid
  try {
    if (
      status === "paid" &&
      updated?.orderType === "dine-in" &&
      updated?.table?._id
    ) {
      await Table.findByIdAndUpdate(updated.table._id, { status: "available" });
    }
  } catch (e) {
    // do not block response on table updates
  }

  if (global.io)
    global.io.emit("order-status-changed", [updated, req.user.role]);
  res.json(updated);
};

// add this new method
export const updateOrder = async (req, res) => {
  const { id } = req.params;
  const { items, orderType, table, total, notes } = req.body || {};

  const prev = await Order.findById(id);
  if (!prev) return res.status(404).json({ message: "Order not found" });

  const updated = await Order.findByIdAndUpdate(
    id,
    {
      ...(Array.isArray(items) ? { items } : {}),
      ...(orderType ? { orderType } : {}),
      ...(typeof total === "number" ? { total } : {}),
      ...(table !== undefined ? { table } : {}),
      ...(typeof notes === "string" ? { notes } : {}),
    },
    { new: true }
  )
    .populate("table")
    .populate("items.menu");

  // Table transitions
  try {
    const prevWasDineIn = prev?.orderType === "dine-in";
    const prevTableId = prev?.table?._id || prev?.table;

    const nextIsDineIn = updated?.orderType === "dine-in";
    const nextTableId = updated?.table?._id || updated?.table;

    // Free previous table if it was dine-in and:
    // - the table changed, or
    // - order switched away from dine-in
    if (
      prevWasDineIn &&
      prevTableId &&
      (!nextIsDineIn || String(prevTableId) !== String(nextTableId || ""))
    ) {
      await Table.findByIdAndUpdate(prevTableId, { status: "available" });
    }

    // Occupy new table if dine-in with a table
    if (nextIsDineIn && nextTableId) {
      await Table.findByIdAndUpdate(nextTableId, { status: "occupied" });
    }
  } catch (e) {
    // do not block response on table updates
  }

  if (global.io) global.io.emit("order-updated", [updated, req.user.role]);
  res.json(updated);
};

export const getAnalytics = async (req, res) => {
  const { start, end, groupBy } = resolveRange(req.query);
  const format = dateFormat(groupBy);

  const agg = await Order.aggregate([
    { $match: { status: "paid", paidAt: { $gte: start, $lte: end } } },
    {
      $project: {
        revenue: { $ifNull: ["$amountPaid", "$total"] },
        paidAt: 1,
      },
    },
    {
      $group: {
        _id: { $dateToString: { format, date: "$paidAt" } },
        revenue: { $sum: "$revenue" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const map = new Map(agg.map((r) => [r._id, r]));

  const buckets = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    let label;
    if (groupBy === "day") {
      label = cursor.toISOString().slice(0, 10);
      cursor.setDate(cursor.getDate() + 1);
    } else if (groupBy === "month") {
      label = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      cursor.setMonth(cursor.getMonth() + 1);
    } else {
      label = String(cursor.getFullYear());
      cursor.setFullYear(cursor.getFullYear() + 1);
    }

    const row = map.get(label) || { revenue: 0, count: 0 };
    buckets.push({ label, revenue: row.revenue, count: row.count });
  }

  res.json({
    totalOrders: buckets.reduce((s, b) => s + b.count, 0),
    totalRevenue: buckets.reduce((s, b) => s + b.revenue, 0),
    buckets,
  });
};

export const getBestSellers = async (req, res) => {
  const data = await Order.aggregate([
    { $match: { status: "paid" } },
    { $unwind: "$items" },
    { $group: { _id: "$items.menu", qtySold: { $sum: "$items.qty" } } },
    {
      $lookup: {
        from: "menuitems",
        localField: "_id",
        foreignField: "_id",
        as: "menu",
      },
    },
    { $unwind: { path: "$menu", preserveNullAndEmptyArrays: true } },
    { $project: { menuId: "$_id", name: "$menu.name", qtySold: 1 } },
    { $sort: { qtySold: -1 } },
    { $limit: 10 },
  ]);

  res.json(data);
};
