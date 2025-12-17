/* ---------- helpers ---------- */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

export function formatNumber(n) {
  return Number(n).toLocaleString('en-MM'); // MMK formatting
}

export function dateFormat(groupBy) {
  if (groupBy === "day") return "%Y-%m-%d";
  if (groupBy === "year") return "%Y";
  return "%Y-%m";
}

export function resolveRange(query) {
  const now = new Date();

  if (query.start && query.end) {
    return {
      start: new Date(query.start),
      end: endOfDay(query.end),
      groupBy: "day",
    };
  }

  if (query.month) {
    const [y, m] = query.month.split("-").map(Number);
    return {
      start: new Date(y, m - 1, 1),
      end: endOfDay(new Date(y, m, 0)),
      groupBy: "day",
    };
  }

  if (query.year) {
    const y = Number(query.year);
    return {
      start: new Date(y, 0, 1),
      end: new Date(y, 11, 31, 23, 59, 59, 999),
      groupBy: "month",
    };
  }

  // fallback = last 30 days
  const start = new Date(now);
  start.setDate(now.getDate() - 29);

  return { start, end: endOfDay(now), groupBy: "day" };
}
