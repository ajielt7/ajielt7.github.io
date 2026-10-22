# Worker RajaOngkir

Worker `pemesanan-api` menyediakan endpoint publik yang dipakai checkout:

- `GET /api/destinations?search=<teks>` mencari kelurahan/kecamatan/kota.
- `POST /api/shipping-cost` menerima `destinationId` dan daftar `{ id, quantity }`, lalu meminta tarif beberapa ekspedisi sekaligus ke RajaOngkir.
- `GET /health` mengembalikan status Worker.

Pencarian lokasi dikembalikan sebagai JSON dan disimpan pada Workers Cache per teks pencarian selama 30 hari jika hasilnya ditemukan (hasil kosong selama 5 menit). Cache aktif lintas versi Worker. Tarif ongkir tetap diminta langsung dari RajaOngkir setiap kali checkout menghitung tarif karena nilainya harus aktual. Worker meminta JNE, J&T, SiCepat, IDExpress, SAP, Ninja, TIKI, Wahana, POS, Sentral Cargo, Lion Parcel, REX, dan SPX dalam satu permintaan. Hanya layanan yang tersedia untuk rute dan akun API yang akan tampil. ID asal Cimekar (`5052`) disimpan sebagai data acuan agar Worker tidak mencari asal lagi pada setiap permintaan tarif. Lihat `../data/rajaongkir-reference.json` untuk snapshot ID asal dan daftar kode kurir yang diminta.

Halaman menghitung ongkir otomatis setelah lokasi tujuan dipilih dan keranjang berisi produk. Checkout menampilkan satu dropdown dengan kurir termurah terpilih. Saat dropdown dibuka, pelanggan melihat maksimal dua alternatif reguler dan satu kurir dengan kargo jika tersedia; opsi lain berada di bagian “Kurir lainnya”. Setelah memilih kurir, daftar layanan dan harga kurir tersebut ditampilkan dari yang termurah. Setelah memilih layanan, daftar harga menutup dan dropdown utama menampilkan kurir beserta layanan/harga pilihannya. Layanan kargo diberi label jika RajaOngkir mengembalikannya untuk rute itu. Perhitungan ongkir berjalan otomatis setelah tujuan dan produk dipilih.

Cache lokasi diisi bertahap saat pelanggan mencari tujuan; tidak ada proses pengambilan massal seluruh Indonesia. Data area dapat berubah di sumber RajaOngkir, sehingga hasil pencarian akan diminta ulang setelah masa cache habis.

Key Shipping Cost disimpan pada secret Worker `RAJAONGKIR_API_KEY`. Jangan masukkan nilai key ke source, konfigurasi, atau repository. File `ApiKey.txt` lokal diabaikan oleh Git.

Berat contoh dihitung server sebagai 500 gram per unit produk. Perbarui `GRAMS_PER_PRODUCT` di `index.js` setelah berat aktual produk beserta kemasan diketahui.

Checkout publik menggunakan `https://pemesanan-api.ajielt7.workers.dev`. Worker menerima origin GitHub Pages proyek dan localhost untuk pengembangan.
