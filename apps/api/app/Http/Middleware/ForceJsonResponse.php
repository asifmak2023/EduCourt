<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The API is consumed by token clients (web and mobile) that always expect JSON.
 * Forcing the Accept header keeps validation, authentication and not-found
 * errors rendered as JSON instead of attempting an HTML redirect.
 */
class ForceJsonResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        $request->headers->set('Accept', 'application/json');

        return $next($request);
    }
}
