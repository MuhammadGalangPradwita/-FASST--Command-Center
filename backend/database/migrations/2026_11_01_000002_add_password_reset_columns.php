<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Dukungan ganti password & reset password oleh atasan.
     */
    public function up(): void
    {
        // Wajib ganti password setelah login dengan kata sandi sementara
        foreach (['jenderals', 'pics', 'mcs'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->boolean('must_change_password')->default(false);
            });
        }

        // Permintaan reset dari halaman "Lupa kata sandi" (ditangani atasan)
        foreach (['pics', 'mcs'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->timestamp('password_reset_requested_at')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (['pics', 'mcs'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropColumn('password_reset_requested_at');
            });
        }

        foreach (['jenderals', 'pics', 'mcs'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropColumn('must_change_password');
            });
        }
    }
};
