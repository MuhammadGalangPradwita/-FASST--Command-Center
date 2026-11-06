<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\Jenderal;
use App\Models\Pic;
use App\Models\Mc;
use App\Models\Anggota;
use App\Models\LogActivity;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with comprehensive RBAC accounts.
     */
    public function run(): void
    {
        $defaultPassword = Hash::make('password123');

        // 1. Jenderal (Super Admin)
        $jenderal = Jenderal::create([
            'nama' => 'Jenderal Andika',
            'email' => 'jenderal@kemenangan.id',
            'password' => $defaultPassword,
        ]);

        LogActivity::log('jenderal', $jenderal->id, 'SYSTEM_INIT', 'Sistem Pemenangan Paslon diinisialisasi oleh Jenderal Kemenangan');


        // 3. PIC Wilayah (Level 1 Admin)
        $picJakarta = Pic::create([
            'jenderal_id' => $jenderal->id,
            'nama' => 'H. Budi Santoso, S.T. (PIC DKI Jakarta)',
            'no_hp' => '081234567891',
            'wilayah' => 'DKI Jakarta',
            'password' => $defaultPassword,
        ]);

        $picJabar = Pic::create([
            'jenderal_id' => $jenderal->id,
            'nama' => 'Drs. Asep Hidayat (PIC Jawa Barat)',
            'no_hp' => '081234567892',
            'wilayah' => 'Jawa Barat',
            'password' => $defaultPassword,
        ]);

        $picJatim = Pic::create([
            'jenderal_id' => $jenderal->id,
            'nama' => 'Cak Sugeng Rahardjo (PIC Jawa Timur)',
            'no_hp' => '081234567894',
            'wilayah' => 'Jawa Timur',
            'password' => $defaultPassword,
        ]);

        LogActivity::log('jenderal', $jenderal->id, 'CREATE_PIC', 'Super Admin mendaftarkan PIC DKI Jakarta, Jawa Barat, dan Jawa Timur');

        // 4. MC (Koordinator Anggota / Field Officer)
        // MC 1: Jakarta Selatan (Kuota 7/10 - Active)
        $mc1 = Mc::create([
            'pic_id' => $picJakarta->id,
            'nama' => 'Ridwan Kamil (MC Jaksel Cilandak)',
            'no_hp' => '081234567801',
            'password' => $defaultPassword,
        ]);

        // MC 2: Jakarta Timur (belum ada anggota)
        $mc2 = Mc::create([
            'pic_id' => $picJakarta->id,
            'nama' => 'Dewi Sartika (MC Jaktim Duren Sawit)',
            'no_hp' => '081234567802',
            'password' => $defaultPassword,
        ]);

        // MC 3: Bandung (Kuota PENUH 10/10 - Test batas kuota ketat!)
        $mc3 = Mc::create([
            'pic_id' => $picJabar->id,
            'nama' => 'Dedi Kusnandar (MC Bandung Coblong)',
            'no_hp' => '081234567803',
            'password' => $defaultPassword,
        ]);

        // MC 4: Surabaya (Kuota 4/10 - Active)
        $mc4 = Mc::create([
            'pic_id' => $picJatim->id,
            'nama' => 'Dimas Wahyudi (MC Surabaya Wonokromo)',
            'no_hp' => '081234567804',
            'password' => $defaultPassword,
        ]);

        LogActivity::log('pic', $picJakarta->id, 'CREATE_MC', 'PIC Budi Santoso mendaftarkan MC Ridwan Kamil');
        LogActivity::log('pic', $picJakarta->id, 'CREATE_MC', 'PIC Budi Santoso mendaftarkan MC Dewi Sartika');
        LogActivity::log('pic', $picJabar->id, 'CREATE_MC', 'PIC Asep Hidayat mendaftarkan MC Dedi Kusnandar');
        LogActivity::log('pic', $picJatim->id, 'CREATE_MC', 'PIC Cak Sugeng mendaftarkan MC Dimas Wahyudi');

        // 5. Anggota MC 1 (Jakarta: 7 anggota)
        $anggotasMc1 = [
            ['Ahmad Fauzi', '3171012301900001', '081300000001'],
            ['Siti Aminah', '3171012301900002', '081300000002'],
            ['Bambang Wijaya', '3171012301900003', '081300000003'],
            ['Ratna Sari', '3171012301900004', '081300000004'],
            ['Eko Prasetyo', '3171012301900005', '081300000005'],
            ['Rina Marlina', '3171012301900006', '081300000006'],
            ['Taufik Hidayat', '3171012301900007', '081300000007'],
        ];

        foreach ($anggotasMc1 as $i => [$nama, $nik, $noHp]) {
            Anggota::create([
                'mc_id' => $mc1->id,
                'nama' => $nama,
                'nik' => $nik,
                'no_hp' => $noHp,
                'created_by' => $i % 3 === 0 ? 'mc' : 'self',
            ]);
        }

        // 6. Anggota MC 3 (Bandung: 10 anggota - kuota PENUH 10/10)
        for ($i = 1; $i <= 10; $i++) {
            Anggota::create([
                'mc_id' => $mc3->id,
                'nama' => 'Warga Bandung ' . $i,
                'nik' => '32730101019000' . str_pad($i, 2, '0', STR_PAD_LEFT),
                'no_hp' => '0822000000' . str_pad($i, 2, '0', STR_PAD_LEFT),
                'created_by' => $i % 2 === 0 ? 'mc' : 'self',
            ]);
        }

        // 7. Anggota MC 4 (Surabaya: 4 anggota)
        for ($i = 1; $i <= 4; $i++) {
            Anggota::create([
                'mc_id' => $mc4->id,
                'nama' => 'Arek Suroboyo ' . $i,
                'nik' => '35780101019000' . str_pad($i, 2, '0', STR_PAD_LEFT),
                'no_hp' => '0833000000' . str_pad($i, 2, '0', STR_PAD_LEFT),
                'created_by' => 'self',
            ]);
        }

        LogActivity::log('mc', $mc1->id, 'MEMBER_REGISTER', 'Anggota Ahmad Fauzi mendaftar secara mandiri melalui link pendaftaran MC');
        LogActivity::log('mc', $mc3->id, 'QUOTA_REACHED', 'Batas kuota maksimal 10 anggota untuk MC Dedi Kusnandar telah tercapai (10/10)');
    }
}
