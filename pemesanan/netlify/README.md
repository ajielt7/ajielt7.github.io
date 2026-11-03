# Percobaan API Netlify

Netlify Functions membungkus `worker/index.js`, sehingga aturan validasi,
Apps Script, RajaOngkir, dan endpoint admin tetap memakai implementasi yang sama.

## Pengaturan site

1. Impor repository `ajielt7/ajielt7.github.io` ke Netlify.
2. Atur **Base directory** ke `pemesanan`. Konfigurasi `netlify.toml` dan
   semua path build dihitung dari direktori ini.
3. Di **Environment variables**, isi nama berikut memakai nilai yang sama
   dengan secret Cloudflare Worker: `RAJAONGKIR_API_KEY`,
   `GOOGLE_APPS_SCRIPT_URL`, `GOOGLE_SCRIPT_TOKEN`, dan `ADMIN_TOKEN`.
   Pastikan scope tiap variabel mencakup **Functions**. Jangan commit nilai secret.
4. Deploy site. Perubahan environment variables baru berlaku setelah deploy.
5. Uji `https://<nama-site>.netlify.app/health` lewat halaman GitHub Pages
   atau aplikasi. API mempertahankan pemeriksaan CORS yang sama.

Site ini hanya backend percobaan. Ganti URL API aplikasi setelah endpoint lolos
uji jaringan seluler dan alur pesanan. Untuk unggah bukti, jaga ukuran request
JSON di bawah batas 6 MB Netlify Functions; unggahan base64 perlu dikompresi
hingga sekitar 4 MB.
