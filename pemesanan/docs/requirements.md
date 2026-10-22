# Kebutuhan Produk

## Tujuan

Membangun sistem pemesanan barang fisik yang dapat digunakan pelanggan tanpa akun. Versi awal berfokus pada produk nomor rumah akrilik dan proses pembayaran transfer yang diverifikasi manual oleh admin.

## Aktor

- **Pelanggan:** memilih/mendeskripsikan produk, memasukkan kontak dan alamat, memilih pengiriman yang tersedia, membayar, serta mengirim bukti transfer.
- **Admin:** melihat pesanan dan bukti pembayaran, mencocokkan pembayaran terhadap mutasi rekening, lalu menyetujui pesanan.

Pelanggan tidak perlu login. Dashboard admin harus memiliki kontrol akses/login agar data pesanan dan bukti pembayaran tidak terbuka untuk umum.

## Kebutuhan fungsional

| ID | Kebutuhan | Kriteria penerimaan |
| --- | --- | --- |
| FR-01 | Pelanggan dapat membuat pesanan nomor rumah akrilik. | Halaman menampilkan 12 pilihan produk dan keranjang checkout di sisi katalog pada layar lebar. Checkout memuat kontak, alamat tertulis, pencarian tujuan ekspedisi, dan subtotal produk. Detail tulisan/desain produk ditunda; nama, ukuran, dan harga pada 12 kartu masih contoh prototipe. |
| FR-02 | Pemilihan titik rumah pada peta. | Ditunda sementara; checkout saat ini hanya meminta alamat tertulis dan tidak mengumpulkan koordinat. |
| FR-03 | Pelanggan memilih tujuan ekspedisi dan melihat ongkir. | Setelah lokasi tujuan dipilih dan keranjang terisi, sistem menghitung estimasi otomatis, menampilkan kurir termurah, maksimal dua alternatif reguler, dan satu kurir dengan layanan kargo jika tersedia. Kurir lain dibuka melalui bagian kurir lainnya; layanan per kurir diurutkan dari harga terendah. Layanan lain termasuk kargo dapat dipilih bila dikembalikan API. |
| FR-04 | Perhitungan ongkir ojol. | Rumus bisnis: 4 km pertama Rp10.000, setiap km setelahnya Rp2.500, jarak pecahan dibulatkan ke atas. Kalkulasi UI sementara dinonaktifkan bersama fitur titik lokasi. |
| FR-05 | Sistem memperoleh ongkir ekspedisi. | Worker meminta tarif beberapa kode kurir dalam satu permintaan ke RajaOngkir API V2. Hanya layanan yang tersedia untuk rute dan akun yang tampil. Bobot prototipe 500 gram per item; perlu diganti bobot aktual sebelum dipakai untuk transaksi nyata. |
| FR-06 | Checkout menampilkan kode referensi pembayaran otomatis. | Kode dibuat unik oleh backend, ditampilkan dengan instruksi yang jelas, dan dikaitkan dengan pesanan. Pelanggan mencantumkan kode pada deskripsi transfer. |
| FR-07 | Pelanggan dapat mengunggah screenshot bukti transfer. | File disimpan di Google Drive dengan akses terkendali; Sheet mencatat referensi file dan status bukti. Tipe serta batas ukuran file perlu ditentukan. |
| FR-08 | Admin memeriksa dan menyetujui pembayaran manual. | Dashboard menampilkan detail pesanan, kode pembayaran, bukti, dan informasi yang diperlukan untuk pencocokan dengan mutasi bank. Admin mengubah status melalui tombol ACC. |
| FR-09 | ACC memicu pemberitahuan WhatsApp otomatis. | Sistem mengirim pemberitahuan setelah ACC berhasil tersimpan. Penggunaan WhatsApp Business Platform/API, template, kredensial, dan biaya harus dipastikan sebelum fitur ini dirilis. |
| FR-10 | Sistem menyimpan rekaman pesanan. | Data pesanan, koordinat, kode pembayaran, ongkir, status, serta referensi bukti dicatat di Google Sheets melalui backend. |
| FR-11 | Frontend menggunakan gambar dan ikon sementara dari layanan eksternal. | Foto produk/visual menggunakan Unsplash; ikon menggunakan Font Awesome yang dimuat melalui CDN. |

## Kebutuhan nonfungsional

- Frontend dapat di-host sebagai situs statis GitHub Pages.
- Validasi dan logika ongkir penting dilakukan di backend, bukan hanya browser.
- Rahasia API disimpan di Cloudflare Worker secrets, tidak di repository publik.
- Akses dashboard admin, Google Sheet, dan bukti di Drive dibatasi.
- Halaman menjelaskan penggunaan koordinat alamat dan bukti transfer kepada pelanggan.
- Aset dari Unsplash dan Font Awesome dapat gagal dimuat jika layanan eksternal tidak tersedia; konten utama dan fungsi checkout harus tetap dapat digunakan.
- Sistem memberi pesan kesalahan yang jelas bila peta, layanan rute, upload, atau penyimpanan sedang gagal.

## Di luar cakupan versi awal

Akun pelanggan, payment gateway, pengecekan mutasi bank otomatis, inventori otomatis, proses produksi, pelacakan paket, dan banyak toko/penjual.

## Aturan bisnis yang sudah diputuskan

- Titik awal pengiriman: Cimekar, Cileunyi.
- Opsi ojol hanya jika jarak kurang dari 40 km.
- Pada jarak kurang dari 40 km, pelanggan dapat memilih ojol atau kurir ekspedisi.
- Pada jarak 40 km atau lebih, hanya kurir ekspedisi tersedia.
- Ongkir ekspedisi menggunakan RajaOngkir; tarif ojol memakai formula per km di FR-04.
- Pembayaran dilakukan lewat transfer bank dan diverifikasi admin secara manual terhadap mutasi.
