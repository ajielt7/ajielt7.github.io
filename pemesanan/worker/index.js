const RAJAONGKIR_BASE = 'https://rajaongkir.komerce.id/api/v1';
const ALLOWED_ORIGINS = new Set([
  'https://ajielt7.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
]);
const PRODUCT_IDS = new Set([
  'minimalis', 'premium', 'custom', 'akrilik-hitam', 'akrilik-putih', 'akrilik-emas',
  'akrilik-silver', 'nomor-timbul', 'nomor-dobel', 'nomor-led', 'nomor-jalan', 'nomor-keluarga'
]);
const PRODUCTS = {
  minimalis: { name: 'Nomor Rumah Minimalis', price: 75000 },
  premium: { name: 'Nomor Rumah Premium', price: 120000 },
  custom: { name: 'Nomor Rumah Custom', price: 150000 },
  'akrilik-hitam': { name: 'Akrilik Hitam Elegan', price: 85000 },
  'akrilik-putih': { name: 'Akrilik Putih Minimal', price: 85000 },
  'akrilik-emas': { name: 'Akrilik Nuansa Emas', price: 95000 },
  'akrilik-silver': { name: 'Akrilik Silver Modern', price: 95000 },
  'nomor-timbul': { name: 'Nomor Timbul 3D', price: 135000 },
  'nomor-dobel': { name: 'Nomor Lapis Ganda', price: 165000 },
  'nomor-led': { name: 'Nomor Rumah LED', price: 250000 },
  'nomor-jalan': { name: 'Nomor + Nama Jalan', price: 185000 },
  'nomor-keluarga': { name: 'Nomor + Nama Keluarga', price: 175000 }
};
const GRAMS_PER_PRODUCT = 500; // Bobot kemasan contoh sementara, dipilih untuk prototipe.
const COURIER_CODES = 'jne:sicepat:ide:sap:ninja:jnt:tiki:wahana:pos:sentral:lion:rex:spx';
// ID asal hasil verifikasi RajaOngkir: Cimekar, Cileunyi, Bandung (40623).
const ORIGIN_DESTINATION_ID = 5052;
const DESTINATION_CACHE_SECONDS = 60 * 60 * 24 * 30;

function json(data, status, origin, cacheControl = 'no-store') {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cacheControl };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    headers.Vary = 'Origin';
  }
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers });
}

async function rajaOngkir(path, init, apiKey) {
  const response = await fetch(`${RAJAONGKIR_BASE}${path}`, {
    ...init,
    headers: { Accept: 'application/json', key: apiKey, ...init?.headers }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.meta?.status === 'error') {
    throw new Error(payload?.meta?.message || `RajaOngkir mengembalikan HTTP ${response.status}`);
  }
  return payload;
}

async function appsScript(env, action, data) {
  const response = await fetch(env.GOOGLE_APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: env.GOOGLE_SCRIPT_TOKEN, action, ...data })
  });
  return response.json().catch(() => null);
}

