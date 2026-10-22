# Sistem Pemesanan Nomor Rumah Akrilik

Proyek percobaan untuk membangun sistem pemesanan barang fisik (awal: nomor rumah akrilik) dengan layanan gratis atau berbiaya rendah. Pelanggan memesan tanpa akun, memilih pengiriman, membayar melalui transfer bank manual, lalu admin mencocokkan pembayaran dan menyetujui pesanan.

## Rancangan teknologi

- **Frontend:** GitHub Pages.
- **Aset frontend sementara:** foto dari Unsplash dan ikon Font Awesome melalui CDN.
- **Backend/API:** Cloudflare Workers.
- **Database pesanan:** Google Sheets.
- **Bukti transfer:** Google Drive; Sheet menyimpan metadata dan referensi file.
- **Peta/rute:** pemilihan titik lokasi dan perhitungan rute sementara dihapus dari prototipe. Dapat diaktifkan kembali setelah alur checkout dan layanan jarak diputuskan.

## Alur ringkas

1. Pelanggan memilih produk dan memasukkan kontak serta alamat tertulis.
2. Metode dan ongkir pengiriman dikonfirmasi manual setelah alamat diperiksa.
3. Pelanggan mentransfer ke rekening usaha, mencantumkan kode pada deskripsi transfer, lalu mengunggah screenshot bukti.
4. Admin memeriksa bukti dan mutasi bank melalui dashboard, kemudian menyetujui pesanan secara manual.
5. Setelah ACC, sistem mengirim WhatsApp otomatis. Integrasi WhatsApp Business Platform/API dan biayanya masih perlu dipastikan.

## Dokumentasi proyek

- [Kebutuhan produk](docs/requirements.md)
- [Arsitektur](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Status, keputusan, dan pekerjaan lanjutan](docs/state.md)

## Publikasi GitHub Pages

Rencana publikasi saat ini adalah menaruh aplikasi di folder `pemesanan/` pada repository Pages `ajielt7/ajielt7.github.io`, sehingga situs utama tidak tertimpa. Jika file aplikasi ditempatkan di folder tersebut pada branch yang dipakai Pages, alamatnya menjadi `https://ajielt7.github.io/pemesanan/`.

## Status

Prototipe frontend pemesanan sudah dibuat. Backend belum terhubung: pesanan tidak tersimpan, kode pembayaran belum dibuat, bukti belum diunggah, dan ongkir belum dihitung. Titik lokasi rumah sementara dihapus dari checkout. Lihat [state.md](docs/state.md) untuk status dan keputusan teknis terbuka.

