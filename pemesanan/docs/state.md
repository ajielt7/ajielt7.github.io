# Status Proyek

Dokumen ini adalah catatan serah-terima utama. Perbarui setiap kali keputusan, implementasi, atau kendala berubah.

## Status saat ini

- **Fase:** aplikasi admin Android dengan antrean order, proses, dan retensi order selesai.
- **Status integrasi:** Worker `pemesanan-api` aktif dengan endpoint `?view=all` dan `/complete`; request tanpa `Origin` hanya diterima pada route admin yang tetap memerlukan bearer token. Source Worker sudah disinkronkan ke GitHub pada 23 Okt 2026. Secret Worker tetap terpasang.
- **Perubahan admin:** aplikasi Flutter memakai tiga tab Orderan baru/Proses/Selesai, token tersimpan terenkripsi Android Keystore, notifikasi polling 45 detik di foreground dan alarm sekitar 15 menit di background. Apps Script lokal mendukung daftar status, penandaan selesai, dan penghapusan baris/bukti Drive setelah tujuh hari.
- **Yang masih perlu dilakukan:** salin dan terbitkan `apps-script/Code.gs` terbaru, jalankan `setupOrderCleanupTrigger` sekali, lalu bangun APK terbaru dan uji alur pada ponsel. Notifikasi latar dapat tertunda oleh mode hemat baterai.
- **Dokumen inti yang tersedia:** README, requirements, architecture, roadmap, state.

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
- Pelanggan mengunggah screenshot bukti pembayaran. File disimpan di folder privat Google Drive `Bukti Pembayaran`; Sheet menyimpan ID file dan waktu unggah.
- Admin mencocokkan pembayaran dengan mutasi bank secara manual dan menekan ACC.
- Setelah ACC, sistem diharapkan mengirim konfirmasi WhatsApp otomatis. Akses/biaya WhatsApp API masih perlu dipastikan.

## Keputusan teknis yang masih terbuka

1. **Konfigurasi Google:** Apps Script Web App dipilih sebagai penghubung. Isi `SPREADSHEET_ID`, `WORKER_SHARED_TOKEN`, `GOOGLE_APPS_SCRIPT_URL`, dan `GOOGLE_SCRIPT_TOKEN` sesuai `apps-script/README.md`.
2. **Akses admin:** mekanisme autentikasi dan bagaimana kredensial admin dikelola.
3. **Layanan peta/rute:** tile provider OSM dan endpoint routing yang ketentuannya sesuai. OSRM publik adalah prototipe tanpa jaminan ketersediaan.
4. **RajaOngkir:** uji penghitungan harga JNE/J&T terhadap alamat tujuan nyata dan pastikan cakupan layanan sesuai akun.
5. **WhatsApp otomatis:** jenis akun/API, konfigurasi pesan, biaya, serta mekanisme retry/log.
6. **Upload bukti:** folder Drive privat `Bukti Pembayaran`; atur retensi dan akses admin saat dashboard dibuat.
7. **Detail produk:** pilihan bahan/ukuran/warna/desain nomor akrilik dan harga.
8. **Tarif kurir dekat:** RajaOngkir tetap dipakai untuk kurir ekspedisi walaupun jarak kurang dari 40 km; perlu tentukan pilihan kurir dan apakah pelanggan memilih layanan atau sistem memberi daftar.
9. **Aset frontend:** pilih foto Unsplash yang relevan, versi Font Awesome, dan URL CDN saat implementasi; siapkan fallback jika aset eksternal gagal dimuat.
10. **Identitas visual:** konfirmasi nama usaha/brand pengganti placeholder �ruma.� dan pilih foto produk/rumah final.

## Catatan risiko

- Layanan tile publik OSM dan server demo OSRM dapat membatasi atau menghentikan akses; jangan jadikan dependency tanpa rencana pengganti untuk operasi nyata.
- Rute OSRM yang dipanggil browser serta koordinat asal sementara belum cocok untuk penetapan ongkir final; pindahkan kalkulasi ke backend dan verifikasi titik asal sebelum pemakaian nyata.
- Halaman frontend saat ini belum diverifikasi di browser pada perangkat sasaran.
- Koordinat rumah dan bukti transfer sensitif. Batasi akses Sheet dan folder Drive; jangan bagikan bukti secara publik.
- Kode referensi pembayaran harus unik dan tidak boleh menjadi satu-satunya pengaman dashboard/admin.
- WhatsApp otomatis dan API ekspedisi mungkin memerlukan pendaftaran/biaya; klaim "semua gratis" perlu diverifikasi per layanan sebelum rilis.

## Cara melanjutkan di sesi berikutnya

Lanjutkan dengan menyalin `apps-script/Code.gs` terbaru ke project Apps Script, memberi izin Google Drive jika diminta, lalu terbitkan deployment Web App versi baru. Jangan menaruh API key atau kredensial di frontend/repository publik.

