# Sistem Pendataan Pendukung Berjenjang

Implementasi penuh dari **Product Requirements Document (PRD) Sistem Pendataan Pendukung Berjenjang** menggunakan arsitektur modern **Next.js (Frontend)** dan **Laravel 12 API (Backend)**.

---

## 🏛️ Arsitektur Hierarki Komando (4 Tingkat)

```
[ Jenderal Kemenangan (Super Admin) ]
              │
              ▼
    [ PIC (Koordinator MC) ]  (Level 1 Admin Wilayah)
              │
              ▼
  [ MC (Koordinator Anggota) ] ── (Batas Ketat Maks. 10 Anggota / MC)
              │
              ▼
   [ Anggota (Pendukung) ]
```

| Tingkat | Peran | Akses Utama & Tanggung Jawab |
|---|---|---|
| **Tier 1** | **Jenderal Kemenangan** | Super Admin. Command Center nasional, manajemen PIC & MC, sebaran anggota per wilayah, dan audit trail log. |
| **Tier 2** | **PIC (Koordinator MC)** | Level 1 Admin. Rekapitulasi wilayah, pendaftaran MC baru, pengawasan kuota MC dan anggota di wilayahnya. |
| **Tier 3** | **MC (Koordinator Anggota)** | Field Officer. Mengkoordinasikan **maksimal 10 anggota**, kontrol penuh CRUD anggota, link pendaftaran unik, progress bar (0/10). |
| **Tier 4** | **Anggota (Pendukung)** | Mendaftar mandiri lewat link pendaftaran unik milik MC, atau didaftarkan langsung oleh MC. Anggota tidak memiliki akun login. |

---

## 🚀 Fitur Utama MVP Sesuai PRD

### 1. Registrasi Anggota (Hybrid System - PRD 3.1)
- **Pendaftaran Mandiri (Self-Registration)**: Calon pemilih mendaftar lewat link pendaftaran unik milik MC (`/daftar/[token]`) dan otomatis masuk ke kelompok MC tersebut. Token dibuat otomatis saat MC dibuat dan berbeda untuk setiap MC. Wajib NIK (16 digit), Nama, No WhatsApp, dan Domisili TPS.
- **Pendaftaran via MC (Input Manual/CRUD)**: Membantu pemilih di lapangan yang tidak memiliki smartphone atau mengalami kendala teknis.
- **Batas Kuota Ketat Maksimal 10**: Form pendaftaran otomatis dinonaktifkan jika kuota 10 orang sudah terpenuhi. Upaya penambahan ke-11 akan ditolak otomatis oleh backend (`error_code: QUOTA_FULL`).
- **Unisitas Data**: Pencegahan ketat terhadap duplikasi NIK dan Nomor WhatsApp.

### 2. Grup Koordinasi WhatsApp
- Setelah pendaftaran berhasil, anggota langsung diarahkan ke Grup Koordinasi WhatsApp resmi wilayahnya.

### 3. Dashboard Berjenjang & Log Activity / Audit Trail (PRD 3.3)
- **Dashboard Jenderal**: Ringkasan nasional (total PIC, MC, anggota, capaian kuota), sebaran anggota per wilayah, MC teratas, pendaftar terbaru, dan aktivitas terbaru.
- **Dashboard PIC**: Rekapitulasi wilayah, daftar MC beserta kuota anggotanya, tambah MC, dan detail anggota per MC.
- **Dashboard MC**: Kuota tracker (0/10), link pendaftaran unik (salin & bagikan), serta fungsi CRUD anggota.
- **Log Activity (Immutable Audit Trail)**: Pencatatan waktu presisi, peran, User ID, jenis aksi (`MEMBER_REGISTER`, `CREATE_MC`, `AUTH_LOGIN`, `REGISTER_REJECTED_QUOTA_FULL`, dll.), deskripsi perubahan, serta IP address.

---

## 🛠️ Tech Stack

- **Backend**: Laravel 12 (PHP 8.2), SQLite / Eloquent ORM, Laravel Sanctum, RESTful API.
- **Frontend**: Next.js 16 (App Router, Turbopack, React 19, TypeScript), Tailwind CSS, Lucide Icons, Canvas Confetti.

---

## ⚡ Cara Menjalankan Aplikasi

### 1. Backend (Laravel API)
```bash
cd backend
# Database SQLite & migrasi otomatis sudah terkonfigurasi
php artisan serve --port=8000
```
Backend API berjalan di: `http://127.0.0.1:8000/api`

### 2. Frontend (Next.js)
```bash
cd frontend
npm run dev
```
Aplikasi web berjalan di: `http://localhost:3000`

---

## 🔗 Panduan Halaman & Demo Akun

- **Portal Utama**: [http://localhost:3000](http://localhost:3000)
- **Command Center Jenderal**: [http://localhost:3000/dashboard/jenderal](http://localhost:3000/dashboard/jenderal)
- **Dashboard PIC Wilayah**: [http://localhost:3000/dashboard/pic](http://localhost:3000/dashboard/pic)
- **Dashboard MC Lapangan**: [http://localhost:3000/dashboard/mc](http://localhost:3000/dashboard/mc)
  - Demo MC Aktif (7/10): `Ridwan Kamil` (login: `081234567801`)
  - Demo MC Kuota Penuh (10/10): `Dedi Kusnandar` (login: `081234567803`)
- **Pendaftaran Anggota**: link `/daftar/[token]` per MC — salin dari kolom *Link Pendaftaran* di menu MC.
- **Audit Trail Log**: [http://localhost:3000/audit](http://localhost:3000/audit)
