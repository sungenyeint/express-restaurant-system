import Order from "../models/Order.js";
import Table from "../models/Table.js";

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
  if (global.io) global.io.emit("order-created", populated);
  res.json(populated);
};

export const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status, amountPaid } = req.body || {};

  if (!status) return res.status(400).json({ message: "status is required" });

  const updatePayload = { status };
  if (status === 'paid') {
    // attach payment details if provided
    if (typeof amountPaid === 'number') updatePayload.amountPaid = amountPaid;
    updatePayload.paidAt = new Date();
    if (req.user && req.user._id) updatePayload.paidBy = req.user._id;
  }

  const updated = await Order.findByIdAndUpdate(id, updatePayload, { new: true })
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

  if (global.io) global.io.emit("order-status-changed", updated);
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

  if (global.io) global.io.emit("order-updated", updated);
  res.json(updated);
};

export const getAnalytics = async (req, res) => {
  // Support direct date range, month selection or year selection.
  // Query params:
  // - start=YYYY-MM-DD & end=YYYY-MM-DD => group by day (default)
  // - month=YYYY-MM => group by day for that month
  // - year=YYYY => group by month for that year
  // - fallback: timeframe=day|month|year behavior as before

  const now = new Date();
  let startDate = null;
  let endDate = null;
  let groupBy = 'month';

  if (req.query.start && req.query.end) {
    // explicit date range
    startDate = new Date(req.query.start.toString());
    endDate = new Date(req.query.end.toString());
    // include the end day fully
    endDate.setHours(23, 59, 59, 999);
    groupBy = 'day';
  } else if (req.query.month) {
    // single month selected
    const [y, m] = req.query.month.toString().split('-').map(Number);
    startDate = new Date(y, (m || 1) - 1, 1);
    endDate = new Date(y, (m || 1), 0);
    endDate.setHours(23,59,59,999);
    groupBy = 'day';
  } else if (req.query.year) {
    const y = Number(req.query.year);
    startDate = new Date(y, 0, 1);
    endDate = new Date(y, 11, 31, 23, 59, 59, 999);
    groupBy = 'month';
  } else {
    // fallback to timeframe param
    const timeframe = (req.query.timeframe || 'month').toString();
    if (timeframe === 'day') {
      groupBy = 'day';
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 29); // last 30 days
      endDate = new Date(now);
    } else if (timeframe === 'month') {
      groupBy = 'month';
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 11);
      startDate.setDate(1);
      endDate = new Date(now);
    } else {
      groupBy = 'year';
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 4);
      startDate.setMonth(0,1);
      endDate = new Date(now);
    }
    // normalize endDate to end of day
    endDate.setHours(23,59,59,999);
  }

  if (!startDate || !endDate) return res.status(400).json({ message: 'invalid date range' });

  // choose date format for grouping
  let dateFormat = '%Y-%m';
  if (groupBy === 'day') dateFormat = '%Y-%m-%d';
  else if (groupBy === 'year') dateFormat = '%Y';

  // Aggregate revenue per bucket using paidAt and amountPaid (fallback to total)
  const agg = await Order.aggregate([
    { $match: { status: 'paid', paidAt: { $gte: startDate, $lte: endDate } } },
    {
      $addFields: {
        revenue: {
          $cond: [{ $ifNull: ['$amountPaid', false] }, '$amountPaid', '$total'],
        },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$paidAt' } },
        revenue: { $sum: '$revenue' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const bucketsMap = new Map();
  for (const row of agg) bucketsMap.set(row._id, { revenue: row.revenue || 0, count: row.count || 0 });

  // Build continuous buckets from startDate..endDate according to groupBy
  const buckets = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    let label = '';
    if (groupBy === 'day') {
      label = cursor.toISOString().slice(0, 10);
      cursor.setDate(cursor.getDate() + 1);
    } else if (groupBy === 'month') {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      label = `${y}-${m}`;
      cursor.setMonth(cursor.getMonth() + 1);
    } else {
      label = String(cursor.getFullYear());
      cursor.setFullYear(cursor.getFullYear() + 1);
    }
    const val = bucketsMap.get(label) || { revenue: 0, count: 0 };
    buckets.push({ label, revenue: val.revenue, count: val.count });
  }

  const totalOrders = buckets.reduce((s, b) => s + (b.count || 0), 0);
  const totalRevenue = buckets.reduce((s, b) => s + (b.revenue || 0), 0);

  // Comparison for month/year selections: compare selected month/year with previous
  let compare = null;
  if (req.query.month) {
    const [y, m] = req.query.month.toString().split('-').map(Number);
    const mm = String(m).padStart(2, '0');
    const curPrefix = `${y}-${mm}`; // buckets are day labels YYYY-MM-DD
    const prevDate = new Date(y, m - 2, 1); // previous month (m-2 because Date month is 0-based)
    const prevPrefix = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    let currentMonthRevenue = 0;
    let prevMonthRevenue = 0;
    for (const [key, val] of bucketsMap.entries()) {
      if (key.startsWith(curPrefix)) currentMonthRevenue += (val.revenue || 0);
      if (key.startsWith(prevPrefix)) prevMonthRevenue += (val.revenue || 0);
    }
    compare = { currentMonthRevenue, prevMonthRevenue };
  } else if (req.query.year) {
    const y = Number(req.query.year);
    const curPrefix = `${y}-`; // buckets are month labels YYYY-MM
    const prevPrefix = `${y - 1}-`;

    let currentMonthRevenue = 0;
    let prevMonthRevenue = 0;
    for (const [key, val] of bucketsMap.entries()) {
      if (key.startsWith(curPrefix)) currentMonthRevenue += (val.revenue || 0);
      if (key.startsWith(prevPrefix)) prevMonthRevenue += (val.revenue || 0);
    }
    compare = { currentMonthRevenue, prevMonthRevenue };
  }

  res.json({ totalOrders, totalRevenue, buckets, compare });
};

export const getBestSellers = async (req, res) => {
  // Aggregate items across paid orders and return top sellers
  const agg = await Order.aggregate([
    { $match: { status: 'paid' } },
    { $unwind: '$items' },
    { $group: { _id: '$items.menu', qtySold: { $sum: '$items.qty' } } },
    {
      $lookup: {
        from: 'menuitems',
        localField: '_id',
        foreignField: '_id',
        as: 'menu'
      }
    },
    { $unwind: { path: '$menu', preserveNullAndEmptyArrays: true } },
    { $project: { menuId: '$_id', name: '$menu.name', qtySold: 1 } },
    { $sort: { qtySold: -1 } },
    { $limit: 10 }
  ]);

  res.json(agg);
};
