<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CampusResource;
use App\Models\Campus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class CampusController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $campuses = Campus::query()
            ->with('institution')
            ->when($search !== '', fn ($query) => $query
                ->where(fn ($q) => $q
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")))
            ->when($request->integer('institution_id') !== 0, fn ($query) => $query
                ->where('institution_id', $request->integer('institution_id')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 25));

        return CampusResource::collection($campuses);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'institution_id' => ['required', 'integer', 'exists:institutions,id'],
            'name' => ['required', 'string', 'max:255'],
            'code' => [
                'required', 'string', 'max:32',
                Rule::unique('campuses', 'code')->where('institution_id', $request->input('institution_id')),
            ],
            'type' => ['required', Rule::in(['school', 'college', 'university'])],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
            'whatsapp' => ['nullable', 'string', 'max:32'],
            'website' => ['nullable', 'url', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $campus = Campus::create($data);

        return (new CampusResource($campus->load('institution')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Campus $campus): CampusResource
    {
        return new CampusResource($campus->load('institution'));
    }

    public function update(Request $request, Campus $campus): CampusResource
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'code' => [
                'sometimes', 'string', 'max:32',
                Rule::unique('campuses', 'code')
                    ->where('institution_id', $campus->institution_id)
                    ->ignore($campus->id),
            ],
            'type' => ['sometimes', Rule::in(['school', 'college', 'university'])],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
            'whatsapp' => ['nullable', 'string', 'max:32'],
            'website' => ['nullable', 'url', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $campus->update($data);

        return new CampusResource($campus->load('institution'));
    }

    public function destroy(Campus $campus): JsonResponse
    {
        $campus->delete();

        return response()->json(['message' => 'Campus archived.']);
    }
}
