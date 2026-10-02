<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StudentResource;
use App\Models\Student;
use App\Services\Files\FileScanner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class StudentPhotoController extends Controller
{
    private const DISK = 'public';

    public function __construct(private readonly FileScanner $scanner) {}

    public function store(Request $request, Student $student): StudentResource
    {
        $request->validate([
            'photo' => ['required', 'file', 'max:5120', 'mimes:jpg,jpeg,png,webp'],
        ]);

        $file = $request->file('photo');

        $this->assertClean($file->getRealPath());

        $this->deleteExisting($student);

        $path = $file->store("student-photos/{$student->id}", self::DISK);

        $student->update(['photo_path' => $path]);

        return new StudentResource($student->refresh());
    }

    public function destroy(Student $student): JsonResponse
    {
        $this->deleteExisting($student);

        $student->update(['photo_path' => null]);

        return response()->json(['message' => 'Student photo removed.']);
    }

    private function deleteExisting(Student $student): void
    {
        if ($student->photo_path && Storage::disk(self::DISK)->exists($student->photo_path)) {
            Storage::disk(self::DISK)->delete($student->photo_path);
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
