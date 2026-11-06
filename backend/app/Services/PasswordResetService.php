<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PasswordResetService
{
    /**
     * Ganti password akun dengan kata sandi sementara.
     * Akun wajib mengganti password saat login berikutnya, dan semua sesi lamanya dicabut.
     */
    public static function issueTemporaryPassword(Model $account): string
    {
        // Tanpa simbol & tanpa huruf mirip (l/1/O/0) agar mudah didiktekan lewat WhatsApp
        $temporary = Str::of(Str::password(12, true, true, false))
            ->replaceMatches('/[lI1O0]/', '')
            ->substr(0, 10)
            ->value();

        $account->forceFill([
            'password' => Hash::make($temporary),
            'must_change_password' => true,
        ]);

        if (array_key_exists('password_reset_requested_at', $account->getAttributes())) {
            $account->password_reset_requested_at = null;
        }

        $account->save();
        $account->tokens()->delete();

        return $temporary;
    }
}
