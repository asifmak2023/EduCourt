<?php

namespace App\Support\Concerns;

use App\Models\Campus;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;

/**
 * Applies campus-level isolation. Models with a campus_id column are filtered
 * by the active campus; the Campus model itself is scoped on its own key.
 */
trait BelongsToCampus
{
    public static function bootBelongsToCampus(): void
    {
        static::addGlobalScope('campus_tenant', function (Builder $builder) {
            /** @var TenantContext $context */
            $context = app(TenantContext::class);

            if (! $context->shouldEnforceCampus()) {
                return;
            }

            $model = $builder->getModel();
            $column = $model instanceof Campus ? $model->getKeyName() : 'campus_id';

            $builder->where($model->getTable().'.'.$column, $context->campusId());
        });
    }

    public function scopeForCampus(Builder $query, int $campusId): Builder
    {
        $model = $query->getModel();
        $column = $model instanceof Campus ? $model->getKeyName() : 'campus_id';

        return $query->where($model->getTable().'.'.$column, $campusId);
    }
}
