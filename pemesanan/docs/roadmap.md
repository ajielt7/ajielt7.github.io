# Roadmap

Urutan ini memprioritaskan alur pesanan yang dapat diuji dari ujung ke ujung. Tahap dapat disesuaikan setelah batasan layanan gratis tervalidasi.

## Tahap 0 — Sepakati kebutuhan dan keputusan teknis

- Finalisasi opsi/atribut nomor rumah akrilik, rekening dan instruksi transfer.
- Pilih jalur Cloudflare ke Google Sheets dan Cloudflare R2.
- Verifikasi akses dan batas API RajaOngkir, peta/routing, serta WhatsApp.
- **Selesai jika:** dokumen `requirements.md`, `architecture.md`, dan `state.md` tidak memiliki keputusan penghambat untuk MVP.

## Tahap 1 — Prototipe frontend dan ongkir

- [x] Buat formulir produk, kontak/alamat, dan keranjang checkout.
- [ ] Sambungkan kembali peta, perhitungan ojol, serta estimasi OSRM setelah alur ongkir ekspedisi stabil.
- [ ] Tinjau katalog dan alur checkout di ponsel/desktop.
- **Selesai jika:** alur dapat dicoba di ponsel/desktop dan opsi/ongkir sesuai kasus uji yang disepakati.

## Tahap 2 — Backend dan pencatatan pesanan

- [x] Buat Cloudflare Worker API `pemesanan-api` dan validasi input.
- [x] Buat endpoint order dan generator kode referensi pembayaran.
- [x] Siapkan adapter Apps Script untuk menyimpan order ke Google Sheets.
- [x] Pasang Apps Script dan isi Script Properties/Worker secrets untuk pesanan.
- [x] Hubungkan pencarian tujuan dan kalkulasi ongkir RajaOngkir JNE/J&T (bobot contoh 500 gram/item; respons live perlu dikonfirmasi).
- **Selesai jika:** pesanan dan totalnya tersimpan konsisten, kode checkout dapat dicari, serta request tidak valid ditolak.

## Tahap 3 — Transfer manual dan bukti pembayaran

- Tampilkan rekening dan instruksi untuk mencantumkan kode pada deskripsi transfer.
- [x] Siapkan form upload screenshot JPG/PNG/WebP maksimal 5 MB dan endpoint penyimpanan privat R2.
- [x] Siapkan Apps Script untuk mengaitkan object key dan waktu upload ke pesanan di Sheet.
- [ ] Aktifkan R2, buat bucket privat `ruma-bukti-pembayaran`, dan ikat ke Worker sebagai `PAYMENT_PROOFS`.
- [ ] Terbitkan kode Worker dan deployment Apps Script versi terbaru.
- **Selesai jika:** admin dapat menemukan bukti dari kode pesanan tanpa akses publik ke file.

## Tahap 4 — Dashboard admin dan ACC

- Tambahkan autentikasi admin dan daftar/detail pesanan.
- Tampilkan bukti privat, kode, nilai yang diharapkan, dan status untuk dicocokkan dengan mutasi bank.
- Sediakan aksi ACC dan pencatatan waktu/admin yang menyetujui.
- **Selesai jika:** endpoint admin terlindungi dan status hanya berubah melalui aksi terotorisasi.

## Tahap 5 — WhatsApp dan peluncuran

- Siapkan WhatsApp Business Platform/API, template/pesan, opt-in yang diperlukan, dan biaya.
- Kirim konfirmasi setelah ACC; sediakan pencatatan dan penanganan gagal kirim.
- Uji end-to-end, konfigurasi kuota/alert layanan API, publikasi, dan prosedur operasional.
- **Selesai jika:** pesanan uji dapat dibuat, dibayar, diverifikasi, disetujui, dan notifikasi terkirim tanpa membuka data pelanggan ke publik.

## Target publikasi frontend saat ini

Frontend ditempatkan di subfolder `pemesanan/` pada repository Pages `ajielt7/ajielt7.github.io` (branch `master`) agar situs utama tetap utuh. Target URL setelah publikasi: `https://ajielt7.github.io/pemesanan/`.

## Prioritas MVP

MVP adalah satu usaha dan satu tipe produk, tanpa akun pelanggan, tanpa payment gateway, serta verifikasi transfer oleh admin. Integrasi WhatsApp otomatis boleh masuk tahap rilis setelah akses/biaya API dipastikan; kebutuhan akhirnya tetap otomatis setelah ACC.
