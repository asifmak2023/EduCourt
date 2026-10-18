<?php

namespace App\Support\Codes;

use Illuminate\Database\Eloquent\SoftDeletes;
use InvalidArgumentException;

/**
 * Generates sequential, tenant-scoped codes such as STG-0001. The sequence is
 * derived from the existing row count and advanced until an unused code is
 * found, so manually overridden codes are never reused.
 */
class CodeGenerator
{
    public function next(string $resource, ?int $institutionId = null, ?int $campusId = null): string
    {
        $profile = CodeRegistry::get($resource);

        $query = $this->baseQuery($profile);

        $query = match ($profile['scope']) {
            CodeRegistry::SCOPE_GLOBAL => $query,
            CodeRegistry::SCOPE_INSTITUTION => $this->scopeToInstitution($query, $institutionId),
            CodeRegistry::SCOPE_CAMPUS => $this->scopeToCampus($query, $campusId),
            default => throw new InvalidArgumentException("Unknown scope [{$profile['scope']}]."),
        };

        $sequence = (clone $query)->count() + 1;

        do {
            $code = sprintf('%s-%0'.$profile['padding'].'d', $profile['prefix'], $sequence);
            $sequence++;
        } while ((clone $query)->where($profile['column'], $code)->exists());

        return $code;
    }

    /**
     * @param  array{model: class-string, column: string, prefix: string, padding: int, scope: string}  $profile
     */
    private function baseQuery(array $profile): mixed
    {
        $model = $profile['model'];

        if (in_array(SoftDeletes::class, class_uses_recursive($model), true)) {
            return $model::withTrashed();
        }

        return $model::query();
    }

    private function scopeToInstitution(mixed $query, ?int $institutionId): mixed
    {
        if ($institutionId === null) {
            throw new InvalidArgumentException('An institution is required to generate this code.');
        }

        return $query->where('institution_id', $institutionId);
    }

    private function scopeToCampus(mixed $query, ?int $campusId): mixed
    {
        if ($campusId === null) {
            throw new InvalidArgumentException('A campus is required to generate this code.');
        }

        return $query->where('campus_id', $campusId);
    }
}
