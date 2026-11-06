<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Models\Jenderal;
use App\Models\Pic;
use App\Models\Mc;
use App\Models\Anggota;
use App\Models\LogActivity;

class McController extends Controller
{
    /**
     * Hanya MC pemilik data, PIC pengelolanya, atau Jenderal yang boleh mengakses.
     */
    private function denyUnlessAllowed(Request $request, int $id): ?JsonResponse
    {
        $user = $request->user();

        $allowed = $user instanceof Jenderal
            || ($user instanceof Mc && $user->id === $id)
            || ($user instanceof Pic && Mc::where('id', $id)->where('pic_id', $user->id)->exists());

        if ($allowed) {
            return null;
        }

        return response()->json([
            'success' => false,
            'message' => 'Akses ditolak: Anda tidak berhak mengelola data MC ini.',
        ], 403);
    }

    /**
     * Daftar MC sesuai cakupan peran: Jenderal semua MC, PIC hanya MC di wilayahnya.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Mc::with('pic:id,nama,wilayah')->withCount('anggotas');

        if ($user instanceof Pic) {
            $query->where('pic_id', $user->id);
        } elseif (!$user instanceof Jenderal) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak: Anda tidak berhak melihat daftar MC.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $query->get(),
        ]);
    }

    /**
     * Get MC dashboard data with quota progress and members
     */
    public function dashboard(Request $request, int $id)
    {
        if ($denied = $this->denyUnlessAllowed($request, $id)) {
            return $denied;
        }

        $mc = Mc::with(['pic', 'anggotas'])->find($id);

        if (!$mc) {
            return response()->json([
                'success' => false,
                'message' => 'Koordinator MC tidak ditemukan.',
            ], 404);
        }

        $members = $mc->anggotas;
        $totalMembers = $members->count();

        return response()->json([
            'success' => true,
            'data' => [
                'mc' => [
                    'id' => $mc->id,
                    'nama' => $mc->nama,
                    'no_hp' => $mc->no_hp,
                    'link_token' => $mc->link_token,
                    'pic_nama' => $mc->pic ? $mc->pic->nama : null,
                    'wilayah' => $mc->pic ? $mc->pic->wilayah : null,
                ],
                'quota' => [
                    'current' => $totalMembers,
                    'max' => Mc::MAX_QUOTA,
                    'remaining' => max(0, Mc::MAX_QUOTA - $totalMembers),
                    'percentage' => round(($totalMembers / Mc::MAX_QUOTA) * 100, 1),
                    'is_full' => $totalMembers >= Mc::MAX_QUOTA,
                ],
                'members' => $members->map(function ($m) {
                    return [
                        'id' => $m->id,
                        'nama' => $m->nama,
                        'nik' => $m->nik,
                        'no_hp' => $m->no_hp,
                        'created_by' => $m->created_by,
                        'created_at' => $m->created_at->format('Y-m-d H:i'),
                    ];
                }),
            ],
        ]);
    }

    /**
     * Add member manually via MC dashboard (Strict max 10 check)
     */
    public function addMember(Request $request, int $id)
    {
        if ($denied = $this->denyUnlessAllowed($request, $id)) {
            return $denied;
        }

        $mc = Mc::findOrFail($id);

        if ($mc->anggotas()->count() >= Mc::MAX_QUOTA) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menambah anggota: Batas kuota 10 anggota telah penuh.',
            ], 422);
        }

        $validated = $request->validate([
            'nama' => 'required|string|max:100',
            'nik' => 'required|regex:/^[0-9]{16}$/|unique:anggotas,nik',
            'no_hp' => 'required|string|max:20|unique:anggotas,no_hp',
        ], [
            'nik.regex' => 'NIK harus tepat 16 digit angka.',
            'nik.unique' => 'NIK ini sudah terdaftar dalam sistem.',
            'no_hp.unique' => 'Nomor WhatsApp ini sudah terdaftar dalam sistem.',
        ]);

        $validated['mc_id'] = $mc->id;
        $validated['created_by'] = 'mc';

        $anggota = Anggota::create($validated);

        LogActivity::log('mc', $mc->id, 'MC_ADD_MEMBER', "MC {$mc->nama} menambahkan anggota manual {$anggota->nama} (NIK: {$anggota->nik})");

        return response()->json([
            'success' => true,
            'message' => 'Anggota berhasil ditambahkan oleh MC.',
            'data' => $anggota,
        ], 201);
    }

    /**
     * Update member info
     */
    public function updateMember(Request $request, int $id, int $memberId)
    {
        if ($denied = $this->denyUnlessAllowed($request, $id)) {
            return $denied;
        }

        $mc = Mc::findOrFail($id);
        $anggota = Anggota::where('mc_id', $mc->id)->where('id', $memberId)->firstOrFail();

        $validated = $request->validate([
            'nama' => 'required|string|max:100',
            'nik' => "required|regex:/^[0-9]{16}$/|unique:anggotas,nik,{$memberId}",
            'no_hp' => "required|string|max:20|unique:anggotas,no_hp,{$memberId}",
        ], [
            'nik.regex' => 'NIK harus tepat 16 digit angka.',
            'nik.unique' => 'NIK ini sudah terdaftar dalam sistem.',
            'no_hp.unique' => 'Nomor WhatsApp ini sudah terdaftar dalam sistem.',
        ]);

        $anggota->update($validated);

        LogActivity::log('mc', $mc->id, 'MC_UPDATE_MEMBER', "MC {$mc->nama} memperbarui data anggota ID {$memberId} ({$anggota->nama})");

        return response()->json([
            'success' => true,
            'message' => 'Data anggota berhasil diperbarui.',
            'data' => $anggota,
        ]);
    }

    /**
     * Delete member from MC group
     */
    public function deleteMember(Request $request, int $id, int $memberId)
    {
        if ($denied = $this->denyUnlessAllowed($request, $id)) {
            return $denied;
        }

        $mc = Mc::findOrFail($id);
        $anggota = Anggota::where('mc_id', $mc->id)->where('id', $memberId)->firstOrFail();

        $nama = $anggota->nama;
        $nik = $anggota->nik;
        $anggota->delete();

        LogActivity::log('mc', $mc->id, 'MC_DELETE_MEMBER', "MC {$mc->nama} menghapus anggota {$nama} (NIK: {$nik})");

        return response()->json([
            'success' => true,
            'message' => "Anggota {$nama} berhasil dihapus dari kelompok MC.",
        ]);
    }
}
