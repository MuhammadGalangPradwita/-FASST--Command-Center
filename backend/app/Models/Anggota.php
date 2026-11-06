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
        'created_by',
    ];

    public function mc()
    {
        return $this->belongsTo(Mc::class, 'mc_id');
    }
}
