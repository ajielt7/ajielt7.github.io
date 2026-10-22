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
