<?php

namespace App\Services;

class RbacService
{
    /**
     * Get permission matrix for a given role based on PRD requirements
     */
    public static function getPermissions(string $role): array
    {
        $matrix = [
            'jenderal' => [
                'user_management' => [
                    'can_crud_pic' => true,
                    'can_read_all_mc' => true,
                    'can_read_all_anggota' => true,
                    'can_crud_mc' => true,
                    'can_crud_anggota' => true,
                ],
                'dashboard' => [
                    'command_center' => true,
                    'regional_dashboard' => true,
                    'mc_dashboard' => true,
                ],
                'audit_trail' => [
                    'read_scope' => 'national_all', // Read All Logs secara nasional/global
                    'can_read' => true,
                ],
                'registration_link' => [
                    'can_manage_link' => true,
                    'can_share_link' => true,
                ],
            ],
            'pic' => [
                'user_management' => [
                    'can_crud_pic' => false,
                    'can_create_mc_wilayah' => true,
                    'can_read_mc_wilayah' => true,
                    'can_update_mc_wilayah' => true,
                    'can_delete_mc' => false,
                    'can_read_anggota_wilayah' => true,
                ],
                'dashboard' => [
                    'command_center' => false,
                    'regional_dashboard' => true,
                    'mc_dashboard' => false,
                ],
                'audit_trail' => [
                    'read_scope' => 'regional', // Read Logs wilayah operasionalnya
                    'can_read' => true,
                ],
                'registration_link' => [
                    'can_manage_link' => true,
                    'can_share_link' => true,
                ],
            ],
            'mc' => [
                'user_management' => [
                    'can_crud_pic' => false,
                    'can_crud_mc' => false,
                    'can_crud_anggota_group' => true,
                ],
                'dashboard' => [
                    'command_center' => false,
                    'regional_dashboard' => false,
                    'mc_dashboard' => true,
                ],
                'audit_trail' => [
                    'read_scope' => 'group_10', // Read Logs 10 anggota kelompoknya
                    'can_read' => true,
                ],
                'registration_link' => [
                    'can_read_link' => true,
                    'can_share_link' => true,
                ],
            ],
            'anggota' => [
                'user_management' => [
                    'can_read_self' => true,
                    'can_update_self' => true,
                ],
                'dashboard' => [
                    'can_access_whatsapp_group' => true,
                ],
                'audit_trail' => [
                    'read_scope' => 'none',
                    'can_read' => false, // No Access
                ],
                'registration_link' => [
                    'can_self_register' => true,
                ],
            ],
        ];

        return $matrix[$role] ?? [];
    }
}
