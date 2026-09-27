# KB TK Khadijah Wonorejo TV

Salinan lokal dari `Extreme-Studios/mugaru-tv`, disesuaikan untuk KB TK Khadijah Wonorejo TV. Repository sumber di GitHub tidak diubah.

## Identitas dan sumber data

- Android application ID: `com.kbtkkhadijahwonorejotv`
- Google Sheet: `https://docs.google.com/spreadsheets/d/1mfkgAA79HFB7d11hHwUx3Jhwvr3ww-nU4BNyakUuAS8/edit`
- Google Drive induk: `https://drive.google.com/drive/u/0/folders/1Rep5ErDUeKsyp_V7_6y-5i0jnvbTakMs`. Subfolder: `Gambar` (cover, ID `14pIbAKaJkS-AX82vfs3xnEldFGR1d5kE`), `Video` (ID `1DpaWdpbRf2OHg4r12T7USvnwokZsMa18`), dan `Poster` (ID `17f2Ijhuj61OUrW2KXZomclikLlAglBc8`). ID ketiganya sudah diisi pada source Apps Script lokal.
- Kanal YouTube: `https://www.youtube.com/@tkkhadijahwonorejo2232`
- Channel ID terverifikasi: `UCt0FwAI34vzhpkFfbpbopng`
- Web App Apps Script: `https://script.google.com/macros/s/AKfycbzQru1H6uJapk-Iws8HgCOCIC6Hm3AMjdRvxZhFha0ry4aBj6iFq7XCwxjCZQZz4PdZFQ/exec` (terpasang pada tiga repository Android).
- Logo sekolah: avatar resmi pada kanal YouTube di atas (`app/src/main/res/drawable/school_logo.jpg`).
- Yayasan: Yayasan Taman Pendidikan dan Sosial Nahdlatul Ulama Khadijah Surabaya. Nama ini tampil di bagian bawah layar loading, beranda, dan profil.
- Animasi splash 4 detik dibuat dari hasil Google Flow: `https://flow.google.com/project/417b30af-7e0b-4ba7-85cd-7097fcd145db`. Revisi lokal memakai logo asli transparan ukuran 200 px pada video 720 px, dengan posisi logo dan judul lebih rendah. Teks `KB TK Khadijah` / `Wonorejo TV`, `Powered By Extreme Studios`, `Versi 1.0.0` tampil langsung di atas latar animasi tanpa kotak. Video 9:16 H.264 720x1280 tersimpan di `app/src/main/res/raw/school_splash.mp4` dan diputar pada pembuka aplikasi. Unggahan revisi ke Flow menunggu persetujuan dialog “Rights to use this video”.

Library Android hanya menampilkan video yang memiliki `source_channel_id` sesuai ID kanal di atas. Backend mengimpor konten kanal ke tab `video`, mengisi kolom sumber tersebut, dan melewati video yang sudah ada. Video dari kanal lain ditolak saat impor.

Pada pemeriksaan 25 September 2026, deployment Apps Script versi 7 terhubung ke Sheet yang benar. Tab `video` berisi 161 video berstatus `approved`: 15 dari impor awal dan 146 dari arsip halaman kanal YouTube. Semua baris memakai `source_channel_id` kanal sekolah. Respons Library dibagi menjadi halaman 40 video; lima halaman versi 6 diuji dan mengembalikan 40 + 40 + 40 + 40 + 1 video dengan total 161 dan ID kanal yang benar. Versi 7 menambahkan tanggal pada respons dan halaman pertamanya diuji HTTP 200.
Android mengambil seluruh halaman Library dan menyatukannya. Batas tunggu tiap halaman serta Board Info adalah 45 detik.

Pada pemeriksaan kanal 25 September 2026, halaman playlist publik menampilkan `Ibadah Haji`, `Surat-Surat Pendek`, dan `KB-TK Khadijah Wonorejo`. Kategori 161 video di Sheet sudah disesuaikan: 8, 17, dan 6 video pada masing-masing playlist; 130 video lain memakai `Video Kanal`. Endpoint versi 7 sudah mengembalikan empat kategori tersebut. Satu video pada halaman playlist publik tidak ditemukan di 161 video kanal yang terimpor; kepemilikan video itu belum diverifikasi, sehingga belum dimasukkan ke Library.

