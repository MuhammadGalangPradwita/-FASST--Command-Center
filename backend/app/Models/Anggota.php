<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Anggota extends Model
{
    use HasFactory;

    protected $table = 'anggotas';

    protected $fillable = [
        'mc_id',
        'nama',
        'nik',
        'no_hp',
        'jurusan',
        'angkatan',
        'domisili',
        'pekerjaan',
        'masukan',
        'created_by',
    ];

    protected $casts = [
        'angkatan' => 'integer',
    ];

    /**
     * Aturan validasi data alumni. Jurusan & angkatan wajib saat daftar mandiri,
     * opsional saat diinput/diubah MC (data anggota lama belum punya isian ini).
     */
    public static function alumniRules(bool $requireCore): array
    {
        $core = $requireCore ? 'required' : 'nullable';

        return [
            'jurusan' => "{$core}|string|max:100",
            'angkatan' => "{$core}|integer|between:1950," . now()->year,
            'domisili' => 'nullable|string|max:100',
            'pekerjaan' => 'nullable|string|max:100',
            'masukan' => 'nullable|string|max:1000',
        ];
    }

    public const ALUMNI_MESSAGES = [
        'jurusan.required' => 'Jurusan wajib diisi.',
        'angkatan.required' => 'Angkatan wajib diisi.',
        'angkatan.integer' => 'Angkatan harus berupa tahun (misal: 2015).',
        'angkatan.between' => 'Angkatan harus berupa tahun yang valid.',
        'masukan.max' => 'Kritik & masukan maksimal 1000 karakter.',
    ];

    public function mc()
    {
        return $this->belongsTo(Mc::class, 'mc_id');
    }
}
