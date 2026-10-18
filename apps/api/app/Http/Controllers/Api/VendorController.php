<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\VendorResource;
use App\Models\Vendor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class VendorController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $vendors = Vendor::query()
            ->with('payableAccount')
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            }))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return VendorResource::collection($vendors);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));

        if (empty($data['code'])) {
            $data['code'] = $this->nextCodeFor($tenant['campus_id']);
        }

        $vendor = Vendor::create($data + $tenant);

        return (new VendorResource($vendor->load('payableAccount')))->response()->setStatusCode(201);
    }

    public function nextCode(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        return response()->json([
            'data' => ['code' => $this->nextCodeFor($tenant['campus_id'])],
        ]);
    }

    public function show(Vendor $vendor): VendorResource
    {
        return new VendorResource($vendor->load('payableAccount'));
    }

    public function update(Request $request, Vendor $vendor): VendorResource
    {
        $data = $request->validate($this->rules($vendor->campus_id, $vendor->id, false));

        if (array_key_exists('code', $data) && empty($data['code'])) {
            unset($data['code']);
        }

        $vendor->update($data);

        return new VendorResource($vendor->load('payableAccount'));
    }

    public function destroy(Vendor $vendor): JsonResponse
    {
        if ($vendor->expenses()->exists()) {
            return response()->json([
                'message' => 'Vendor has expenses and cannot be archived.',
            ], 409);
        }

        $vendor->delete();

        return response()->json(['message' => 'Vendor archived.']);
    }

    private function nextCodeFor(int $campusId): string
    {
        $sequence = Vendor::withTrashed()->where('campus_id', $campusId)->count() + 1;

        do {
            $code = sprintf('VND-%04d', $sequence);
            $sequence++;
        } while (
            Vendor::withTrashed()
                ->where('campus_id', $campusId)
                ->where('code', $code)
                ->exists()
        );

        return $code;
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'code' => [
                'sometimes', 'nullable', 'string', 'max:32',
                Rule::unique('vendors', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'name' => [$presence, 'string', 'max:191'],
            'contact_name' => ['nullable', 'string', 'max:191'],
            'phone' => ['nullable', 'string', 'max:32'],
            'email' => ['nullable', 'email', 'max:191'],
            'tax_number' => ['nullable', 'string', 'max:64'],
            'address' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'payable_account_id' => [
                'nullable', 'integer',
                Rule::exists('chart_of_accounts', 'id')
                    ->where('campus_id', $campusId)
                    ->where('account_type', 'liability')
                    ->where('is_group', 0)
                    ->whereNull('deleted_at'),
            ],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
