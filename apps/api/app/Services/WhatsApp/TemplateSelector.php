<?php

namespace App\Services\WhatsApp;

use App\Models\IntegrationTemplate;

/**
 * Chooses the approved template for a purpose and renders its ordered body
 * parameters from a delivery context.
 *
 * Templates are authored and approved in the institution's own WABA. EduCourt
 * only stores the mapping: `parameters` is an ordered list of source keys
 * (e.g. ["recipient_name", "outstanding", "oldest_due_date", "days_overdue"]).
 * A template without explicit parameters falls back to the context order.
 */
final class TemplateSelector
{
    public const STATUS_APPROVED = 'approved';

    public function select(int $institutionId, ?int $senderId, string $purpose): ?IntegrationTemplate
    {
        return IntegrationTemplate::query()
            ->where('institution_id', $institutionId)
            ->where('sender_id', $senderId)
            ->where('purpose', $purpose)
            ->where('approval_status', self::STATUS_APPROVED)
            ->orderByDesc('id')
            ->first();
    }

    /**
     * @param  array<string, scalar|null>  $context
     * @return array<int, string>
     */
    public function parameters(IntegrationTemplate $template, array $context): array
    {
        $definition = $template->parameters;

        if (! is_array($definition) || $definition === []) {
            return array_values(array_map(
                static fn ($value) => (string) $value,
                $context,
            ));
        }

        $ordered = [];

        foreach ($definition as $entry) {
            $key = is_array($entry)
                ? ($entry['source'] ?? $entry['field'] ?? $entry['name'] ?? null)
                : $entry;

            if (! is_string($key) || $key === '') {
                continue;
            }

            $ordered[] = (string) ($context[$key] ?? '');
        }

        return $ordered;
    }
}
