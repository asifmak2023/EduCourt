<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\Campus;
use App\Support\TenantContext;

/**
 * Stamps academic records with the active institution and campus. Campus is the
 * tenant boundary for all academic data.
 */
trait StampsAcademicTenant
{
    /**
     * @return array{institution_id: int, campus_id: int}
     */
    protected function academicTenantAttributes(): array
    {
        /** @var TenantContext $context */
        $context = app(TenantContext::class);

        $campusId = $context->campusId();

        if ($campusId === null) {
            abort(403, 'Select a campus (X-Campus-Id header) to manage academic data.');
        }

        $institutionId = $context->institutionId()
            ?? Campus::query()->whereKey($campusId)->value('institution_id');

        return [
            'institution_id' => (int) $institutionId,
            'campus_id' => $campusId,
        ];
    }
}
