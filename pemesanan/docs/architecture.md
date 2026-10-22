# Arsitektur Sistem

## Ringkasan

Situs pelanggan disajikan sebagai berkas statis dari GitHub Pages. Cloudflare Worker menjadi API/backend yang memvalidasi pesanan, menghitung ongkir, mengelola upload dan integrasi penyimpanan, serta mengatur status. Google Sheets menjadi penyimpanan data pesanan awal; file screenshot berada di Google Drive.

```mermaid
flowchart LR
  Customer[Pelanggan] --> Pages[GitHub Pages<br/>Form checkout + Leaflet]
  Pages --> Unsplash[Unsplash<br/>gambar]
  Pages --> FA[Font Awesome CDN<br/>ikon]
  Pages --> Worker[Cloudflare Worker<br/>API + aturan bisnis]
  Worker --> OSRM[OSRM<br/>jarak rute prototipe]
  Worker --> Raja[RajaOngkir API<br/>ongkir ekspedisi]
  Worker --> Sheets[Google Sheets<br/>data pesanan]
  Worker --> Drive[Google Drive<br/>bukti transfer]
  Admin[Admin] --> Dashboard[Dashboard admin]
  Dashboard --> Worker
  Worker --> WA[WhatsApp Business API<br/>setelah ACC]
```

## Komponen dan tanggung jawab

| Komponen | Tanggung jawab |
| --- | --- |
| GitHub Pages | Menyajikan halaman publik pemesanan/checkout. Tidak menyimpan rahasia atau memutuskan status pembayaran. |
| Unsplash | Sumber foto sementara untuk visual frontend; gunakan URL/aset yang sesuai ketentuan Unsplash. |
| Font Awesome CDN | Menyediakan ikon frontend. Versi dan URL CDN dipilih saat implementasi. |
| Leaflet + OpenStreetMap | Menyediakan UI peta bagi pelanggan untuk memilih pin rumah. Atribusi dan kebijakan penyedia tile harus dipatuhi. |
| Cloudflare Worker | Worker `pemesanan-api` menyediakan `/api/destinations` dan `/api/shipping-cost` untuk RajaOngkir. API pesanan/admin belum dibangun. |
| OSRM | Menghasilkan estimasi jarak rute jalan untuk tarif ojol pada prototipe. Endpoint yang digunakan dan strategi pengganti perlu diputuskan. |
| RajaOngkir | Worker memakai API Shipping Cost V2 untuk mencari tujuan dan meminta tarif beberapa ekspedisi sekaligus. Hasil pencarian tujuan di-cache sebagai respons JSON pada Workers Cache selama 30 hari; tarif tetap dihitung langsung. Bobot item saat ini contoh 500 gram. |
| Google Sheets | Menyimpan kolom pesanan, alamat/koordinat, kode referensi, jumlah dan ongkir, status pembayaran/pesanan, serta ID/link Drive bukti. |
| Google Drive | Menyimpan screenshot bukti transfer. File tidak boleh dibagikan publik; dashboard mengambilnya melalui akses admin yang sah. |
| Dashboard admin | Membutuhkan autentikasi admin. Menampilkan pesanan/bukti dan menyediakan aksi ACC setelah pengecekan manual mutasi bank. |
| WhatsApp Business Platform/API | Mengirim notifikasi setelah admin ACC. Kredensial dan biaya pesan menjadi dependency yang perlu dipastikan. |

## Alur pemesanan dan pembayaran

1. Pelanggan memilih produk, memasukkan kontak/alamat tertulis, lalu mencari kelurahan/kecamatan/kota tujuan.
2. Frontend meminta hasil pencarian tujuan dari Worker. Pada cache miss Worker menghubungi RajaOngkir memakai secret API key di Cloudflare; hasilnya disimpan sebagai JSON di Workers Cache agar pencarian serupa berikutnya dapat memakai cache.
3. Setelah lokasi dipilih dan keranjang berisi produk, frontend meminta estimasi ongkir otomatis. Worker menggunakan ID asal Cimekar yang dicatat di `data/rajaongkir-reference.json`, menghitung berat prototipe 500 gram per item, dan meminta tarif beberapa ekspedisi sekaligus. Checkout menampilkan satu dropdown dengan kurir termurah terpilih. Saat dibuka, dropdown menampilkan maksimal dua alternatif reguler dan satu kurir dengan kargo jika tersedia; opsi lain berada di bagian “Kurir lainnya”. Setelah pelanggan memilih kurir, daftar layanan dan harga kurir itu tampil dari yang termurah. Setelah memilih layanan, daftar harga menutup dan dropdown utama menampilkan kurir beserta layanan/harga pilihannya. Layanan kargo diberi tanda jika dapat dikenali dari respons API. Tarif tetap diminta langsung dari RajaOngkir.
4. Backend menetapkan order ID dan kode referensi pembayaran unik, menyimpan pesanan berstatus menunggu pembayaran, lalu mengembalikan checkout dan instruksi transfer.
5. Pelanggan mencantumkan kode di deskripsi transfer dan mengunggah screenshot. Worker memvalidasi file, menyimpan file di Drive, dan mencatat referensi file/status bukti pada Sheet.
6. Admin membuka dashboard yang dilindungi akses, membandingkan kode, nilai, bukti, dan mutasi rekening secara manual.
7. Saat admin menekan ACC, Worker menyimpan status terlebih dahulu lalu meminta WhatsApp API mengirim konfirmasi. Kegagalan pengiriman harus tercatat dan tidak membatalkan status pembayaran yang sudah disetujui.

## Data dan keamanan

- Sheet menyimpan data terstruktur dan ID file; screenshot disimpan di Drive, bukan dimasukkan sebagai isi sel.
- API key OSRM jika layanan yang dipilih memerlukan key, RajaOngkir, akses Google, dan WhatsApp disimpan sebagai secret di Cloudflare, bukan pada JavaScript publik.
- Key Shipping Cost RajaOngkir dibaca dari `ApiKey.txt` lokal dan disimpan pada secret Worker `RAJAONGKIR_API_KEY`; jangan commit file `ApiKey.txt` ke GitHub.
- Endpoint admin tidak boleh dapat dipanggil tanpa autentikasi/otorisasi.
- Validasi ukuran/tipe file, sanitasi input, batas request, dan aturan retensi bukti perlu ditentukan.
- Gambar Unsplash dan Font Awesome CDN adalah dependensi eksternal frontend; siapkan fallback bila gambar/font gagal dimuat dan hindari menjadikannya syarat untuk menyelesaikan checkout.
- Koordinat rumah, alamat, nomor telepon, dan bukti transfer adalah data pelanggan; akses dan periode penyimpanan perlu dibatasi.

## Keputusan yang belum final

- Cara Worker mengakses Sheets/Drive: Apps Script perantara atau Google API secara langsung.
- Mekanisme autentikasi dashboard admin.
- Endpoint/penyedia tile OSM serta layanan OSRM yang layak untuk tingkat penggunaan dan ketentuan usaha.
- Bobot aktual tiap produk dan paket/akurasi tarif RajaOngkir sebelum transaksi nyata.
- Penyedia WhatsApp Business/API dan biaya pesan.
- Format data produk khusus nomor rumah akrilik dan detail tarif kurir.
