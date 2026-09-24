<?php

namespace App\Support\Concerns;

use App\Models\Institution;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;

/**
 * Applies institution (tenant) isolation. Every tenant-owned model has an
 * institution_id; the Institution model itself is scoped on its own key.
 */
trait BelongsToInstitution
{
    public static function bootBelongsToInstitution(): void
    {
        static::addGlobalScope('institution_tenant', function (Builder $builder) {
            /** @var TenantContext $context */
            $context = app(TenantContext::class);

            if (! $context->shouldEnforceInstitution()) {
                return;
            }

            $model = $builder->getModel();
            $column = $model instanceof Institution ? $model->getKeyName() : 'institution_id';

            $builder->where($model->getTable().'.'.$column, $context->institutionId());
        });
    }

    public function scopeForInstitution(Builder $query, int $institutionId): Builder
    {
        $model = $query->getModel();
        $column = $model instanceof Institution ? $model->getKeyName() : 'institution_id';

        return $query->where($model->getTable().'.'.$column, $institutionId);
    }
}
