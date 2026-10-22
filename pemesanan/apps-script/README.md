# Penghubung Google Sheets

`Code.gs` adalah endpoint Web App Apps Script yang menerima pesanan dari Cloudflare Worker dan menambahkannya ke tab `Pesanan`. Baris judul dibuat otomatis jika tab kosong. Permintaan berulang dengan `clientRequestId` yang sama mengembalikan pesanan yang sudah ada agar tidak membuat duplikat. Aksi `uploadProof` memverifikasi kode pesanan dan nomor WhatsApp, membuat folder Drive `Bukti Pembayaran` bila belum ada, menyimpan gambar di folder privat tersebut, lalu mencatat ID file dan waktu unggah di Sheet.

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

Saat pertama kali mengunggah bukti, Google akan meminta izin akses Google Drive. Setujui sebagai pemilik project karena Apps Script perlu membuat folder dan file bukti. Folder `Bukti Pembayaran` dibuat otomatis di Drive pemilik Web App dan jangan dibagikan dengan akses publik. Setelah menambahkan kode baru, perbarui deployment lewat **Deploy > Manage deployments > Edit > New version > Deploy**.

Untuk membuat folder sebelum ada pesanan pertama, pilih fungsi `setupProofFolder` di toolbar editor Apps Script, klik **Jalankan**, lalu setujui izin Google Drive. Folder akan muncul di Drive akun pemilik project. Jangan ubah setelan berbagi folder menjadi publik.

Apps Script memakai `SPREADSHEET_ID` untuk membuka spreadsheet dan mengelola tab `Pesanan`. Jangan bagikan spreadsheet ke publik. Permintaan Worker mengirim token pada body, bukan pada URL.

## Kolom yang dibuat

`order_id`, `client_request_id`, `payment_code`, `created_at`, identitas/alamat pelanggan, tujuan, rincian produk JSON, subtotal, kurir/layanan/ongkir, total, status pembayaran/pesanan, ID file bukti Drive, waktu unggah, waktu ACC, admin, dan catatan admin.

Status awal adalah `MENUNGGU_PEMBAYARAN`. Apps Script menyimpan gambar di Google Drive; kolom `proof_file_id` berisi ID Drive dan `proof_uploaded_at` berisi waktu unggah. File tidak dibagikan publik. Admin dapat menemukannya dari ID file saat dashboard admin dibuat.

