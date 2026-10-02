<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Files\FileScanner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class UserPhotoController extends Controller
{
    private const DISK = 'public';

    public function __construct(private readonly FileScanner $scanner) {}

    public function store(Request $request, User $user): UserResource
    {
        $request->validate([
            'photo' => ['required', 'file', 'max:5120', 'mimes:jpg,jpeg,png,webp'],
        ]);

        $file = $request->file('photo');

        $this->assertClean($file->getRealPath());

        $this->deleteExisting($user);

        $path = $file->store("user-photos/{$user->id}", self::DISK);

        $user->update(['photo_path' => $path]);

        $user->student?->update(['photo_path' => $path]);

        return new UserResource($user->refresh()->load([
            'roles', 'campus', 'institution', 'scopeAssignments', 'student',
        ]));
    }

    public function destroy(User $user): JsonResponse
    {
        $this->deleteExisting($user);

        $user->update(['photo_path' => null]);

        $user->student?->update(['photo_path' => null]);

        return response()->json(['message' => 'User photo removed.']);
    }

    private function deleteExisting(User $user): void
    {
        $paths = array_filter([
            $user->photo_path,
            $user->student?->photo_path,
        ]);

        foreach (array_unique($paths) as $path) {
            if (Storage::disk(self::DISK)->exists($path)) {
                Storage::disk(self::DISK)->delete($path);
            }
        }
    }

    private function assertClean(?string $absolutePath): void
    {
        if ($absolutePath === null) {
            return;
        }

        $threat = $this->scanner->scan($absolutePath);

        if ($threat !== null) {
            throw ValidationException::withMessages([
                'photo' => ["The uploaded photo failed a malware scan ({$threat})."],
            ]);
        }
    }
}
