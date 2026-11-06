<?php

namespace App\Http\Middleware;

use App\Models\Jenderal;
use App\Models\Mc;
use App\Models\Pic;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Batasi route ke peran tertentu, contoh: ->middleware('role:jenderal').
 * Peran ditentukan dari akun pemilik token login, bukan dari header browser.
 */
class EnsureRole
{
    private const ROLE_MODELS = [
        'jenderal' => Jenderal::class,
        'pic' => Pic::class,
        'mc' => Mc::class,
    ];

    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        foreach ($roles as $role) {
            $model = self::ROLE_MODELS[$role] ?? null;

            if ($model && $user instanceof $model) {
                return $next($request);
            }
        }

        return response()->json([
            'success' => false,
            'message' => 'Akses ditolak: peran Anda tidak memiliki izin untuk aksi ini.',
        ], 403);
    }

    /**
     * Nama peran dari akun yang sedang login.
     */
    public static function roleOf(mixed $user): ?string
    {
        foreach (self::ROLE_MODELS as $role => $model) {
            if ($user instanceof $model) {
                return $role;
            }
        }

        return null;
    }
}
