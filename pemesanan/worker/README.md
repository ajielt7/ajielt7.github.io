# Worker RajaOngkir

Worker `pemesanan-api` menyediakan endpoint publik yang dipakai checkout:

- `GET /api/destinations?search=<teks>` mencari kelurahan/kecamatan/kota.
- `POST /api/shipping-cost` menerima `destinationId` dan daftar `{ id, quantity }`, lalu meminta tarif `jne:jnt` ke RajaOngkir.
- `GET /health` mengembalikan status Worker.

Key Shipping Cost disimpan pada secret Worker `RAJAONGKIR_API_KEY`. Jangan masukkan nilai key ke source, konfigurasi, atau repository. File `ApiKey.txt` lokal diabaikan oleh Git.

Berat contoh dihitung server sebagai 500 gram per unit produk. Perbarui `GRAMS_PER_PRODUCT` di `index.js` setelah berat aktual produk beserta kemasan diketahui.

Checkout publik menggunakan `https://pemesanan-api.ajielt7.workers.dev`. Worker menerima origin GitHub Pages proyek dan localhost untuk pengembangan.

