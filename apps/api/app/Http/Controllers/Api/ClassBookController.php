<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ClassBookResource;
use App\Models\ClassBook;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ClassBookController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $books = ClassBook::query()
            ->with(['subject', 'classRoom'])
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->filled('class_room_id'), fn ($q) => $q->where('class_room_id', $request->integer('class_room_id')))
            ->when($request->filled('subject_id'), fn ($q) => $q->where('subject_id', $request->integer('subject_id')))
            ->orderBy('class_room_id')
            ->orderBy('title')
            ->paginate($request->integer('per_page', 50));

        return ClassBookResource::collection($books);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));
        $data += $tenant;

        $book = ClassBook::create($data);

        return (new ClassBookResource($book->load(['subject', 'classRoom'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(ClassBook $classBook): ClassBookResource
    {
        return new ClassBookResource($classBook->load(['subject', 'classRoom']));
    }

    public function update(Request $request, ClassBook $classBook): ClassBookResource
    {
        $data = $request->validate($this->rules($classBook->campus_id, false));

        $classBook->update($data);

        return new ClassBookResource($classBook->load(['subject', 'classRoom']));
    }

    public function destroy(ClassBook $classBook): JsonResponse
    {
        $classBook->delete();

        return response()->json(['message' => 'Book removed from list.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'academic_year_id' => [$presence, 'integer', Rule::exists('academic_years', 'id')->where('campus_id', $campusId)],
            'class_room_id' => [$presence, 'integer', Rule::exists('class_rooms', 'id')->where('campus_id', $campusId)],
            'subject_id' => ['nullable', 'integer', Rule::exists('subjects', 'id')->where('campus_id', $campusId)],
            'title' => [$presence, 'string', 'max:255'],
            'author' => ['nullable', 'string', 'max:255'],
            'publisher' => ['nullable', 'string', 'max:255'],
            'isbn' => ['nullable', 'string', 'max:32'],
            'edition' => ['nullable', 'string', 'max:255'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'is_required' => ['sometimes', 'boolean'],
        ];
    }
}
