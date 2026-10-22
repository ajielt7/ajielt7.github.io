# Sistem Pemesanan Nomor Rumah Akrilik

Proyek percobaan untuk membangun sistem pemesanan barang fisik (awal: nomor rumah akrilik) dengan layanan gratis atau berbiaya rendah. Pelanggan memesan tanpa akun, memilih pengiriman, membayar melalui transfer bank manual, lalu admin mencocokkan pembayaran dan menyetujui pesanan.

## Rancangan teknologi

- **Frontend:** GitHub Pages.
- **Aset frontend sementara:** foto dari Unsplash dan ikon Font Awesome melalui CDN.
- **Backend/API:** Cloudflare Worker `pemesanan-api` untuk pencarian tujuan dan perhitungan tarif beberapa ekspedisi.
- **Database pesanan:** Google Sheets.
- **Bukti transfer:** Cloudflare R2 privat; Sheet hanya menyimpan object key dan waktu unggah.
- **Ongkir ekspedisi:** API RajaOngkir V2 melalui Worker; key disimpan sebagai secret Cloudflare. Pencarian lokasi dicache bertahap sebagai JSON selama 30 hari dan tarif tetap dihitung real-time. Bobot sementara 500 gram per item.
- **Peta/rute:** pemilihan titik lokasi dan perhitungan rute sementara dihapus dari prototipe. Dapat diaktifkan kembali setelah alur checkout dan layanan jarak diputuskan.

## Alur ringkas

1. Pelanggan memilih produk dan memasukkan kontak serta alamat tertulis.
2. Pelanggan memilih kelurahan/kecamatan/kota dari pencarian RajaOngkir. Hasil yang sudah dicari memakai Workers Cache; setelah tujuan dipilih dan keranjang terisi, sistem menghitung tarif beberapa ekspedisi dan otomatis memilih yang termurah. Layanan kargo ditampilkan bila tersedia.
3. Pelanggan mentransfer ke rekening usaha, mencantumkan kode pada deskripsi transfer, lalu mengunggah screenshot JPG/PNG/WebP (maksimal 5 MB). Worker memverifikasi pesanan dan menyimpan gambar privat di R2.
4. Admin memeriksa bukti dan mutasi bank melalui dashboard, kemudian menyetujui pesanan secara manual.
5. Setelah ACC, sistem mengirim WhatsApp otomatis. Integrasi WhatsApp Business Platform/API dan biayanya masih perlu dipastikan.

## Dokumentasi proyek

- [Kebutuhan produk](docs/requirements.md)
- [Arsitektur](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Status, keputusan, dan pekerjaan lanjutan](docs/state.md)
- [Pemasangan penghubung Google Sheets](apps-script/README.md)

## Publikasi GitHub Pages

Frontend berada di folder `pemesanan/` pada repository Pages `ajielt7/ajielt7.github.io`: `https://ajielt7.github.io/pemesanan/`.

## Status

Checkout, integrasi Worker RajaOngkir, endpoint pesanan, dan upload bukti R2 sudah disiapkan di source. Apps Script dan Worker secrets sudah dikonfigurasi, tetapi R2 perlu diaktifkan di Cloudflare, bucket dibuat dan diikat ke Worker, lalu kode Apps Script/Worker terbaru diterbitkan. Dashboard ACC manual dan akses admin melihat bukti masih tahap berikutnya. Bobot katalog masih contoh. Lihat [state.md](docs/state.md) untuk status dan keputusan teknis terbuka.
