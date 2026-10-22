# Sistem Pemesanan Nomor Rumah Akrilik

Proyek percobaan untuk membangun sistem pemesanan barang fisik (awal: nomor rumah akrilik) dengan layanan gratis atau berbiaya rendah. Pelanggan memesan tanpa akun, memilih pengiriman, membayar melalui transfer bank manual, lalu admin mencocokkan pembayaran dan menyetujui pesanan.

## Rancangan teknologi

- **Frontend:** GitHub Pages.
- **Aset frontend sementara:** foto dari Unsplash dan ikon Font Awesome melalui CDN.
- **Backend/API:** Cloudflare Worker `pemesanan-api` untuk pencarian tujuan dan perhitungan tarif JNE/J&T.
- **Database pesanan:** Google Sheets.
- **Bukti transfer:** Google Drive; Sheet menyimpan metadata dan referensi file.
- **Ongkir ekspedisi:** API RajaOngkir V2 melalui Worker; key disimpan sebagai secret Cloudflare. Pencarian lokasi dicache bertahap sebagai JSON selama 30 hari dan tarif tetap dihitung real-time. Bobot sementara 500 gram per item.
- **Peta/rute:** pemilihan titik lokasi dan perhitungan rute sementara dihapus dari prototipe. Dapat diaktifkan kembali setelah alur checkout dan layanan jarak diputuskan.

## Alur ringkas

1. Pelanggan memilih produk dan memasukkan kontak serta alamat tertulis.
2. Pelanggan memilih kelurahan/kecamatan/kota dari pencarian RajaOngkir. Hasil yang sudah dicari memakai Workers Cache; tarif JNE/J&T tetap dihitung real-time berdasarkan bobot contoh.
3. Pelanggan mentransfer ke rekening usaha, mencantumkan kode pada deskripsi transfer, lalu mengunggah screenshot bukti.
4. Admin memeriksa bukti dan mutasi bank melalui dashboard, kemudian menyetujui pesanan secara manual.
5. Setelah ACC, sistem mengirim WhatsApp otomatis. Integrasi WhatsApp Business Platform/API dan biayanya masih perlu dipastikan.

## Dokumentasi proyek

- [Kebutuhan produk](docs/requirements.md)
- [Arsitektur](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Status, keputusan, dan pekerjaan lanjutan](docs/state.md)

## Publikasi GitHub Pages

Frontend berada di folder `pemesanan/` pada repository Pages `ajielt7/ajielt7.github.io`: `https://ajielt7.github.io/pemesanan/`.

## Status

Prototipe checkout dan integrasi Worker RajaOngkir sudah disiapkan. Respons live RajaOngkir belum diverifikasi dari sesi ini. Pesanan tetap belum tersimpan; kode pembayaran dan unggah bukti belum tersedia. Bobot katalog masih contoh. Lihat [state.md](docs/state.md) untuk status dan keputusan teknis terbuka.

