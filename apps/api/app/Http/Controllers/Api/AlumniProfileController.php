<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\AlumniProfileResource;
use App\Models\AlumniProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class AlumniProfileController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $alumni = AlumniProfile::query()
            ->with('student')
            ->when($request->filled('graduation_year'), fn ($q) => $q->where('graduation_year', $request->string('graduation_year')))
            ->when($request->filled('search'), fn ($q) => $q->where(fn ($w) => $w
                ->where('full_name', 'like', '%'.$request->string('search').'%')
                ->orWhere('email', 'like', '%'.$request->string('search').'%')))
            ->orderBy('full_name')
            ->paginate($request->integer('per_page', 50));

        return AlumniProfileResource::collection($alumni);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $alumni = AlumniProfile::create($data + $tenant);

        return (new AlumniProfileResource($alumni->load('student')))->response()->setStatusCode(201);
    }

    public function show(AlumniProfile $alumnus): AlumniProfileResource
    {
        return new AlumniProfileResource($alumnus->load('student'));
    }

    public function update(Request $request, AlumniProfile $alumnus): AlumniProfileResource
    {
        $alumnus->update($request->validate($this->rules($alumnus->campus_id, false)));

        return new AlumniProfileResource($alumnus->load('student'));
    }

    public function destroy(AlumniProfile $alumnus): JsonResponse
    {
        $alumnus->delete();

        return response()->json(['message' => 'Alumni profile removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'student_id' => ['nullable', 'integer', Rule::exists('students', 'id')->where('campus_id', $campusId)],
            'full_name' => [$presence, 'string', 'max:255'],
            'graduation_year' => ['nullable', 'string', 'max:12'],
            'current_occupation' => ['nullable', 'string', 'max:255'],
            'employer' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
            'city' => ['nullable', 'string', 'max:128'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