function validImageSignature(bytes, mime) {
  if (mime === 'image/png') return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  if (mime === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === 'image/webp') return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  return false;
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function constantTimeEquals(left, right) {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function isAdminAuthorized(request, env) {
  const expected = String(env.ADMIN_TOKEN || '');
  const authorization = request.headers.get('Authorization') || '';
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  return Boolean(expected && supplied && constantTimeEquals(supplied, expected));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const isAdminEndpoint = url.pathname === '/api/admin/orders'
      || /^\/api\/admin\/orders\/[0-9a-f-]{36}\/(?:approve|complete)$/i.test(url.pathname);
    // Native Android clients do not send a browser Origin header. Permit that
    // only on admin routes, which still require the ADMIN_TOKEN bearer token.
    if ((!origin && !isAdminEndpoint) || (origin && !ALLOWED_ORIGINS.has(origin))) {
      return json({ error: 'Origin tidak diizinkan.' }, 403);
    }
    if (request.method === 'OPTIONS') return json({}, 204, origin);

    try {
      if (url.pathname === '/health' && request.method === 'GET') return json({ ok: true }, 200, origin);

      if (url.pathname === '/api/orders' && request.method === 'POST') {
        const contentLength = Number(request.headers.get('Content-Length') || 0);
        if (contentLength > 16384) return json({ error: 'Data pesanan terlalu besar.' }, 413, origin);
        if (!env.GOOGLE_APPS_SCRIPT_URL || !env.GOOGLE_SCRIPT_TOKEN) {
          return json({ error: 'Penyimpanan pesanan belum dikonfigurasi.' }, 503, origin);
        }
        const body = await request.json().catch(() => null);
        if (!body || !/^[0-9a-f-]{36}$/i.test(String(body.clientRequestId || ''))) {
          return json({ error: 'ID permintaan pesanan tidak valid.' }, 400, origin);
        }
        const customer = body.customer || {};
        const name = String(customer.name || '').trim();
        const phone = String(customer.phone || '').trim();
        const address = String(customer.address || '').trim();
        const destinationId = String(body.destination?.id || '');
        const destinationLabel = String(body.destination?.label || '').trim();
        if (name.length < 2 || name.length > 100 || !/^[+0-9() .-]{8,24}$/.test(phone) || address.length < 8 || address.length > 500) {
          return json({ error: 'Nama, nomor WhatsApp, atau alamat belum valid.' }, 400, origin);
        }
        if (!/^\d{1,12}$/.test(destinationId) || !destinationLabel || destinationLabel.length > 200) {
          return json({ error: 'Lokasi tujuan pesanan tidak valid.' }, 400, origin);
        }
        if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 12) {
          return json({ error: 'Daftar produk pesanan tidak valid.' }, 400, origin);
        }
        let units = 0;
        const items = [];
        for (const item of body.items) {
          if (!PRODUCT_IDS.has(item?.id) || !Number.isInteger(item?.quantity) || item.quantity < 1 || item.quantity > 20) {
            return json({ error: 'Produk atau jumlah pesanan tidak valid.' }, 400, origin);
          }
          units += item.quantity;
          items.push({ id: item.id, name: PRODUCTS[item.id].name, quantity: item.quantity, unitPrice: PRODUCTS[item.id].price });
        }
        if (units > 40) return json({ error: 'Jumlah maksimal 40 produk per pesanan.' }, 400, origin);
        const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        const selectedShipping = body.shipping || {};
        const courierCode = String(selectedShipping.code || '').trim().toLowerCase();
        const courierName = String(selectedShipping.name || '').trim();
        const service = String(selectedShipping.service || selectedShipping.description || '').trim();
        const shippingCost = Number(selectedShipping.cost);
        if (!COURIER_CODES.split(':').includes(courierCode) || !courierName || courierName.length > 80 || !service || service.length > 120 || !Number.isSafeInteger(shippingCost) || shippingCost < 0 || shippingCost > 2000000) {
          return json({ error: 'Pilihan ekspedisi atau tarif ongkir tidak valid.' }, 400, origin);
        }
        const now = new Date();
        const dateCode = now.toISOString().slice(0, 10).replaceAll('-', '');
        const paymentCode = `PNA-${dateCode}-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
        const order = {
          clientRequestId: body.clientRequestId,
          orderId: crypto.randomUUID(),
          paymentCode,
          createdAt: now.toISOString(),
          customer: { name, phone, address },
          destination: { id: destinationId, label: destinationLabel },
          items,
          subtotal,
          shipping: { code: courierCode, name: courierName, service, cost: shippingCost },
          total: subtotal + shippingCost,
          paymentStatus: 'MENUNGGU_PEMBAYARAN',
          orderStatus: 'MENUNGGU_PEMBAYARAN'
        };
        const result = await appsScript(env, 'createOrder', { order });
        if (!result?.ok || !result.order) {
          return json({ error: result?.error || 'Pesanan belum berhasil disimpan. Coba lagi beberapa saat.' }, 502, origin);
        }
        return json({ ok: true, order: result.order }, 201, origin);
      }

      if (url.pathname === '/api/orders/proof' && request.method === 'POST') {
        if (!env.GOOGLE_APPS_SCRIPT_URL || !env.GOOGLE_SCRIPT_TOKEN) return json({ error: 'Penyimpanan pesanan belum dikonfigurasi.' }, 503, origin);
        const contentLength = Number(request.headers.get('Content-Length') || 0);
        if (contentLength > 5 * 1024 * 1024 + 32768) return json({ error: 'Ukuran gambar maksimal 5 MB.' }, 413, origin);
        const form = await request.formData();
        const orderId = String(form.get('orderId') || '');
        const paymentCode = String(form.get('paymentCode') || '').trim();
        const phone = String(form.get('phone') || '').trim();
        const file = form.get('proof');
        if (!/^[0-9a-f-]{36}$/i.test(orderId) || !/^PNA-\d{8}-[A-F0-9]{8}$/.test(paymentCode) || !/^[+0-9() .-]{8,24}$/.test(phone)) {
          return json({ error: 'Data pesanan untuk unggah bukti tidak valid.' }, 400, origin);
        }
        if (!(file instanceof File) || file.size < 1 || file.size > 5 * 1024 * 1024) return json({ error: 'Pilih gambar maksimal 5 MB.' }, 400, origin);
        const allowedTypes = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]);
        const extension = allowedTypes.get(file.type);
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (!extension || !validImageSignature(bytes, file.type)) return json({ error: 'Format bukti harus JPG, PNG, atau WebP yang valid.' }, 400, origin);

        const result = await appsScript(env, 'uploadProof', {
          orderId, paymentCode, phone, mimeType: file.type, extension,
          imageBase64: bytesToBase64(bytes)
        });
        if (!result?.ok) return json({ error: result?.error || 'Bukti gagal disimpan ke Google Drive.' }, 409, origin);
        return json({ ok: true, message: 'Bukti pembayaran berhasil disimpan ke Google Drive.' }, 201, origin);
      }

      if (url.pathname === '/api/admin/orders' && request.method === 'GET') {
        if (!env.ADMIN_TOKEN) return json({ error: 'Akses admin belum dikonfigurasi.' }, 503, origin);
        if (!isAdminAuthorized(request, env)) return json({ error: 'Token admin tidak valid.' }, 401, origin);
        const allOrders = url.searchParams.get('view') === 'all';
        const result = await appsScript(env, allOrders ? 'listOrders' : 'listPendingOrders', {});
        if (!result?.ok) return json({ error: result?.error || 'Daftar pesanan gagal dimuat.' }, 502, origin);
        return json({ ok: true, orders: Array.isArray(result.orders) ? result.orders : [] }, 200, origin);
      }

      const approvalMatch = url.pathname.match(/^\/api\/admin\/orders\/([0-9a-f-]{36})\/approve$/i);
      if (approvalMatch && request.method === 'POST') {
        if (!env.ADMIN_TOKEN) return json({ error: 'Akses admin belum dikonfigurasi.' }, 503, origin);
        if (!isAdminAuthorized(request, env)) return json({ error: 'Token admin tidak valid.' }, 401, origin);
        const body = await request.json().catch(() => null);
        const paymentCode = String(body?.paymentCode || '').trim();
        const adminNote = String(body?.adminNote || '').trim();
        if (!/^PNA-\d{8}-[A-F0-9]{8}$/.test(paymentCode) || adminNote.length > 500) {
          return json({ error: 'Data persetujuan tidak valid.' }, 400, origin);
        }
        const result = await appsScript(env, 'approveOrder', {
          orderId: approvalMatch[1], paymentCode, adminNote
        });
        if (!result?.ok) return json({ error: result?.error || 'Persetujuan pesanan gagal.' }, 409, origin);
        return json({ ok: true, order: result.order }, 200, origin);
      }

      const completionMatch = url.pathname.match(/^\/api\/admin\/orders\/([0-9a-f-]{36})\/complete$/i);
      if (completionMatch && request.method === 'POST') {
        if (!env.ADMIN_TOKEN) return json({ error: 'Akses admin belum dikonfigurasi.' }, 503, origin);
        if (!isAdminAuthorized(request, env)) return json({ error: 'Token admin tidak valid.' }, 401, origin);
        const body = await request.json().catch(() => null);
        const paymentCode = String(body?.paymentCode || '').trim();
        if (!/^PNA-\d{8}-[A-F0-9]{8}$/.test(paymentCode)) {
          return json({ error: 'Kode pembayaran tidak valid.' }, 400, origin);
        }
        const result = await appsScript(env, 'completeOrder', { orderId: completionMatch[1], paymentCode });
        if (!result?.ok) return json({ error: result?.error || 'Pesanan gagal ditandai selesai.' }, 409, origin);
        return json({ ok: true, order: result.order }, 200, origin);
      }

      if (url.pathname === '/api/destinations' && request.method === 'GET') {
        if (!env.RAJAONGKIR_API_KEY) return json({ error: 'API ongkir belum dikonfigurasi.' }, 503, origin);
        const search = (url.searchParams.get('search') || '').trim();
        if (search.length < 3 || search.length > 80) return json({ error: 'Masukkan minimal 3 karakter lokasi.' }, 400, origin);
        const query = new URLSearchParams({ search, limit: '10', offset: '0' });
        const result = await rajaOngkir(`/destination/domestic-destination?${query}`, {}, env.RAJAONGKIR_API_KEY);
        const data = Array.isArray(result.data) ? result.data : [];
        const ttl = data.length ? DESTINATION_CACHE_SECONDS : 300;
        return json({ data }, 200, origin, `public, max-age=${ttl}, s-maxage=${ttl}`);
      }

      if (url.pathname === '/api/shipping-cost' && request.method === 'POST') {
        if (!env.RAJAONGKIR_API_KEY) return json({ error: 'API ongkir belum dikonfigurasi.' }, 503, origin);
        const contentLength = Number(request.headers.get('Content-Length') || 0);
        if (contentLength > 8192) return json({ error: 'Data keranjang terlalu besar.' }, 413, origin);
        const body = await request.json().catch(() => null);
        if (!body || !/^\d{1,12}$/.test(String(body.destinationId || ''))) {
          return json({ error: 'Pilih lokasi tujuan dari hasil pencarian.' }, 400, origin);
        }
        if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 12) {
          return json({ error: 'Keranjang produk tidak valid.' }, 400, origin);
        }
        let units = 0;
        for (const item of body.items) {
          if (!PRODUCT_IDS.has(item?.id) || !Number.isInteger(item?.quantity) || item.quantity < 1 || item.quantity > 20) {
            return json({ error: 'Produk atau jumlah tidak valid.' }, 400, origin);
          }
          units += item.quantity;
        }
        if (units > 40) return json({ error: 'Jumlah maksimal 40 produk per perhitungan.' }, 400, origin);
        const form = new URLSearchParams({
          origin: String(ORIGIN_DESTINATION_ID),
          destination: String(body.destinationId),
          weight: String(units * GRAMS_PER_PRODUCT),
          courier: COURIER_CODES,
          price: 'lowest'
        });
        const result = await rajaOngkir('/calculate/domestic-cost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form
        }, env.RAJAONGKIR_API_KEY);
        return json({ weightGrams: units * GRAMS_PER_PRODUCT, data: Array.isArray(result.data) ? result.data : [] }, 200, origin);
      }

      return json({ error: 'Endpoint tidak ditemukan.' }, 404, origin);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Permintaan backend gagal diproses.' }, 502, origin);
    }
  }
};
