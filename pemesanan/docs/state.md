# Status Proyek

Dokumen ini adalah catatan serah-terima utama. Perbarui setiap kali keputusan, implementasi, atau kendala berubah.

## Status saat ini

- **Fase:** prototipe frontend (Tahap 1 roadmap).
- **Kode aplikasi:** `index.html`, `styles.css`, dan `script.js` berisi katalog 12 produk, keranjang/checkout samping, data kontak dan alamat, peta, serta pratinjau lokal. Hero, pengantar, cara pesan, dan footer dihapus agar halaman fokus pada pemesanan. Bagian detail tulisan/desain produk sementara dihapus. Harga, ukuran, dan variasi katalog hanya contoh prototipe, belum disahkan sebagai harga usaha.
- **Dokumen inti yang tersedia:** README, requirements, architecture, roadmap, state.
- **Tahap berikutnya:** verifikasi halaman di subpath Pages, tetapkan koordinat asal usaha, lalu putuskan integrasi Google/API sebelum membangun backend pada Tahap 2.

## Keputusan yang sudah disepakati

- Proyek adalah sistem pemesanan barang fisik; produk awal nomor rumah dari akrilik.
- Pelanggan tidak perlu login. Akan ada dashboard untuk admin; dashboard perlu akses admin terlindungi.
- Hosting frontend: GitHub Pages. Backend: Cloudflare Worker. Data pesanan: Google Sheets.
- Aset frontend sementara: gambar dari Unsplash dan ikon Font Awesome melalui CDN.
- Merek “ruma.” dan foto hero saat ini hanya placeholder visual.
- Peta Leaflet memakai tile OpenStreetMap; pengguna dapat memilih pin atau meminta lokasi browser.
- `script.js` memanggil OSRM demo dari browser untuk estimasi jarak, menentukan opsi ojol/ekspedisi, dan menghitung ongkir ojol sesuai aturan. Titik asal di kode masih koordinat perkiraan Cimekar.
- Formulir memvalidasi input dan membuka dialog pratinjau lokal; belum mengirim atau menyimpan pesanan.
- Target Pages: repository publik `ajielt7/ajielt7.github.io`, default branch `master`, sudah memuat situs utama. Aplikasi ditempatkan di subfolder `pemesanan/` untuk mempertahankan halaman utama.
- Peta/UI pin: Leaflet + OpenStreetMap. Routing jalan untuk prototipe: OSRM.
- Titik asal kirim: Cimekar, Cileunyi.
- Jarak <40 km: pelanggan boleh memilih ojol atau ekspedisi. Jarak >=40 km: hanya ekspedisi.
- Ekspedisi seperti JNE/J&T dihitung memakai RajaOngkir.
- Ojol: 4 km pertama Rp10.000; tiap kilometer setelahnya Rp2.500; jarak pecahan dibulatkan ke atas. Contoh: 4,2 km menjadi 5 km dan ongkir Rp12.500.
- Transfer bank dan verifikasi masih manual. Tidak ada payment gateway atau pengecekan mutasi otomatis pada MVP.
- Sistem membuat kode referensi pembayaran otomatis dan menampilkannya bersama instruksi checkout. Pelanggan menaruh kode pada deskripsi transfer.
- Pelanggan mengunggah screenshot bukti pembayaran. File disimpan di Google Drive; informasi pesanan, kode, koordinat, status, dan referensi file dicatat di Google Sheets.
- Admin mencocokkan pembayaran dengan mutasi bank secara manual dan menekan ACC.
- Setelah ACC, sistem diharapkan mengirim konfirmasi WhatsApp otomatis. Akses/biaya WhatsApp API masih perlu dipastikan.

## Keputusan teknis yang masih terbuka

1. **Integrasi Google:** Apps Script sebagai penghubung atau Cloudflare Worker memakai Google API langsung.
2. **Akses admin:** mekanisme autentikasi dan bagaimana kredensial admin dikelola.
3. **Layanan peta/rute:** tile provider OSM dan endpoint routing yang ketentuannya sesuai. OSRM publik adalah prototipe tanpa jaminan ketersediaan.
4. **RajaOngkir:** paket/API, syarat akun, cakupan kurir, dan bentuk endpoint terbaru.
5. **WhatsApp otomatis:** jenis akun/API, konfigurasi pesan, biaya, serta mekanisme retry/log.
6. **Upload bukti:** batas ukuran/tipe, retensi, dan akses admin ke Drive.
7. **Detail produk:** pilihan bahan/ukuran/warna/desain nomor akrilik dan harga.
8. **Tarif kurir dekat:** RajaOngkir tetap dipakai untuk kurir ekspedisi walaupun jarak kurang dari 40 km; perlu tentukan pilihan kurir dan apakah pelanggan memilih layanan atau sistem memberi daftar.
9. **Aset frontend:** pilih foto Unsplash yang relevan, versi Font Awesome, dan URL CDN saat implementasi; siapkan fallback jika aset eksternal gagal dimuat.
10. **Identitas visual:** konfirmasi nama usaha/brand pengganti placeholder “ruma.” dan pilih foto produk/rumah final.

## Catatan risiko

- Layanan tile publik OSM dan server demo OSRM dapat membatasi atau menghentikan akses; jangan jadikan dependency tanpa rencana pengganti untuk operasi nyata.
- Rute OSRM yang dipanggil browser serta koordinat asal sementara belum cocok untuk penetapan ongkir final; pindahkan kalkulasi ke backend dan verifikasi titik asal sebelum pemakaian nyata.
- Halaman frontend saat ini belum diverifikasi di browser pada perangkat sasaran.
- Koordinat rumah dan bukti transfer sensitif. Batasi akses Sheet/Drive dan jangan membuat file bukti publik.
- Kode referensi pembayaran harus unik dan tidak boleh menjadi satu-satunya pengaman dashboard/admin.
- WhatsApp otomatis dan API ekspedisi mungkin memerlukan pendaftaran/biaya; klaim "semua gratis" perlu diverifikasi per layanan sebelum rilis.

## Cara melanjutkan di sesi berikutnya

Mulai dengan memeriksa bagian **Keputusan teknis yang masih terbuka**, pilih koneksi Google dan layanan API, lalu implementasikan Tahap 1 pada `roadmap.md`. Jangan menaruh API key atau kredensial di berkas frontend/repository publik.

