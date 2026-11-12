<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Data alumni pada anggota: jurusan, angkatan, domisili, pekerjaan,
     * serta kritik & masukan untuk Mas Anto.
     * Semua nullable agar data anggota lama tetap valid.
     */
    public function up(): void
    {
        Schema::table('anggotas', function (Blueprint $table) {
            $table->string('jurusan', 100)->nullable()->after('no_hp');
            $table->unsignedSmallInteger('angkatan')->nullable()->after('jurusan');
            $table->string('domisili', 100)->nullable()->after('angkatan');
            $table->string('pekerjaan', 100)->nullable()->after('domisili');
            $table->text('masukan')->nullable()->after('pekerjaan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('anggotas', function (Blueprint $table) {
            $table->dropColumn(['jurusan', 'angkatan', 'domisili', 'pekerjaan', 'masukan']);
        });
    }
};
