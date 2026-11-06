<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Jenderal;
use App\Models\Pic;
use App\Models\Mc;
use App\Models\Anggota;
use App\Models\LogActivity;
use App\Services\PasswordResetService;

class JenderalController extends Controller
{
    /**
     * Command Center nasional: ringkasan PIC, MC, anggota, dan sebaran per wilayah.
     */
    public function commandCenter()
    {
        $totalPics = Pic::count();
        $totalMcs = Mc::count();
        $totalAnggota = Anggota::count();
        $targetCapacity = $totalMcs * Mc::MAX_QUOTA;

        $mcCounts = Mc::withCount('anggotas')->get(['id', 'pic_id', 'nama']);

        // Sebaran anggota per wilayah PIC
        $regions = Pic::orderBy('wilayah')->get(['id', 'nama', 'wilayah'])->map(function ($pic) use ($mcCounts) {
            $mcs = $mcCounts->where('pic_id', $pic->id);
            $anggota = $mcs->sum('anggotas_count');
            $capacity = $mcs->count() * Mc::MAX_QUOTA;

            return [
                'pic_id' => $pic->id,
                'pic_nama' => $pic->nama,
                'wilayah' => $pic->wilayah,
                'total_mc' => $mcs->count(),
                'total_anggota' => $anggota,
                'capacity' => $capacity,
                'filled_pct' => $capacity > 0 ? round(($anggota / $capacity) * 100, 1) : 0,
            ];
        })->sortByDesc('total_anggota')->values();

        $topMcs = Mc::with('pic:id,wilayah')->withCount('anggotas')
            ->orderByDesc('anggotas_count')->orderBy('nama')->limit(5)
            ->get(['id', 'pic_id', 'nama'])
            ->map(fn ($mc) => [
                'id' => $mc->id,
                'nama' => $mc->nama,
                'wilayah' => $mc->pic?->wilayah,
                'anggota' => $mc->anggotas_count,
                'quota_max' => Mc::MAX_QUOTA,
            ]);

        $recentMembers = Anggota::with(['mc:id,pic_id,nama', 'mc.pic:id,wilayah'])
            ->latest('id')->limit(6)->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'nama' => $a->nama,
                'mc_nama' => $a->mc?->nama,
                'wilayah' => $a->mc?->pic?->wilayah,
                'created_by' => $a->created_by,
                'created_at' => $a->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'success' => true,
            'data' => [
                'kpi' => [
                    'total_pics' => $totalPics,
                    'total_mcs' => $totalMcs,
                    'total_anggota' => $totalAnggota,
                    'target_capacity' => $targetCapacity,
                    'capacity_filled_pct' => $targetCapacity > 0 ? round(($totalAnggota / $targetCapacity) * 100, 1) : 0,
                    'via_link' => Anggota::where('created_by', 'self')->count(),
                    'by_mc' => Anggota::where('created_by', 'mc')->count(),
                    'mcs_full' => $mcCounts->where('anggotas_count', '>=', Mc::MAX_QUOTA)->count(),
                    'mcs_empty' => $mcCounts->where('anggotas_count', 0)->count(),
                    'pics_without_mc' => $regions->where('total_mc', 0)->count(),
                ],
                'regional_distribution' => $regions,
                'top_mcs' => $topMcs,
                'recent_members' => $recentMembers,
                'recent_logs' => LogActivity::latest('created_at')->limit(8)->get(),
                'last_updated' => now()->toIso8601String(),
            ],
        ]);
    }

    /**
     * RBAC User Management: Create PIC (CRUD PIC - Create)
     */
    public function storePic(Request $request)
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:100',
            'no_hp' => 'required|string|max:20|unique:pics,no_hp|unique:mcs,no_hp',
            'wilayah' => 'required|string|max:100',
            'password' => 'required|string|min:8',
        ], [
            'no_hp.unique' => 'Nomor WhatsApp ini sudah dipakai oleh akun PIC/MC lain.',
            'password.min' => 'Password minimal 8 karakter.',
        ]);

        $validated['jenderal_id'] = $request->user()->id;
        $validated['password'] = bcrypt($validated['password']);

        $pic = Pic::create($validated);

        LogActivity::log('jenderal', $request->user()->id, 'CREATE_PIC', "Jenderal membuat Koordinator Wilayah baru: {$pic->nama} ({$pic->wilayah})");

        return response()->json([
            'success' => true,
            'message' => 'Koordinator PIC wilayah berhasil ditambahkan.',
            'data' => $pic,
        ], 201);
    }

    /**
     * RBAC User Management: Update PIC (CRUD PIC - Update)
     */
    public function updatePic(Request $request, int $id)
    {
        $pic = Pic::findOrFail($id);

        $validated = $request->validate([
            'nama' => 'required|string|max:100',
            'no_hp' => "required|string|max:20|unique:pics,no_hp,{$id}|unique:mcs,no_hp",
            'wilayah' => 'required|string|max:100',
        ], [
            'no_hp.unique' => 'Nomor WhatsApp ini sudah dipakai oleh akun PIC/MC lain.',
        ]);

        $pic->update($validated);

        LogActivity::log('jenderal', $request->user()->id, 'UPDATE_PIC', "Jenderal memperbarui data PIC ID {$id} ({$pic->nama})");

        return response()->json([
            'success' => true,
            'message' => 'Data PIC berhasil diperbarui.',
            'data' => $pic,
        ]);
    }

    /**
     * RBAC User Management: Delete PIC (CRUD PIC - Delete)
     */
    public function deletePic(Request $request, int $id)
    {
        $pic = Pic::findOrFail($id);
        $nama = $pic->nama;
        $wilayah = $pic->wilayah;

        // MC ikut terhapus (cascade), tapi anggota di bawah MC dibatasi (restrict)
        $anggotaCount = $pic->anggotas()->count();
        if ($anggotaCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "PIC {$nama} tidak dapat dihapus karena masih memiliki {$anggotaCount} anggota terdaftar di bawah MC-nya.",
            ], 422);
        }

        $mcCount = $pic->mcs()->count();

        $pic->delete();

        LogActivity::log('jenderal', $request->user()->id, 'DELETE_PIC', "Jenderal menghapus PIC {$nama} ({$wilayah}) beserta {$mcCount} MC");

        return response()->json([
            'success' => true,
            'message' => "PIC {$nama} berhasil dihapus dari sistem.",
        ]);
    }

    /**
     * Reset password PIC: buat kata sandi sementara (wajib diganti saat login berikutnya)
     */
    public function resetPicPassword(Request $request, int $id)
    {
        $pic = Pic::findOrFail($id);
        $temporary = PasswordResetService::issueTemporaryPassword($pic);

        LogActivity::log('jenderal', $request->user()->id, 'PASSWORD_RESET', "Jenderal mereset kata sandi PIC {$pic->nama}");

        return response()->json([
            'success' => true,
            'message' => "Kata sandi PIC {$pic->nama} berhasil direset.",
            'data' => ['temporary_password' => $temporary],
        ]);
    }

    /**
     * Reset password MC oleh Jenderal
     */
    public function resetMcPassword(Request $request, int $id)
    {
        $mc = Mc::findOrFail($id);
        $temporary = PasswordResetService::issueTemporaryPassword($mc);

        LogActivity::log('jenderal', $request->user()->id, 'PASSWORD_RESET', "Jenderal mereset kata sandi MC {$mc->nama}");

        return response()->json([
            'success' => true,
            'message' => "Kata sandi MC {$mc->nama} berhasil direset.",
            'data' => ['temporary_password' => $temporary],
        ]);
    }

    /**
     * RBAC User Management: Update MC (nama, no HP, dan PIC pengelola)
     */
    public function updateMc(Request $request, int $id)
    {
        $mc = Mc::findOrFail($id);

        $validated = $request->validate([
            'nama' => 'required|string|max:100',
            'no_hp' => "required|string|max:20|unique:mcs,no_hp,{$id}|unique:pics,no_hp",
            'pic_id' => 'required|integer|exists:pics,id',
        ], [
            'no_hp.unique' => 'Nomor WhatsApp ini sudah dipakai oleh akun PIC/MC lain.',
        ]);

        $mc->update($validated);

        LogActivity::log('jenderal', $request->user()->id, 'UPDATE_MC', "Jenderal memperbarui data MC ID {$id} ({$mc->nama})");

        return response()->json([
            'success' => true,
            'message' => 'Data MC berhasil diperbarui.',
            'data' => $mc->load('pic:id,nama,wilayah'),
        ]);
    }

    /**
     * RBAC User Management: Delete MC
     */
    public function deleteMc(Request $request, int $id)
    {
        $mc = Mc::findOrFail($id);
        $nama = $mc->nama;

        // Anggota di bawah MC dibatasi (restrict)
        $anggotaCount = $mc->anggotas()->count();
        if ($anggotaCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "MC {$nama} tidak dapat dihapus karena masih memiliki {$anggotaCount} anggota terdaftar.",
            ], 422);
        }

        $mc->delete();

        LogActivity::log('jenderal', $request->user()->id, 'DELETE_MC', "Jenderal menghapus MC {$nama}");

        return response()->json([
            'success' => true,
            'message' => "MC {$nama} berhasil dihapus dari sistem.",
        ]);
    }
}
