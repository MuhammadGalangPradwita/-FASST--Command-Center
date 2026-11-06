<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RegistrationController;
use App\Http\Controllers\Api\McController;
use App\Http\Controllers\Api\PicController;
use App\Http\Controllers\Api\JenderalController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AnggotaController;

// Health check
Route::get('/ping', function () {
    return response()->json(['status' => 'ok', 'app' => 'Sistem Pemenangan Paslon API', 'timestamp' => now()]);
});

// 1. Autentikasi
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::post('/change-password', [AuthController::class, 'changePassword'])->middleware('auth:sanctum');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
});

// 2. Registrasi Anggota via Link Pendaftaran MC (PRD 3.1)
Route::get('/registration-link/{token}', [RegistrationController::class, 'checkLink']);
Route::post('/register-member', [RegistrationController::class, 'register']);

// 4. Dashboard Berjenjang (PRD 3.3)
// Dashboard MC (Field Officer: CRUD 10 Anggota)
Route::prefix('mc')->middleware('auth:sanctum')->group(function () {
    Route::get('/{id}/dashboard', [McController::class, 'dashboard']);
    Route::post('/{id}/members', [McController::class, 'addMember']);
    Route::put('/{id}/members/{memberId}', [McController::class, 'updateMember']);
    Route::delete('/{id}/members/{memberId}', [McController::class, 'deleteMember']);
});

// Dashboard PIC (Level 1 Admin: Manage MC & Anggota Wilayah)
Route::prefix('pic')->middleware('auth:sanctum')->group(function () {
    Route::get('/{id}/dashboard', [PicController::class, 'dashboard']);
    Route::post('/{id}/mcs', [PicController::class, 'storeMc']);
    Route::put('/{id}/mcs/{mcId}', [PicController::class, 'updateMc']);
    Route::post('/{id}/mcs/{mcId}/reset-password', [PicController::class, 'resetMcPassword']);
    Route::get('/{id}/anggotas', [PicController::class, 'getAnggotas']);
});

// Dashboard Jenderal (Super Admin: Command Center & CRUD PIC) - khusus Jenderal
Route::prefix('jenderal')->middleware(['auth:sanctum', 'role:jenderal'])->group(function () {
    Route::get('/dashboard', [JenderalController::class, 'commandCenter']);
    Route::post('/pics', [JenderalController::class, 'storePic']);
    Route::put('/pics/{id}', [JenderalController::class, 'updatePic']);
    Route::delete('/pics/{id}', [JenderalController::class, 'deletePic']);
    Route::post('/pics/{id}/reset-password', [JenderalController::class, 'resetPicPassword']);
    Route::post('/mcs/{id}/reset-password', [JenderalController::class, 'resetMcPassword']);
    Route::put('/mcs/{id}', [JenderalController::class, 'updateMc']);
    Route::delete('/mcs/{id}', [JenderalController::class, 'deleteMc']);
});

Route::middleware(['auth:sanctum'])->group(function () {
    // 5. Audit Trail Log (PRD 3.3 - RBAC Scoped berdasarkan akun login)
    Route::get('/audit-logs', [AuditLogController::class, 'index']);

    // Daftar anggota sesuai cakupan peran (Jenderal / PIC / MC)
    Route::get('/anggotas', [AnggotaController::class, 'index']);
    // Daftar MC sesuai cakupan peran (Jenderal / PIC)
    Route::get('/mcs', [McController::class, 'index']);
    // Daftar seluruh PIC hanya untuk Jenderal
    Route::get('/pics', [PicController::class, 'index'])->middleware('role:jenderal');
});
