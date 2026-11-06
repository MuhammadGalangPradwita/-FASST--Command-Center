<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('akun:reset-password {email : Email akun Jenderal}', function (string $email) {
    $jenderal = \App\Models\Jenderal::where('email', $email)->first();

    if (!$jenderal) {
        $this->error("Akun Jenderal dengan email {$email} tidak ditemukan.");
        return 1;
    }

    $temporary = \App\Services\PasswordResetService::issueTemporaryPassword($jenderal);
    \App\Models\LogActivity::log('system', null, 'PASSWORD_RESET', "Kata sandi Jenderal {$jenderal->nama} direset lewat server");

    $this->info("Kata sandi sementara untuk {$jenderal->nama}: {$temporary}");
    $this->line('Jenderal wajib mengganti kata sandi ini saat login berikutnya.');
})->purpose('Reset kata sandi Jenderal (yang tidak punya atasan) dari server');
