<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Ganti kode referral dengan token link pendaftaran unik per MC.
     */
    public function up(): void
    {
        Schema::table('mcs', function (Blueprint $table) {
            $table->string('link_token', 32)->nullable()->unique()->after('no_hp');
        });

        DB::table('mcs')->orderBy('id')->each(function ($mc) {
            DB::table('mcs')->where('id', $mc->id)->update(['link_token' => Str::lower(Str::random(16))]);
        });

        Schema::table('mcs', function (Blueprint $table) {
            $table->dropUnique(['kode_referral']);
            $table->dropColumn('kode_referral');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mcs', function (Blueprint $table) {
            $table->string('kode_referral', 20)->nullable()->unique()->after('no_hp');
        });

        DB::table('mcs')->orderBy('id')->each(function ($mc) {
            DB::table('mcs')->where('id', $mc->id)->update(['kode_referral' => 'REF-' . $mc->id]);
        });

        Schema::table('mcs', function (Blueprint $table) {
            $table->dropUnique(['link_token']);
            $table->dropColumn('link_token');
        });
    }
};
