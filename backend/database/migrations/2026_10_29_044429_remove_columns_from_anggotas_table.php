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
        // Hapus kolom dari tabel anggotas
        Schema::table('anggotas', function (Blueprint $table) {
            $table->dropColumn([
                'wilayah',
                'provinsi',
                'kab_kota',
                'kecamatan',
                'kelurahan',
                'tps',
                'is_voted',
            ]);
        });

        // Hapus foreign key paslon_id dari tabel votes
        Schema::table('votes', function (Blueprint $table) {
            $table->dropForeign(['paslon_id']);
        });

        // Hapus kolom paslon_id dari tabel votes
        Schema::table('votes', function (Blueprint $table) {
            $table->dropColumn('paslon_id');
        });

        // Hapus tabel paslons
        Schema::dropIfExists('paslons');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Kembalikan kolom anggotas
        Schema::table('anggotas', function (Blueprint $table) {
            $table->string('wilayah', 100)->nullable();
            $table->string('provinsi', 100)->nullable();
            $table->string('kab_kota', 100)->nullable();
            $table->string('kecamatan', 100)->nullable();
            $table->string('kelurahan', 100)->nullable();
            $table->string('tps', 50)->nullable();
            $table->boolean('is_voted')->default(false);
        });
    }
};
