<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Jenderal;
use App\Models\Pic;
use App\Models\Mc;
use App\Models\Anggota;

class AnggotaController extends Controller
{
    /**
     * Daftar anggota sesuai cakupan peran yang login:
     * - Jenderal: seluruh anggota (nasional)
     * - PIC: anggota dari semua MC di wilayahnya
     * - MC: anggota yang terdaftar di kelompoknya sendiri
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $scoped = Anggota::query();

        if ($user instanceof Mc) {
            $scoped->where('mc_id', $user->id);
        } elseif ($user instanceof Pic) {
            $scoped->whereHas('mc', fn ($mc) => $mc->where('pic_id', $user->id));
        } elseif (!$user instanceof Jenderal) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak: Anda tidak berhak melihat daftar anggota.',
            ], 403);
        }

        $summary = [
            'total' => (clone $scoped)->count(),
            'via_link' => (clone $scoped)->where('created_by', 'self')->count(),
            'by_mc' => (clone $scoped)->where('created_by', 'mc')->count(),
        ];

        if ($user instanceof Mc) {
            $summary['quota_max'] = Mc::MAX_QUOTA;
        }

        $query = (clone $scoped)->with(['mc:id,pic_id,nama', 'mc.pic:id,nama,wilayah']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                    ->orWhere('nik', 'like', "%{$search}%")
                    ->orWhere('no_hp', 'like', "%{$search}%")
                    ->orWhereHas('mc', fn ($mc) => $mc->where('nama', 'like', "%{$search}%"));
            });
        }

        if (in_array($request->get('source'), ['self', 'mc'], true)) {
            $query->where('created_by', $request->get('source'));
        }

        $anggotas = $query->latest('id')->paginate($request->get('per_page', 30));

        return response()->json([
            'success' => true,
            'data' => $anggotas,
            'summary' => $summary,
        ]);
    }
}
