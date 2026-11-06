<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fitur e-voting dihapus: buang tabel suara dan OTP login pemilih.
     */
    public function up(): void
    {
        Schema::dropIfExists('votes');
        Schema::dropIfExists('otps');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('anggota_id')->unique()->constrained('anggotas')->onDelete('restrict');
            $table->timestamp('voted_at')->useCurrent();
        });

        Schema::create('otps', function (Blueprint $table) {
            $table->id();
            $table->string('no_hp', 20)->index();
            $table->string('otp_code', 6);
            $table->string('token', 100)->nullable()->unique();
            $table->boolean('is_used')->default(false);
            $table->timestamp('expires_at');
            $table->timestamps();
        });
    }
};
