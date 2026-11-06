<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Middleware\EnsureRole;
use App\Models\Jenderal;
use App\Models\Pic;
use App\Models\Mc;
use App\Models\Anggota;
use App\Models\LogActivity;
use App\Services\PasswordResetService;

class PicController extends Controller
{
    /**
     * Hanya PIC pemilik wilayah atau Jenderal yang boleh mengakses.
     */
    private function denyUnlessAllowed(Request $request, int $id): ?JsonResponse
    {
        $user = $request->user();

        if ($user instanceof Jenderal || ($user instanceof Pic && $user->id === $id)) {
            return null;
        }

        return response()->json([
            'success' => false,
            'message' => 'Akses ditolak: Anda tidak berhak mengelola data PIC ini.',
        ], 403);
    }

    /**
     * Get PIC Regional Dashboard (Rekapitulasi Wilayah Operasional)
     */
    public function dashboard(Request $request, int $id)
    {
        if ($denied = $this->denyUnlessAllowed($request, $id)) {
            return $denied;
        }

        $pic = Pic::with(['mcs.anggotas'])->find($id);

        if (!$pic) {
            return response()->json([
                'success' => false,
                'message' => 'Koordinator Wilayah (PIC) tidak ditemukan.',
            ], 404);
        }

        $mcs = $pic->mcs;
        $totalMcs = $mcs->count();

        $allMembers = $mcs->flatMap->anggotas;
        $totalRegistered = $allMembers->count();

        $targetVoters = $totalMcs * Mc::MAX_QUOTA;
        $targetAchievementPct = $targetVoters > 0 ? round(($totalRegistered / $targetVoters) * 100, 1) : 0;

        $mcList = $mcs->map(function ($mc) {
            $count = $mc->anggotas->count();

            return [
                'id' => $mc->id,
                'nama' => $mc->nama,
                'no_hp' => $mc->no_hp,
                'link_token' => $mc->link_token,
                'quota_count' => $count,
                'quota_max' => Mc::MAX_QUOTA,
                'is_full' => $count >= Mc::MAX_QUOTA,
                'password_reset_requested_at' => $mc->password_reset_requested_at?->toIso8601String(),
                'anggotas' => $mc->anggotas->map(function ($a) {
                    return [
                        'id' => $a->id,
                        'nama' => $a->nama,
                        'nik' => $a->nik,
                        'no_hp' => $a->no_hp,
                    ];
                }),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'pic' => [
                    'id' => $pic->id,
                    'nama' => $pic->nama,
                    'wilayah' => $pic->wilayah,
                    'no_hp' => $pic->no_hp,
                ],
                'summary' => [
                    'total_mcs' => $totalMcs,
                    'total_registered' => $totalRegistered,
                    'target_voters' => $targetVoters,
                    'target_achievement_pct' => $targetAchievementPct,
                ],
                'mcs' => $mcList,
            ],
        ]);
    }

    /**
     * RBAC User Management: Create MC under this PIC
     */
    public function storeMc(Request $request, int $id)
    {
        if ($denied = $this->denyUnlessAllowed($request, $id)) {
            return $denied;
        }

        $pic = Pic::findOrFail($id);

        $validated = $request->validate([
            'nama' => 'required|string|max:100',
            'no_hp' => 'required|string|max:20|unique:mcs,no_hp|unique:pics,no_hp',
        ], [
            'no_hp.unique' => 'Nomor WhatsApp ini sudah dipakai oleh akun PIC/MC lain.',
        ]);

        $validated['pic_id'] = $pic->id;
        $validated['password'] = bcrypt('password123');

        $mc = Mc::create($validated);

        LogActivity::log('pic', $pic->id, 'CREATE_MC', "PIC {$pic->nama} menambahkan MC baru {$mc->nama} (Link: /daftar/{$mc->link_token})");

        return response()->json([
            'success' => true,
            'message' => 'MC berhasil didaftarkan.',
            'data' => $mc,
        ], 201);
    }

    /**
     * RBAC User Management: Update MC in this PIC's wilayah
     */
    public function updateMc(Request $request, int $id, int $mcId)
    {
        if ($denied = $this->denyUnlessAllowed($request, $id)) {
            return $denied;
        }

        $pic = Pic::findOrFail($id);
        $mc = Mc::where('pic_id', $pic->id)->where('id', $mcId)->firstOrFail();

        $validated = $request->validate([
            'nama' => 'required|string|max:100',
            'no_hp' => "required|string|max:20|unique:mcs,no_hp,{$mcId}|unique:pics,no_hp",
        ], [
            'no_hp.unique' => 'Nomor WhatsApp ini sudah dipakai oleh akun PIC/MC lain.',
        ]);

        $mc->update($validated);

        LogActivity::log('pic', $pic->id, 'UPDATE_MC', "PIC {$pic->nama} memperbarui data MC {$mc->nama}");

        return response()->json([
            'success' => true,
            'message' => 'Data MC berhasil diperbarui.',
            'data' => $mc,
        ]);
    }

    /**
     * Reset password MC di wilayah PIC ini
     */
    public function resetMcPassword(Request $request, int $id, int $mcId)
    {
        if ($denied = $this->denyUnlessAllowed($request, $id)) {
            return $denied;
        }

        $mc = Mc::where('pic_id', $id)->where('id', $mcId)->firstOrFail();
        $temporary = PasswordResetService::issueTemporaryPassword($mc);

        $role = EnsureRole::roleOf($request->user());
        LogActivity::log($role, $request->user()->id, 'PASSWORD_RESET', "Kata sandi MC {$mc->nama} direset oleh {$request->user()->nama}");

        return response()->json([
            'success' => true,
            'message' => "Kata sandi MC {$mc->nama} berhasil direset.",
            'data' => ['temporary_password' => $temporary],
        ]);
    }

    /**
     * RBAC User Management: Read Anggota di wilayahnya
     */
    public function getAnggotas(Request $request, int $id)
    {
        if ($denied = $this->denyUnlessAllowed($request, $id)) {
            return $denied;
        }

        $pic = Pic::findOrFail($id);
        $mcIds = $pic->mcs()->pluck('id');
        $anggotas = Anggota::whereIn('mc_id', $mcIds)->with('mc')->latest()->paginate(50);

        return response()->json([
            'success' => true,
            'data' => $anggotas,
        ]);
    }

    /**
 * Menampilkan seluruh PIC untuk Jenderal.
 */
public function index(Request $request)
{
    $pics = Pic::query()
        ->withCount('mcs')
        ->latest('id')
        ->paginate(50);

    return response()->json([
        'success' => true,
        'message' => 'Daftar PIC berhasil diambil.',
        'data' => $pics,
    ]);
}

}
