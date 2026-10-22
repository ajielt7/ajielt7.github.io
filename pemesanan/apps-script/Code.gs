const ORDER_HEADERS = [
  'order_id', 'client_request_id', 'payment_code', 'created_at',
  'customer_name', 'customer_phone', 'customer_address',
  'destination_id', 'destination_label', 'items_json', 'subtotal',
  'courier_code', 'courier_name', 'courier_service', 'shipping_cost', 'total',
  'payment_status', 'order_status', 'proof_file_id', 'proof_uploaded_at',
  'approved_at', 'approved_by', 'admin_note'
];

function doPost(event) {
  const properties = PropertiesService.getScriptProperties();
  const expectedToken = properties.getProperty('WORKER_SHARED_TOKEN');
  if (!expectedToken) return output_({ ok: false, error: 'Token penghubung belum dikonfigurasi.' });

  let payload;
  try {
    payload = JSON.parse(event?.postData?.contents || '{}');
  } catch (_error) {
    return output_({ ok: false, error: 'Format data tidak valid.' });
  }
  if (!constantTimeEquals_(String(payload.token || ''), expectedToken)) {
    return output_({ ok: false, error: 'Permintaan tidak diizinkan.' });
  }
  if (payload.action === 'authorizeProof') return authorizeProof_(payload);
  if (payload.action === 'attachProof') return attachProof_(payload);
  if (payload.action !== 'createOrder' || !payload.order) {
    return output_({ ok: false, error: 'Aksi tidak dikenal.' });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getOrdersSheet_();
    const order = payload.order;
    const requestId = String(order.clientRequestId || '');
    if (!requestId || !order.orderId || !order.paymentCode || !Array.isArray(order.items)) {
      return output_({ ok: false, error: 'Data pesanan tidak lengkap.' });
    }

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const requestIds = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues();
      const existingIndex = requestIds.findIndex((row) => row[0] === requestId);
      if (existingIndex !== -1) {
        const existing = sheet.getRange(existingIndex + 2, 1, 1, ORDER_HEADERS.length).getValues()[0];
        return output_({ ok: true, order: publicOrder_(existing) });
      }
    }

    const safe = safeCell_;
    const shipping = order.shipping || {};
    const customer = order.customer || {};
    const destination = order.destination || {};
    const row = [
      safe(order.orderId), safe(requestId), safe(order.paymentCode), safe(order.createdAt),
      safe(customer.name), safe(customer.phone), safe(customer.address),
      safe(destination.id), safe(destination.label), safe(JSON.stringify(order.items)), Number(order.subtotal),
      safe(shipping.code), safe(shipping.name), safe(shipping.service), Number(shipping.cost), Number(order.total),
      'MENUNGGU_PEMBAYARAN', 'MENUNGGU_PEMBAYARAN', '', '', '', '', ''
    ];
    sheet.appendRow(row);
    return output_({ ok: true, order: {
      orderId: order.orderId,
      paymentCode: order.paymentCode,
      createdAt: order.createdAt,
      subtotal: Number(order.subtotal),
      shippingCost: Number(shipping.cost),
      total: Number(order.total),
      paymentStatus: 'MENUNGGU_PEMBAYARAN',
      orderStatus: 'MENUNGGU_PEMBAYARAN'
    } });
  } catch (error) {
    console.error('createOrder failed', error);
    return output_({ ok: false, error: 'Pesanan gagal ditulis ke Google Sheets.' });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function getOrdersSheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('Script Property SPREADSHEET_ID belum diatur.');
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  let sheet = spreadsheet.getSheetByName('Pesanan');
  if (!sheet) sheet = spreadsheet.insertSheet('Pesanan');
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, ORDER_HEADERS.length).setValues([ORDER_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function authorizeProof_(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const rowNumber = findOrderRow_(payload);
    if (!rowNumber) return output_({ ok: true, authorized: false, error: 'Pesanan tidak ditemukan.' });
    const sheet = getOrdersSheet_();
    const row = sheet.getRange(rowNumber, 1, 1, ORDER_HEADERS.length).getValues()[0];
    if (row[16] !== 'MENUNGGU_PEMBAYARAN') return output_({ ok: true, authorized: false, error: 'Status pesanan tidak mengizinkan unggah bukti.' });
    if (row[18]) return output_({ ok: true, authorized: false, error: 'Bukti pembayaran untuk pesanan ini sudah pernah diunggah.' });
    return output_({ ok: true, authorized: true });
  } catch (error) {
    console.error('authorizeProof failed', error);
    return output_({ ok: false, error: 'Pesanan tidak dapat diverifikasi.' });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function attachProof_(payload) {
  const fileKey = String(payload.fileKey || '');
  if (!/^payment-proofs\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(fileKey)) {
    return output_({ ok: false, error: 'Referensi file bukti tidak valid.' });
  }
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const rowNumber = findOrderRow_(payload);
    if (!rowNumber) return output_({ ok: false, error: 'Pesanan tidak ditemukan.' });
    const sheet = getOrdersSheet_();
    const row = sheet.getRange(rowNumber, 1, 1, ORDER_HEADERS.length).getValues()[0];
    if (row[16] !== 'MENUNGGU_PEMBAYARAN' || row[18]) {
      return output_({ ok: false, error: 'Pesanan sudah berubah atau bukti telah diunggah.' });
    }
    sheet.getRange(rowNumber, 19, 1, 2).setValues([[safeCell_(fileKey), safeCell_(payload.uploadedAt || new Date().toISOString())]]);
    return output_({ ok: true });
  } catch (error) {
    console.error('attachProof failed', error);
    return output_({ ok: false, error: 'Bukti gagal dicatat pada pesanan.' });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function findOrderRow_(payload) {
  const orderId = String(payload.orderId || '');
  const paymentCode = String(payload.paymentCode || '');
  const phone = String(payload.phone || '').replace(/\D/g, '');
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || !paymentCode || !phone) return 0;
  const sheet = getOrdersSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  const offset = ids.findIndex((row) => row[0] === orderId);
  if (offset < 0) return 0;
  const rowNumber = offset + 2;
  const row = sheet.getRange(rowNumber, 1, 1, ORDER_HEADERS.length).getDisplayValues()[0];
  const savedPhone = String(row[5] || '').replace(/\D/g, '');
  return row[2] === paymentCode && savedPhone === phone ? rowNumber : 0;
}

function safeCell_(value) {
  const text = String(value ?? '');
  return /^[=+@\-]/.test(text) ? `'${text}` : text;
}

function constantTimeEquals_(left, right) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function publicOrder_(row) {
  return {
    orderId: row[0],
    paymentCode: row[2],
    createdAt: row[3],
    subtotal: Number(row[10]),
    shippingCost: Number(row[14]),
    total: Number(row[15]),
    paymentStatus: row[16],
    orderStatus: row[17]
  };
}

function output_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
