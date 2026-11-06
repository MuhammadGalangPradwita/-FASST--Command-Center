<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Mc;
use App\Models\Anggota;
use App\Models\LogActivity;

class RegistrationController extends Controller
{
    /**
     * Check MC registration link and quota status
     */
    public function checkLink(string $token)
    {
        $mc = Mc::where('link_token', trim($token))->with('pic')->first();

        if (!$mc) {
            return response()->json([
                'success' => false,
                'message' => 'Link pendaftaran tidak valid atau MC tidak ditemukan.',
            ], 404);
        }

        $currentCount = $mc->anggotas()->count();
        $isFull = $currentCount >= Mc::MAX_QUOTA;

        return response()->json([
            'success' => true,
            'data' => [
                'mc_nama' => $mc->nama,
                'wilayah' => $mc->pic ? $mc->pic->wilayah : 'Wilayah Tidak Diketahui',
                'quota_count' => $currentCount,
                'quota_max' => Mc::MAX_QUOTA,
                'quota_remaining' => max(0, Mc::MAX_QUOTA - $currentCount),
                'is_quota_full' => $isFull,
            ],
            'message' => $isFull
                ? 'Kuota kelompok untuk koordinator ini telah penuh (10/10).'
                : 'Link pendaftaran aktif. Tersedia slot anggota.',
        ]);
    }

    /**
     * Self-registration via MC registration link
     */
    public function register(Request $request)
    {
        $request->validate([
            'link_token' => 'required|string',
            'nama' => 'required|string|max:100',
            'nik' => [
                'required',
                'regex:/^[0-9]{16}$/',
                'unique:anggotas,nik',
            ],
            'no_hp' => [
                'required',
                'string',
                'max:20',
                'unique:anggotas,no_hp',
            ],
        ], [
            'nik.regex' => 'Nomor Induk Kependudukan (NIK) harus tepat 16 digit angka.',
            'nik.unique' => 'NIK ini sudah terdaftar dalam sistem.',
            'no_hp.unique' => 'Nomor WhatsApp ini sudah terdaftar dalam sistem.',
        ]);

        $mc = Mc::where('link_token', trim($request->link_token))->with('pic')->first();

        if (!$mc) {
            return response()->json([
                'success' => false,
                'message' => 'Link pendaftaran tidak valid atau MC tidak ditemukan.',
            ], 404);
        }

        // Strict Quota Check: Max 10 per MC
        $currentCount = $mc->anggotas()->count();
        if ($currentCount >= Mc::MAX_QUOTA) {
            LogActivity::log('mc', $mc->id, 'REGISTER_REJECTED_QUOTA_FULL', "Pendaftaran ditolak untuk NIK {$request->nik} karena kuota MC {$mc->nama} sudah 10/10.");

            return response()->json([
                'success' => false,
                'message' => 'Pendaftaran gagal: Batas kuota kelompok maksimal 10 anggota untuk MC ini telah terpenuhi.',
                'error_code' => 'QUOTA_FULL',
            ], 422);
        }

        $anggota = Anggota::create([
            'mc_id' => $mc->id,
            'nama' => $request->nama,
            'nik' => $request->nik,
            'no_hp' => $request->no_hp,
            'created_by' => 'self',
        ]);

        $newCount = $currentCount + 1;

        LogActivity::log(
            'anggota',
            $anggota->id,
            'MEMBER_REGISTER',
            "Anggota baru {$anggota->nama} (NIK: {$anggota->nik}) mendaftar via link pendaftaran MC {$mc->nama}. Kuota MC sekarang: {$newCount}/10"
        );

        // Official WhatsApp group coordination link per PRD 3.2.3
        $waGroupLink = 'https://chat.whatsapp.com/invitation-paslon-resmi-' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $mc->pic->wilayah ?? 'nasional'));

        return response()->json([
            'success' => true,
            'message' => 'Pendaftaran anggota berhasil terverifikasi dalam hierarki.',
            'data' => [
                'anggota' => $anggota,
                'mc' => [
                    'nama' => $mc->nama,
                    'quota_status' => "{$newCount}/10",
                ],
                'whatsapp_group_link' => $waGroupLink,
            ],
        ], 201);
    }
}
