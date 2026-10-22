# Status Proyek

Dokumen ini adalah catatan serah-terima utama. Perbarui setiap kali keputusan, implementasi, atau kendala berubah.

## Status saat ini

- **Fase:** upload bukti pembayaran dan persiapan dashboard admin.
- **Kode aplikasi:** frontend checkout dan form unggah bukti sudah disiapkan. Worker memverifikasi order, jenis/ukuran file, lalu menyimpan screenshot JPG/PNG/WebP hingga 5 MB ke binding R2 `PAYMENT_PROOFS`; Apps Script mencatat object key dan waktu di Sheet. URL Apps Script dan token sudah terpasang sebagai secret Worker. R2 belum aktif pada akun sehingga bucket dan binding belum dapat dibuat; kode Worker terbaru dan Apps Script terbaru juga belum diterbitkan ulang. Bobot produk masih contoh 500 gram/unit; harga katalog masih contoh.
- **Dokumen inti yang tersedia:** README, requirements, architecture, roadmap, state.
- **Tahap berikutnya:** aktifkan R2 dari Cloudflare Dashboard, buat bucket privat `ruma-bukti-pembayaran`, ikat sebagai `PAYMENT_PROOFS`, lalu terbitkan versi Apps Script dan Worker terbaru. Setelah itu lanjutkan endpoint admin untuk melihat bukti dan ACC manual.

## Keputusan yang sudah disepakati

- Proyek adalah sistem pemesanan barang fisik; produk awal nomor rumah dari akrilik.
- Pelanggan tidak perlu login. Akan ada dashboard untuk admin; dashboard perlu akses admin terlindungi.
- Hosting frontend: GitHub Pages. Backend: Cloudflare Worker. Data pesanan: Google Sheets.
- Aset frontend sementara: gambar dari Unsplash dan ikon Font Awesome melalui CDN.
- Merek �ruma.� dan foto hero saat ini hanya placeholder visual.
- Pemilihan titik lokasi peta sementara dihapus dari checkout; pelanggan memilih tujuan pengiriman melalui hasil pencarian RajaOngkir.
- `script.js` meminta Worker mencari tujuan dan menghitung tarif ekspedisi; API key tidak ada di frontend.
- Worker source ada di `worker/index.js`; nama Worker Cloudflare `pemesanan-api`, URL `https://pemesanan-api.ajielt7.workers.dev`.
- Worker memakai API RajaOngkir V2 dengan beberapa kode kurir, dan bobot prototipe 500 gram per item. Pencarian live mengembalikan lokasi asal `CIMEKAR, CILEUNYI, BANDUNG, JAWA BARAT, 40623` dengan ID 5052. Data wilayah dicache bertahap per kata pencarian; belum ada snapshot lengkap semua wilayah Indonesia. Cakupan kurir dan layanan kargo perlu diverifikasi lewat respons nyata untuk alamat pelanggan.
- Formulir mengirim checkout ke endpoint order Worker. Penyimpanan menunggu konfigurasi Apps Script dan Google Sheet.
- Target Pages: repository publik `ajielt7/ajielt7.github.io`, default branch `master`, sudah memuat situs utama. Aplikasi ditempatkan di subfolder `pemesanan/` untuk mempertahankan halaman utama.
- Peta/UI pin dan routing ojol: ditunda sementara; Leaflet/OSRM tidak dimuat saat ini.
- Titik asal kirim: Cimekar, Cileunyi.
- Jarak <40 km: pelanggan boleh memilih ojol atau ekspedisi. Jarak >=40 km: hanya ekspedisi.
- Ekspedisi seperti JNE/J&T dihitung memakai RajaOngkir.
- Ojol: 4 km pertama Rp10.000; tiap kilometer setelahnya Rp2.500; jarak pecahan dibulatkan ke atas. Contoh: 4,2 km menjadi 5 km dan ongkir Rp12.500.
- Transfer bank dan verifikasi masih manual. Tidak ada payment gateway atau pengecekan mutasi otomatis pada MVP.
- Sistem membuat kode referensi pembayaran otomatis dan menampilkannya bersama instruksi checkout. Pelanggan menaruh kode pada deskripsi transfer.
- Pelanggan mengunggah screenshot bukti pembayaran. File disimpan privat di Cloudflare R2; Sheet menyimpan object key dan waktu unggah.
- Admin mencocokkan pembayaran dengan mutasi bank secara manual dan menekan ACC.
- Setelah ACC, sistem diharapkan mengirim konfirmasi WhatsApp otomatis. Akses/biaya WhatsApp API masih perlu dipastikan.

