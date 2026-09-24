<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ExpenseCategoryResource;
use App\Models\ExpenseCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ExpenseCategoryController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $categories = ExpenseCategory::query()
            ->with('expenseAccount')
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            }))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('sort_order')
            ->orderBy('code')
            ->paginate($request->integer('per_page', 50));

        return ExpenseCategoryResource::collection($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));

        $category = ExpenseCategory::create($data + $tenant);

        return (new ExpenseCategoryResource($category->load('expenseAccount')))->response()->setStatusCode(201);
    }

    public function show(ExpenseCategory $expenseCategory): ExpenseCategoryResource
    {
        return new ExpenseCategoryResource($expenseCategory->load('expenseAccount'));
    }

    public function update(Request $request, ExpenseCategory $expenseCategory): ExpenseCategoryResource
    {
        $data = $request->validate($this->rules($expenseCategory->campus_id, $expenseCategory->id, false));

        $expenseCategory->update($data);

        return new ExpenseCategoryResource($expenseCategory->load('expenseAccount'));
    }

    public function destroy(ExpenseCategory $expenseCategory): JsonResponse
    {
        if ($expenseCategory->lines()->exists()) {
            return response()->json([
                'message' => 'Expense category is used by an expense and cannot be archived.',
            ], 409);
        }

        $expenseCategory->delete();

        return response()->json(['message' => 'Expense category archived.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'code' => [
                $presence, 'string', 'max:32',
                Rule::unique('expense_categories', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'name' => [$presence, 'string', 'max:191'],
            'description' => ['nullable', 'string', 'max:1000'],
            'expense_account_id' => [
                'nullable', 'integer',
                Rule::exists('chart_of_accounts', 'id')
                    ->where('campus_id', $campusId)
                    ->where('account_type', 'expense')
                    ->where('is_group', false)
                    ->whereNull('deleted_at'),
            ],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
