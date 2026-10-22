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
const GRAMS_PER_PRODUCT = 500; // Bobot kemasan contoh sementara, dipilih untuk prototipe.

function json(data, status, origin) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return json({ error: 'Origin tidak diizinkan.' }, 403);
    if (request.method === 'OPTIONS') return json({}, 204, origin);
    if (!env.RAJAONGKIR_API_KEY) return json({ error: 'API ongkir belum dikonfigurasi.' }, 503, origin);

    try {
      if (url.pathname === '/api/destinations' && request.method === 'GET') {
        const search = (url.searchParams.get('search') || '').trim();
        if (search.length < 3 || search.length > 80) return json({ error: 'Masukkan minimal 3 karakter lokasi.' }, 400, origin);
        const query = new URLSearchParams({ search, limit: '10', offset: '0' });
        const result = await rajaOngkir(`/destination/domestic-destination?${query}`, {}, env.RAJAONGKIR_API_KEY);
        return json({ data: Array.isArray(result.data) ? result.data : [] }, 200, origin);
      }

      if (url.pathname === '/api/shipping-cost' && request.method === 'POST') {
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
        const originQuery = new URLSearchParams({ search: 'Cimekar', limit: '10', offset: '0' });
        const originResult = await rajaOngkir(`/destination/domestic-destination?${originQuery}`, {}, env.RAJAONGKIR_API_KEY);
        const normalize = (value) => String(value || '').trim().toLocaleLowerCase('id-ID');
        const originLocation = (originResult.data || []).find((location) =>
          normalize(location.subdistrict) === 'cimekar' &&
          [location.district, location.city, location.label].some((value) => normalize(value).includes('cileunyi'))
        );
        if (!originLocation) return json({ error: 'Lokasi asal Cimekar, Cileunyi belum ditemukan di RajaOngkir.' }, 502, origin);
        const form = new URLSearchParams({
          origin: String(originLocation.id),
          destination: String(body.destinationId),
          weight: String(units * GRAMS_PER_PRODUCT),
          courier: 'jne:jnt',
          price: 'lowest'
        });
        const result = await rajaOngkir('/calculate/domestic-cost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form
        }, env.RAJAONGKIR_API_KEY);
        return json({ weightGrams: units * GRAMS_PER_PRODUCT, data: Array.isArray(result.data) ? result.data : [] }, 200, origin);
      }

      if (url.pathname === '/health' && request.method === 'GET') return json({ ok: true }, 200, origin);
      return json({ error: 'Endpoint tidak ditemukan.' }, 404, origin);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Layanan ongkir gagal dihubungi.' }, 502, origin);
    }
  }
};