## Keputusan teknis yang masih terbuka

1. **Konfigurasi Google:** Apps Script Web App dipilih sebagai penghubung. Isi `SPREADSHEET_ID`, `WORKER_SHARED_TOKEN`, `GOOGLE_APPS_SCRIPT_URL`, dan `GOOGLE_SCRIPT_TOKEN` sesuai `apps-script/README.md`.
2. **Akses admin:** mekanisme autentikasi dan bagaimana kredensial admin dikelola.
3. **Layanan peta/rute:** tile provider OSM dan endpoint routing yang ketentuannya sesuai. OSRM publik adalah prototipe tanpa jaminan ketersediaan.
4. **RajaOngkir:** uji penghitungan harga JNE/J&T terhadap alamat tujuan nyata dan pastikan cakupan layanan sesuai akun.
5. **WhatsApp otomatis:** jenis akun/API, konfigurasi pesan, biaya, serta mekanisme retry/log.
6. **Upload bukti:** R2 privat dipilih; atur retensi dan endpoint akses admin saat dashboard dibuat.
7. **Detail produk:** pilihan bahan/ukuran/warna/desain nomor akrilik dan harga.
8. **Tarif kurir dekat:** RajaOngkir tetap dipakai untuk kurir ekspedisi walaupun jarak kurang dari 40 km; perlu tentukan pilihan kurir dan apakah pelanggan memilih layanan atau sistem memberi daftar.
9. **Aset frontend:** pilih foto Unsplash yang relevan, versi Font Awesome, dan URL CDN saat implementasi; siapkan fallback jika aset eksternal gagal dimuat.
10. **Identitas visual:** konfirmasi nama usaha/brand pengganti placeholder �ruma.� dan pilih foto produk/rumah final.

## Catatan risiko

- Layanan tile publik OSM dan server demo OSRM dapat membatasi atau menghentikan akses; jangan jadikan dependency tanpa rencana pengganti untuk operasi nyata.
- Rute OSRM yang dipanggil browser serta koordinat asal sementara belum cocok untuk penetapan ongkir final; pindahkan kalkulasi ke backend dan verifikasi titik asal sebelum pemakaian nyata.
- Halaman frontend saat ini belum diverifikasi di browser pada perangkat sasaran.
- Koordinat rumah dan bukti transfer sensitif. Batasi akses Sheet/R2 dan jangan membuat file bukti publik.
- Kode referensi pembayaran harus unik dan tidak boleh menjadi satu-satunya pengaman dashboard/admin.
- WhatsApp otomatis dan API ekspedisi mungkin memerlukan pendaftaran/biaya; klaim "semua gratis" perlu diverifikasi per layanan sebelum rilis.

## Cara melanjutkan di sesi berikutnya

Lanjutkan dengan mengaktifkan R2 di Dashboard Cloudflare, membuat bucket privat `ruma-bukti-pembayaran` dan binding `PAYMENT_PROOFS`. Setelah bucket tersedia, terbitkan kode Worker terbaru dan salin ulang `apps-script/Code.gs` ke Apps Script, lalu buat deployment Web App versi baru. Jangan menaruh API key atau kredensial di frontend/repository publik.
