# Worker RajaOngkir

Worker `pemesanan-api` menyediakan endpoint publik yang dipakai checkout:

- `GET /api/destinations?search=<teks>` mencari kelurahan/kecamatan/kota.
- `POST /api/shipping-cost` menerima `destinationId` dan daftar `{ id, quantity }`, lalu meminta tarif beberapa ekspedisi sekaligus ke RajaOngkir.
- `POST /api/orders` memvalidasi data checkout, menghitung subtotal dari harga server, membuat kode pembayaran, lalu meneruskan pesanan ke Apps Script/Google Sheets.
- `POST /api/orders/proof` menerima bukti JPG/PNG/WebP maksimal 5 MB, memvalidasi gambar, lalu mengirimnya ke Apps Script untuk diverifikasi dan disimpan ke folder Google Drive `Bukti Pembayaran`; ID Drive dicatat pada Sheet.
- `GET /api/admin/orders` mengembalikan pesanan menunggu verifikasi; `GET /api/admin/orders?view=all` mengembalikan status pembayaran, proses, dan selesai.
- `POST /api/admin/orders/<order_id>/approve` menyetujui pembayaran; `POST /api/admin/orders/<order_id>/complete` memindahkan pesanan diproses ke selesai. Semua endpoint admin memerlukan `Authorization: Bearer <ADMIN_TOKEN>`.
- `GET /health` mengembalikan status Worker.

Pembuatan pesanan memerlukan secret Worker `GOOGLE_APPS_SCRIPT_URL` (URL Web App Apps Script berakhiran `/exec`) dan `GOOGLE_SCRIPT_TOKEN`. Apps Script menyimpan pasangan `SPREADSHEET_ID` dan `WORKER_SHARED_TOKEN` di Script Properties. Nilai token kedua sisi harus sama. Lihat `../apps-script/README.md` untuk pemasangan.

Apps Script terbaru perlu menyediakan action `listOrders`, `listPendingOrders`, `approveOrder`, dan `completeOrder`. Jalankan `setupOrderCleanupTrigger` sekali untuk menghapus order selesai beserta bukti Drive setelah tujuh hari.

Apps Script memerlukan otorisasi Drive dari pemilik Web App. Folder `Bukti Pembayaran` dibuat otomatis pada unggahan pertama, dengan izin privat bawaan Drive. Worker hanya menerima file JPG, PNG, atau WebP maksimum 5 MB dan memeriksa signature gambar; akses admin untuk melihat bukti perlu ditambahkan saat dashboard dibuat.

Pencarian lokasi dikembalikan sebagai JSON dan disimpan pada Workers Cache per teks pencarian selama 30 hari jika hasilnya ditemukan (hasil kosong selama 5 menit). Cache aktif lintas versi Worker. Tarif ongkir tetap diminta langsung dari RajaOngkir setiap kali checkout menghitung tarif karena nilainya harus aktual. Worker meminta JNE, J&T, SiCepat, IDExpress, SAP, Ninja, TIKI, Wahana, POS, Sentral Cargo, Lion Parcel, REX, dan SPX dalam satu permintaan. Hanya layanan yang tersedia untuk rute dan akun API yang akan tampil. ID asal Cimekar (`5052`) disimpan sebagai data acuan agar Worker tidak mencari asal lagi pada setiap permintaan tarif. Lihat `../data/rajaongkir-reference.json` untuk snapshot ID asal dan daftar kode kurir yang diminta.

Halaman menghitung ongkir otomatis setelah lokasi tujuan dipilih dan keranjang berisi produk. Checkout menampilkan satu dropdown dengan kurir termurah terpilih. Saat dropdown dibuka, pelanggan melihat maksimal dua alternatif reguler dan satu kurir dengan kargo jika tersedia; opsi lain berada di bagian “Kurir lainnya”. Setelah memilih kurir, daftar layanan dan harga kurir tersebut ditampilkan dari yang termurah. Setelah memilih layanan, daftar harga menutup dan dropdown utama menampilkan kurir beserta layanan/harga pilihannya. Layanan kargo diberi label jika RajaOngkir mengembalikannya untuk rute itu. Perhitungan ongkir berjalan otomatis setelah tujuan dan produk dipilih.

Cache lokasi diisi bertahap saat pelanggan mencari tujuan; tidak ada proses pengambilan massal seluruh Indonesia. Data area dapat berubah di sumber RajaOngkir, sehingga hasil pencarian akan diminta ulang setelah masa cache habis.

Key Shipping Cost disimpan pada secret Worker `RAJAONGKIR_API_KEY`. Jangan masukkan nilai key ke source, konfigurasi, atau repository. File `ApiKey.txt` lokal diabaikan oleh Git.

Berat contoh dihitung server sebagai 500 gram per unit produk. Perbarui `GRAMS_PER_PRODUCT` di `index.js` setelah berat aktual produk beserta kemasan diketahui.

Checkout publik menggunakan `https://pemesanan-api.ajielt7.workers.dev`. Worker menerima origin GitHub Pages proyek dan localhost untuk pengembangan.

