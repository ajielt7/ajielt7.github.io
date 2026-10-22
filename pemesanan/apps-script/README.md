# Penghubung Google Sheets

`Code.gs` adalah endpoint Web App Apps Script yang menerima pesanan dari Cloudflare Worker dan menambahkannya ke tab `Pesanan`. Baris judul dibuat otomatis jika tab kosong. Permintaan berulang dengan `clientRequestId` yang sama mengembalikan pesanan yang sudah ada agar tidak membuat duplikat. Aksi `authorizeProof` dan `attachProof` memverifikasi pesanan lalu mencatat key gambar bukti yang disimpan privat di Cloudflare R2.

## Pasang ke Google Sheet

1. Buka Google Sheet `Pemesanan Nomor Rumah Akrilik`.
2. Pilih **Ekstensi > Apps Script**. Beri nama project `Pemesanan Nomor Rumah Akrilik API`.
3. Ganti isi `Code.gs` bawaan dengan file `Code.gs` di folder ini, lalu simpan.
4. Buka **Project Settings > Script Properties**, tambahkan:

   | Property | Value |
   | --- | --- |
   | `SPREADSHEET_ID` | ID spreadsheet dari URL Google Sheets |
   | `WORKER_SHARED_TOKEN` | Token acak panjang yang sama dengan secret Worker `GOOGLE_SCRIPT_TOKEN` |

5. Pilih **Deploy > New deployment > Web app**. Jalankan sebagai akun pemilik Sheet. Atur akses agar Worker dapat memanggil URL tanpa login Google; endpoint memeriksa token sebelum menjalankan aksi.
6. Salin URL Web App berakhiran `/exec` dan simpan sebagai Worker secret `GOOGLE_APPS_SCRIPT_URL`.
7. Simpan token yang sama sebagai Worker secret `GOOGLE_SCRIPT_TOKEN`. Jangan masukkan nilainya ke source, GitHub, atau `ApiKey.txt`.

Apps Script memakai `SPREADSHEET_ID` untuk membuka spreadsheet dan mengelola tab `Pesanan`. Jangan bagikan spreadsheet ke publik. Permintaan Worker mengirim token pada body, bukan pada URL.

## Kolom yang dibuat

`order_id`, `client_request_id`, `payment_code`, `created_at`, identitas/alamat pelanggan, tujuan, rincian produk JSON, subtotal, kurir/layanan/ongkir, total, status pembayaran/pesanan, object key bukti R2, waktu ACC, admin, dan catatan admin.

Status awal adalah `MENUNGGU_PEMBAYARAN`. Apps Script tidak menyimpan konten gambar; kolom `proof_file_id` berisi object key privat R2 dan `proof_uploaded_at` berisi waktu unggah. Kode Apps Script perlu diperbarui dan deployment Web App diterbitkan sebagai versi baru setelah perubahan.
