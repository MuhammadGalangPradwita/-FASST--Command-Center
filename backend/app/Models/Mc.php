<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class Mc extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $table = 'mcs';

    protected $fillable = [
        'pic_id',
        'nama',
        'no_hp',
        'link_token',
        'password',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'must_change_password' => 'boolean',
        'password_reset_requested_at' => 'datetime',
    ];

    protected $appends = [
        'quota_count',
    ];

    protected static function booted(): void
    {
        // Setiap MC otomatis mendapat link pendaftaran unik
        static::creating(function (Mc $mc) {
            if (empty($mc->link_token)) {
                $mc->link_token = self::generateLinkToken();
            }
        });
    }

    public static function generateLinkToken(): string
    {
        do {
            $token = Str::lower(Str::random(16));
        } while (self::where('link_token', $token)->exists());

        return $token;
    }

    public function pic()
    {
        return $this->belongsTo(Pic::class, 'pic_id');
    }

    public function anggotas()
    {
        return $this->hasMany(Anggota::class, 'mc_id');
    }

    public function getQuotaCountAttribute(): int
    {
        return $this->anggotas()->count();
    }
}
