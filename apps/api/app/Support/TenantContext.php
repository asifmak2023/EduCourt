<?php

namespace App\Support;

/**
 * Holds the active institution and campus for the current request.
 *
 * MySQL has no row-level security, so tenant isolation is enforced in the
 * application layer. Institution isolation is always applied for tenant users;
 * campus isolation is applied when a specific campus is active.
 */
class TenantContext
{
    private ?int $institutionId = null;

    private ?int $campusId = null;

    private bool $enforceInstitution = false;

    private bool $enforceCampus = false;

    public function set(
        ?int $institutionId,
        ?int $campusId,
        bool $enforceInstitution = true,
        bool $enforceCampus = true,
    ): void {
        $this->institutionId = $institutionId;
        $this->campusId = $campusId;
        $this->enforceInstitution = $enforceInstitution;
        $this->enforceCampus = $enforceCampus;
    }

    public function clear(): void
    {
        $this->institutionId = null;
        $this->campusId = null;
        $this->enforceInstitution = false;
        $this->enforceCampus = false;
    }

    public function institutionId(): ?int
    {
        return $this->institutionId;
    }

    public function campusId(): ?int
    {
        return $this->campusId;
    }

    public function shouldEnforceInstitution(): bool
    {
        return $this->enforceInstitution && $this->institutionId !== null;
    }

    public function shouldEnforceCampus(): bool
    {
        return $this->enforceCampus && $this->campusId !== null;
    }

    public function hasCampus(): bool
    {
        return $this->campusId !== null;
    }
}
