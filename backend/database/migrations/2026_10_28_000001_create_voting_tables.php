<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Tabel jenderals (Super Admin)
        Schema::create('jenderals', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 100);
            $table->string('email', 100)->unique();
            $table->string('password', 255);
            $table->timestamps();
        });

        // 2. Tabel pics (Koordinator MC / Level 1 Admin Wilayah)
        Schema::create('pics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('jenderal_id')->constrained('jenderals')->onDelete('cascade');
            $table->string('nama', 100);
            $table->string('no_hp', 20)->unique();
            $table->string('wilayah', 100);
            $table->string('password', 255)->nullable();
            $table->timestamps();
        });

        // 3. Tabel mcs (Koordinator Anggota / Field Officer)
        Schema::create('mcs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pic_id')->constrained('pics')->onDelete('cascade');
            $table->string('nama', 100);
            $table->string('no_hp', 20)->unique();
            $table->string('kode_referral', 20)->unique();
            $table->string('password', 255)->nullable();
            $table->timestamps();
        });

        // Tabel Pasangan Calon (Paslon)
        Schema::create('paslons', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('nomor_urut')->unique();
            $table->string('nama_paslon', 150);
            $table->string('slogan', 255)->nullable();
            $table->text('visi_misi')->nullable();
            $table->string('warna_tema', 30)->default('#3b82f6');
            $table->timestamps();
        });

        // 4. Tabel anggotas (Anggota / Pemilih Terdaftar)
        Schema::create('anggotas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mc_id')->constrained('mcs')->onDelete('restrict');
            $table->string('nama', 100);
            $table->string('nik', 16)->unique();
            $table->string('no_hp', 20)->unique();
            $table->string('wilayah', 100);
            $table->string('provinsi', 100)->nullable();
            $table->string('kab_kota', 100)->nullable();
            $table->string('kecamatan', 100)->nullable();
            $table->string('kelurahan', 100)->nullable();
            $table->string('tps', 50)->nullable();
            $table->boolean('is_voted')->default(false);
            $table->enum('created_by', ['self', 'mc'])->default('self');
            $table->timestamps();
        });

        // 5. Tabel votes (Hasil Perolehan Suara - One Man One Vote)
        Schema::create('votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('anggota_id')->unique()->constrained('anggotas')->onDelete('restrict');
            $table->foreignId('paslon_id')->constrained('paslons')->onDelete('restrict');
            $table->timestamp('voted_at')->useCurrent();
        });

        // 6. Tabel log_activities (Immutable Audit Trail)
        Schema::create('log_activities', function (Blueprint $table) {
            $table->id();
            $table->enum('user_type', ['jenderal', 'pic', 'mc', 'anggota', 'system']);
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('action', 100);
            $table->text('description')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        // Tabel OTP / Magic Link untuk Passwordless Whatsapp Auth
        Schema::create('otps', function (Blueprint $table) {
            $table->id();
            $table->string('no_hp', 20);
            $table->string('otp_code', 6);
            $table->string('token', 64)->unique();
            $table->boolean('is_used')->default(false);
            $table->timestamp('expires_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('otps');
        Schema::dropIfExists('log_activities');
        Schema::dropIfExists('votes');
        Schema::dropIfExists('anggotas');
        Schema::dropIfExists('paslons');
        Schema::dropIfExists('mcs');
        Schema::dropIfExists('pics');
        Schema::dropIfExists('jenderals');
    }
};