Layar pemutar lokal memakai YouTube embedded player dalam WebView dengan HTTP Referer aplikasi. Tidak diperlukan YouTube Data API key untuk pemutaran embed. YouTube tetap dapat menolak embed pada video tertentu bila pemilik video membatasi pemutaran sematan.

## Pemeriksaan 26 September 2026

- Deployment baru yang dipasang pengguna sudah aktif. `YOUTUBE_API_KEY` sudah diisi pada Script Properties menggunakan key yang disetujui pengguna; nilainya tidak disimpan di source.
- Impor channel lewat deployment tersebut berhasil: total 171 video; 171 dilewati karena sudah ada. Endpoint Library mengembalikan total 171 video dengan kategori `Ibadah Haji`, `KB-TK Khadijah Wonorejo`, `Surat-Surat Pendek`, dan `Video Kanal`.
- AdMob SDK dan konfigurasi unit iklan yang belum dipakai dihapus. Build debug melalui Android Studio berhasil, lalu aplikasi terpasang dan terbuka pada Sony SO-03L. Layar Beranda dan Koleksi tampil; satu video kanal dibuka dan mulai diputar pada pemutar YouTube di dalam aplikasi.
- APK debug ada di `app/build/intermediates/apk/debug/app-debug.apk`. Pemeriksaan ini tidak mencakup semua video atau perangkat Android lain.
- Tab `admin` tidak diberi akun `admin/admin` bawaan. Admin perlu disiapkan dengan kredensial yang aman sebelum fitur admin dipakai.

## Perubahan berikutnya

- Ikon pada layar pembuka bawaan Android dibuat transparan; video splash sekolah tetap diputar. Layar pembuka singkat dari sistem Android tidak bisa dihapus sepenuhnya.
- Layar `Memuat konten...` yang menutup seluruh aplikasi dihapus. Beranda dan tab lain langsung bisa dibuka, dan daftar video diperbarui setelah setiap halaman API diterima. Board Info dimuat terpisah.
- Panel admin, dialog login, pengaturan akun, dan pintu masuk tersembunyi di Profil dihapus dari UI. Backend admin tidak diubah.
- Tab Live hanya memakai hasil pemeriksaan `active_live` dari YouTube Data API untuk kanal sekolah. Rekaman live lama tidak dipakai sebagai pengganti siaran aktif. Pemeriksaan API memakai cache pencarian 20 menit dan mengecek status video pada setiap permintaan.
- Kode `active_live` sudah ada di source Apps Script lokal, tetapi perlu ditempel dan di-redeploy agar tab Live pada APK baru dapat memeriksa siaran. Perubahan Android ini belum berhasil dibangun ulang dari terminal karena Gradle gagal membuat koneksi loopback pada lingkungan ini; APK debug yang tercatat di atas masih build sebelumnya.
- Tulisan `Powered By Extreme Studios` pada video splash diperkecil dari ukuran sekitar 24 px menjadi 14 px. Seluruh 96 frame video diperbarui; durasi tetap 4 detik, H.264 720x1280 24 fps. Salinan video sebelum perubahan ada di `app/build/school_splash_before_powered_resize.mp4`.
- Tulisan `Versi 1.0.0` pada video splash diperkecil dari sekitar 20 px menjadi 12 px, dengan logo, judul, dan `Powered By Extreme Studios` tetap. Frame awal dan akhir diperiksa. Salinan sebelumnya ada di `app/build/school_splash_before_version_resize.mp4`.
- Pada 27 September 2026, Web App yang terpasang masih mengembalikan daftar `films` untuk `?type=active_live`; endpoint baru belum di-redeploy. Ini penyebab pesan `Backend perlu diperbarui untuk status live` pada APK. `?type=portal_posts` merespons sukses dengan nol post; itu keadaan kosong, bukan kegagalan API.
