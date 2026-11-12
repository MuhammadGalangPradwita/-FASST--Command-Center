<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Pic extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $table = 'pics';

    protected $fillable = [
        'jenderal_id',
        'nama',
        'no_hp',
        'wilayah',
        'wa_group_link',
        'password',
    ];

    /**
     * Format link undangan grup WhatsApp, mis. https://chat.whatsapp.com/AbC123xyz,
     * atau link saluran (channel), mis. https://whatsapp.com/channel/0029Va...
     * (boleh diikuti query seperti ?mode=ems_copy_t dari tombol "Salin link").
     */
    public const WA_GROUP_PATTERN = '/^https:\/\/(chat\.whatsapp\.com\/(invite\/)?|whatsapp\.com\/channel\/)[A-Za-z0-9]{10,64}(\?[^\s]*)?$/';

    /**
     * Rapikan link yang ditempel PIC: buang spasi, lengkapi "https://" bila tidak ada.
     */
    public static function normalizeWaGroupLink(?string $link): ?string
    {
        $link = trim((string) $link);

        if ($link === '') {
            return null;
        }

        $link = preg_replace('/^(https?:\/\/)?(www\.)?/i', 'https://', $link);

        return $link;
    }

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'must_change_password' => 'boolean',
        'password_reset_requested_at' => 'datetime',
    ];

    public function jenderal()
    {
        return $this->belongsTo(Jenderal::class, 'jenderal_id');
    }

    public function mcs()
    {
        return $this->hasMany(Mc::class, 'pic_id');
    }

    public function anggotas()
    {
        return $this->hasManyThrough(
            Anggota::class,
            Mc::class,
            'pic_id',
            'mc_id'
        );
    }
}
