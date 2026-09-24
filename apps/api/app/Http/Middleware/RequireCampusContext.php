<?php

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ensures an active campus is selected before reaching campus-scoped resources.
 * Campus is the tenant boundary for operational data.
 */
class RequireCampusContext
{
    public function __construct(private readonly TenantContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($this->context->campusId() === null) {
            abort(403, 'Select a campus (X-Campus-Id header) to access this resource.');
        }

        return $next($request);
    }
}
