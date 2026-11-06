<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Jenderal extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'jenderals';

    protected $fillable = [
        'nama',
        'email',
        'password',
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'must_change_password' => 'boolean',
    ];

    public function pics()
    {
        return $this->hasMany(Pic::class, 'jenderal_id');
    }

    public function mcs()
    {
        return $this->hasManyThrough(Mc::class, Pic::class, 'jenderal_id', 'pic_id');
    }
}