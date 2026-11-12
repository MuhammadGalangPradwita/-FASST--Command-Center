#!/bin/sh
# Bikin 1 akun Jenderal (Super Admin) baru — aman untuk produksi.
# Tidak membuat data demo apa pun. Kalau email sudah ada, password-nya diperbarui.
#
# Cara pakai (jalankan dari dalam folder "backend"):
#   sh create-jenderal.sh "email@domain.id" "PasswordKuat123" "Nama Jenderal"
#
# Contoh:
#   sh create-jenderal.sh "admin@quickcountfast.site" "Rahasia#2024" "Jenderal Pemenangan"

set -eu

EMAIL="${1:-}"
PASSWORD="${2:-}"
NAMA="${3:-Jenderal Pemenangan}"

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo "Pemakaian: sh create-jenderal.sh <email> <password> [nama]"
  exit 1
fi

if [ ! -f artisan ]; then
  echo "ERROR: jalankan script ini dari dalam folder 'backend' (file 'artisan' tidak ditemukan di sini)."
  exit 1
fi

# Lewatkan nilai via environment agar aman dari masalah tanda kutip.
JENDERAL_EMAIL="$EMAIL" JENDERAL_PASSWORD="$PASSWORD" JENDERAL_NAMA="$NAMA" \
php artisan tinker --execute='
  $email = getenv("JENDERAL_EMAIL");
  $pass  = getenv("JENDERAL_PASSWORD");
  $nama  = getenv("JENDERAL_NAMA");
  $j = App\Models\Jenderal::updateOrCreate(
      ["email" => $email],
      ["nama" => $nama, "password" => Illuminate\Support\Facades\Hash::make($pass)]
  );
  echo ($j->wasRecentlyCreated ? "DIBUAT" : "DIPERBARUI")." : Jenderal id={$j->id} email={$j->email} nama={$j->nama}\n";
'

echo "Selesai. Login pakai email di atas + password yang kamu masukkan."
