import Order from "../models/Order.js";
import QRCode from 'qrcode';
import { formatNumber, escapeHtml } from "../helpers/format.js";

export const createQr = async(req, res) => {
  const id = req.params.id;
//   const order = ORDERS[id];
  const order = await Order.findById(id);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  const amount = req.query.amount ?? order.total;
  // Example QR payload, replace with real payment payload required by merchant
  const payload = `PAY|ORDER:${id}|AMOUNT:${amount}`;

  try {
    const dataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 300 });
    res.json({ ok: true, qr: dataUrl });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

export const printCustomer = async(req, res) => {
  const id = req.params.id;
    // const order = ORDERS[id];
    const order = await Order.findById(id).populate("items.menu");
    if (!order) return res.status(404).send('Order not found.');

    // Optionally generate an inline QR (for payment)
    const qrData = await QRCode.toDataURL(`PAY|ORDER:${id}|AMOUNT:${order.total}`, { margin:1, width:260 });

    const html = `
  <!doctype html>
  <html>
  <head>
  <meta charset="utf-8"/>
  <title>Receipt ${id}</title>
  <style>
    body { font-family: monospace; width:72mm; margin:0; padding:6px; font-size:12px; }
    .center{text-align:center}
    .bold{font-weight:700}
    .divider{border-top:1px dashed #000; margin:6px 0;}
    table{width:100%; border-collapse:collapse}
    td { padding:3px 0; vertical-align:top; }
    .right{text-align:right}
    .small{font-size:11px}
  </style>
  </head>
  <body>
    <div class="center bold">GOLDEN LOTUS RESTAURANT</div>
    <div class="center small">No.22, Mandalay</div>
    <div class="divider"></div>

    <div>Invoice: ${id.slice(0,8)}</div>
    <div>Date: ${new Date(order.createdAt).toLocaleString()}</div>
    <div class="divider"></div>

    <table>
      ${order.items.map(it => `
        <tr>
          <td>${it.qty} x ${escapeHtml(it.menu.name)}</td>
          <td class="right">${formatNumber(it.menu.price * it.qty)} MMK</td>
        </tr>
      `).join('')}
    </table>

    <div class="divider"></div>
    <table>
      <tr><td class="bold">Total</td><td class="right bold">${formatNumber(order.total)} MMK</td></tr>
    </table>

    <div class="divider"></div>
    <div class="center bold">SCAN TO PAY</div>
    <div class="center"><img src="${qrData}" style="width:240px; height:auto; display:block; margin:6px auto;" /></div>

    <div class="divider"></div>
    <div class="center small">🙏 Thank you! GOLDEN LOTUS RESTAURANT</div>

    <script>
      // Auto print then close
      window.print();
      setTimeout(()=> window.close(), 600);
    </script>
  </body>
  </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
};

/**
 * Printable HTML for Kitchen slip (no prices)
 * GET /print/kitchen/:id
 */
export const printKitchen = async (req, res) => {
    const id = req.params.id;
    // const order = ORDERS[id];
    const order = await Order.findById(id).populate('items.menu').populate('table');
    if (!order) return res.status(404).send('Order not found.');

    const html = `
  <!doctype html>
  <html>
  <head><meta charset="utf-8"/><title>Kitchen ${id}</title>
  <style>
    body { font-family: monospace; width:72mm; margin:0; padding:6px; font-size:14px;}
    .center{text-align:center}
    .big{font-size:16px; font-weight:700}
    .divider{border-top:1px dashed #000; margin:6px 0;}
    .notes{font-size:12px}
  </style>
  </head>
  <body>
    <div class="center big">KITCHEN ORDER</div>
    <div class="center">
      ${order.orderType === 'dine-in'
          ? `Table - ${order.table?.tableNumber ?? '-'}`
          : 'Take away'}
    </div>
    <div class="divider"></div>

    ${order.items.map(it => `
      <div style="font-weight:700; font-size:15px; margin-bottom:6px;">
        ${it.qty} x ${escapeHtml(it.menu.name)}
      </div>
    `).join('')}

    ${order.notes ? `<div class="notes">notes - ${escapeHtml(order.notes)}</div>` : ''}

    <div class="divider"></div>
    <div class="center">---</div>

    <script>
      window.print();
      setTimeout(()=> window.close(), 500);
    </script>
  </body>
  </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
};

/**
 * QR BILL (print-only or show)
 * GET /print/qr/:id
 */
export const printQr = async (req, res) => {
    const id = req.params.id;
    // const order = ORDERS[id];
    const order = await Order.findById(id);
    if (!order) return res.status(404).send('Order not found.');

    const qrData = await QRCode.toDataURL(`PAY|ORDER:${id}|AMOUNT:${order.total}`, { margin:1, width:300 });

    const html = `
  <!doctype html>
  <html>
  <head><meta charset="utf-8"/><title>QR Bill ${id}</title>
  <style>
    body{font-family:monospace; width:80mm; padding:6px; margin:0}
    .center{text-align:center}
    .divider{border-top:1px dashed #000; margin:6px 0;}
    img.qr{display:block; margin: 0 auto; width:260px;}
  </style>
  </head>
  <body>
    <div class="center"><b>QR BILL</b></div>
    <div class="center">Invoice: ${id.slice(0,8)}</div>
    <div class="center small">${new Date(order.createdAt).toLocaleString()}</div>
    <div class="divider"></div>

    <div>Total: <b>${formatNumber(order.total)} MMK</b></div>
    <div class="divider"></div>

    <div class="center">Scan to Pay</div>
    <img class="qr" src="${qrData}" />

    <div class="divider"></div>
    <div class="center">Thank you</div>

    <script>
      window.print();
      setTimeout(()=> window.close(), 700);
    </script>
  </body>
  </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
};
