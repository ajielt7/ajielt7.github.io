const ORDER_HEADERS = [
  'order_id', 'client_request_id', 'payment_code', 'created_at',
  'customer_name', 'customer_phone', 'customer_address',
  'destination_id', 'destination_label', 'items_json', 'subtotal',
  'courier_code', 'courier_name', 'courier_service', 'shipping_cost', 'total',
  'payment_status', 'order_status', 'proof_file_id', 'proof_uploaded_at',
  'approved_at', 'approved_by', 'admin_note', 'completed_at'
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
  if (payload.action === 'listOrders') return listOrders_(false);
  if (payload.action === 'listPendingOrders') return listOrders_(true);
  if (payload.action === 'approveOrder') return approveOrder_(payload);
  if (payload.action === 'completeOrder') return completeOrder_(payload);
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
      safe(customer.name), safePhoneCell_(customer.phone), safe(customer.address),
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

function listOrders_(pendingOnly) {
  try {
    const sheet = getOrdersSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return output_({ ok: true, orders: [] });
    const range = sheet.getRange(2, 1, lastRow - 1, ORDER_HEADERS.length);
    const displayRows = range.getDisplayValues();
    const values = range.getValues();
    const rows = displayRows.map((row, index) => ({ row, completedAt: values[index][23] }));
    const orders = rows.reverse()
      .filter(({ row }) => pendingOnly
        ? row[18] && ['MENUNGGU_PEMBAYARAN', 'MENUNGGU_VERIFIKASI'].includes(row[16])
        : ['MENUNGGU_PEMBAYARAN', 'MENUNGGU_VERIFIKASI', 'DIPROSES', 'SELESAI'].includes(row[17]))
      .slice(0, 500)
      .map(({ row, completedAt }) => ({
        orderId: row[0], paymentCode: row[2], createdAt: row[3],
        customerName: row[4], customerPhone: row[5], customerAddress: row[6],
        destination: row[8], items: parseItems_(row[9]), subtotal: Number(row[10]) || 0,
        courierName: row[12], courierService: row[13], shippingCost: Number(row[14]) || 0,
        total: Number(row[15]) || 0, paymentStatus: row[16], orderStatus: row[17],
        proofFileId: row[18], proofUploadedAt: row[19],
        approvedAt: row[20], adminNote: row[22],
        completedAt: completedAt instanceof Date ? completedAt.toISOString() : String(completedAt || '')
      }));
    return output_({ ok: true, orders });
  } catch (error) {
    console.error('listPendingOrders failed', error);
    return output_({ ok: false, error: 'Daftar pesanan gagal dibaca dari Google Sheets.' });
  }
}

function completeOrder_(payload) {
  const orderId = String(payload.orderId || '');
  const paymentCode = String(payload.paymentCode || '');
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || !/^PNA-\d{8}-[A-F0-9]{8}$/.test(paymentCode)) {
    return output_({ ok: false, error: 'Data pesanan selesai tidak valid.' });
  }
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getOrdersSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return output_({ ok: false, error: 'Pesanan tidak ditemukan.' });
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
    const offset = ids.findIndex((row) => row[0] === orderId);
    if (offset < 0) return output_({ ok: false, error: 'Pesanan tidak ditemukan.' });
    const rowNumber = offset + 2;
    const row = sheet.getRange(rowNumber, 1, 1, ORDER_HEADERS.length).getDisplayValues()[0];
    if (row[2] !== paymentCode) return output_({ ok: false, error: 'Kode pembayaran tidak cocok.' });
    if (row[17] !== 'DIPROSES') return output_({ ok: false, error: 'Hanya pesanan yang sedang diproses dapat diselesaikan.' });

    const completedAt = new Date();
    sheet.getRange(rowNumber, 18).setValue('SELESAI');
    sheet.getRange(rowNumber, 24).setValue(completedAt);
    return output_({ ok: true, order: { orderId, paymentCode, orderStatus: 'SELESAI', completedAt } });
  } catch (error) {
    console.error('completeOrder failed', error);
    return output_({ ok: false, error: 'Pesanan gagal diperbarui di Google Sheets.' });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function cleanupCompletedOrders() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getOrdersSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;
    const rows = sheet.getRange(2, 1, lastRow - 1, ORDER_HEADERS.length).getValues();
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      const row = rows[index];
      const completedAt = row[23] instanceof Date ? row[23].getTime() : Date.parse(row[23]);
      if (row[17] !== 'SELESAI' || !Number.isFinite(completedAt) || completedAt > cutoff) continue;
      const proofFileId = String(row[18] || '');
      try {
        if (proofFileId) permanentlyDeleteDriveFile_(proofFileId);
        sheet.deleteRow(index + 2);
      } catch (error) {
        console.error(`Cleanup failed for order ${row[0]}`, error);
      }
    }
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function permanentlyDeleteDriveFile_(fileId) {
  const response = UrlFetchApp.fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    { method: 'delete', headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` }, muteHttpExceptions: true }
  );
  const status = response.getResponseCode();
  if (status !== 200 && status !== 204 && status !== 404) {
    throw new Error(`Drive delete failed with HTTP ${status}`);
  }
}

function setupOrderCleanupTrigger() {
  const exists = ScriptApp.getProjectTriggers().some(
    (trigger) => trigger.getHandlerFunction() === 'cleanupCompletedOrders'
  );
  if (!exists) {
    ScriptApp.newTrigger('cleanupCompletedOrders').timeBased().everyHours(1).create();
  }
  Logger.log('Retensi order selesai aktif: penghapusan otomatis setiap jam setelah 7 hari.');
}

function approveOrder_(payload) {
  const orderId = String(payload.orderId || '');
  const paymentCode = String(payload.paymentCode || '');
  const adminNote = String(payload.adminNote || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || !/^PNA-\d{8}-[A-F0-9]{8}$/.test(paymentCode) || adminNote.length > 500) {
    return output_({ ok: false, error: 'Data persetujuan tidak valid.' });
  }
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getOrdersSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return output_({ ok: false, error: 'Pesanan tidak ditemukan.' });
    const orderIds = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
    const offset = orderIds.findIndex((row) => row[0] === orderId);
    if (offset < 0) return output_({ ok: false, error: 'Pesanan tidak ditemukan.' });
    const rowNumber = offset + 2;
    const row = sheet.getRange(rowNumber, 1, 1, ORDER_HEADERS.length).getDisplayValues()[0];
    if (row[2] !== paymentCode) return output_({ ok: false, error: 'Kode pembayaran tidak cocok.' });
    if (!row[18]) return output_({ ok: false, error: 'Pesanan belum memiliki bukti pembayaran.' });
    if (!['MENUNGGU_PEMBAYARAN', 'MENUNGGU_VERIFIKASI'].includes(row[16])) {
      return output_({ ok: false, error: 'Status pembayaran sudah berubah.' });
    }

    const approvedAt = new Date();
    sheet.getRange(rowNumber, 17, 1, 2).setValues([['TERVERIFIKASI', 'DIPROSES']]);
    sheet.getRange(rowNumber, 21, 1, 3).setValues([[approvedAt, 'Admin Android', safeCell_(adminNote)]]);
    return output_({ ok: true, order: { orderId, paymentCode, paymentStatus: 'TERVERIFIKASI', orderStatus: 'DIPROSES' } });
  } catch (error) {
    console.error('approveOrder failed', error);
    return output_({ ok: false, error: 'Pesanan gagal diperbarui di Google Sheets.' });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function parseItems_(value) {
  try {
    const items = JSON.parse(String(value || '[]'));
    return Array.isArray(items) ? items : [];
  } catch (_error) {
    return [];
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
  } else if (sheet.getRange(1, ORDER_HEADERS.length).isBlank()) {
    sheet.getRange(1, ORDER_HEADERS.length).setValue('completed_at');
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
  let failureStage = 'mengunci proses unggah';
  try {
    lock.waitLock(10000);
    failureStage = 'mencari pesanan';
    const rowNumber = findOrderRow_({ orderId, paymentCode, phone });
    if (!rowNumber) return output_({ ok: false, error: 'Pesanan tidak ditemukan. Periksa kode pembayaran dan nomor WhatsApp.' });
    failureStage = 'memeriksa status pesanan';
    const sheet = getOrdersSheet_();
    const row = sheet.getRange(rowNumber, 1, 1, ORDER_HEADERS.length).getValues()[0];
    if (row[16] !== 'MENUNGGU_PEMBAYARAN') return output_({ ok: false, error: 'Status pesanan tidak mengizinkan unggah bukti.' });
    if (row[18]) return output_({ ok: false, error: 'Bukti pembayaran untuk pesanan ini sudah pernah diunggah.' });

    failureStage = 'mengakses folder Drive';
    const folder = getProofFolder_();
    const uploadedAt = new Date();
    const blob = Utilities.newBlob(bytes, mimeType, `${paymentCode}-${orderId}.${extension}`);
    let file;
    try {
      failureStage = 'membuat file di Drive';
      file = folder.createFile(blob);
      failureStage = 'mencatat file ke Google Sheets';
      sheet.getRange(rowNumber, 19, 1, 2).setValues([[safeCell_(file.getId()), uploadedAt]]);
      return output_({ ok: true });
    } catch (error) {
      if (file) {
        try {
          file.setTrashed(true);
        } catch (cleanupError) {
          console.error('Failed to clean up uploaded proof file', cleanupError);
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('uploadProof failed', error);
    return output_({ ok: false, error: `Bukti gagal pada tahap: ${failureStage}.` });
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
  const savedPhone = normalizePhoneForMatch_(row[5]);
  return row[2] === paymentCode && savedPhone === normalizePhoneForMatch_(phone) ? rowNumber : 0;
}

function safePhoneCell_(value) {
  const text = String(value ?? '').trim();
  // A leading apostrophe tells Sheets to keep phone numbers such as 08... as text.
  return /^0\d+$/.test(text) ? `'${text}` : safeCell_(text);
}

function normalizePhoneForMatch_(value) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.startsWith('62')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
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

