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
  if (payload.action === 'uploadProof') return uploadProof_(payload);
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

function uploadProof_(payload) {
  const orderId = String(payload.orderId || '');
  const paymentCode = String(payload.paymentCode || '');
  const phone = String(payload.phone || '').replace(/\D/g, '');
  const mimeType = String(payload.mimeType || '');
  const extension = String(payload.extension || '');
  const encoded = String(payload.imageBase64 || '');
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || !/^PNA-\d{8}-[A-F0-9]{8}$/.test(paymentCode) || !phone || extensions[mimeType] !== extension || !encoded || encoded.length > 7 * 1024 * 1024) {
    return output_({ ok: false, error: 'Data bukti pembayaran tidak valid.' });
  }
  let bytes;
  try {
    bytes = Utilities.base64Decode(encoded);
  } catch (_error) {
    return output_({ ok: false, error: 'Data gambar tidak valid.' });
  }
  if (!bytes.length || bytes.length > 5 * 1024 * 1024 || !validImageBytes_(bytes, mimeType)) {
    return output_({ ok: false, error: 'Gambar harus JPG, PNG, atau WebP yang valid dan maksimal 5 MB.' });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const rowNumber = findOrderRow_({ orderId, paymentCode, phone });
    if (!rowNumber) return output_({ ok: false, error: 'Pesanan tidak ditemukan. Periksa kode pembayaran dan nomor WhatsApp.' });
    const sheet = getOrdersSheet_();
    const row = sheet.getRange(rowNumber, 1, 1, ORDER_HEADERS.length).getValues()[0];
    if (row[16] !== 'MENUNGGU_PEMBAYARAN') return output_({ ok: false, error: 'Status pesanan tidak mengizinkan unggah bukti.' });
    if (row[18]) return output_({ ok: false, error: 'Bukti pembayaran untuk pesanan ini sudah pernah diunggah.' });

    const folder = getProofFolder_();
    const uploadedAt = new Date();
    const blob = Utilities.newBlob(bytes, mimeType, `${paymentCode}-${orderId}.${extension}`);
    let file;
    try {
      file = folder.createFile(blob);
      sheet.getRange(rowNumber, 19, 1, 2).setValues([[safeCell_(file.getId()), uploadedAt]]);
      return output_({ ok: true });
    } catch (error) {
      if (file) file.setTrashed(true);
      throw error;
    }
  } catch (error) {
    console.error('uploadProof failed', error);
    return output_({ ok: false, error: 'Bukti gagal disimpan ke Google Drive.' });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function getProofFolder_() {
  const properties = PropertiesService.getScriptProperties();
  const folderId = properties.getProperty('PROOF_FOLDER_ID');
  if (folderId) return DriveApp.getFolderById(folderId);
  const folder = DriveApp.createFolder('Bukti Pembayaran');
  properties.setProperty('PROOF_FOLDER_ID', folder.getId());
  return folder;
}

function setupProofFolder() {
  const folder = getProofFolder_();
  Logger.log(`Folder bukti siap: ${folder.getUrl()}`);
}

function validImageBytes_(bytes, mimeType) {
  if (mimeType === 'image/png') return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => (bytes[index] & 255) === value);
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && (bytes[0] & 255) === 255 && (bytes[1] & 255) === 216 && (bytes[2] & 255) === 255;
  if (mimeType === 'image/webp') return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4).map((value) => value & 255)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12).map((value) => value & 255)) === 'WEBP';
  return false;
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

