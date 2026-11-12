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
     * Check MC registration link
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

        return response()->json([
            'success' => true,
            'data' => [
                'mc_nama' => $mc->nama,
                'wilayah' => $mc->pic ? $mc->pic->wilayah : 'Wilayah Tidak Diketahui',
                'member_count' => $mc->anggotas()->count(),
                'has_wa_group' => filled($mc->pic?->wa_group_link),
            ],
            'message' => 'Link pendaftaran aktif.',
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
            ...Anggota::alumniRules(requireCore: true),
        ], [
            'nik.regex' => 'Nomor Induk Kependudukan (NIK) harus tepat 16 digit angka.',
            'nik.unique' => 'NIK ini sudah terdaftar dalam sistem.',
            'no_hp.unique' => 'Nomor WhatsApp ini sudah terdaftar dalam sistem.',
            ...Anggota::ALUMNI_MESSAGES,
        ]);

        $mc = Mc::where('link_token', trim($request->link_token))->with('pic')->first();

        if (!$mc) {
            return response()->json([
                'success' => false,
                'message' => 'Link pendaftaran tidak valid atau MC tidak ditemukan.',
            ], 404);
        }

        $anggota = Anggota::create([
            'mc_id' => $mc->id,
            'nama' => $request->nama,
            'nik' => $request->nik,
            'no_hp' => $request->no_hp,
            'jurusan' => $request->jurusan,
            'angkatan' => $request->angkatan,
            'domisili' => $request->domisili,
            'pekerjaan' => $request->pekerjaan,
            'masukan' => $request->masukan,
            'created_by' => 'self',
        ]);

        $memberCount = $mc->anggotas()->count();

        LogActivity::log(
            'anggota',
            $anggota->id,
            'MEMBER_REGISTER',
            "Anggota baru {$anggota->nama} (NIK: {$anggota->nik}) mendaftar via link pendaftaran MC {$mc->nama}. Total anggota MC sekarang: {$memberCount}"
        );

        // Grup WhatsApp milik PIC dari MC ini (null bila PIC belum mengisinya)
        $waGroupLink = $mc->pic?->wa_group_link;

        return response()->json([
            'success' => true,
            'message' => 'Pendaftaran anggota berhasil terverifikasi dalam hierarki.',
            'data' => [
                'anggota' => $anggota,
                'mc' => [
                    'nama' => $mc->nama,
                    'member_count' => $memberCount,
                ],
                'whatsapp_group_link' => $waGroupLink,
            ],
        ], 201);
    }
}
