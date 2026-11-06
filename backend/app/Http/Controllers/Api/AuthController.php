<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\Jenderal;
use App\Models\Pic;
use App\Models\Mc;
use App\Models\Anggota;
use App\Models\LogActivity;
use App\Services\RbacService;
use App\Http\Middleware\EnsureRole;

class AuthController extends Controller
{
    /**
     * Login tunggal: peran (Jenderal / PIC / MC) dideteksi otomatis dari akun
     */
    public function login(Request $request)
    {
        $request->validate([
            'identifier' => 'required|string', // email (Jenderal) atau nomor WhatsApp (PIC/MC)
            'password' => 'required|string',
        ]);

        $identifier = trim($request->identifier);
        $password = $request->password;

        // Peran ditentukan otomatis dari akun yang cocok
        $candidates = str_contains($identifier, '@')
            ? [Jenderal::where('email', $identifier)->first()]
            : [
                Pic::where('no_hp', $identifier)->first(),
                Mc::where('no_hp', $identifier)->first(),
            ];

        $user = collect($candidates)
            ->filter()
            ->first(fn ($account) => $account->password && Hash::check($password, $account->password));

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Email/nomor WhatsApp atau kata sandi salah.',
            ], 401);
        }

        $role = EnsureRole::roleOf($user);

        LogActivity::log($role, $user->id, 'AUTH_LOGIN', "Pengguna {$user->nama} login sebagai peran {$role}");

        $token = $user->createToken("{$role}-token")->plainTextToken;

        $permissions = RbacService::getPermissions($role);

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil sebagai ' . strtoupper($role),
            'data' => [
                'role' => $role,
                'user' => [
                    'id' => $user->id,
                    'nama' => $user->nama,
                    'email' => $user->email ?? null,
                    'no_hp' => $user->no_hp ?? null,
                    'wilayah' => $user->wilayah ?? ($user->pic->wilayah ?? null),
                    'link_token' => $user->link_token ?? null,
                    'must_change_password' => (bool) $user->must_change_password,
                ],
                'permissions' => $permissions,
                'token' => $token,
            ],
        ]);
    }

    /**
     * Ganti password akun yang sedang login. Sesi di perangkat lain ikut dicabut.
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed|different:current_password',
        ], [
            'password.min' => 'Kata sandi baru minimal 8 karakter.',
            'password.confirmed' => 'Konfirmasi kata sandi baru tidak cocok.',
            'password.different' => 'Kata sandi baru harus berbeda dari kata sandi lama.',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Kata sandi lama salah.',
                'errors' => ['current_password' => ['Kata sandi lama salah.']],
            ], 422);
        }

        $user->forceFill([
            'password' => Hash::make($request->password),
            'must_change_password' => false,
        ])->save();

        $currentTokenId = $user->currentAccessToken()?->id;
        $user->tokens()->where('id', '!=', $currentTokenId)->delete();

        $role = EnsureRole::roleOf($user);
        LogActivity::log($role, $user->id, 'PASSWORD_CHANGED', "Pengguna {$user->nama} mengganti kata sandi");

        return response()->json([
            'success' => true,
            'message' => 'Kata sandi berhasil diganti.',
        ]);
    }

    /**
     * Lupa password: teruskan permintaan reset ke atasan (PIC -> Jenderal, MC -> PIC).
     * Respons selalu sama agar tidak bisa dipakai menebak akun yang terdaftar.
     */
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'identifier' => 'required|string|max:100',
        ]);

        $identifier = trim($request->identifier);

        if (!str_contains($identifier, '@')) {
            $account = Pic::where('no_hp', $identifier)->first() ?? Mc::where('no_hp', $identifier)->first();

            if ($account) {
                $account->forceFill(['password_reset_requested_at' => now()])->save();

                $role = EnsureRole::roleOf($account);
                $atasan = $role === 'pic' ? 'Jenderal' : 'PIC';
                LogActivity::log($role, $account->id, 'PASSWORD_RESET_REQUESTED', "{$account->nama} meminta reset kata sandi (diteruskan ke {$atasan})");
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Jika nomor terdaftar, permintaan reset sudah diteruskan ke atasan Anda. Mereka akan mengirimkan kata sandi sementara lewat WhatsApp.',
        ]);
    }

    /**
     * Logout: cabut token yang sedang dipakai agar tidak bisa digunakan lagi
     */
    public function logout(Request $request)
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.',
        ]);
    }

}
