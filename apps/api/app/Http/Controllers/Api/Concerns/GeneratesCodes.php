<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Support\Codes\CodeGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Shared helpers for controllers whose records carry a generated identifier.
 *
 * Controllers declare the registry key through $codeResource and, when the
 * column is not "code", through $codeColumn.
 */
trait GeneratesCodes
{
    /**
     * Fills the code column when the request left it blank.
     *
     * @param  array<string, mixed>  $data
     * @param  array{institution_id?: int, campus_id?: int}  $tenant
     */
    protected function applyGeneratedCode(array &$data, array $tenant): void
    {
        $column = $this->codeColumn();

        if (! blank($data[$column] ?? null)) {
            return;
        }

        $data[$column] = $this->nextResourceCode($tenant);
    }

    /**
     * Drops a blank code so updates never erase an existing identifier.
     *
     * @param  array<string, mixed>  $data
     */
    protected function stripBlankCode(array &$data): void
    {
        $column = $this->codeColumn();

        if (array_key_exists($column, $data) && blank($data[$column])) {
            unset($data[$column]);
        }
    }

    public function nextCode(Request $request): JsonResponse
    {
        return response()->json([
            'data' => [$this->codeColumn() => $this->nextResourceCode($this->nextCodeTenant($request))],
        ]);
    }

    /**
     * @param  array{institution_id?: int, campus_id?: int}  $tenant
     */
    protected function nextResourceCode(array $tenant): string
    {
        return app(CodeGenerator::class)->next(
            $this->codeResource(),
            isset($tenant['institution_id']) ? (int) $tenant['institution_id'] : null,
            isset($tenant['campus_id']) ? (int) $tenant['campus_id'] : null,
        );
    }

    /**
     * @return array{institution_id?: int, campus_id?: int}
     */
    protected function nextCodeTenant(Request $request): array
    {
        return $this->academicTenantAttributes();
    }

    protected function codeResource(): string
    {
        return property_exists($this, 'codeResource') ? $this->codeResource : '';
    }

    protected function codeColumn(): string
    {
        return property_exists($this, 'codeColumn') ? $this->codeColumn : 'code';
    }
}
