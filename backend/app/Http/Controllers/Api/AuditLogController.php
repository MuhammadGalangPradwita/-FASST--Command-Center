<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Middleware\EnsureRole;
use Illuminate\Http\Request;
use App\Models\LogActivity;
use App\Models\Pic;
use App\Models\Mc;
use App\Models\Anggota;

class AuditLogController extends Controller
{
    /**
     * List audit activity logs strictly scoped by RBAC permission matrix:
     * - Jenderal: Read All Logs (Nasional/Global)
     * - PIC: Read Logs wilayah operasionalnya
     * - MC: Read Logs 10 anggota kelompoknya
     * - Anggota: No Access (403 Forbidden)
     */
    public function index(Request $request)
    {
        // Peran & ID diambil dari akun pemilik token login (tidak bisa dipalsukan dari browser)
        $role = EnsureRole::roleOf($request->user());
        $userId = $request->user()?->id;

        // RBAC: Anggota (atau akun tanpa peran staf) tidak punya akses
        if ($role === null) {
            return response()->json([
                'success' => false,
                'message' => 'Akses Ditolak: Peran Anggota tidak memiliki hak akses ke modul Audit Trail.',
            ], 403);
        }

        $query = LogActivity::query();

        // RBAC Scoping
        if ($role === 'mc' && $userId) {
            $mc = Mc::find($userId);
            if ($mc) {
                $anggotaIds = $mc->anggotas()->pluck('id')->toArray();
                $query->where(function ($q) use ($mc, $anggotaIds) {
                    $q->where(function ($sub) use ($mc) {
                        $sub->where('user_type', 'mc')->where('user_id', $mc->id);
                    })->orWhere(function ($sub) use ($anggotaIds) {
                        $sub->where('user_type', 'anggota')->whereIn('user_id', $anggotaIds);
                    });
                });
            }
        } elseif ($role === 'pic' && $userId) {
            $pic = Pic::find($userId);
            if ($pic) {
                $mcIds = $pic->mcs()->pluck('id')->toArray();
                $anggotaIds = Anggota::whereIn('mc_id', $mcIds)->pluck('id')->toArray();

                $query->where(function ($q) use ($pic, $mcIds, $anggotaIds) {
                    $q->where(function ($sub) use ($pic) {
                        $sub->where('user_type', 'pic')->where('user_id', $pic->id);
                    })->orWhere(function ($sub) use ($mcIds) {
                        $sub->where('user_type', 'mc')->whereIn('user_id', $mcIds);
                    })->orWhere(function ($sub) use ($anggotaIds) {
                        $sub->where('user_type', 'anggota')->whereIn('user_id', $anggotaIds);
                    });
                });
            }
        }
        // Jenderal: No filter, can read all national logs!

        // Optional request filters
        if ($request->filled('user_type')) {
            $query->where('user_type', $request->user_type);
        }

        if ($request->filled('action')) {
            $query->where('action', 'like', "%{$request->action}%");
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('action', 'like', "%{$search}%")
                  ->orWhere('ip_address', 'like', "%{$search}%");
            });
        }

        $logs = $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 30));

        return response()->json([
            'success' => true,
            'role_scope' => $role,
            'data' => $logs,
        ]);
    }
}
