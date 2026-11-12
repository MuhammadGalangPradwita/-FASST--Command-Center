<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Link undangan grup WhatsApp milik PIC. Anggota yang mendaftar lewat
     * link MC di bawah PIC ini diarahkan ke grup tersebut.
     */
    public function up(): void
    {
        Schema::table('pics', function (Blueprint $table) {
            $table->string('wa_group_link', 255)->nullable()->after('wilayah');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pics', function (Blueprint $table) {
            $table->dropColumn('wa_group_link');
        });
    }
};
