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
        'password',
    ];

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
