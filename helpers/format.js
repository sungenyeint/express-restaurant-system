/* ---------- helpers ---------- */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
export function formatNumber(n) {
  return Number(n).toLocaleString('en-MM'); // MMK formatting
}
