<?php

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the active institution and campus for the request. Campus is the
 * tenant boundary for all operational data.
 *
 * - The Super User (product owner) bypasses isolation and may optionally filter
 *   to a single campus with the X-Campus-Id header.
 * - Every other user is isolated to their institution and to a permitted
 *   campus.
 */
class ResolveTenant
{
    public function __construct(private readonly TenantContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            $this->context->clear();

            return $next($request);
        }

        $requested = $request->header('X-Campus-Id');
        $requested = $requested !== null ? (int) $requested : null;

        if ($user->isPlatformAdmin()) {
            $this->context->set(null, $requested, false, $requested !== null);

            return $next($request);
        }

        $allowed = $user->allowedCampusIds();
        $campusId = $user->campus_id;

        if ($requested !== null && in_array($requested, $allowed, true)) {
            $campusId = $requested;
        }

        if ($campusId === null && $allowed !== []) {
            $campusId = $allowed[0];
        }

        $this->context->set($user->institution_id, $campusId, true, $campusId !== null);

        return $next($request);
    }
}
